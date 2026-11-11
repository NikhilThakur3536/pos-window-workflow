import { axiosInstance, apiUrls } from '@/api-queries';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { z } from 'zod';

// --------------------------------------- Supplier Pricing ---------------------------------------

export const SUPPLIER_PRICING_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type SupplierPricingStatus = (typeof SUPPLIER_PRICING_STATUSES)[number];

export const SUPPLIER_DELIVERY_CYCLES = ['SINGLE_DELIVERY', 'MULTIPLE_DELIVERIES'] as const;
export type SupplierDeliveryCycle = (typeof SUPPLIER_DELIVERY_CYCLES)[number];

// One supplier pricing record per SKU + optional debtor/warehouse scope.
export interface SupplierPricingInput {
    companyCreditorId: string;
    companyStockDetailId: string;
    supplierItemCode?: string;
    currentCost: number;
    leadTimeDays?: number | null;
    deliveryCycle?: string | null;
    minimumOrderQuantity?: number | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    isPrimarySupplier?: boolean;
    status?: SupplierPricingStatus;
}

export const supplierPricingSchema = z.object({
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    companyStockDetailId: z.string().min(1, 'Product is required'),
    supplierItemCode: z.string().optional(),
    currentCost: z.coerce.number().min(0, 'Current cost must be 0 or greater'),
    leadTimeDays: z.coerce.number().nonnegative().optional().nullable(),
    deliveryCycle: z.string().optional().nullable(),
    minimumOrderQuantity: z.coerce.number().nonnegative().optional().nullable(),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().optional().nullable(),
    isPrimarySupplier: z.boolean().optional(),
    status: z.enum(SUPPLIER_PRICING_STATUSES).optional(),
});

export type SupplierPricingSchema = z.infer<typeof supplierPricingSchema>;

export interface SupplierPricingFilters {
    companyCreditorId?: string;
    companyStockDetailId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    status?: SupplierPricingStatus | string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface SupplierPricingRecord {
    id: string;
    companyId: string;
    companyCreditorId: string;
    companyStockDetailId: string;
    companyStockItemSupplierId?: string;
    supplierItemCode?: string;
    currentCost?: number;
    unitCost?: number;
    isPrimarySupplier?: boolean;
    primary?: boolean;
    status: SupplierPricingStatus;
    minimumOrderQuantity?: number | null;
    leadTimeDays?: number | null;
    deliveryCycle?: string | null;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    reorderLevel?: number | null;
    standardOrderQuantity?: number | null;
    maximumOrderQuantity?: number | null;
    safetyStockQuantity?: number | null;
    orderMultiple?: number | null;
    createdAt?: string;
    updatedAt?: string;
    CompanyCreditor?: Partial<CompanyCreditor>;
    CompanyStockDetail?: {
        id?: string;
        itemCode?: string;
        description?: string;
        barcode?: string;
    };
}

/** Resolve the recorded cost regardless of whether the API returns the new or legacy field name. */
export const supplierPricingCost = (record: Pick<SupplierPricingRecord, 'currentCost' | 'unitCost'>): number =>
    record.currentCost ?? record.unitCost ?? 0;

/** Resolve the recorded primary flag regardless of whether the API returns the new or legacy field name. */
export const supplierPricingIsPrimary = (record: Pick<SupplierPricingRecord, 'isPrimarySupplier' | 'primary'>): boolean =>
    !!record.isPrimarySupplier || !!record.primary;

export interface GetSupplierPricingListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SupplierPricingRecord[];
    };
}

export interface GetSupplierPricingResponse {
    success: boolean;
    message: string;
    data: SupplierPricingRecord;
}

export interface MutateSupplierPricingResponse {
    success: boolean;
    message: string;
    data: SupplierPricingRecord;
}

export async function getSupplierPricingList(
    props: SupplierPricingFilters,
): Promise<GetSupplierPricingListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.list.url,
            method: apiUrls.supplierPricing.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierPricingList = (props: SupplierPricingFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierPricing), 'list', props],
        queryFn: async () => await getSupplierPricingList(props),
    });
};

export async function getSupplierPricing(id: string): Promise<GetSupplierPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.get.url,
            method: apiUrls.supplierPricing.get.method,
            data: { id },
        })
    ).data;
}

export async function createSupplierPricing(
    data: SupplierPricingSchema,
): Promise<MutateSupplierPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.create.url,
            method: apiUrls.supplierPricing.create.method,
            data,
        })
    ).data;
}

export async function updateSupplierPricing(
    data: SupplierPricingSchema & { id: string },
): Promise<MutateSupplierPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.update.url,
            method: apiUrls.supplierPricing.update.method,
            data,
        })
    ).data;
}

