import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosFormDataInstance, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { StockDetails } from '../company/stock-details';

// --------------------------------------- NST / STOCK DISPOSITION ---------------------------------------
// NST = Near-Stock / non-saleable stock (near-expiry, damaged, expired).
// The backend exposes a single resource: stockDisposition, split into rules,
// candidates, allocations and reporting.

export const NST_DISPOSITION_TYPES = ['NEAR_EXPIRY', 'DAMAGED', 'EXPIRED'] as const;
export type NSTDispositionType = (typeof NST_DISPOSITION_TYPES)[number];

export const NST_TRIGGER_MODES = ['AUTOMATIC', 'MANUAL', 'BOTH'] as const;
export type NSTTriggerMode = (typeof NST_TRIGGER_MODES)[number];

export const NST_ACTION_TYPES = ['DISCOUNT_SALE', 'QUARANTINE', 'RETURN_TO_SUPPLIER', 'WRITE_OFF'] as const;
export type NSTActionType = (typeof NST_ACTION_TYPES)[number];

export const NST_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'FIXED_PRICE'] as const;
export type NSTDiscountType = (typeof NST_DISCOUNT_TYPES)[number];

export const NST_SCOPE_TYPES = [
    'ALL',
    'STOCK',
    'CATEGORY',
    'SUBCATEGORY',
    'BRAND',
    'SUPPLIER',
    'WAREHOUSE',
] as const;
export type NSTScopeType = (typeof NST_SCOPE_TYPES)[number];

export const NST_SOURCE_TYPES = ['MANUAL', 'AUTOMATIC'] as const;
export type NSTSourceType = (typeof NST_SOURCE_TYPES)[number];

export const NST_DISPOSITION_SOURCE_TYPES = [
    'DISPOSITION_WRITE_OFF',
    'DISPOSITION_ALLOCATE',
    'DISPOSITION_RELEASE',
    'DISPOSITION_SALE',
    'DISPOSITION_REFUND',
    'DISPOSITION_RETURN',
] as const;
export type NSTDispositionSourceType = (typeof NST_DISPOSITION_SOURCE_TYPES)[number];

export const NST_RULE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type NSTRuleStatus = (typeof NST_RULE_STATUSES)[number];

export const NST_STATUS = [
    'ACTIVE',
    'PENDING_APPROVAL',
    'APPROVED',
    'REJECTED',
    'CANCELLED',
    'WRITTEN_OFF',
    'RETURNED',
    'SOLD',
    'SOLD_OUT',
    'DRAFT',
] as const;
export type NSTStatus = (typeof NST_STATUS)[number];

// The pre-sale lookup treats only ACTIVE + APPROVED allocations as sellable.
export const NST_SELLABLE_STATUS = 'ACTIVE';
export const NST_SELLABLE_APPROVAL_STATUS = 'APPROVED';

// ------------------------- Rules -------------------------

export interface NSTRuleScope {
    scopeType: NSTScopeType;
    scopeId?: string;
}

export interface DispositionRule {
    id: string;
    code: string;
    name: string;
    dispositionType: NSTDispositionType;
    triggerMode: NSTTriggerMode;
    nearExpiryFromDays: number;
    nearExpiryToDays: number;
    actionType: NSTActionType;
    discountType?: NSTDiscountType;
    discountValue?: number;
    maximumDiscountPercentage?: number;
    minimumMarginPercentage?: number;
    allowSale: boolean;
    allowPromotionStacking: boolean;
    requireApproval: boolean;
    minimumApproverLevel: number;
    priority: number;
    status: 'ACTIVE' | 'INACTIVE';
    scopes: NSTRuleScope[];
    createdAt: string;
    updatedAt?: string;
}

export interface GetDispositionRuleListResponse {
    success: boolean;
    message: string;
    data: DispositionRule[];
}

const scopeSchema = z.object({
    scopeType: z.enum(NST_SCOPE_TYPES),
    scopeId: z.string().optional(),
});

export const dispositionRuleBaseSchema = z.object({
    code: z.string().min(1, 'Rule code is required'),
    name: z.string().min(1, 'Rule name is required'),
    dispositionType: z.enum(NST_DISPOSITION_TYPES),
    triggerMode: z.enum(NST_TRIGGER_MODES),
    nearExpiryFromDays: z.number().min(0, 'From days cannot be negative'),
    nearExpiryToDays: z.number().min(0, 'To days cannot be negative'),
    actionType: z.enum(NST_ACTION_TYPES),
    discountType: z.enum(NST_DISCOUNT_TYPES).optional(),
    discountValue: z.number().nonnegative().optional(),
    maximumDiscountPercentage: z.number().nonnegative().optional(),
    minimumMarginPercentage: z.number().nonnegative().optional(),
    allowSale: z.boolean().optional(),
    allowPromotionStacking: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    minimumApproverLevel: z.number().min(1, 'Approver level must be at least 1').optional(),
    priority: z.number().min(0).optional(),
    // A newly created rule is live; the backend defaults it to ACTIVE otherwise.
    status: z.enum(NST_RULE_STATUSES).optional(),
    scopes: z.array(scopeSchema).default([]),
});

