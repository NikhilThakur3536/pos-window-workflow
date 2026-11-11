import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { SubCategoryDetails } from '../categories/sub-categories';

// --------------------------------------- STOCK RANGES ---------------------------------------

// Stock Range Listing

export type StockRangeFilter = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    subCategoryId?: string;
};

export interface StockRangeDetails {
    id: string;
    name: string;
    code: string;
    description?: string;
    subCategoryId: string;
    CompanyStockSubCategory?: SubCategoryDetails;
    timezone?: string;
    status: 'ACTIVE' | 'INACTIVE' | string;
    createdAt: string;
    updatedAt: string;
}

export interface GetStockRangeResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockRangeDetails[];
    };
}

export async function getStockRanges(props: StockRangeFilter): Promise<GetStockRangeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockRange.list.url,
            method: apiUrls.stockRange.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockRanges = (props: StockRangeFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockRange), props],
        queryFn: async () => await getStockRanges(props),
    });
};

// Stock Range Get By Id

export interface GetStockRangeByIdResponse {
    success: boolean;
    message: string;
    data: StockRangeDetails;
}

export async function getStockRangeById(id: string): Promise<GetStockRangeByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockRange.get.url,
            method: apiUrls.stockRange.get.method,
            data: { id },
        })
    ).data;
}

export const useGetStockRangeById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockRange), id],
        queryFn: async () => await getStockRangeById(id),
    });
};

// Stock Range Create

export const stockRangeBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Range Code is required'),
    description: z.string().optional(),
    subCategoryId: z.string().min(1, 'Sub Category is required'),
    timezone: z.string().min(1, 'Timezone is required'),
});

export type StockRangeCreateSchema = z.infer<typeof stockRangeBaseSchema>;

export type MutateStockRangeResponse = {
    success: boolean;
    message: string;
};

export async function createStockRange(data: StockRangeCreateSchema): Promise<MutateStockRangeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockRange.create.url,
            method: apiUrls.stockRange.create.method,
            data,
        })
    ).data;
}

export const useCreateStockRange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockRange,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockRange)] });
        },
    });
};

// Stock Range Update

export const stockRangeUpdateSchema = stockRangeBaseSchema.partial().extend({ id: z.string() });

export type StockRangeUpdateSchema = z.infer<typeof stockRangeUpdateSchema>;

export async function updateStockRange(data: StockRangeUpdateSchema): Promise<MutateStockRangeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockRange.update.url,
            method: apiUrls.stockRange.update.method,
            data,
        })
    ).data;
}

export const useUpdateStockRange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStockRange,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockRange)] });
        },
    });
};

// Stock Range Delete

export async function removeStockRange(id: string): Promise<MutateStockRangeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockRange.delete.url,
            method: apiUrls.stockRange.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveStockRange = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeStockRange,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockRange)] });
        },
    });
};