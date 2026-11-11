import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- Replenishment Recommendations ---------------------------------------
//
// Location-based demand and reorder analytics (spec 3060):
//   POST /api/company/replenishmentPolicy/all      { limit, offset }
//   POST /api/company/replenishmentPolicy/get      { id }
//   POST /api/company/replenishmentPolicy/create   { scopeType, companyDebtorId | warehouseId, ... }
//   POST /api/company/replenishmentPolicy/update   { id, values only — scope cannot change }
//   POST /api/company/replenishmentPolicy/delete   { id }
//   POST /api/company/replenishmentPolicy/resolve  { companyDebtorId | warehouseId }
//   POST /api/company/replenishment/recommend      { companyDebtorId | companyDebtorGroupId | warehouseId, asOfDate, limit, companyStockDetailIds? }
//   POST /api/company/replenishment/save           { location id, asOfDate, clientDocumentId, notes, timezone }
//   POST /api/company/replenishment/get            { id }
//   POST /api/company/replenishment/all            { location id, runStatus, fromDate, toDate, limit, offset }
//   POST /api/company/replenishment/approve        { id, decision, reason, adjustments }
//   POST /api/company/replenishment/conversionPayload { id, markConverted }
//
// Only ONE of companyDebtorId / companyDebtorGroupId / warehouseId may be sent per call.
// clientDocumentId is browser-generated, unique per save click, prefixed REPL-, reused only
// when retrying the same failed request so the backend can de-duplicate.
// conversionPayload is called twice: first with markConverted:false to review the supplier
// groups, then with markConverted:true only after every PO draft was created successfully.

// FE-facing security actions (documentation constants). They map onto SYSTEM_MODULES codes:
//   REPLENISHMENT_VIEW          -> REPLENISHMENT_RECOMMENDATIONS.code (READ)
//   REPLENISHMENT_CALCULATE     -> REPLENISHMENT_RECOMMENDATIONS.code (CREATE)
//   REPLENISHMENT_POLICY_MANAGE -> POLICIES (CREATE/UPDATE/DELETE)
//   REPLENISHMENT_APPROVE       -> APPROVAL (CREATE)
//   REPLENISHMENT_CONVERT       -> CONVERSION (CREATE)
export const REPLENISHMENT_ACTION_CODES = {
    VIEW: 'REPLENISHMENT_VIEW',
    POLICY_MANAGE: 'REPLENISHMENT_POLICY_MANAGE',
    CALCULATE: 'REPLENISHMENT_CALCULATE',
    APPROVE: 'REPLENISHMENT_APPROVE',
    CONVERT: 'REPLENISHMENT_CONVERT',
} as const;

// Scope types supported by the policy create API (COMPANY / STORE / WAREHOUSE).
// Store Group policies are shown by the list + resolve chain but are not created here.
export const POLICY_SCOPE_TYPES = ['COMPANY', 'STORE', 'WAREHOUSE'] as const;
export type PolicyScopeType = (typeof POLICY_SCOPE_TYPES)[number];

export const REPLENISHMENT_RUN_STATUSES = ['PROPOSED', 'APPROVED', 'REJECTED', 'CONVERTED'] as const;
export type ReplenishmentRunStatus = (typeof REPLENISHMENT_RUN_STATUSES)[number];

// --------------------------------------- Policies ---------------------------------------

export interface ReplenishmentPolicy {
    id?: string;
    scopeType?: PolicyScopeType | string;
    companyDebtorId?: string;
    companyDebtorGroupId?: string;
    warehouseId?: string;
    storeName?: string;
    groupName?: string;
    warehouseName?: string;
    lookbackDays?: number;
    coverDays?: number;
    seasonalStartMonth?: number;
    seasonalEndMonth?: number;
    seasonalUpliftPercent?: number;
    includeIncomingStock?: boolean;
    includeReservedDemand?: boolean;
    notes?: string;
    status?: string;
    source?: string;
    sourceType?: string;
    sourceLabel?: string;
    calculationVersion?: number;
    validFrom?: string;
    createdBy?: string;
    createdAt?: string;
    [key: string]: unknown;
}

// Backend rules mirrored so the user can see the constraints before submit.
// The API validation message is still shown below the relevant field when the server rejects.
const policyValueShape = {
    lookbackDays: z.number().min(1, 'Lookback days must be at least 1'),
    coverDays: z.number().min(1, 'Cover days must be at least 1'),
    seasonalStartMonth: z.number().min(1, 'Seasonal start month must be between 1 and 12').max(12),
    seasonalEndMonth: z.number().min(1, 'Seasonal end month must be between 1 and 12').max(12),
    seasonalUpliftPercent: z
        .number()
        .min(0, 'Seasonal uplift must be at least 0%')
        .max(100, 'Seasonal uplift must be at most 100%'),
    includeIncomingStock: z.boolean(),
    includeReservedDemand: z.boolean(),
};