export const dispositionRuleCreateSchema = dispositionRuleBaseSchema.superRefine((val, ctx) => {
    // A discount can never exceed the configured maximum for that rule. Only meaningful
    // for percentage discounts; a fixed-amount/price rule has no comparable percentage.
    if (
        val.discountType === 'PERCENTAGE' &&
        val.discountValue != null &&
        val.maximumDiscountPercentage != null &&
        val.discountValue > val.maximumDiscountPercentage
    ) {
        const message = 'Discount value cannot be greater than the maximum discount';
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message });
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maximumDiscountPercentage'], message });
    }
});

export type DispositionRuleCreateSchema = z.infer<typeof dispositionRuleCreateSchema>;

export const dispositionRuleUpdateSchema = dispositionRuleBaseSchema
    .partial()
    .extend({
        id: z.string().min(1, 'Rule id is required'),
    })
    .superRefine((val, ctx) => {
        // A discount can never exceed the configured maximum for that rule. Only meaningful
        // for percentage discounts; a fixed-amount/price rule has no comparable percentage.
        if (
            val.discountType === 'PERCENTAGE' &&
            val.discountValue != null &&
            val.maximumDiscountPercentage != null &&
            val.discountValue > val.maximumDiscountPercentage
        ) {
            const message = 'Discount value cannot be greater than the maximum discount';
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message });
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['maximumDiscountPercentage'], message });
        }
    });

export type DispositionRuleUpdateSchema = z.infer<typeof dispositionRuleUpdateSchema>;

export interface GetDispositionRuleListProps {
    status?: string;
    dispositionType?: NSTDispositionType;
}

export async function getDispositionRules(
    props?: GetDispositionRuleListProps,
): Promise<GetDispositionRuleListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.rules.list.url,
            method: apiUrls.stockDisposition.rules.list.method,
            data: props || {},
        })
    ).data;
}

export const useGetDispositionRules = (props?: GetDispositionRuleListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'rules', props],
        queryFn: async () => await getDispositionRules(props),
    });
};

export interface GetDispositionRuleByIdProps {
    id: string;
}

export async function getDispositionRuleById(
    props: GetDispositionRuleByIdProps,
): Promise<{ success: boolean; data: DispositionRule }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.rules.get.url,
            method: apiUrls.stockDisposition.rules.get.method,
            data: props,
        })
    ).data;
}

export const useGetDispositionRuleById = (props: GetDispositionRuleByIdProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'rules', 'get', props],
        enabled: !!props?.id,
        queryFn: async () => await getDispositionRuleById(props as GetDispositionRuleByIdProps),
    });
};

export async function createDispositionRule(data: DispositionRuleCreateSchema) {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.rules.create.url,
            method: apiUrls.stockDisposition.rules.create.method,
            data,
        })
    ).data;
}

export const useCreateDispositionRule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDispositionRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

export async function updateDispositionRule(data: DispositionRuleUpdateSchema) {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.rules.update.url,
            method: apiUrls.stockDisposition.rules.update.method,
            data,
        })
    ).data;
}

export const useUpdateDispositionRule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDispositionRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

