import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';

const validTimezones = moment.tz.names();

// --------------------------------------- Warehouses ---------------------------------------

// Warehouses Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface WarehouseDetails {
    id: string;
    name: string;
    groupCode: string;
    status: 'ACTIVE' | 'INACTIVE';
    companyId: string;
    domainId: string;
    warehouse: string;
    description: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetWarehouseResponse {
    success: boolean;
    message: string;
    count: number;
    data: WarehouseDetails[];
}

export async function getWarehouses(props: FilterProps): Promise<GetWarehouseResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouses.list.url,
            method: apiUrls.warehouses.list.method,
            params: props,
        })
    ).data;
}

export const useGetWarehouses = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouses), props],
        queryFn: async () => await getWarehouses(props),
    });
};

// Warehouse Offline Listing

export async function getWarehousesOffline(online: boolean): Promise<GetWarehouseResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.warehouses.list.url,
            method: apiUrls.warehouses.list.method,
        });
        await setDBData(getIDBKey(apiUrls.warehouses), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetWarehouseResponse>(getIDBKey(apiUrls.warehouses));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetWarehousesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.warehouses), online],
        queryFn: async () => await getWarehousesOffline(online),
    });
};

// Warehouse Get By Id
export interface GetWarehouseByIdResponse {
    success: boolean;
    data: WarehouseDetails;
}

export async function getWarehouseById(id: string): Promise<GetWarehouseByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouses.get.url(id),
            method: apiUrls.warehouses.get.method,
        })
    ).data;
}

export const useGetWarehouseById = (
    id: string,
    enabled = true
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouses), id],
        queryFn: async () => await getWarehouseById(id),
        enabled,
    });
};

// Warehouses Create

export const WarehouseBaseSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    groupCode: z.string().min(1, 'Group code is required'),
    description: z.string().optional(),
});

export const warehouseCreateSchema = WarehouseBaseSchema.extend({
    timezone: z.string(),
    companyId: z.string().min(1, 'Company id is required'),
    domainId: z.string().min(1, 'Domain id is required'),
}).refine((data) => validTimezones.includes(data.timezone), {
    path: ['timezone'],
    message: 'Invalid timezone',
});

export type WarehouseCreateSchema = z.infer<typeof warehouseCreateSchema>;

export type MutateWarehouseResponse = {
    success: boolean;
};

export async function createWarehouse(data: WarehouseCreateSchema): Promise<MutateWarehouseResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouses.create.url,
            method: apiUrls.warehouses.create.method,
            data,
        })
    ).data;
}

export const useCreateWarehouse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouses)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.warehouses)] });
        },
    });
};

// Warehouse Update

export const warehouseUpdateSchema = WarehouseBaseSchema.extend({ id: z.string() });

export type WarehouseUpdateSchema = z.infer<typeof warehouseUpdateSchema>;

export async function updateWarehouse(data: WarehouseUpdateSchema): Promise<MutateWarehouseResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.warehouses.update.url(id),
            method: apiUrls.warehouses.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateWarehouse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouses)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.warehouses)] });
        },
    });
};

// Warehouse Delete

export async function removeWarehouse(id: string): Promise<MutateWarehouseResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouses.delete.url(id),
            method: apiUrls.warehouses.delete.method,
        })
    ).data;
}

export const useRemoveWarehouse = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeWarehouse,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouses)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.warehouses)] });
        },
    });
};