type PolicyRangeValues = {
    scopeType?: PolicyScopeType;
    lookbackDays: number;
    coverDays: number;
    seasonalUpliftPercent: number;
};

const policyRangeChecks = (val: PolicyRangeValues, ctx: z.RefinementCtx) => {
    if (val.scopeType === 'STORE') {
        if (val.coverDays < 12 || val.coverDays > 21) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['coverDays'],
                message: 'Cover days must be between 12 and 21 for a store policy.',
            });
        }
        if (val.seasonalUpliftPercent < 25 || val.seasonalUpliftPercent > 40) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['seasonalUpliftPercent'],
                message: 'Seasonal uplift must be between 25% and 40% for a store policy.',
            });
        }
    }
    if (val.scopeType === 'WAREHOUSE') {
        // Warehouse/DC policy fields are fixed defaults (disabled in the UI).
        if (val.lookbackDays !== 45 || val.coverDays !== 45 || val.seasonalUpliftPercent !== 40) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['coverDays'],
                message: 'Warehouse policy is fixed: lookback 45 days, cover 45 days, uplift 40%.',
            });
        }
    }
};

const policyLocationChecks = (
    val: { scopeType?: PolicyScopeType; companyDebtorId?: string; warehouseId?: string },
    ctx: z.RefinementCtx,
) => {
    if (val.scopeType === 'STORE' && !val.companyDebtorId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['companyDebtorId'], message: 'Select a store for a store policy.' });
    }
    if (val.scopeType === 'WAREHOUSE' && !val.warehouseId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['warehouseId'], message: 'Select a warehouse for a warehouse policy.' });
    }
};

export const replenishmentPolicyCreateSchema = z
    .object({
        scopeType: z.enum(POLICY_SCOPE_TYPES),
        companyDebtorId: z.string().optional(),
        warehouseId: z.string().optional(),
        ...policyValueShape,
        notes: z.string().optional(),
        timezone: z.string().optional(),
    })
    .superRefine(policyRangeChecks)
    .superRefine(policyLocationChecks);

export type ReplenishmentPolicyCreateSchema = z.infer<typeof replenishmentPolicyCreateSchema>;

// Update carries values only — the scope (scopeType + location) cannot change.
// scopeType is kept as an optional FE-only field so the store / warehouse range checks
// still run; it is stripped from the payload before the request is sent.
export const replenishmentPolicyUpdateSchema = z
    .object({
        id: z.string().min(1, 'Policy id is required'),
        scopeType: z.enum(POLICY_SCOPE_TYPES).optional(),
        companyDebtorId: z.string().optional(),
        warehouseId: z.string().optional(),
        ...policyValueShape,
        notes: z.string().optional(),
    })
    .superRefine(policyRangeChecks)
    .superRefine(policyLocationChecks);

export type ReplenishmentPolicyUpdateSchema = z.infer<typeof replenishmentPolicyUpdateSchema>;

export interface MutateReplenishmentPolicyResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentPolicy;
}

export async function createReplenishmentPolicy(
    data: ReplenishmentPolicyCreateSchema,
): Promise<MutateReplenishmentPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishmentPolicy.create.url,
            method: apiUrls.replenishmentPolicy.create.method,
            data,
        })
    ).data;
}

export const useCreateReplenishmentPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ReplenishmentPolicyCreateSchema) => createReplenishmentPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishmentPolicy)] });
        },
    });
};

export interface ReplenishmentPolicyListProps {
    limit?: number;
    offset?: number;
}

export interface GetReplenishmentPoliciesResponse {
    success?: boolean;
    message?: string;
    count?: number;
    data?: ReplenishmentPolicy[] | { count?: number; rows?: ReplenishmentPolicy[] };
}

export const getReplenishmentPolicies = (res?: GetReplenishmentPoliciesResponse): ReplenishmentPolicy[] => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    return data?.rows || [];
};

export const useGetReplenishmentPolicies = (props: ReplenishmentPolicyListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentPolicy), 'all', props],
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentPolicy.all.url,
                method: apiUrls.replenishmentPolicy.all.method,
                data: props,
            })).data as GetReplenishmentPoliciesResponse,
    });
};

