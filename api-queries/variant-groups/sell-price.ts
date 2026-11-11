import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- SELL PRICE VARIANT GROUPS ---------------------------------------

// Sell Price Variant Groups Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface SPVariantGroupDetails {
    id: string;
    name: string;
    code: string;
    description: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetSPVariantGroupResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SPVariantGroupDetails[];
    };
}

export async function getSPVariantGroups(props: FilterProps): Promise<GetSPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.spVariantGroups.list.url,
            method: apiUrls.spVariantGroups.list.method,
            data: props,
        })
    ).data;
}

export const useGetSPVariantGroups = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.spVariantGroups), props],
        queryFn: async () => await getSPVariantGroups(props),
    });
};

// Sell Price Variant Group Get By Id
export interface GetSPVariantGroupByIdResponse {
    success: boolean;
    data: SPVariantGroupDetails;
}

export async function getSPVariantGroupById(id: string): Promise<GetSPVariantGroupByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.spVariantGroups.get.url,
            method: apiUrls.spVariantGroups.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSPVariantGroupById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.spVariantGroups), id],
        queryFn: async () => await getSPVariantGroupById(id),
    });
};

// Sell Price Variant Group Create

export const spVariantGroupBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    description: z.string().optional(),
});

export const spVariantGroupCreateSchema = spVariantGroupBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SPVariantGroupCreateSchema = z.infer<typeof spVariantGroupCreateSchema>;

export type MutateSPVariantGroupResponse = {
    success: boolean;
};

export async function createSPVariantGroup(data: SPVariantGroupCreateSchema): Promise<MutateSPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.spVariantGroups.create.url,
            method: apiUrls.spVariantGroups.create.method,
            data,
        })
    ).data;
}

export const useCreateSPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.spVariantGroups)] });
        },
    });
};

// Sell Price Variant Group Update

export const spVariantGroupUpdateSchema = spVariantGroupBaseSchema.extend({ sellPriceVariantGroupId: z.string() });

export type SPVariantGroupUpdateSchema = z.infer<typeof spVariantGroupUpdateSchema>;

export async function updateSPVariantGroup(data: SPVariantGroupUpdateSchema): Promise<MutateSPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.spVariantGroups.update.url,
            method: apiUrls.spVariantGroups.update.method,
            data,
        })
    ).data;
}

export const useUpdateSPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.spVariantGroups)] });
        },
    });
};

// Sell Price Variant Group Delete

export async function removeSPVariantGroup(sellPriceVariantGroupId: string): Promise<MutateSPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.spVariantGroups.delete.url,
            method: apiUrls.spVariantGroups.delete.method,
            data: { sellPriceVariantGroupId },
        })
    ).data;
}

export const useRemoveSPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.spVariantGroups)] });
        },
    });
};
