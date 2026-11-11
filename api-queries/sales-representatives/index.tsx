import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';

const validTimezones = moment.tz.names();

// --------------------------------------- SALES REPRESENTATIVES ---------------------------------------

// Sales Representatives Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface Target {
    targetLevel: number;
    targetValue: number;
    commissionPercent: number;
}

export interface SalesRepresentativeDetails {
    id: string;
    repNumber: number;
    isSalesManager: boolean;
    managerRepId: string;
    name: string;
    email: string;
    cellNumber: string;
    baseCommissionOn: string;
    comPercent: number;
    targets: Target[];
    onHold: boolean;
    allowEmails: boolean;
    domainId: string;
    companyId: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

export interface GetSalesRepresentativeResponse {
    success: boolean;
    message: string;
    count: number;
    data: SalesRepresentativeDetails[];
}

export async function getSalesRepresentatives(props: FilterProps): Promise<GetSalesRepresentativeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.salesRepresentatives.list.url,
            method: apiUrls.salesRepresentatives.list.method,
            data: props,
        })
    ).data;
}

export const useGetSalesRepresentatives = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.salesRepresentatives), props],
        queryFn: async () => await getSalesRepresentatives(props),
    });
};

// Sales Representatives Offline Listing

export async function getSalesRepresentativesOffline(online: boolean): Promise<GetSalesRepresentativeResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.salesRepresentatives.list.url,
            method: apiUrls.salesRepresentatives.list.method,
        });
        await setDBData(getIDBKey(apiUrls.salesRepresentatives), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetSalesRepresentativeResponse>(getIDBKey(apiUrls.salesRepresentatives));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetSalesRepresentativesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.salesRepresentatives), online],
        queryFn: async () => await getSalesRepresentativesOffline(online),
    });
};

// Sales Representative Get By Id
export interface GetSalesRepresentativeByIdResponse {
    success: boolean;
    data: SalesRepresentativeDetails;
}

export async function getSalesRepresentativeById(id: string): Promise<GetSalesRepresentativeByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.salesRepresentatives.get.url,
            method: apiUrls.salesRepresentatives.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSalesRepresentativeById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.salesRepresentatives), id],
        queryFn: async () => await getSalesRepresentativeById(id),
    });
};

// Sales Representatives Create

export const SalesRepresentativeBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    repNumber: z.string().min(1, 'Rep Number is required'),
    description: z.string().optional(),
});

export const salesRepresentativeCreateSchema = SalesRepresentativeBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type SalesRepresentativeCreateSchema = z.infer<typeof salesRepresentativeCreateSchema>;

export type MutateSalesRepresentativeResponse = {
    success: boolean;
};

export async function createSalesRepresentative(
    data: SalesRepresentativeCreateSchema,
): Promise<MutateSalesRepresentativeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.salesRepresentatives.create.url,
            method: apiUrls.salesRepresentatives.create.method,
            data,
        })
    ).data;
}

export const useCreateSalesRepresentative = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSalesRepresentative,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.salesRepresentatives)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.salesRepresentatives)] });
        },
    });
};

// Sales Representative Update

export const salesRepresentativeUpdateSchema = SalesRepresentativeBaseSchema.extend({ id: z.string() });

export type SalesRepresentativeUpdateSchema = z.infer<typeof salesRepresentativeUpdateSchema>;

export async function updateSalesRepresentative(
    data: SalesRepresentativeUpdateSchema,
): Promise<MutateSalesRepresentativeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.salesRepresentatives.update.url,
            method: apiUrls.salesRepresentatives.update.method,
            data,
        })
    ).data;
}

export const useUpdateSalesRepresentative = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSalesRepresentative,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.salesRepresentatives)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.salesRepresentatives)] });
        },
    });
};

// Sales Representative Delete

export async function removeSalesRepresentative(id: string): Promise<MutateSalesRepresentativeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.salesRepresentatives.delete.url,
            method: apiUrls.salesRepresentatives.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveSalesRepresentative = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSalesRepresentative,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.salesRepresentatives)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.salesRepresentatives)] });
        },
    });
};