export async function deleteDispositionRule(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.rules.delete.url,
            method: apiUrls.stockDisposition.rules.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteDispositionRule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDispositionRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

// ------------------------- Candidates -------------------------

export interface DispositionCandidateInventory {
    batchNumber?: string;
    availableQuantity?: number;
    warehouseId?: string;
    locationId?: string;
}

export interface DispositionCandidateRule {
    id?: string;
    name?: string;
    code?: string;
    actionType?: NSTActionType | string;
    allowSale?: boolean;
    discountPercentage?: number;
    discountedUnitPrice?: number;
}

// The candidates endpoint is the batch source for the automatic near-expiry flow.
// Each row already carries the exact inventory batch and the rule that matched it.
export interface DispositionCandidate {
    companyStockDetailId: string;
    companyStockInventoryId: string;
    dispositionType?: NSTDispositionType;
    expiryDate?: string;
    remainingDays?: number;
    inventory?: DispositionCandidateInventory;
    rule?: DispositionCandidateRule;
    stockDetail?: StockDetails;
    // Legacy flat shape, still returned by older builds.
    CompanyStockDetail?: StockDetails;
    description?: string;
    itemCode?: string;
    barcode?: string;
    batchNumber?: string;
    availableStock?: number;
    unitCost?: number;
    // The pre-discount price the candidate would be sold at if the discount were dropped.
    originalUnitPrice?: string | number;
    suggestedUnitPrice?: string | number;
    discountPercentage?: number;
    marginPercentage?: number;
    ruleId?: string;
    ruleName?: string;
    // When the batch already has an allocation the backend may echo it on the row; the
    // screen also cross-checks the active allocation list so the action is never blind.
    existingAllocation?: {
        id?: string;
        dispositionNumber?: string;
        status?: string;
        approvalStatus?: string;
        allocatedQuantity?: number;
        remainingQuantity?: number;
    };
    // Whether this batch can still take a new allocation right now. When false the
    // backend also explains why, and /stockDisposition/create must not be attempted.
    canAllocate?: boolean;
    allocationBlockedReason?: string;
    // The pricing record (and its type) a new allocation must be attached to. Candidate-
    // driven creates send these so the POS can quote the discounted price without
    // re-resolving the price list.
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
}

// Read helpers so the UI and the POS lookup agree on one definition of a candidate.
export const candidateStockDetail = (c?: DispositionCandidate) => c?.stockDetail || c?.CompanyStockDetail;
export const candidateBatchNumber = (c?: DispositionCandidate) => c?.inventory?.batchNumber || c?.batchNumber || '';
// `inventory.availableQuantity` is the exact remaining physical stock that can still be
// allocated for another NST. The flat field is only read when the nested one is absent.
export const candidateAvailable = (c?: DispositionCandidate) =>
    c?.inventory?.availableQuantity ?? c?.availableStock ?? 0;
export const candidateRuleId = (c?: DispositionCandidate) => c?.rule?.id || c?.ruleId;
export const candidateRuleName = (c?: DispositionCandidate) => c?.rule?.name || c?.ruleName || '';
export const candidateDiscountedPrice = (c?: DispositionCandidate) =>
    c?.rule?.discountedUnitPrice ?? c?.suggestedUnitPrice;
// The pre-discount price of the batch, shown so the selling price can be verified.
export const candidateOriginalPrice = (c?: DispositionCandidate) => c?.originalUnitPrice;
export const candidateDiscountPct = (c?: DispositionCandidate) =>
    c?.rule?.discountPercentage ?? c?.discountPercentage ?? 0;
export const candidateHasStock = (c?: DispositionCandidate) => candidateAvailable(c) > 0;
// An allocation counts as "already allocated" while it is ACTIVE. Approval is reported
// alongside it but does not gate the decision on the recommendations screen.
export const nstIsActive = (d?: { status?: string } | null) => !d?.status || d.status === NST_SELLABLE_STATUS;
export const nstIsApproved = (d?: { approvalStatus?: string } | null) =>
    d?.approvalStatus === NST_SELLABLE_APPROVAL_STATUS;
export const candidateExistingAllocation = (c?: DispositionCandidate) => c?.existingAllocation;
export const candidateInventoryId = (c?: DispositionCandidate) => c?.companyStockInventoryId || '';

export interface GetDispositionCandidatesProps {
    companyDebtorId?: string;
    // Company/DC scope only: narrows the batch lookup to a single warehouse. Omitted for a
    // store (a store is already pinned to one location) and when no warehouse is chosen.
    warehouseId?: string;
    // Company/DC scope only: narrows the lookup to one product's batches. Omitted when no
    // product was chosen.
    companyStockDetailId?: string;
    maxDays?: number;
    // 'ALL' lists every disposition kind in the same window (near-expiry, expired).
    dispositionType?: NSTDispositionType | 'ALL';
    // Scopes the candidates to a selling price list. Batches without a price in the
    // selected pricing type are excluded, so the list only offers priceable stock.
    companyStockPricingTypeId?: string;
}

export async function getDispositionCandidates(
    props?: GetDispositionCandidatesProps,
): Promise<{ success: boolean; data: DispositionCandidate[] }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.candidates.list.url,
            method: apiUrls.stockDisposition.candidates.list.method,
            data: props || {},
        })
    ).data;
}

// One list call for the recommendations screen, used only to know which batches already
// have an active allocation so the action is not a blind "Allocate".
export const useGetActiveNSTAllocations = (companyDebtorId?: string) =>
    useGetStockDispositions({
        status: NST_SELLABLE_STATUS,
        ...(companyDebtorId ? { companyDebtorId } : {}),
        limit: 200,
        offset: 0,
    });

export const useGetDispositionCandidates = (props?: GetDispositionCandidatesProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'candidates', props],
        queryFn: async () => await getDispositionCandidates(props),
    });
};

// ------------------------- Allocations (create / get / list) -------------------------