export async function deleteSupplierPricing(
    id: string,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.delete.url,
            method: apiUrls.supplierPricing.delete.method,
            data: { id },
        })
    ).data;
}

export interface SetPrimarySupplierPricingManualInput {
    companyStockDetailId: string;
    mode: 'MANUAL';
    companyStockItemSupplierId: string;
    reason?: string;
}

export interface SetPrimarySupplierPricingAutoInput {
    companyStockDetailId: string;
    mode: 'AUTO';
    companyDebtorId?: string;
    companyWarehouseId?: string;
}

export type SetPrimarySupplierPricingInput = SetPrimarySupplierPricingManualInput | SetPrimarySupplierPricingAutoInput;

export async function setPrimarySupplierPricing(
    data: SetPrimarySupplierPricingInput,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.setPrimary.url,
            method: apiUrls.supplierPricing.setPrimary.method,
            data,
        })
    ).data;
}

export const useMutateSupplierPricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            action,
            data,
        }: {
            action: 'create' | 'update' | 'delete' | 'setPrimary';
            data:
                | SupplierPricingSchema
                | (SupplierPricingSchema & { id: string })
                | { id: string }
                | SetPrimarySupplierPricingInput;
        }) => {
            if (action === 'create') return createSupplierPricing(data as SupplierPricingSchema);
            if (action === 'update') return updateSupplierPricing(data as SupplierPricingSchema & { id: string });
            if (action === 'setPrimary') return setPrimarySupplierPricing(data as SetPrimarySupplierPricingInput);
            return deleteSupplierPricing((data as { id: string }).id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierPricing)] });
        },
    });
};

// --------------------------------------- Supplier Cost Comparison ---------------------------------------

export const SUPPLIER_COST_SOURCES = ['DEAL', 'CURRENT_COST', 'LAST_PURCHASE', 'NONE'] as const;
export type SupplierCostSource = (typeof SUPPLIER_COST_SOURCES)[number];

export interface SupplierCostComparisonFilters {
    companyStockDetailId?: string;
    companyCreditorId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface SupplierCostComparisonSupplier {
    companyStockItemSupplierId?: string;
    companyCreditorId: string;
    supplierName?: string;
    accountNumber?: string;
    supplierItemCode?: string;
    currentCost?: number;
    unitCost?: number;
    isPrimarySupplier?: boolean;
    primary?: boolean;
    recommended?: boolean;
    costSource?: SupplierCostSource;
    hasActiveDeal?: boolean;
    dealSaving?: number | null;
    dealSavingPercentage?: number | null;
    lastPurchasePrice?: number | null;
    leadTimeDays?: number | null;
    deliveryCycle?: string | null;
    minimumOrderQuantity?: number | null;
}

export interface SupplierCostComparisonItem {
    companyStockDetailId: string;
    itemCode?: string;
    description?: string;
    effectiveCost?: number | null;
    costSource?: SupplierCostSource | null;
    currentPrimarySupplier?: Partial<SupplierCostComparisonSupplier> | null;
    recommendedPrimarySupplier?: Partial<SupplierCostComparisonSupplier> | null;
    dealSaving?: number | null;
    dealSavingPercentage?: number | null;
    lastPurchasePrice?: number | null;
    lastPurchaseDate?: string | null;
    totalSuppliers?: number;
    suppliers?: SupplierCostComparisonSupplier[];
    // legacy aggregate fields (kept for backwards compatibility)
    lowestCost?: number;
    highestCost?: number;
    averageCost?: number;
    savings?: number;
}

export interface SupplierCostComparisonData {
    companyStockDetailId?: string;
    itemCode?: string;
    description?: string;
    effectiveCost?: number | null;
    costSource?: SupplierCostSource | null;
    currentPrimarySupplier?: Partial<SupplierCostComparisonSupplier> | null;
    recommendedPrimarySupplier?: Partial<SupplierCostComparisonSupplier> | null;
    dealSaving?: number | null;
    dealSavingPercentage?: number | null;
    lastPurchasePrice?: number | null;
    lastPurchaseDate?: string | null;
    totalSuppliers?: number;
    suppliers?: SupplierCostComparisonSupplier[];
    // legacy paginated shape (kept for backwards compatibility)
    count?: number;
    rows?: SupplierCostComparisonItem[];
    lowestCost?: number;
    highestCost?: number;
    averageCost?: number;
    savings?: number;
}

export interface SupplierCostComparisonResponse {
    success: boolean;
    message: string;
    data: SupplierCostComparisonData;
}

export async function getSupplierCostComparison(
    props: SupplierCostComparisonFilters,
): Promise<SupplierCostComparisonResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierPricing.compare.url,
            method: apiUrls.supplierPricing.compare.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierCostComparison = (props: SupplierCostComparisonFilters | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierPricing), 'compare', props],
        enabled: !!props?.companyStockDetailId,
        queryFn: async () => await getSupplierCostComparison(props as SupplierCostComparisonFilters),
    });
};

