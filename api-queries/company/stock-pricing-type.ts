import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreateCompanyPricingTypeSchema, UpdateCompanyPricingTypeSchema } from '@/schema/company/pricing-type';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- STOCK PRICING TYPES ---------------------------------------

// Stock Pricing Types Listing
export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CompanyStockPricingType {
    id: string;
    name: string;
    status: string;
    code: string;
    sequenceNumber: string;
    createdAt?: string;
    updatedAt?: string;
    companyId: string;
    domainId: string;
    timezone: string;
}

export interface CompanyStockPricingTypeListResponse {
    success: boolean;
    data: {
        rows: CompanyStockPricingType[];
        count: number;
    };
}

export async function companyStockPricingTypeList(props: FilterProps): Promise<CompanyStockPricingTypeListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.pricingTypes.list.url,
            method: apiUrls.masters.pricingTypes.list.method,
            data: props,
        })
    ).data;
}

export function useCompanyStockPricingTypeList(props: FilterProps) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.pricingTypes), props],
        queryFn: async () => await companyStockPricingTypeList(props),
    });
}

// Stock Pricing Create

export interface CreateCompanyPricingResponse {
    success: boolean;
    message: string;
    data: CompanyStockPricingType;
}

export async function createCompanyStockPricingType(
    data: CreateCompanyPricingTypeSchema,
): Promise<CreateCompanyPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.pricingTypes.create.url,
            method: apiUrls.masters.pricingTypes.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyStockPricingType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyStockPricingType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.pricingTypes)] });
        },
    });
};

// Stock Pricing Update

export async function updateCompanyStockPricingType(
    data: UpdateCompanyPricingTypeSchema,
): Promise<CreateCompanyPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.pricingTypes.update.url,
            method: apiUrls.masters.pricingTypes.update.method,
            data,
        })
    ).data;
}

export const useUpdateCompanyStockPricingType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompanyStockPricingType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.pricingTypes)] });
        },
    });
};

// Stock Pricing Delete

export interface DeleteCompanyPricingResponse {
    success: boolean;
    message: string;
}

export async function removeCompanyStockPricingType(id: string): Promise<DeleteCompanyPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.pricingTypes.delete.url(id),
            method: apiUrls.masters.pricingTypes.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyStockPricingType = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCompanyStockPricingType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.pricingTypes)] });
        },
    });
};