export interface StockDispositionItem {
    id: string;
    companyStockDetailId: string;
    companyStockInventoryId?: string;
    companyStockPricingId?: string;
    CompanyStockDetail?: StockDetails;
    stockDispositionRuleId?: string;
    dispositionType: NSTDispositionType;
    sourceType: NSTSourceType;
    allocatedQuantity: number;
    availableQuantity: number;
    remainingQuantity: number;
    soldQuantity?: number;
    returnedQuantity?: number;
    writtenOffQuantity?: number;
    discountPercentage?: number;
    unitPrice?: number;
    originalValue?: number;
    realisedValue?: number;
    reason?: string;
    photoUrls?: string[];
    pdfUrl?: string;
    labelUrl?: string;
    status: NSTStatus;
    stockDispositionVersion?: number;
    approvalId?: string;
    approvedAt?: string;
    approvedBy?: string;
    cancelledAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface StockDisposition {
    id: string;
    companyDebtorId?: string;
    CompanyDebtor?: CompanyCreditor;
    companyStockDetailId: string;
    companyStockInventoryId?: string;
    stockDispositionRuleId?: string;
    Rule?: DispositionRule;
    dispositionType: NSTDispositionType;
    sourceType: NSTSourceType;
    allocatedQuantity: number;
    availableQuantity: number;
    remainingQuantity: number;
    soldQuantity?: number;
    returnedQuantity?: number;
    writtenOffQuantity?: number;
    discountPercentage?: number;
    unitPrice?: number;
    // The backend-calculated price a sale/credit note must submit, and the pre-discount
    // price it is compared against. The backend echoes these on the allocation itself.
    originalUnitPrice?: number;
    discountedUnitPrice?: number;
    // The pricing record (and its tax) an NST sale line must submit.
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    companyTaxRateId?: string;
    originalValue?: number;
    realisedValue?: number;
    reason?: string;
    photoUrls?: string[];
    pdfUrl?: string;
    labelUrl?: string;
    batchNumber?: string;
    expiryDate?: string;
    // DRAFT / PENDING mean the allocation still needs /approve before it can be sold.
    approvalStatus?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | string;
    approvalRequired?: boolean;
    stockDispositionRuleName?: string;
    // The list endpoint nests the matched rule as `rule`; the allocation detail endpoint
    // returns it as `Rule`. Read both so callers never have to care which.
    rule?: DispositionRule;
    // Product / document details echoed on the list rows.
    stockDetail?: StockDetails;
    dispositionNumber?: string;
    originalUnitCost?: number;
    discountType?: NSTDiscountType;
    discountValue?: number;
    // `approvedBy` / `createdBy` hold user ids; the readable names come from these.
    approvedByUser?: { firstName?: string; surname?: string; name?: string };
    createdByUser?: { firstName?: string; surname?: string; name?: string };
    status: NSTStatus;
    // The allocation carries the version as `version`; `stockDispositionVersion` is the
    // name used by the sale payloads, so accept either.
    version?: number;
    stockDispositionVersion?: number;
    warehouseId?: string;
    approvalId?: string;
    approvedAt?: string;
    approvedBy?: string;
    cancelledAt?: string;
    clientDocumentId?: string;
    notSynced?: boolean;
    items?: StockDispositionItem[];
    CompanyStockDetail?: StockDetails;
    createdAt: string;
    updatedAt?: string;
}

export interface GetStockDispositionListResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: StockDisposition[] };
}

export interface GetStockDispositionProps {
    inventoryScope?: 'COMPANY' | 'STORE';
    // COMPANY uses null; STORE is pinned to the authorized selling store.
    companyDebtorId?: string | null;
    companyStockDetailId?: string;
    companyStockInventoryId?: string;
    warehouseId?: string;
    dispositionType?: NSTDispositionType;
    status?: string;
    approvalStatus?: string;
    expiryBefore?: string;
    expiryAfter?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export const NST_APPROVAL_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const;
export type NSTApprovalStatus = (typeof NST_APPROVAL_STATUSES)[number];

// UI-level filter state for the NST workspace; expiryFrom/To are the expiry window and
// dateFrom/To filter on the allocation's own created date.
export interface NSTListFilters {
    search: string;
    status: string;
    dispositionType: string;
    approvalStatus?: string;
    // Product-level filter (all batches/allocations of one product).
    companyStockDetailId?: string;
    companyStockInventoryId?: string;
    warehouseId?: string;
    expiryFrom?: string;
    expiryTo?: string;
    dateFrom?: string;
    dateTo?: string;
    movementSourceType?: string;
}

export async function getStockDispositions(props: GetStockDispositionProps): Promise<GetStockDispositionListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.list.url,
            method: apiUrls.stockDisposition.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockDispositions = (props: GetStockDispositionProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), props],
        queryFn: async () => await getStockDispositions(props),
    });
};

export interface GetStockDispositionByIdProps {
    id: string;
    companyDebtorId?: string;
}

export async function getStockDispositionById(
    props: GetStockDispositionByIdProps,
): Promise<{ success: boolean; data: StockDisposition }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.get.url,
            method: apiUrls.stockDisposition.get.method,
            data: props,
        })
    ).data;
}

export const useGetStockDispositionById = (props: GetStockDispositionByIdProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'get', props],
        enabled: !!props?.id,
        queryFn: async () => await getStockDispositionById(props as GetStockDispositionByIdProps),
    });
};

