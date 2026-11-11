import { apiUrls, axiosInstance, handleError, queryKeys } from '@/api-queries';
import { CreateCompanyPricingLevelSchema } from '@/schema/company/pricing-level';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

type ListResponse<T> = {
    message: string;
    data: {
        count: number;
        rows: T[];
    };
};

type DataResponse<T> = {
    message: string;
    data: {
        rows: T;
        count: number;
    };
    success: boolean;
};

export interface StockLevel {
    id: string;
    companyId: string;
    name: string;
    enable: number;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    timezone: string;
    domainId: string;
}

export interface StockLevelQuery {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
}

export const companyStockPricingLevelList = async (data: StockLevelQuery): Promise<DataResponse<StockLevel[]>> => {
    return (
        await axiosInstance({
            url: apiUrls.masters.costLevels.list.url,
            method: apiUrls.masters.costLevels.list.method,
            data,
        })
    ).data;
};

export const useCompanyStockPricingLevelList = (payload: StockLevelQuery) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.costLevels), payload],
        queryFn: async () => await companyStockPricingLevelList(payload),
    });
};

export type CreateCompanyPricingLevelResponse = DataResponse<StockLevel>;

export const createCompanyStockPricingLevel = async (
    payload: CreateCompanyPricingLevelSchema,
): Promise<CreateCompanyPricingLevelResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.masters.costLevels.create.url,
            method: apiUrls.masters.costLevels.create.method,
            data: payload,
        })
    ).data;
};

export const useCreateCompanyStockPricingLevel = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyStockPricingLevel,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.costLevels)] });
        },
        onError: (error) => {
            handleError('Stock Pricing Level Creation Failed', error);
        },
    });
};
