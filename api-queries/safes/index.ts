import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- SAFES ---------------------------------------

// Safes Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface SafeDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    name: string;
    code: string;
    description: string;
    amount: number;
}

export interface GetSafeResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SafeDetails[];
    };
}

export async function getSafes(props: FilterProps): Promise<GetSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.list.url,
            method: apiUrls.safes.list.method,
            data: props,
        })
    ).data;
}

export const useGetSafes = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.safes), props],
        queryFn: async () => await getSafes(props),
    });
};

// Safe Get By Id
export interface GetSafeByIdResponse {
    success: boolean;
    data: SafeDetails;
}

export async function getSafeById(id: string): Promise<GetSafeByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.get.url,
            method: apiUrls.safes.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSafeById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.safes), id],
        queryFn: async () => await getSafeById(id),
    });
};

// Safe Create

export const safeBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    description: z.string().optional(),
});

export const safeCreateSchema = safeBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SafeCreateSchema = z.infer<typeof safeCreateSchema>;

export type MutateSafeResponse = {
    success: boolean;
};

export async function createSafe(data: SafeCreateSchema): Promise<MutateSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.create.url,
            method: apiUrls.safes.create.method,
            data,
        })
    ).data;
}

export const useCreateSafe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSafe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.safes)] });
        },
    });
};

// Safe Update

export const safeUpdateSchema = safeBaseSchema.extend({ id: z.string() });

export type SafeUpdateSchema = z.infer<typeof safeUpdateSchema>;

export async function updateSafe(data: SafeUpdateSchema): Promise<MutateSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.update.url,
            method: apiUrls.safes.update.method,
            data,
        })
    ).data;
}

export const useUpdateSafe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSafe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.safes)] });
        },
    });
};

// Safe Delete

export async function removeSafe(safeId: string): Promise<MutateSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.delete.url,
            method: apiUrls.safes.delete.method,
            data: { safeId },
        })
    ).data;
}

export const useRemoveSafe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSafe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.safes)] });
        },
    });
};

// Safe Cashout

export const safeCashoutSchema = z
    .object({
        vendorId: z.string().min(1, 'Vendor Info is required'),
        referenceNumber: z.string().min(1, 'Reference Number is required'),
        safeId: z.string().min(1, 'Safe is required'),
        amount: z.number().min(1, 'Amount is required'),
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SafeCashoutSchema = z.infer<typeof safeCashoutSchema>;

export type MutateSafeCashoutResponse = {
    success: boolean;
};

export async function safeCashout(data: SafeCashoutSchema): Promise<MutateSafeCashoutResponse> {
    return (
        await axiosInstance({
            url: apiUrls.safes.cashout.url,
            method: apiUrls.safes.cashout.method,
            data,
        })
    ).data;
}

export const useSafeCashout = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: safeCashout,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.safes)] });
        },
    });
};