export const stockDispositionCreateSchema = z.object({
    // Omitted means company/DC stock. Only send it when an admin is allocating for a store.
    companyDebtorId: z.string().optional(),
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockInventoryId: z.string().min(1, 'Product inventory is required'),
    stockDispositionRuleId: z.string().optional(),
    dispositionType: z.enum(NST_DISPOSITION_TYPES),
    sourceType: z.enum(NST_SOURCE_TYPES),
    allocatedQuantity: z.number().min(1, 'Quantity must be at least 1'),
    // Near-expiry and expired allocations are batch-bound, so the batch travels with them.
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    reason: z.string().optional(),
    photoUrls: z.array(z.string()).optional(),
    // Recommended: makes the create safe to retry without double-reserving stock.
    clientDocumentId: z.string().optional(),
    // Pricing each new allocation must be attached to. Candidate-driven creates submit
    // these so the discounted price resolves without re-reading the product price list.
    companyStockPricingId: z.string().optional(),
    companyStockPricingTypeId: z.string().optional(),
});

export type StockDispositionCreateSchema = z.infer<typeof stockDispositionCreateSchema>;

export interface CreateStockDispositionResponse {
    success: boolean;
    message?: string;
    data?: StockDisposition & {
        approvalId?: string;
        requiresApproval?: boolean;
    };
}

export async function createStockDisposition(
    data: StockDispositionCreateSchema,
): Promise<CreateStockDispositionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.create.url,
            method: apiUrls.stockDisposition.create.method,
            data,
        })
    ).data;
}

export const useCreateStockDisposition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockDisposition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

// Label payload for an approved discounted NST item

export interface GetStockDispositionLabelProps {
    id: string;
    companyDebtorId?: string;
}

export interface StockDispositionLabel {
    barcodeValue?: string;
    batchNumber?: string;
    expiryDate?: string;
    originalUnitPrice?: number;
    discountedUnitPrice?: number;
    remainingQuantity?: number;
}

export async function getStockDispositionLabel(
    props: GetStockDispositionLabelProps,
): Promise<{ success: boolean; data?: StockDispositionLabel }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.label.url,
            method: apiUrls.stockDisposition.label.method,
            data: props,
        })
    ).data;
}

export const useGetStockDispositionLabel = (props: GetStockDispositionLabelProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'label', props],
        enabled: !!props?.id,
        queryFn: async () => await getStockDispositionLabel(props as GetStockDispositionLabelProps),
    });
};

// ------------------------- Approval -------------------------
// If approval is required, the security flow returns 428. After completing
// supervisor/fingerprint approval, resend with the received approval token.

export const stockDispositionApproveSchema = z.object({
    id: z.string().min(1, 'Disposition id is required'),
    companyDebtorId: z.string().optional(),
    reason: z.string().optional(),
});

export type StockDispositionApproveSchema = z.infer<typeof stockDispositionApproveSchema>;

// The 428 tells us which action the granted token belongs to; the token is keyed by it.
export const NST_APPROVE_ACTION_CODE = 'STOCK_DISPOSITION_APPROVE';

export type NSTApprovalTokens = Record<string, string>;

export interface ApproveStockDispositionInput extends StockDispositionApproveSchema {
    approvalToken?: string;
    approvalTokens?: NSTApprovalTokens;
    // Retained so an approval retry resends the exact same body.
    clientDocumentId?: string;
}

export async function approveStockDisposition(
    data: ApproveStockDispositionInput,
): Promise<{ success: boolean; message?: string; data?: StockDisposition }> {
    const { approvalToken, approvalTokens, ...payload } = data;
    const tokens = approvalTokens && Object.keys(approvalTokens).length ? approvalTokens : undefined;
    // Fall back to the single-token header shape when the caller only has one token.
    const singleToken = approvalToken || tokens?.[NST_APPROVE_ACTION_CODE];
    const body = tokens ? { ...payload, approvalTokens: tokens } : payload;
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.approve.url,
            method: apiUrls.stockDisposition.approve.method,
            data: body,
            ...(singleToken ? { headers: { 'X-Approval-Token': singleToken } } : {}),
        })
    ).data;
}

export const useApproveStockDisposition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveStockDisposition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

// ------------------------- Evidence photos -------------------------
// Maximum 10 files per request, 10 MB each. Files go to the dedicated endpoint once the
// allocation exists; create only carries the optional photoUrls.

export const NST_PHOTO_MAX_FILES = 10;
export const NST_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const NST_PHOTO_ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;
export const NST_PHOTO_ACCEPT_ATTR = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

export interface UploadNSTPhotoInput {
    id: string;
    photos: File[];
}

export interface UploadNSTPhotoResponse {
    success: boolean;
    message?: string;
    // The endpoint echoes the saved allocation, so read the urls off the disposition.
    data?: {
        disposition?: { id?: string; photoUrls?: string[] };
        photoUrls?: string[];
        url?: string;
        key?: string;
    } | null;
}

export const nstPhotoUrlsFromResponse = (res?: UploadNSTPhotoResponse | null): string[] => {
    const d = res?.data;
    if (!d) return [];
    if (d.disposition?.photoUrls) return d.disposition.photoUrls;
    if (d.photoUrls) return d.photoUrls;
    return d.url ? [d.url] : [];
};

