import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface CurrencyMasterDetails {
    id: string;
    code: string;
    name: string;
    symbol: string;
    decimalPlaces: number;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetCurrencyMasterListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CurrencyMasterDetails[];
    };
}

export interface GetCurrencyMasterResponse {
    success: boolean;
    message: string;
    data: CurrencyMasterDetails;
}

export interface MutateCurrencyMasterResponse {
    success: boolean;
    message: string;
    data?: CurrencyMasterDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type CurrencyMasterFilterProps = {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
};

export async function getCurrencies(
    props: CurrencyMasterFilterProps
): Promise<GetCurrencyMasterListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.currency.all.url,
            method: apiUrls.currency.all.method,
            data: props,
        })
    ).data;
}

export const useGetCurrencies = (props: CurrencyMasterFilterProps) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.currency), props],
        queryFn: () => getCurrencies(props),
    });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getCurrencyById(id: string): Promise<GetCurrencyMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.currency.get.url,
            method: apiUrls.currency.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCurrencyById = (id: string) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.currency), id],
        queryFn: () => getCurrencyById(id),
        enabled: !!id,
    });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const currencyMasterCreateSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    name: z.string().min(1, 'Name is required'),
    symbol: z.string().min(1, 'Symbol is required'),
    decimalPlaces: z.number().int().min(0),
    status: z.string().optional(),
});

export type CurrencyMasterCreateSchema = z.infer<typeof currencyMasterCreateSchema>;

export async function createCurrency(
    data: CurrencyMasterCreateSchema
): Promise<MutateCurrencyMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.currency.create.url,
            method: apiUrls.currency.create.method,
            data,
        })
    ).data;
}

export const useCreateCurrency = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCurrency,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.currency)],
            });
        },
    });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const currencyMasterUpdateSchema = z.object({
    id: z.string(),
    code: z.string().optional(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    decimalPlaces: z.number().int().min(0).optional(),
    status: z.string().optional(),
});

export type CurrencyMasterUpdateSchema = z.infer<typeof currencyMasterUpdateSchema>;

export async function updateCurrency(
    data: CurrencyMasterUpdateSchema
): Promise<MutateCurrencyMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.currency.update.url,
            method: apiUrls.currency.update.method,
            data,
        })
    ).data;
}

export const useUpdateCurrency = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateCurrency,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.currency)],
            });
        },
    });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteCurrency(id: string): Promise<MutateCurrencyMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.currency.delete.url,
            method: apiUrls.currency.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteCurrency = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCurrency,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.currency)],
            });
        },
    });
};
