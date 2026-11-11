import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

export const STOCK_MOVEMENT_TYPES = [
    'TRANSFER_OUT',
    'TRANSFER_IN',
    'RECEIPT',
    'ADJUSTMENT',
    'RETURN',
    'DISPATCH',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface StockMovementItemInput {
    companyStockDetailId: string;
    salesOrderItemId?: string;
    quantity: number;
}

export interface CreateStockMovementInput {
    movementType: StockMovementType;
    warehouseId: string;
    salesOrderId: string;
    overrideReason?: string;
    items: StockMovementItemInput[];
}

export interface StockMovementItemRecord {
    id?: string;
    companyStockDetailId?: string;
    salesOrderItemId?: string;
    itemCode?: string;
    description?: string;
    quantity?: number;
}

export interface StockMovementRecord {
    id: string;
    movementNumber?: string | null;
    movementType?: StockMovementType | string | null;
    status?: string | null;
    warehouseId?: string | null;
    warehouseName?: string | null;
    salesOrderId?: string | null;
    salesOrderNumber?: string | null;
    companyDebtorName?: string | null;
    overrideReason?: string | null;
    totalQuantity?: number | null;
    createdAt?: string | null;
    items?: StockMovementItemRecord[];
    [key: string]: unknown;
}

export interface StockMovementListFilters {
    limit?: number;
    offset?: number;
    movementType?: StockMovementType | '';
    warehouseId?: string;
    salesOrderId?: string;
    search?: string;
}

export interface StockMovementListResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: StockMovementRecord[];
    };
}

export interface StockMovementCreateResponse {
    success: boolean;
    message?: string;
    data?: StockMovementRecord | null;
}

const numberOrUndefined = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
};

const normalizeStockMovement = (raw: Record<string, unknown>): StockMovementRecord | null => {
    const id = raw.id ? String(raw.id) : '';
    if (!id) return null;
    const warehouse = raw.warehouse as Record<string, unknown> | undefined;
    const salesOrder = raw.salesOrder as Record<string, unknown> | undefined;
    const debtor = (raw.companyDebtor || raw.CompanyDebtor) as Record<string, unknown> | undefined;
    const rawItems = (raw.items || raw.stockMovementItems || raw.StockMovementItems) as unknown;
    const items = Array.isArray(rawItems)
        ? rawItems
              .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
              .map((item) => ({
                  id: item.id ? String(item.id) : undefined,
                  companyStockDetailId: item.companyStockDetailId ? String(item.companyStockDetailId) : undefined,
                  salesOrderItemId: item.salesOrderItemId ? String(item.salesOrderItemId) : undefined,
                  itemCode: item.itemCode ? String(item.itemCode) : undefined,
                  description: item.description ? String(item.description) : undefined,
                  quantity: numberOrUndefined(item.quantity),
              }))
        : undefined;
    return {
        ...raw,
        id,
        movementNumber: (raw.movementNumber || raw.stockMovementNumber || raw.number) as string | undefined,
        movementType: raw.movementType as string | undefined,
        status: raw.status as string | undefined,
        warehouseId: (raw.warehouseId || warehouse?.id) as string | undefined,
        warehouseName: (warehouse?.warehouse || warehouse?.name || raw.warehouseName) as string | undefined,
        salesOrderId: (raw.salesOrderId || salesOrder?.id) as string | undefined,
        salesOrderNumber: (raw.salesOrderNumber || salesOrder?.salesOrderNumber || salesOrder?.id) as
            | string
            | undefined,
        companyDebtorName: (debtor?.name || raw.companyDebtorName) as string | undefined,
        overrideReason: raw.overrideReason as string | undefined,
        totalQuantity: numberOrUndefined(raw.totalQuantity),
        createdAt: raw.createdAt as string | undefined,
        items,
    };
};

export async function getStockMovements(props: StockMovementListFilters): Promise<StockMovementListResponse> {
    const response = await axiosInstance({
        url: apiUrls.stockMovements.all.url,
        method: apiUrls.stockMovements.all.method,
        data: props,
    });
    const body = response.data as {
        success?: boolean;
        message?: string;
        data?: { count?: number; rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    };
    const payload = body?.data;
    const rows = Array.isArray(payload) ? payload : payload?.rows || [];
    return {
        success: body?.success !== false,
        message: body?.message,
        data: {
            count: Array.isArray(payload) ? rows.length : payload?.count || rows.length,
            rows: rows
                .map((row) => normalizeStockMovement(row))
                .filter((row): row is StockMovementRecord => !!row),
        },
    };
}

export const useGetStockMovements = (props: StockMovementListFilters) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.stockMovements), 'all', props],
        queryFn: async () => await getStockMovements(props),
    });

export const createStockMovementSchema = z.object({
    movementType: z.enum(STOCK_MOVEMENT_TYPES),
    warehouseId: z.string().min(1, 'Warehouse is required'),
    salesOrderId: z.string().min(1, 'Sales order is required'),
    overrideReason: z.string().optional(),
    items: z
        .array(
            z.object({
                companyStockDetailId: z.string().min(1),
                salesOrderItemId: z.string().optional(),
                quantity: z.number().positive('Quantity must be greater than zero'),
            }),
        )
        .min(1, 'At least one item is required'),
});

export async function createStockMovement(
    data: CreateStockMovementInput,
): Promise<StockMovementCreateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockMovements.create.url,
            method: apiUrls.stockMovements.create.method,
            data,
        })
    ).data;
}

export const useCreateStockMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockMovement,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockMovements)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorOrder)] });
        },
    });
};