export const validateNSTPhotos = (files: File[]): string | null => {
    if (files.length > NST_PHOTO_MAX_FILES) return `You can attach up to ${NST_PHOTO_MAX_FILES} photos.`;
    for (const file of files) {
        if (!NST_PHOTO_ACCEPTED.includes(file.type as (typeof NST_PHOTO_ACCEPTED)[number]))
            return `${file.name} is not a supported image format.`;
        if (file.size > NST_PHOTO_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
    }
    return null;
};

export async function uploadNSTPhotos(data: UploadNSTPhotoInput): Promise<UploadNSTPhotoResponse> {
    const formData = new FormData();
    formData.append('id', data.id);
    (data.photos || []).forEach((file) => formData.append('photos', file));
    return (
        await axiosFormDataInstance({
            url: apiUrls.stockDisposition.photoUpload.url,
            method: apiUrls.stockDisposition.photoUpload.method,
            data: formData,
        })
    ).data;
}

export const useUploadNSTPhotos = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadNSTPhotos,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

// ------------------------- Cancel / Write-off / Return -------------------------

// quantity is optional: the backend defaults it to the whole remaining quantity, and
// rejects anything above it.
const dispositionActionSchema = z.object({
    id: z.string().min(1, 'Disposition id is required'),
    companyDebtorId: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    reason: z.string().optional(),
});

export type DispositionActionSchema = z.infer<typeof dispositionActionSchema>;

export async function cancelStockDisposition(
    data: DispositionActionSchema,
): Promise<{ success: boolean; message?: string }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.cancel.url,
            method: apiUrls.stockDisposition.cancel.method,
            data,
        })
    ).data;
}

export const useCancelStockDisposition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelStockDisposition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

export async function writeOffStockDisposition(
    data: DispositionActionSchema,
): Promise<{ success: boolean; message?: string }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.writeOff.url,
            method: apiUrls.stockDisposition.writeOff.method,
            data,
        })
    ).data;
}

export const useWriteOffStockDisposition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: writeOffStockDisposition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

export async function returnStockDispositionToSupplier(
    data: DispositionActionSchema,
): Promise<{ success: boolean; message?: string }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.returnToSupplier.url,
            method: apiUrls.stockDisposition.returnToSupplier.method,
            data,
        })
    ).data;
}

export const useReturnStockDispositionToSupplier = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: returnStockDispositionToSupplier,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
        },
    });
};

// ------------------------- Reporting -------------------------

export interface NSTReportLine {
    companyStockDetailId?: string;
    description?: string;
    itemDescription?: string;
    itemCode?: string;
    categoryId?: string;
    subCategoryId?: string;
    dispositionType: NSTDispositionType;
    availableQuantity?: number;
    soldQuantity?: number;
    discountedQuantity?: number;
    originalValue?: number;
    realisedValue?: number;
    discountLoss?: number;
    returnedQuantity?: number;
    writtenOffQuantity?: number;
    returns?: number;
    writeOffs?: number;
}

export interface NSTReportTotals {
    nearExpiryAvailable?: number;
    damagedAvailable?: number;
    expiredAvailable?: number;
    availableDamagedQuantity?: number;
    availableNearExpiryQuantity?: number;
    availableExpiredQuantity?: number;
    discountedQuantitySold?: number;
    originalValue?: number;
    realisedValue?: number;
    discountLoss?: number;
    returnedQuantity?: number;
    writtenOffQuantity?: number;
    totalOriginalValue?: number;
    totalRealisedValue?: number;
    totalDiscountLoss?: number;
    totalReturns?: number;
    totalWriteOffs?: number;
}

export interface NSTReportSummary {
    // The backend groups the headline figures under `totals`. The flat fields are kept
    // for older responses that returned them at the top level.
    totals?: NSTReportTotals;
    availableDamagedQuantity?: number;
    availableNearExpiryQuantity?: number;
    availableExpiredQuantity?: number;
    discountedQuantitySold?: number;
    totalOriginalValue?: number;
    totalRealisedValue?: number;
    totalDiscountLoss?: number;
    totalReturns?: number;
    totalWriteOffs?: number;
    rows?: NSTReportLine[];
}

export interface GetNSTReportProps {
    companyDebtorId?: string;
    warehouseId?: string;
    dateFrom?: string;
    dateTo?: string;
    expiryAfter?: string;
    expiryBefore?: string;
    categoryId?: string;
    subCategoryId?: string;
    companyStockDetailId?: string;
    dispositionType?: NSTDispositionType;
    approvalStatus?: string;
    status?: string;
}

export async function getNSTReport(props?: GetNSTReportProps): Promise<{ success: boolean; data: NSTReportSummary }> {
    return (
        await axiosInstance({
            url: apiUrls.stockDisposition.report.url,
            method: apiUrls.stockDisposition.report.method,
            data: props || {},
        })
    ).data;
}

export const useGetNSTReport = (props?: GetNSTReportProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDisposition), 'report', props],
        queryFn: async () => await getNSTReport(props),
    });
};