// --------------------------------------- Replenishment Recommendations ---------------------------------------

export interface ReplenishmentRecommendFilters {
    companyStockDetailIds: string[];
    companyDebtorId?: string;
    companyWarehouseId?: string;
    categoryId?: string;
    asOfDate?: string;
    includeNonReorder?: boolean;
    limit?: number;
    offset?: number;
}

export const replenishmentRecommendSchema = z.object({
    companyStockDetailIds: z.array(z.string()).min(1, 'At least one product is required'),
    companyDebtorId: z.string().optional(),
    companyWarehouseId: z.string().optional(),
    asOfDate: z.string().optional(),
    includeNonReorder: z.boolean().optional(),
    limit: z.number().optional(),
    offset: z.number().optional(),
});

export type ReplenishmentRecommendSchema = z.infer<typeof replenishmentRecommendSchema>;

export interface ReplenishmentRecommendItem {
    companyCreditorId?: string;
    companyStockDetailId: string;
    itemCode?: string;
    description?: string;
    stockOnHand: number;
    stockOnOrder?: number;
    stockPosition?: number;
    reorderLevel?: number | null;
    reorderTriggered?: boolean;
    safetyStockQuantity?: number | null;
    rawRecommendedQuantity?: number;
    standardOrderQuantity?: number | null;
    minimumOrderQuantity?: number | null;
    orderMultiple?: number | null;
    maximumOrderQuantity?: number | null;
    recommendedQuantity?: number;
    agreedUnitCost?: number;
    supplier?: {
        companyCreditorId?: string;
        name?: string;
        accountNumber?: string;
    };
    currency?: string;
}

export interface GetReplenishmentRecommendResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: ReplenishmentRecommendItem[];
        preparedAt?: string;
        companyDebtorId?: string;
        companyWarehouseId?: string;
    };
}

export async function getReplenishmentRecommendations(
    props: ReplenishmentRecommendSchema,
): Promise<GetReplenishmentRecommendResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.recommend.url,
            method: apiUrls.replenishment.recommend.method,
            data: props,
        })
    ).data;
}

export const useGetReplenishmentRecommendations = (props: ReplenishmentRecommendSchema | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishment), 'recommend', props],
        enabled: !!props,
        queryFn: async () => await getReplenishmentRecommendations(props as ReplenishmentRecommendSchema),
    });
};

export interface ReplenishmentSaveInput {
    clientDocumentId: string;
    item: ReplenishmentRecommendItem[];
}

export async function saveReplenishmentRecommendations(
    data: ReplenishmentSaveInput,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.save.url,
            method: apiUrls.replenishment.save.method,
            data,
        })
    ).data;
}

export const useSaveReplenishmentRecommendations = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ReplenishmentSaveInput) => saveReplenishmentRecommendations(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishment)] });
        },
    });
};

export interface ReplenishmentApproveInput {
    clientDocumentId: string;
    itemsToApprove: Array<{
        companyStockDetailId: string;
        companyCreditorId?: string;
        isApproved: boolean;
        approvedQuantity: number;
    }>;
}

export async function approveReplenishmentRecommendations(
    data: ReplenishmentApproveInput,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.approve.url,
            method: apiUrls.replenishment.approve.method,
            data,
        })
    ).data;
}

export const useApproveReplenishmentRecommendations = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: ReplenishmentApproveInput) => approveReplenishmentRecommendations(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishment)] });
        },
    });
};

// Conversion payload built from approved recommendations -> purchase order lines

export interface SupplierGroupedConversionItem {
    companyCreditorId: string;
    companyStockDetailId: string;
    orderedQuantity: number;
    agreedUnitCost: number;
    replenishmentRecommendationItemId?: string;
}

export interface ReplenishmentConversionPayloadInput {
    clientDocumentId: string;
}

export interface ReplenishmentConversionPayloadResponse {
    success: boolean;
    message: string;
    data?: {
        suppliers?: SupplierGroupedConversionItem[];
        purchaseOrders?: Array<{
            companyCreditorId: string;
            supplierName?: string;
            items: SupplierGroupedConversionItem[];
        }>;
    };
}

export async function getReplenishmentConversionPayload(
    data: ReplenishmentConversionPayloadInput,
): Promise<ReplenishmentConversionPayloadResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishment.conversionPayload.url,
            method: apiUrls.replenishment.conversionPayload.method,
            data,
        })
    ).data;
}

export const useGetReplenishmentConversionPayload = () => {
    return useMutation({
        mutationFn: (data: ReplenishmentConversionPayloadInput) => getReplenishmentConversionPayload(data),
    });
};
