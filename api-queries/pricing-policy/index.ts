import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '@/api-queries/company/stock-details';

// --------------------------------------- PRICING POLICIES (pricingMatrix) ---------------------------------------

export type PricingPolicyFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface PricingPolicyDetails {
    id: string;
    name: string;
    companyId: string;
    domainId: string;
    transactionType: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    companyStockDetailId?: string | null;
    companyStockCategoryId?: string | null;
    groupId?: string | null;
    userId?: string | null;
    maxDiscountPercent: number;
    maxDiscountAmount: number | null;
    targetGpPercent?: number | null;
    minGpPercent?: number | null;
    maxGpPercent?: number | null;
    gpTolerancePercent?: number | null;
    blockingGpVariancePercent?: number | null;
    enforceGpPolicy?: boolean | null;
    isCompanyGpDefault?: boolean;
    allowPriceOverride: boolean;
    requireApprovalAboveLimit: boolean;
    priority: number;
    status: 'ACTIVE' | 'INACTIVE';
    timezone: string;
    createdAt: string;
    updatedAt: string;
    CompanyStockDetail?: StockDetails;
}

export interface GetPricingPolicyResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: PricingPolicyDetails[];
    };
}

export async function getPricingPolicies(props: PricingPolicyFilterProps): Promise<GetPricingPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingMatrix.all.url,
            method: apiUrls.pricingMatrix.all.method,
            data: props,
        })
    ).data;
}

export const useGetPricingPolicies = (props: PricingPolicyFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.pricingMatrix), props],
        queryFn: async () => await getPricingPolicies(props),
    });
};

// Get single policy by id (/get)
export interface GetSinglePricingPolicyResponse {
    success: boolean;
    message: string;
    data: PricingPolicyDetails | PricingPolicyDetails[] | null;
}

export async function getPricingPolicyById(id: string): Promise<GetSinglePricingPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingMatrix.get.url,
            method: apiUrls.pricingMatrix.get.method,
            data: { id },
        })
    ).data;
}

export const useGetPricingPolicyById = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.pricingMatrix), id],
        queryFn: async () => await getPricingPolicyById(id as string),
        enabled: !!id,
    });
};

// Save / Create / Update
export const PRICING_POLICY_TRANSACTION_TYPES = ['ALL', 'POS', 'ACCOUNT_SALE'] as const;

export type PricingPolicyTransactionType = (typeof PRICING_POLICY_TRANSACTION_TYPES)[number];

export const pricingPolicySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    transactionType: z
        .string()
        .min(1, 'Transaction type is required')
        .refine((val) => (PRICING_POLICY_TRANSACTION_TYPES as readonly string[]).includes(val), {
            message: 'Transaction type must be ALL, POS or ACCOUNT_SALE',
        }),
    scope: z.enum(['COMPANY', 'GROUP', 'USER', 'SKU', 'CATEGORY']).optional(),
    companyDebtorId: z.string().optional(),
    companyWarehouseId: z.string().optional(),
    companyStockDetailId: z.string().optional(),
    companyStockCategoryId: z.string().optional(),
    groupId: z.string().optional(),
    userId: z.string().optional(),
    maxDiscountPercent: z.number().min(0).max(100, 'Max discount percent must be between 0 and 100'),
    maxDiscountAmount: z.number().min(0).nullable(),
    allowPriceOverride: z.boolean(),
    requireApprovalAboveLimit: z.boolean(),
    priority: z.number().min(0, 'Priority must be at least 0'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    // Cost consistency limits applied to prices governed by this policy.
    targetGpPercent: z.number().nullable().optional(),
    minGpPercent: z.number().nullable().optional(),
    maxGpPercent: z.number().nullable().optional(),
    gpTolerancePercent: z.number().nullable().optional(),
    blockingGpVariancePercent: z.number().nullable().optional(),
    enforceGpPolicy: z.boolean().nullable().optional(),
    isCompanyGpDefault: z.boolean().nullable().optional(),
});

export type PricingPolicySchema = z.infer<typeof pricingPolicySchema>;

export type PricingPolicySavePayload = Omit<
    PricingPolicySchema,
    'companyStockDetailId' | 'companyStockCategoryId' | 'groupId' | 'userId' | 'companyDebtorId' | 'companyWarehouseId'