// ------------------------- Report Export -------------------------
// The export endpoint streams the same report as xlsx/csv bytes, so it must be requested
// as a blob and saved manually; parsing it as JSON would corrupt the file.

export type NSTReportExportFormat = 'xlsx' | 'csv';

export interface ExportNSTReportProps extends GetNSTReportProps {
    format?: NSTReportExportFormat;
}

const NST_REPORT_EXPORT_MIME_TYPES: Record<NSTReportExportFormat, string> = {
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
};

export async function exportNSTReport(props: ExportNSTReportProps): Promise<void> {
    const format = props.format || 'xlsx';

    const response = await axiosInstance({
        url: apiUrls.stockDisposition.reportExport.url,
        method: apiUrls.stockDisposition.reportExport.method,
        data: { ...props, format },
        responseType: 'blob',
        headers: {
            Accept: NST_REPORT_EXPORT_MIME_TYPES[format],
        },
    });

    const contentDisposition = (response.headers?.['content-disposition'] as string) || '';
    const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    const fileName = filenameMatch?.[1]?.replace(/"/g, '') || `nst-report.${format}`;

    const contentType = (response.headers?.['content-type'] as string) || '';
    // Some failures come back as a 200 JSON body instead of a file; surface the message
    // rather than saving a broken workbook.
    if (contentType.includes('application/json')) {
        const text = await (response.data as Blob).text();
        let message = 'Failed to export the NST report';
        try {
            message = JSON.parse(text)?.message || message;
        } catch {
            // Keep the fallback message when the body is not valid JSON.
        }
        throw new Error(message);
    }

    const blob = new Blob([response.data as BlobPart], {
        type: contentType || NST_REPORT_EXPORT_MIME_TYPES[format],
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

export const useExportNSTReport = () => {
    return useMutation({
        mutationFn: exportNSTReport,
    });
};

// Shared invalidation helper used by the NST module

export const invalidateNST = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockDisposition)] });
};

// ------------------------- Pre-sale NST lookup -------------------------
// There is no separate "NST price resolve" endpoint. stockDisposition/list filtered to
// ACTIVE + APPROVED is the lookup, and a row is only sellable when its rule allows sale.

export const nstVersion = (d?: StockDisposition | null) => d?.stockDispositionVersion ?? d?.version ?? 1;

export const nstRule = (d?: StockDisposition | null): DispositionRule | undefined => d?.Rule || d?.rule;

// The backend rejects the sale unless every condition below holds, so the POS mirrors it
// instead of trusting the row. A row without its rule is NOT sellable: the spec only sells
// ACTIVE + APPROVED rows whose rule is DISCOUNT_SALE with allowSale.
export const isSellableNST = (d?: StockDisposition | null): d is StockDisposition => {
    if (!d) return false;
    if (d.status !== NST_SELLABLE_STATUS) return false;
    if (d.approvalStatus !== NST_SELLABLE_APPROVAL_STATUS) return false;
    if ((d.remainingQuantity ?? 0) <= 0) return false;
    const rule = nstRule(d);
    if (!rule) return false;
    if (rule.actionType !== 'DISCOUNT_SALE') return false;
    if (rule.allowSale !== true) return false;
    return true;
};

// Promotions must not be offered on an NST line when the rule disallows stacking.
export const nstAllowsPromotionStacking = (d?: StockDisposition | null): boolean => {
    return nstRule(d)?.allowPromotionStacking !== false;
};

// Parses an NST label scan such as "NST:<stockDispositionId>" into its id, or null when
// the barcode is just a product barcode / some other value.
export const parseNSTLabelScan = (barcode?: string | null): string | null => {
    if (!barcode) return null;
    const match = /^NST:\s*([A-Za-z0-9_-]+)$/i.exec(barcode.trim());
    return match ? match[1] : null;
};

// Returns the reason an allocation failed the sellability gate, so the POS can show the
// cashier why a scanned / picked record was not added instead of silently ignoring it.
export const nstNotSellableReason = (d?: StockDisposition | null): string => {
    if (!d) return 'The discounted stock record could not be found.';
    if (d.status && d.status !== NST_SELLABLE_STATUS)
        return `This discounted stock is ${String(d.status).replace(/_/g, ' ').toLowerCase()} and cannot be sold.`;
    if (d.approvalStatus && d.approvalStatus !== NST_SELLABLE_APPROVAL_STATUS)
        return `This discounted stock is not yet approved for sale.`;
    if ((d.remainingQuantity ?? 0) <= 0) return 'This discounted stock has no remaining quantity.';
    const rule = nstRule(d);
    if (!rule) return 'This discounted stock has no matching rule.';
    if (rule.actionType !== 'DISCOUNT_SALE') return 'The rule for this discounted stock does not allow a sale.';
    if (rule.allowSale !== true) return 'Sale is not allowed for this discounted stock rule.';
    return 'This discounted stock cannot be sold right now.';
};

