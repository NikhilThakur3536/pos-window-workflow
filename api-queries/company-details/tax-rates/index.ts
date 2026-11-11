import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { TaxAgencyDetails } from './tax-agencies';

const validTimezones = moment.tz.names();

// --------------------------------------- TAX RATES ---------------------------------------

// Tax Rates Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface TaxRateDetails {
    id: string;
    companyId: string;
    type: string;
    internalTaxId: number;
    taxRateId: number;
    description: string;
    name:string;
    taxOnly: boolean;
    positionTaxReportOutput: string;
    positionTaxReportInput: string;
    startDate: string;
    endDate: string;
    priorityRate: boolean;
    default: boolean;
    userSelectable: boolean;
    taxRatePercent: number;
    taxInputControlAccountId: string;
    taxOutputControlAccountId: string;
    taxAgencyId: string;
    taxAgency: TaxAgencyDetails;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetTaxRateResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: TaxRateDetails[];
    };
}

export async function getTaxRates(props: FilterProps): Promise<GetTaxRateResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'taxRates', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.taxRates.list.url,
                method: apiUrls.taxRates.list.method,
                params: props,
            })
        ).data;
    }
}

export const useGetTaxRates = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxRates), props],
        queryFn: async () => await getTaxRates(props),
    });
};

// Tax Rate Get By Id
export interface GetTaxRateByIdResponse {
    success: boolean;
    data: TaxRateDetails;
}

export async function getTaxRateById(id: string): Promise<GetTaxRateByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxRates.get.url(id),
            method: apiUrls.taxRates.get.method,
        })
    ).data;
}

export const useGetTaxRateById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.taxRates), id],
        queryFn: async () => await getTaxRateById(id),
    });
};

// Tax Rate Create

export const taxRateBaseSchema = z.object({
    type: z.enum(['TAX-RATE', 'TAX-RATE-VARIATION']),
    internalTaxId: z.number().min(1, 'Internal Tax ID is required'),
    taxRateId: z.number().min(1, 'Tax Rate ID is required'),
    description: z.string().min(1, 'Description is required'),
    positionTaxReportOutput: z.string().optional(),
    positionTaxReportInput: z.string().optional(),
    taxInputControlAccountId: z.string().optional(),
    taxOutputControlAccountId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    taxOnly: z.boolean(),
    priorityRate: z.boolean(),
    default: z.boolean(),
    userSelectable: z.boolean(),
    taxRatePercent: z.number().min(0, 'Percentage is required'),
    taxAgencyId: z.string().optional(),
});

export const taxRateCreateSchema = taxRateBaseSchema
    .extend({
        timezone: z.string(),
        companyId: z.string().min(1, 'Company id is required'),
        domainId: z.string().min(1, 'Domain id is required'),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type TaxRateCreateSchema = z.infer<typeof taxRateCreateSchema>;

export type MutateTaxRateResponse = {
    success: boolean;
};

export async function createTaxRate(data: TaxRateCreateSchema): Promise<MutateTaxRateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxRates.create.url,
            method: apiUrls.taxRates.create.method,
            data,
        })
    ).data;
}

export const useCreateTaxRate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTaxRate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxRates)] });
        },
    });
};

// Tax Rate Update

export const taxRateUpdateSchema = taxRateBaseSchema.extend({ id: z.string() });

export type TaxRateUpdateSchema = z.infer<typeof taxRateUpdateSchema>;

export async function updateTaxRate(data: TaxRateUpdateSchema): Promise<MutateTaxRateResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.taxRates.update.url(id),
            method: apiUrls.taxRates.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateTaxRate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTaxRate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxRates)] });
        },
    });
};

// Tax Rate Delete

export async function removeTaxRate(id: string): Promise<MutateTaxRateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.taxRates.delete.url(id),
            method: apiUrls.taxRates.delete.method,
        })
    ).data;
}

export const useRemoveTaxRate = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTaxRate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.taxRates)] });
        },
    });
};
