import { axiosInstance, queryKeys } from '@/api-queries';
import { StockDetails } from '@/api-queries/company/stock-details';
import { CreateStockPricingSchema, UpdateStockPricingSchema } from '@/schema/company/stock-details';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface FilterProps {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
}

export interface CompanyStockPricingTypeDetails {
    id: string;
    createdAt: string;
    updatedAt: string;
    timezone: string;
    status: string;
    domainId: string;
    companyId: string;
    name: string;
}

export interface CompanyStockPricingType {
    id: string;
    companyStockPricingTypeId: string;
    priceExclusive: number | null;
    priceInclusive: number | null;
    markupPercent: number | null;
    gpPercent: number | null;
    // markupPercentLatestCost: number;
    // gpPercentLatestCost: number;
    // markupPercentFutureCost: number;
    // gpPercentFutureCost: number;
    enable: boolean | number;
    type: CompanyStockPricingTypeDetails;
}

export interface CompanyStockPricing {
    id?: string;
    companyStockDetailId: string;
    pricingTypes: CompanyStockPricingType[];
    costTypes?: CompanyStockCostType | null;
    costLevels?: CompanyStockPricingCostLevel[];
    settings?: CompanyStockPricingSettings | null;
    taxRate?: {
        percent: number | null;
    } | null;
}

export interface CompanyStockCostType {
    id: string;
    companyId: string;
    companyStockDetailId: string;
    averageCost?: number | null;
    highestCost?: number | null;
    previousCost?: number | null;
    latestCost?: number | null;
    baseCost?: number | null;
    // managerCost: number;
    // futureCost: number;
    createdAt: string;
    updatedAt: string;
    status: string;
    timezone: string;
    domainId: string;
}

export interface CompanyStockPricingCostLevelType {
    id: string;
    companyId: string;
    name: string;
    enable: boolean | number;
    createdAt: string;
    updatedAt: string;
    status: string;
    timezone: string;
    domainId: string;
}

export interface CompanyStockPricingCostLevel {
    id: string;
    companyStockPricingCostLevelTypeId: string;
    value: number | null;
    type?: CompanyStockPricingCostLevelType | null;
}

export interface CompanyStockPricingSettings {
    id: string;
    companyId: string;
    companyStockDetailId: string;
    companyStockPricingTypeId: string;
    priceExclusive?: number;
    priceInclusive?: number;
    markupPercent?: number;
    gpPercent?: number;
    // markupPercentLatestCost?: number;
    // gpPercentLatestCost?: number;
    // markupPercentFutureCost?: number;
    // gpPercentFutureCost?: number;
    effectiveDate: string | null;
    isFuturePrice: boolean;
    appliedDate: string | null;
    enable: boolean;
    CompanyStockPricingType: CompanyStockPricingType;
    CompanyStockDetail: StockDetails;
    type: CompanyStockPricingType;
    recommendedGpPercent?: number | null;
    sellPriceVariantGroupId?: string | null;
    unitCost?: number | null;
    futureCost?: number | null;
    // SKU-level cost consistency limits; they override the category rule when set.
    minGpPercent?: number | null;
    maxGpPercent?: number | null;
    gpTolerancePercent?: number | null;
    blockingGpVariancePercent?: number | null;
    enforceGpPolicy?: boolean | null;
    overrideCategoryGpPolicy?: boolean | null;
}

export interface CompanyStockPricingDetails {
    pricingTypes: CompanyStockPricing[];
    recommendedGpPercent: number;
    sellPriceVariantGroupId: string | null;
    unitCost: number;
    futureCost: number;
    defaultApplyWhen: string;
    futureEffectiveDate: string | null;
    createdAt: string;
    updatedAt: string;
    status: string;
    timezone: string;
    domainId: string;
}

// export type CompanyStockPricingTypeDetails = CompanyStockPricingDetails['pricingTypes'][number];

export type CompanyStockPricingListResponse = {
    count: number;
    rows: CompanyStockPricing[];
};

export async function companyStockPricingList(companyStockDetailId: string): Promise<CompanyStockPricingListResponse> {
    return (
        await axiosInstance.post('/api/company/companyStockPricing/price', {
            companyStockDetailId,
            limit: 1,
            offset: 0,
        })
    ).data;
}

export const useCompanyStockPricingList = (companyStockDetailId: string) => {
    return useQuery({
        queryKey: [queryKeys.COMPANY.STOCK_PRICING, companyStockDetailId],
        queryFn: async () => await companyStockPricingList(companyStockDetailId),
        enabled: !!companyStockDetailId,
    });
};

export async function createCompanyStockPricing(data: CreateStockPricingSchema & { approvalToken?: string }) {
    // A supervisor-approved retry resends the identical payload with the token in the
    // X-Approval-Token header; the token is never part of the pricing payload itself.
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance.post(
            '/api/company/companyStockPricing/create',
            payload,
            approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : undefined,
        )
    ).data;
}

export const useCreateCompanyStockPricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyStockPricing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.COMPANY.STOCK_PRICING] });
        },
    });
};

export async function updateCompanyStockPricing(data: UpdateStockPricingSchema & { approvalToken?: string }) {
    // Retried after supervisor approval: same payload, token carried in the header.
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance.post(
            '/api/company/companyStockPricing/update',
            payload,
            approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : undefined,
        )
    ).data;
}

export const useUpdateCompanyStockPricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompanyStockPricing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.COMPANY.STOCK_PRICING] });
        },
    });
};
