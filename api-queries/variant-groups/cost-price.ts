import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- COST PRICE VARIANT GROUPS ---------------------------------------

// Cost Price Variant Groups Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CPVariantGroupDetails {
    id: string;
    name: string;
    code: string;
    description: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetCPVariantGroupResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CPVariantGroupDetails[];
    };
}

export async function getCPVariantGroups(props: FilterProps): Promise<GetCPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cpVariantGroups.list.url,
            method: apiUrls.cpVariantGroups.list.method,
            data: props,
        })
    ).data;
}

export const useGetCPVariantGroups = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cpVariantGroups), props],
        queryFn: async () => await getCPVariantGroups(props),
    });
};

// Cost Price Variant Group Get By Id
export interface GetCPVariantGroupByIdResponse {
    success: boolean;
    data: CPVariantGroupDetails;
}

export async function getCPVariantGroupById(id: string): Promise<GetCPVariantGroupByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cpVariantGroups.get.url,
            method: apiUrls.cpVariantGroups.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCPVariantGroupById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cpVariantGroups), id],
        queryFn: async () => await getCPVariantGroupById(id),
    });
};

// Cost Price Variant Group Create

export const cpVariantGroupBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    description: z.string().optional(),
});

export const cpVariantGroupCreateSchema = cpVariantGroupBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CPVariantGroupCreateSchema = z.infer<typeof cpVariantGroupCreateSchema>;

export type MutateCPVariantGroupResponse = {
    success: boolean;
};

export async function createCPVariantGroup(data: CPVariantGroupCreateSchema): Promise<MutateCPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cpVariantGroups.create.url,
            method: apiUrls.cpVariantGroups.create.method,
            data,
        })
    ).data;
}

export const useCreateCPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cpVariantGroups)] });
        },
    });
};

// Cost Price Variant Group Update

export const cpVariantGroupUpdateSchema = cpVariantGroupBaseSchema.extend({ costPriceVariantGroupId: z.string() });

export type CPVariantGroupUpdateSchema = z.infer<typeof cpVariantGroupUpdateSchema>;

export async function updateCPVariantGroup(data: CPVariantGroupUpdateSchema): Promise<MutateCPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cpVariantGroups.update.url,
            method: apiUrls.cpVariantGroups.update.method,
            data,
        })
    ).data;
}

export const useUpdateCPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cpVariantGroups)] });
        },
    });
};

// Cost Price Variant Group Delete

export async function removeCPVariantGroup(costPriceVariantGroupId: string): Promise<MutateCPVariantGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cpVariantGroups.delete.url,
            method: apiUrls.cpVariantGroups.delete.method,
            data: { costPriceVariantGroupId },
        })
    ).data;
}

export const useRemoveCPVariantGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCPVariantGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cpVariantGroups)] });
        },
    });
};
