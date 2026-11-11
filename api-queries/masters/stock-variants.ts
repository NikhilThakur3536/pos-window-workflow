import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import moment from 'moment-timezone';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- STOCK VARIANTS ---------------------------------------

// Stock Variant Listing

export type StockVariantFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    searchKey?: string;
    status?: string;
};

export interface StockVariantDetails {
    id: string;
    identifier: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE' | string;
    companyId: string;
    domainId: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetStockVariantResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockVariantDetails[];
    };
}

export async function getStockVariants(props: StockVariantFilterProps): Promise<GetStockVariantResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockVariants.list.url,
            method: apiUrls.stockVariants.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockVariants = (props: StockVariantFilterProps, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockVariants), props],
        queryFn: async () => await getStockVariants(props),
        enabled,
    });
};

// Stock Variant Get By Id

export interface GetStockVariantByIdResponse {
    success: boolean;
    message: string;
    data: StockVariantDetails;
}

export async function getStockVariantById(variantId: string): Promise<GetStockVariantByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockVariants.get.url,
            method: apiUrls.stockVariants.get.method,
            data: { variantId },
        })
    ).data;
}

// Stock Variant Create

const validTimezones = moment.tz.names();

export const stockVariantBaseSchema = z.object({
    identifier: z.string().min(1, 'Identifier is required'),
    description: z.string().min(1, 'Description is required'),
});

export const stockVariantCreateSchema = stockVariantBaseSchema.extend({
    timezone: z.string(),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type StockVariantCreateSchema = z.infer<typeof stockVariantCreateSchema>;

export const stockVariantUpdateSchema = stockVariantBaseSchema.partial().extend({
    variantId: z.string().min(1, 'Variant id is required'),
});

export type StockVariantUpdateSchema = z.infer<typeof stockVariantUpdateSchema>;

export type StockVariantFormValues = StockVariantCreateSchema & { variantId?: string };

export type MutateStockVariantResponse = {
    success: boolean;
    message: string;
};

export async function createStockVariant(data: StockVariantCreateSchema): Promise<MutateStockVariantResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockVariants.create.url,
            method: apiUrls.stockVariants.create.method,
            data,
        })
    ).data;
}

export const useCreateStockVariant = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockVariants)] });
        },
    });
};

// Stock Variant Update

export async function updateStockVariant(data: StockVariantUpdateSchema): Promise<MutateStockVariantResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockVariants.update.url,
            method: apiUrls.stockVariants.update.method,
            data,
        })
    ).data;
}

export const useUpdateStockVariant = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStockVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockVariants)] });
        },
    });
};

// Stock Variant Delete

export async function removeStockVariant(variantId: string): Promise<MutateStockVariantResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockVariants.delete.url,
            method: apiUrls.stockVariants.delete.method,
            data: { variantId },
        })
    ).data;
}

export const useRemoveStockVariant = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeStockVariant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockVariants)] });
        },
    });
};