> & {
    pricingMatrixId?: string;
    id?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    companyStockDetailId?: string | null;
    companyStockCategoryId?: string | null;
    groupId?: string | null;
    userId?: string | null;
};

export type MutatePricingPolicyResponse = {
    success: boolean;
    message?: string;
};

export async function savePricingPolicy(data: PricingPolicySavePayload): Promise<MutatePricingPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingMatrix.save.url,
            method: apiUrls.pricingMatrix.save.method,
            data,
        })
    ).data;
}

export const useSavePricingPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: savePricingPolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.pricingMatrix)] });
        },
    });
};

// Delete
export async function deletePricingPolicy(id: string): Promise<MutatePricingPolicyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingMatrix.delete.url,
            method: apiUrls.pricingMatrix.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeletePricingPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePricingPolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.pricingMatrix)] });
        },
    });
};

// Resolve
export interface PricingMatrixResolveItem {
    companyStockDetailId: string;
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    quantity: number;
    freeQuantity?: number;
    isFree?: boolean;
    unitPrice?: number;
    discount?: number;
    manualDiscountAmount?: number;
    discountPercentage?: number;
    isDiscountOverride?: boolean;
    isPriceOverride?: boolean;
    originalUnitPrice?: number;
    salesOrderItemId?: string;
    description?: string;
}

export interface PricingMatrixResolvePayload {
    /** 'ALL' | 'POS' | 'ACCOUNT_SALE' */
    transactionType: string;
    companyDebtorId?: string;
    buyer?: { companyDebtorId?: string };
    companyWarehouseId?: string | null;
    userId?: string;
    groupId?: string;
    discountAmount?: number;
    items: PricingMatrixResolveItem[];
    promotionId?: string;
    promotionApplications?: any[];
    freeItemOffers?: any[];
    linkedSalesOrderId?: string;
    salesOrderId?: string;
}

export interface PricingMatrixResolvedRule {
    ruleId?: string;
    id?: string;
    name?: string;
    transactionType?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    companyStockDetailId?: string | null;
    companyStockCategoryId?: string | null;
    groupId?: string | null;
    userId?: string | null;
    maxDiscountPercent?: number;
    maxDiscountAmount?: number;
    allowPriceOverride?: boolean;
    requireApprovalAboveLimit?: boolean;
    priority?: number;
    status?: string;
    source?: string;
    [key: string]: unknown;
}

export interface PricingMatrixResolveItemResult {
    companyStockDetailId: string;
    companyStockPricingId?: string;
    pricingLevelId?: string;
    skuCode?: string;
    description?: string;
    allowed?: boolean;
    allowedPrice?: number;
    allowedDiscountPercent?: number;
    allowedDiscountAmount?: number;
    appliedPrice?: number;
    appliedDiscount?: number;
    appliedDiscountPercent?: number;
    baseUnitPrice?: number;
    requestedUnitPrice?: number;
    discountAmount?: number;
    discountPercent?: number;
    overrideRequired?: boolean;
    requiredActions?: string[];
    rule?: PricingMatrixResolvedRule | null;
    [key: string]: unknown;
}

export interface PricingMatrixResolveResponse {
    success?: boolean;
    message?: string;
    allowed?: boolean;
    allowedPrice?: number;
    allowedDiscount?: number;
    allowedDiscountPercent?: number;
    requiredActions?: string[];
    rule?: PricingMatrixResolvedRule | null;
    rules?: PricingMatrixResolvedRule[];
    policy?: PricingPolicyDetails | null;
    items?: PricingMatrixResolveItemResult[];
    [key: string]: unknown;
}

export async function resolvePricingMatrix(
    data: PricingMatrixResolvePayload,
): Promise<PricingMatrixResolveResponse> {
    const res = (
        await axiosInstance({
            url: apiUrls.pricingMatrix.resolve.url,
            method: apiUrls.pricingMatrix.resolve.method,
            data,
        })
    ).data;
    // The endpoint wraps the result in a `data` envelope ({ success, data: {...} });
    // unwrap it so callers can read requiredActions / items / rule directly.
    return res?.data && typeof res.data === 'object' ? res.data : res;
}

export const useResolvePricingMatrix = () => {
    return useMutation({
        mutationFn: resolvePricingMatrix,
    });
};
