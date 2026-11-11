import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- TAX REPORT POSITIONS ---------------------------------------

// Tax Reports Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface TaxReportPositionDetails {
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

export interface GetTaxReportPositionResponse {
    success: boolean;
    message: string;
    count: number;
    data: TaxReportPositionDetails[];
}

export async function getTaxReportPositions(props: FilterProps): Promise<GetTaxReportPositionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxReportPositions.list.url,
            method: apiUrls.taxReportPositions.list.method,
            params: props,
        })
    ).data;
}

export const useGetTaxReportPositions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxReportPositions), props],
        queryFn: async () => await getTaxReportPositions(props),
    });
};

// Tax Rate Get By Id
export interface GetTaxReportPositionByIdResponse {
    success: boolean;
    data: TaxReportPositionDetails;
}

export async function getTaxReportPositionById(id: string): Promise<GetTaxReportPositionByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxReportPositions.get.url(id),
            method: apiUrls.taxReportPositions.get.method,
        })
    ).data;
}

export const useGetTaxReportPositionById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxReportPositions), id],
        queryFn: async () => await getTaxReportPositionById(id),
    });
};

// Tax Reports Create

export const TaxReportPositionBaseSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    code: z.string().min(1, 'Code is required'),
});

export const taxReportPositionCreateSchema = TaxReportPositionBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type TaxReportPositionCreateSchema = z.infer<typeof taxReportPositionCreateSchema>;

export type MutateTaxReportPositionResponse = {
    success: boolean;
};

export async function createTaxReportPosition(
    data: TaxReportPositionCreateSchema,
): Promise<MutateTaxReportPositionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxReportPositions.create.url,
            method: apiUrls.taxReportPositions.create.method,
            data,
        })
    ).data;
}

export const useCreateTaxReportPosition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTaxReportPosition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxReportPositions)] });
        },
    });
};

// Tax Rate Update

export const taxReportPositionUpdateSchema = TaxReportPositionBaseSchema.extend({ id: z.string() });

export type TaxReportPositionUpdateSchema = z.infer<typeof taxReportPositionUpdateSchema>;

export async function updateTaxReportPosition(
    data: TaxReportPositionUpdateSchema,
): Promise<MutateTaxReportPositionResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.taxReportPositions.update.url(id),
            method: apiUrls.taxReportPositions.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateTaxReportPosition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaxReportPosition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxReportPositions)] });
        },
    });
};

// Tax Rate Delete

export async function removeTaxReportPosition(id: string): Promise<MutateTaxReportPositionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxReportPositions.delete.url(id),
            method: apiUrls.taxReportPositions.delete.method,
        })
    ).data;
}

export const useRemoveTaxReportPosition = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTaxReportPosition,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxReportPositions)] });
        },
    });
};
