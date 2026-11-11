import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- TAX CONTROL ACCOUNTS ---------------------------------------

// Tax Control Accounts Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface TaxControlAccountDetails {
    id: string;
    companyId: string;
    domainId: string;
    description: string;
    code: string;
    amount: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetTaxControlAccountResponse {
    success: boolean;
    message: string;
    count: number;
    data: TaxControlAccountDetails[];
}

export async function getTaxControlAccounts(props: FilterProps): Promise<GetTaxControlAccountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxControlAccounts.list.url,
            method: apiUrls.taxControlAccounts.list.method,
            params: props,
        })
    ).data;
}

export const useGetTaxControlAccounts = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxControlAccounts), props],
        queryFn: async () => await getTaxControlAccounts(props),
    });
};

// Tax Rate Get By Id
export interface GetTaxControlAccountByIdResponse {
    success: boolean;
    data: TaxControlAccountDetails;
}

export async function getTaxControlAccountById(id: string): Promise<GetTaxControlAccountByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxControlAccounts.get.url(id),
            method: apiUrls.taxControlAccounts.get.method,
        })
    ).data;
}

export const useGetTaxControlAccountById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxControlAccounts), id],
        queryFn: async () => await getTaxControlAccountById(id),
    });
};

// Tax Control Accounts Create

export const TaxControlAccountBaseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    code: z.string().min(1, 'Code is required'),
    amount: z.number().min(0, 'Amount is required'),
});

export const taxControlAccountCreateSchema = TaxControlAccountBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type TaxControlAccountCreateSchema = z.infer<typeof taxControlAccountCreateSchema>;

export type MutateTaxControlAccountResponse = {
    success: boolean;
};

export async function createTaxControlAccount(
    data: TaxControlAccountCreateSchema,
): Promise<MutateTaxControlAccountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxControlAccounts.create.url,
            method: apiUrls.taxControlAccounts.create.method,
            data,
        })
    ).data;
}

export const useCreateTaxControlAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTaxControlAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxControlAccounts)] });
        },
    });
};

// Tax Rate Update

export const taxControlAccountUpdateSchema = TaxControlAccountBaseSchema.extend({ id: z.string() });

export type TaxControlAccountUpdateSchema = z.infer<typeof taxControlAccountUpdateSchema>;

export async function updateTaxControlAccount(
    data: TaxControlAccountUpdateSchema,
): Promise<MutateTaxControlAccountResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.taxControlAccounts.update.url(id),
            method: apiUrls.taxControlAccounts.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateTaxControlAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaxControlAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxControlAccounts)] });
        },
    });
};

// Tax Rate Delete

export async function removeTaxControlAccount(id: string): Promise<MutateTaxControlAccountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxControlAccounts.delete.url(id),
            method: apiUrls.taxControlAccounts.delete.method,
        })
    ).data;
}

export const useRemoveTaxControlAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTaxControlAccount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxControlAccounts)] });
        },
    });
};