// Kinds of rejection the sale endpoint may return for an NST line, so both sale screens
// can decide how to recover instead of swallowing the backend's message.
export type NSTDispositionSaleErrorKind = 'PRICE' | 'PROMOTION' | 'UNAVAILABLE' | 'CHANGED' | null;

export const matchDispositionSaleError = (error: unknown): NSTDispositionSaleErrorKind => {
    // @ts-ignore
    const message = String(error?.response?.data?.message || error?.message || '');
    if (!message) return null;
    const m = message.toLowerCase();
    const mentionsNst =
        m.includes('disposition') || m.includes('discounted stock') || m.includes('near-expiry') || m.includes('nst');
    if (!mentionsNst) return null;
    if (m.includes('promotion')) return 'PROMOTION';
    if (m.includes('price') && (m.includes('changed') || m.includes('confirm') || m.includes('again'))) return 'PRICE';
    if (
        m.includes('remaining') ||
        m.includes('quantity') ||
        m.includes('not available') ||
        m.includes('no longer') ||
        m.includes('removed') ||
        m.includes('sold out') ||
        m.includes('sold')
    )
        return 'UNAVAILABLE';
    if (m.includes('changed') || m.includes('updated') || m.includes('review')) return 'CHANGED';
    return 'CHANGED';
};

// Picks the batch with the most stock left so a POS line always has the deepest pool.
export const pickSellableNST = (rows?: StockDisposition[] | null): StockDisposition | undefined => {
    let best: StockDisposition | undefined;
    for (const d of rows || []) {
        if (!isSellableNST(d)) continue;
        if (!best || (d.remainingQuantity ?? 0) > (best.remainingQuantity ?? 0)) best = d;
    }
    return best;
};

// ------------------------- Pre-sale lookup payload -------------------------
// The NST check is mandatory once a product resolves, so it is a per-product request
// rather than one big page load. The caller must pass the explicit inventory owner scope.

export interface NSTProductLookupProps {
    companyStockDetailId: string;
    inventoryScope: 'COMPANY' | 'STORE';
    companyDebtorId: string | null;
}

// Called only when the cashier explicitly opens the NST choice for a product. A normal
// POS line never calls the NST API, so stockDisposition/list is not hit on every sale.
// Terminal-Id is not required for this endpoint; it is only needed for POS / till calls.
export async function getNSTOptionsForProduct(props: NSTProductLookupProps): Promise<StockDisposition[]> {
    const res = await getStockDispositions({
        companyStockDetailId: props.companyStockDetailId,
        inventoryScope: props.inventoryScope,
        companyDebtorId: props.companyDebtorId,
        status: NST_SELLABLE_STATUS,
        approvalStatus: NST_SELLABLE_APPROVAL_STATUS,
        limit: 50,
        offset: 0,
    });
    // Several batches can be sellable for one product, so the cashier picks; the list is
    // filtered to rows the backend would actually accept.
    return (res?.data?.rows || []).filter((d) => isSellableNST(d));
}

// Re-reads one allocation before checkout. The screen data can be stale, so the line is
// only submitted when the fresh row still allows the sale and has enough stock left.
export async function refreshNSTForCheckout(
    id: string,
    companyDebtorId?: string,
): Promise<StockDisposition | undefined> {
    const res = await getStockDispositionById({ id, ...(companyDebtorId ? { companyDebtorId } : {}) });
    return res?.data;
}

export interface NSTCheckoutCheck {
    ok: boolean;
    id: string;
    productId?: string;
    message?: string;
}

// Verifies every NST line in a basket against fresh data. Nothing is sent to the backend
// if any line is no longer sellable or no longer has enough remaining quantity.
export const verifyNSTLinesForCheckout = async (
    lines: { stockDispositionId?: string; companyDebtorId?: string; productId?: string; quantity: number }[],
): Promise<NSTCheckoutCheck[]> => {
    const checks: NSTCheckoutCheck[] = [];
    for (const line of lines) {
        if (!line.stockDispositionId) continue;
        let fresh: StockDisposition | undefined;
        try {
            fresh = await refreshNSTForCheckout(line.stockDispositionId, line.companyDebtorId);
        } catch {
            checks.push({
                ok: false,
                id: line.stockDispositionId,
                productId: line.productId,
                message: 'Could not verify the near-expiry allocation. Please select it again.',
            });
            continue;
        }
        if (!fresh || !isSellableNST(fresh)) {
            checks.push({
                ok: false,
                id: line.stockDispositionId,
                productId: line.productId,
                message: 'The selected near-expiry allocation is no longer available for sale. Please choose another.',
            });
            continue;
        }
        if ((fresh.remainingQuantity ?? 0) < line.quantity) {
            checks.push({
                ok: false,
                id: line.stockDispositionId,
                productId: line.productId,
                message: `Only ${fresh.remainingQuantity} left in the selected near-expiry batch, but ${line.quantity} are in the basket.`,
            });
            continue;
        }
        checks.push({ ok: true, id: line.stockDispositionId, productId: line.productId });
    }
    return checks;
};