export const useGetReplenishmentPolicy = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentPolicy), 'get', id],
        enabled: !!id,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentPolicy.get.url,
                method: apiUrls.replenishmentPolicy.get.method,
                data: { id },
            })).data as GetReplenishmentPolicyResponse,
    });
};

// scopeType + location ids are FE-only (range / location checks) and must not be sent:
// the update API accepts policy values only, the scope cannot change.
export async function updateReplenishmentPolicy(
    data: ReplenishmentPolicyUpdateSchema,
): Promise<MutateReplenishmentPolicyResponse> {
    const payload = {
        id: data.id,
        lookbackDays: data.lookbackDays,
        coverDays: data.coverDays,
        seasonalStartMonth: data.seasonalStartMonth,
        seasonalEndMonth: data.seasonalEndMonth,
        seasonalUpliftPercent: data.seasonalUpliftPercent,
        includeIncomingStock: data.includeIncomingStock,
        includeReservedDemand: data.includeReservedDemand,
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
    };
    return (
        await axiosInstance({
            url: apiUrls.replenishmentPolicy.update.url,
            method: apiUrls.replenishmentPolicy.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateReplenishmentPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ReplenishmentPolicyUpdateSchema) => updateReplenishmentPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishmentPolicy)] });
        },
    });
};

export async function deleteReplenishmentPolicy(id: string): Promise<MutateReplenishmentPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishmentPolicy.delete.url,
            method: apiUrls.replenishmentPolicy.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteReplenishmentPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deleteReplenishmentPolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishmentPolicy)] });
        },
    });
};

export interface ReplenishmentPolicyResolveProps {
    companyDebtorId?: string | null;
    companyDebtorGroupId?: string | null;
    warehouseId?: string | null;
    asOfDate?: string;
}

export interface GetReplenishmentPolicyResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentPolicy | ReplenishmentPolicy[];
}

export const getEffectiveReplenishmentPolicy = (
    res?: GetReplenishmentPolicyResponse,
): ReplenishmentPolicy | null => {
    const data = res?.data;
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
};

export const useResolveReplenishmentPolicy = (props: ReplenishmentPolicyResolveProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentPolicy), 'resolve', props],
        enabled: !!props,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentPolicy.resolve.url,
                method: apiUrls.replenishmentPolicy.resolve.method,
                data: props,
            })).data as GetReplenishmentPolicyResponse,
    });
};

// --------------------------------------- Recommendations ---------------------------------------

export interface ReplenishmentRecommendProps {
    companyDebtorId?: string;
    companyDebtorGroupId?: string;
    warehouseId?: string;
    asOfDate: string;
    limit?: number;
    includeZeroRecommendations?: boolean;
    // Optional SKU filter — restrict the recommendation to these companyStockDetailIds.
    companyStockDetailIds?: string[];
}

export interface ReplenishmentRecommendLine {
    skuCode?: string;
    itemCode?: string;
    description?: string;
    dailySalesRate?: number;
    weeklySalesRate?: number;
    monthlySalesRate?: number;
    weeklySalesQuantity?: number;
    monthlySalesQuantity?: number;
    soldQuantity?: number;
    soldQuantityLast7Days?: number;
    soldQuantityLast30Days?: number;
    refundedQuantity?: number;
    netSalesQuantity?: number;
    availableStock?: number;
    reservedDemand?: number;
    incomingStock?: number;
    stockPosition?: number;
    reorderLevel?: number;
    baseTargetQuantity?: number;
    seasonalUpliftPercent?: number;
    seasonalTargetQuantity?: number;
    targetQuantity?: number;
    rawRecommendedQuantity?: number;
    targetedRecommendedQuantity?: number;
    recommendedQuantity?: number;
    supplier?: string;
    supplierName?: string;
    minimumOrderQuantity?: number;
    orderMultiple?: number;
    isSeasonal?: boolean;
    reorderTriggered?: boolean;
    appliedMinimumOrderQuantity?: boolean;
    appliedStandardOrderQuantity?: boolean;
    appliedOrderMultiple?: boolean;
    appliedMaximumOrderQuantity?: boolean;
    locationType?: string;
    companyStockDetailId?: string;
    companyDebtorId?: string;
    storeName?: string;
    warehouseName?: string;
    [key: string]: unknown;
}

export interface ReplenishmentRecommendStore {
    id?: string;
    name?: string;
    accountNumber?: string;
}

