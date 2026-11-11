import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { WarehouseDetails } from '../warehouse';
import { StockDetails } from './stock-details';

const validTimezones = moment.tz.names();

// --------------------------------------- STOCK INVENTORIES ---------------------------------------

// Stock Inventories Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyStockDetailId?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
    warehouseId?: string;
};

export interface StockInventoryDetails {
    id: string;
    companyId: string;
    domainId: string;
    companyStockDetailId: string;
    CompanyStockDetail: StockDetails;
    warehouseId: string;
    warehouse: WarehouseDetails;
    companyDebtorId: string;
    companyDebtor: CompanyCreditor;
    location: string;
    batchNumber: string;
    expiryDate: string;
    stockOnHand: number;
    reservedStock: number;
    availableStock: number;
    warehouseLocationId?: string | null;
    minimumStockLevel: number;
    maximumStockLevel: number;
    unitCost: number;
    totalValue: number;
    orderLevel: string;
    orderQuantity: number;
    lastRestockDate: string;
    lastSaleDate: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    isSuccess?: boolean;
    lastPhysicalCount: number;
    lastVariance: number;
    lastPhysicalCountDate: string;
    remarks: string;
}

export interface GetStockInventoryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockInventoryDetails[];
    };
}

export async function getStockInventories(props: FilterProps): Promise<GetStockInventoryResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'stockInventories', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.stockInventories.list.url,
                method: apiUrls.stockInventories.list.method,
                params: props,
            })
        ).data;
    }
}

export const useGetStockInventories = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockInventories), props],
        queryFn: async () => await getStockInventories(props),
    });
};

// Stock Inventory Get By Id
export interface GetStockInventoryByIdResponse {
    success: boolean;
    data: StockInventoryDetails;
}

export async function getStockInventoryById(id: string): Promise<GetStockInventoryByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventories.get.url(id),
            method: apiUrls.stockInventories.get.method,
        })
    ).data;
}

export const useGetStockInventoryById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockInventories), id],
        queryFn: async () => await getStockInventoryById(id),
    });
};

// Stock Inventory Get By Stock Id

export interface GetStockInventoryByStockIdResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockInventoryDetails[];
    };
}

export async function getStockInventoryByStockId(
    props: FilterProps,
): Promise<GetStockInventoryByStockIdResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'stockInventories', label: props?.csvLabel, listType: 'getByStock' });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.stockInventories.getByStock.url,
                method: apiUrls.stockInventories.getByStock.method,
                data: props,
            })
        ).data;
    }
}

export const useGetStockInventoryByStockId = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockInventories), props],
        queryFn: async () => await getStockInventoryByStockId(props),
    });
};

// Stock Inventories Create

export const stockInventoryBaseSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Company Stock Detail ID is required'),
    companyDebtorId: z.string().optional(),
    warehouseId: z.string().optional(),
    location: z.string().optional(),
    batchNumber: z.string().optional(),
    expiryDate: z.string().optional(),
    lastRestockDate: z.string().optional(),
    lastSaleDate: z.string().optional(),

    stockOnHand: z.number().int().min(0, 'Invalid Stock On Hand'),
    reservedStock: z.number().int().min(0, 'Invalid Reserved Stock'),
    availableStock: z.number().int().min(0, 'Invalid Available Stock'),
    minimumStockLevel: z.number().int().min(0, 'Invalid Minimum Stock Level'),
    maximumStockLevel: z.number().int().min(0, 'Invalid Maximum Stock Level'),

    unitCost: z.number().min(0, 'Invalid Unit Cost'),
    totalValue: z.number().int().min(1, 'Invalid Total Value'),
});

export const stockInventoryCreateSchema = stockInventoryBaseSchema
    .extend({
        timezone: z.string(),
        companyId: z.string().min(1, 'Company id is required'),
        domainId: z.string().min(1, 'Domain id is required'),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type StockInventoryCreateSchema = z.infer<typeof stockInventoryCreateSchema>;

export type MutateStockInventoryResponse = {
    success: boolean;
};

export async function createStockInventory(data: StockInventoryCreateSchema): Promise<MutateStockInventoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventories.create.url,
            method: apiUrls.stockInventories.create.method,
            data,
        })
    ).data;
}

export const useCreateStockInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockInventory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
        },
    });
};

// Stock Inventory Update

export const stockInventoryUpdateSchema = stockInventoryBaseSchema.extend({
    companyStockInventoryId: z.string(),
    lastPhysicalCount: z.number().optional(),
    lastPhysicalCountDate: z.string().optional(),
});

export type StockInventoryUpdateSchema = z.infer<typeof stockInventoryUpdateSchema>;

export async function updateStockInventory(data: StockInventoryUpdateSchema): Promise<MutateStockInventoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventories.update.url,
            method: apiUrls.stockInventories.update.method,
            data,
        })
    ).data;
}

export const useUpdateStockInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStockInventory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
        },
    });
};

// Stock Inventory Delete

export async function removeStockInventory(id: string): Promise<MutateStockInventoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventories.delete.url(id),
            method: apiUrls.stockInventories.delete.method,
        })
    ).data;
}

export const useRemoveStockInventory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeStockInventory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
        },
    });
};

// Stock Inventory Physical Count

export const physicalCountSchema = z.object({
    companyStockInventoryId: z.string().min(1, 'Stock inventory is required'),
    countedQuantity: z.number().min(0, 'Counted quantity is required'),
    clientEventId: z.string().min(1, 'Client event id is required'),
    lastPhysicalCountDate: z.string().optional(),
    warehouseId: z.optional(z.string()),
    remarks: z.string().optional(),
});

export type PhysicalCountSchema = z.infer<typeof physicalCountSchema>;

export type MutatePhysicalCountResponse = {
    success: boolean;
    message?: string;
};

export async function physicalCountStock(data: PhysicalCountSchema): Promise<MutatePhysicalCountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventories.physicalCount.url,
            method: apiUrls.stockInventories.physicalCount.method,
            data,
        })
    ).data;
}

export const usePhysicalCountStock = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: physicalCountStock,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventoryLogs)] });
        },
    });
};

// Stock Markup Export

export async function exportMarkup(props: FilterProps) {
    axiosDownloadCSV({ filters: props, key: 'markup', label: props?.csvLabel });
}
