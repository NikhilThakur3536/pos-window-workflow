import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- TAX AGENCIES ---------------------------------------

// Tax Agencies Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface TaxAgencyDetails {
    id: string;
    companyId: string;
    domainId: string;
    description: string;
    code: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetTaxAgencyResponse {
    success: boolean;
    message: string;
    count: number;
    data: TaxAgencyDetails[];
}

export async function getTaxAgencies(props: FilterProps): Promise<GetTaxAgencyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxAgencies.list.url,
            method: apiUrls.taxAgencies.list.method,
            params: props,
        })
    ).data;
}

export const useGetTaxAgencies = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxAgencies), props],
        queryFn: async () => await getTaxAgencies(props),
    });
};

// Tax Rate Get By Id
export interface GetTaxAgencyByIdResponse {
    success: boolean;
    data: TaxAgencyDetails;
}

export async function getTaxAgencyById(id: string): Promise<GetTaxAgencyByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxAgencies.get.url(id),
            method: apiUrls.taxAgencies.get.method,
        })
    ).data;
}

export const useGetTaxAgencyById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxAgencies), id],
        queryFn: async () => await getTaxAgencyById(id),
    });
};

// Tax Agencies Create

export const TaxAgencyBaseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    code: z.string().min(1, 'Code is required'),
});

export const taxAgencyCreateSchema = TaxAgencyBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type TaxAgencyCreateSchema = z.infer<typeof taxAgencyCreateSchema>;

export type MutateTaxAgencyResponse = {
    success: boolean;
};

export async function createTaxAgency(data: TaxAgencyCreateSchema): Promise<MutateTaxAgencyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxAgencies.create.url,
            method: apiUrls.taxAgencies.create.method,
            data,
        })
    ).data;
}

export const useCreateTaxAgency = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTaxAgency,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxAgencies)] });
        },
    });
};

// Tax Rate Update

export const taxAgencyUpdateSchema = TaxAgencyBaseSchema.extend({ id: z.string() });

export type TaxAgencyUpdateSchema = z.infer<typeof taxAgencyUpdateSchema>;

export async function updateTaxAgency(data: TaxAgencyUpdateSchema): Promise<MutateTaxAgencyResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.taxAgencies.update.url(id),
            method: apiUrls.taxAgencies.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateTaxAgency = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaxAgency,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxAgencies)] });
        },
    });
};

// Tax Rate Delete

export async function removeTaxAgency(id: string): Promise<MutateTaxAgencyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxAgencies.delete.url(id),
            method: apiUrls.taxAgencies.delete.method,
        })
    ).data;
}

export const useRemoveTaxAgency = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTaxAgency,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxAgencies)] });
        },
    });
};