export interface GetReplenishmentRecommendResponse {
    success?: boolean;
    message?: string;
    data?: {
        scopeType?: string;
        companyDebtorId?: string | null;
        companyDebtorGroupId?: string | null;
        warehouseId?: string | null;
        asOfDate?: string;
        lookbackFrom?: string;
        lookbackTo?: string;
        calculationVersion?: number;
        policySource?: string;
        replenishmentPolicyId?: string | null;
        // Effective policy used for this calculation (source = STORE / STORE_GROUP / COMPANY /
        // WAREHOUSE / DEFAULT). This is the authoritative policy snapshot for the run.
        policySnapshot?: ReplenishmentPolicy | null;
        stores?: ReplenishmentRecommendStore[];
        truncated?: boolean;
        count?: number;
        rows?: ReplenishmentRecommendLine[];
        consolidatedCount?: number;
        consolidated?: ReplenishmentRecommendLine[];
        // Legacy / alternate keys kept for backward compatibility.
        preparedAt?: string;
        policy?: ReplenishmentPolicy | unknown;
    };
}

// The policy snapshot returned by recommend is the one the calculation actually used;
// fall back to a legacy `policy` field when present.
export const getReplenishmentRecommendPolicy = (
    res?: GetReplenishmentRecommendResponse,
): ReplenishmentPolicy | null => {
    const data = res?.data;
    if (!data) return null;
    const snapshot = data.policySnapshot || data.policy;
    return (snapshot as ReplenishmentPolicy) || null;
};

// The store(s) the recommendation was scoped to (single store logins return exactly one).
export const getReplenishmentRecommendStores = (
    res?: GetReplenishmentRecommendResponse,
): ReplenishmentRecommendStore[] => {
    const stores = res?.data?.stores;
    return Array.isArray(stores) ? stores : [];
};

export const getReplenishmentRecommendRows = (
    res?: GetReplenishmentRecommendResponse,
): ReplenishmentRecommendLine[] => {
    const data = res?.data;
    if (Array.isArray(data)) return data as ReplenishmentRecommendLine[];
    return data?.rows || [];
};

export const getReplenishmentConsolidatedRows = (
    res?: GetReplenishmentRecommendResponse,
): ReplenishmentRecommendLine[] => {
    const data = res?.data;
    if (!data || Array.isArray(data)) return [];
    return data.consolidated || [];
};

export const useGetReplenishmentRecommend = (props: ReplenishmentRecommendProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishment), 'recommend', props],
        enabled: !!props,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishment.recommend.url,
                method: apiUrls.replenishment.recommend.method,
                data: props,
            })).data as GetReplenishmentRecommendResponse,
    });
};

// --------------------------------------- Saved runs ---------------------------------------

export interface ReplenishmentRunItem {
    id?: string;
    companyStockDetailId?: string;
    skuCode?: string;
    description?: string;
    dailySalesRate?: number;
    weeklySalesRate?: number;
    monthlySalesRate?: number;
    soldQuantityLast7Days?: number;
    soldQuantityLast30Days?: number;
    availableStock?: number;
    reservedDemand?: number;
    incomingStock?: number;
    stockPosition?: number;
    baseTargetQuantity?: number;
    seasonalTargetQuantity?: number;
    targetQuantity?: number;
    recommendedQuantity?: number;
    approvedQuantity?: number;
    adjustmentReason?: string;
    reorderTriggered?: boolean;
    minimumOrderQuantity?: number;
    orderMultiple?: number;
    [key: string]: unknown;
}

export interface ReplenishmentRunAdjustment {
    id?: string;
    recommendationItemId?: string;
    approvedQuantity?: number;
    reason?: string;
    [key: string]: unknown;
}

export interface ReplenishmentRun {
    id: string;
    runNumber?: string;
    runStatus?: string;
    status?: string;
    asOfDate?: string;
    notes?: string;
    companyDebtorId?: string;
    companyDebtorGroupId?: string;
    warehouseId?: string;
    scopeType?: string;
    sourceScope?: string;
    rejectionReason?: string;
    approvalReason?: string;
    createdBy?: string;
    createdAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    convertedBy?: string;
    convertedAt?: string;
    clientDocumentId?: string;
    policy?: ReplenishmentPolicy | unknown;
    items?: ReplenishmentRunItem[];
    adjustments?: ReplenishmentRunAdjustment[];
    [key: string]: unknown;
}

export interface GetReplenishmentRunResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentRun;
}

export const getReplenishmentRunStatus = (run?: ReplenishmentRun | null): string => {
    if (!run) return 'PROPOSED';
    return run.runStatus || run.status || 'PROPOSED';
};

export const getReplenishmentRunItems = (run?: ReplenishmentRun | null): ReplenishmentRunItem[] => {
    if (!run) return [];
    if (Array.isArray(run.items)) return run.items;
    if (Array.isArray(run.lines)) return run.lines as ReplenishmentRunItem[];
    if (Array.isArray(run.recommendationItems)) return run.recommendationItems as ReplenishmentRunItem[];
    return [];
};

