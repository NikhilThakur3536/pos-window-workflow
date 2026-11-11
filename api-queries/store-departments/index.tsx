import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';

const validTimezones = moment.tz.names();

// --------------------------------------- STORE DEPARTMENTS ---------------------------------------

// Store Departments Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface StoreDepartmentDetails {
    id: string;
    name: string;
    description: string;
    code: string;
    companyId: string;
    status: 'ACTIVE' | 'INACTIVE';
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetStoreDepartmentResponse {
    success: boolean;
    message: string;
    count: number;
    data: StoreDepartmentDetails[];
}

export async function getStoreDepartments(props: FilterProps): Promise<GetStoreDepartmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeDepartments.list.url,
            method: apiUrls.storeDepartments.list.method,
            data: props,
        })
    ).data;
}

export const useGetStoreDepartments = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeDepartments), props],
        queryFn: async () => await getStoreDepartments(props),
    });
};

// Store Departments Offline Listing

export async function getStoreDepartmentsOffline(online: boolean): Promise<GetStoreDepartmentResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.storeDepartments.list.url,
            method: apiUrls.storeDepartments.list.method,
        });
        await setDBData(getIDBKey(apiUrls.storeDepartments), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetStoreDepartmentResponse>(getIDBKey(apiUrls.storeDepartments));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetStoreDepartmentsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.storeDepartments), online],
        queryFn: async () => await getStoreDepartmentsOffline(online),
    });
};

// Store Department Get By Id
export interface GetStoreDepartmentByIdResponse {
    success: boolean;
    data: StoreDepartmentDetails;
}

export async function getStoreDepartmentById(id: string): Promise<GetStoreDepartmentByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeDepartments.get.url,
            method: apiUrls.storeDepartments.get.method,
            data: { id },
        })
    ).data;
}

export const useGetStoreDepartmentById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeDepartments), id],
        queryFn: async () => await getStoreDepartmentById(id),
    });
};

// Store Departments Create

export const StoreDepartmentBaseSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    groupCode: z.string().min(1, 'Group code is required'),
    description: z.string().optional(),
});

export const storeDepartmentCreateSchema = StoreDepartmentBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type StoreDepartmentCreateSchema = z.infer<typeof storeDepartmentCreateSchema>;

export type MutateStoreDepartmentResponse = {
    success: boolean;
};

export async function createStoreDepartment(data: StoreDepartmentCreateSchema): Promise<MutateStoreDepartmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeDepartments.create.url,
            method: apiUrls.storeDepartments.create.method,
            data,
        })
    ).data;
}

export const useCreateStoreDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStoreDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeDepartments)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.storeDepartments)] });
        },
    });
};

// Store Department Update

export const storeDepartmentUpdateSchema = StoreDepartmentBaseSchema.extend({ id: z.string() });

export type StoreDepartmentUpdateSchema = z.infer<typeof storeDepartmentUpdateSchema>;

export async function updateStoreDepartment(data: StoreDepartmentUpdateSchema): Promise<MutateStoreDepartmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeDepartments.update.url,
            method: apiUrls.storeDepartments.update.method,
            data,
        })
    ).data;
}

export const useUpdateStoreDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStoreDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeDepartments)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.storeDepartments)] });
        },
    });
};

// Store Department Delete

export async function removeStoreDepartment(id: string): Promise<MutateStoreDepartmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeDepartments.delete.url,
            method: apiUrls.storeDepartments.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveStoreDepartment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeStoreDepartment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeDepartments)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.storeDepartments)] });
        },
    });
};
