import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';

const validTimezones = moment.tz.names();

// --------------------------------------- Tenders ---------------------------------------

// Tenders Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isParentNull?: boolean;
    isDiscountParent?: boolean;
    parentTenderId?: string;
};

export interface TenderDetails {
    id: string;
    type: string;
    code: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    companyId: string;
    domainId: string;
    parentTenderId: string | null;
    isParentNull: boolean;
    isDiscountParent: boolean;
    fixedDiscountType: 'PERCENTAGE' | 'FIXED_VALUE';
    fixedDiscountValue: string;
}

export interface GetTenderResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: TenderDetails[];
    };
}

export async function getTenders(props: FilterProps): Promise<GetTenderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.list.url,
            method: apiUrls.tenders.list.method,
            data: props,
        })
    ).data;
}

export const useGetTenders = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.tenders), props],
        queryFn: async () => await getTenders(props),
    });
};

// Store Departments Offline Listing

export async function getTendersOffline(online: boolean): Promise<GetTenderResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.tenders.list.url,
            method: apiUrls.tenders.list.method,
        });
        await setDBData(getIDBKey(apiUrls.tenders), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetTenderResponse>(getIDBKey(apiUrls.tenders));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetTendersOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.tenders), online],
        queryFn: async () => await getTendersOffline(online),
    });
};

// Tender Get By Id
export interface GetTenderByIdResponse {
    success: boolean;
    data: TenderDetails;
}

export async function getTenderById(id: string): Promise<GetTenderByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.get.url,
            method: apiUrls.tenders.get.method,
            data: { id },
        })
    ).data;
}

export const useGetTenderById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.tenders), id],
        queryFn: async () => await getTenderById(id),
    });
};

// Tenders Create

export const TenderBaseSchema = z.object({
    name: z.string().min(1, 'Tender name is required'),
    groupCode: z.string().min(1, 'Tender code is required'),
    description: z.string().optional(),
});

export const tenderCreateSchema = TenderBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type TenderCreateSchema = z.infer<typeof tenderCreateSchema>;

export type MutateTenderResponse = {
    success: boolean;
};

export async function createTender(data: TenderCreateSchema): Promise<MutateTenderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.create.url,
            method: apiUrls.tenders.create.method,
            data,
        })
    ).data;
}

export const useCreateTender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTender,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.tenders)] });
        },
    });
};

// Tender Update

export const tenderUpdateSchema = TenderBaseSchema.extend({ tenderTypeId: z.string() });

export type TenderUpdateSchema = z.infer<typeof tenderUpdateSchema>;

export async function updateTender(data: TenderUpdateSchema): Promise<MutateTenderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.update.url,
            method: apiUrls.tenders.update.method,
            data: data,
        })
    ).data;
}

export const useUpdateTender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTender,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.tenders)] });
        },
    });
};

// Tender Delete

export async function removeTender(id: string): Promise<MutateTenderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.delete.url,
            method: apiUrls.tenders.delete.method,
            data: { tenderTypeId: id },
        })
    ).data;
}

export const useRemoveTender = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTender,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.tenders)] });
        },
    });
};