export const useGetReplenishmentRun = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishment), 'get', id],
        enabled: !!id,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishment.get.url,
                method: apiUrls.replenishment.get.method,
                data: { id },
            })).data as GetReplenishmentRunResponse,
    });
};

export interface ReplenishmentRunListProps {
    companyDebtorId?: string | null;
    companyDebtorGroupId?: string | null;
    warehouseId?: string | null;
    scopeType?: string;
    runStatus?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}

export interface GetReplenishmentRunsResponse {
    success?: boolean;
    message?: string;
    data?: {
        count?: number;
        rows?: ReplenishmentRun[];
    };
}

export const getReplenishmentRuns = (res?: GetReplenishmentRunsResponse): ReplenishmentRun[] => {
    const data = res?.data;
    if (Array.isArray(data)) return data as ReplenishmentRun[];
    return data?.rows || [];
};

export const useGetReplenishmentRuns = (props: ReplenishmentRunListProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishment), 'all', props],
        enabled: !!props,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishment.all.url,
                method: apiUrls.replenishment.all.method,
                data: props,
            })).data as GetReplenishmentRunsResponse,
    });
};

// --------------------------------------- Save ---------------------------------------

export interface SaveReplenishmentRunInput {
    companyDebtorId?: string;
    companyDebtorGroupId?: string;
    warehouseId?: string;
    asOfDate: string;
    clientDocumentId: string;
    notes?: string;
    timezone?: string;
}

export interface MutateReplenishmentRunResponse {
    success?: boolean;
    message?: string;
    data?: {
        id?: string;
        run?: ReplenishmentRun;
    };
}

export async function saveReplenishmentRun(data: SaveReplenishmentRunInput): Promise<MutateReplenishmentRunResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.save.url,
            method: apiUrls.replenishment.save.method,
            data,
        })
    ).data;
}

export const useSaveReplenishmentRun = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: SaveReplenishmentRunInput) => saveReplenishmentRun(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishment)] });
        },
    });
};

// --------------------------------------- Approval ---------------------------------------

export interface ReplenishmentAdjustmentInput {
    id: string;
    approvedQuantity?: number;
    reason?: string;
}

export interface ApproveReplenishmentRunInput {
    id: string;
    decision: 'APPROVED' | 'REJECTED';
    reason: string;
    adjustments?: ReplenishmentAdjustmentInput[];
}

export async function approveReplenishmentRun(data: ApproveReplenishmentRunInput): Promise<MutateReplenishmentRunResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.approve.url,
            method: apiUrls.replenishment.approve.method,
            data,
        })
    ).data;
}

export const useApproveReplenishmentRun = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ApproveReplenishmentRunInput) => approveReplenishmentRun(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishment)] });
        },
    });
};

// --------------------------------------- Conversion ---------------------------------------

export interface ReplenishmentConversionItem {
    companyStockDetailId?: string;
    skuCode?: string;
    description?: string;
    orderedQuantity?: number;
    agreedUnitCost?: number;
    approvedQuantity?: number;
    recommendedQuantity?: number;
    supplierId?: string;
    [key: string]: unknown;
}

export interface ReplenishmentConversionGroup {
    companyCreditorId?: string;
    supplierName?: string;
    items?: ReplenishmentConversionItem[];
    [key: string]: unknown;
}

export interface ReplenishmentConversionResponse {
    success?: boolean;
    message?: string;
    data?: {
        suppliers?: ReplenishmentConversionGroup[];
        purchaseOrders?: ReplenishmentConversionGroup[];
    };
}

export const getReplenishmentConversionGroups = (
    res?: ReplenishmentConversionResponse,
): ReplenishmentConversionGroup[] => {
    const data = res?.data;
    if (!data) return [];
    return data.purchaseOrders?.length ? data.purchaseOrders : data.suppliers || [];
};

export interface ReplenishmentConversionInput {
    id: string;
    // false: review the supplier groups. true: lock the run as CONVERTED after every PO
    // draft was created successfully.
    markConverted: boolean;
}

export const useReplenishmentConversion = () => {
    return useMutation({
        mutationFn: async ({ id, markConverted }: ReplenishmentConversionInput) =>
            (await axiosInstance({
                url: apiUrls.replenishment.conversionPayload.url,
                method: apiUrls.replenishment.conversionPayload.method,
                data: { id, markConverted },
            })).data as ReplenishmentConversionResponse,
    });
};
