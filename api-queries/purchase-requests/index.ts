import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';


// --------------------------------------- PURCHASE REQUEST ---------------------------------------
// Backlog 3166 — Buyer raises a requirement (products + quantities + warehouse +
// optional candidate suppliers). No approval workflow.
// Status enum: DRAFT | OPEN | CLOSED | CANCELLED

export const PURCHASE_REQUEST_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED'] as const;
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

// --------------------------------------- Types ---------------------------------------

export interface PurchaseRequestItem {
    id?: string;
    purchaseRequestItemId?: string;
    companyStockDetailId: string;
    skuCode?: string;
    description?: string;
    uom?: string;
    requestedQuantity: number;
    estimatedUnitCost?: number;
    notes?: string;
    CompanyStockDetail?: StockDetails;
}

export interface PurchaseRequestDetails {
    id: string;
    clientDocumentId?: string;
    documentNumber?: string;
    prNumber?: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: PurchaseRequestStatus | string;
    warehouseId?: string;
    Warehouse?: { id?: string; warehouse?: string; name?: string };
    requiredByDate?: string;
    candidateSupplierIds?: string[];
    CandidateSuppliers?: (CompanyCreditor & { CompanyCreditor?: CompanyCreditor })[];
    notes?: string;
    totalQuantity?: string | number;
    estimatedTotal?: string | number;
    itemCount?: string | number;
    quotationCount?: string | number;
    purchaseOrderCount?: string | number;
    requestedByUserId?: string;
    requestedByUser?: string;
    addedByUser?: string;
    closeReason?: string;
    cancelReason?: string;
    closedAt?: string | null;
    cancelledAt?: string | null;
    items?: PurchaseRequestItem[];
    PurchaseRequestItems?: PurchaseRequestItem[];
}

export interface GetPurchaseRequestListResponse {
    success: boolean;
    message: string;
    data: PurchaseRequestDetails[];
    total: number;
    limit?: number;
    offset?: number;
}

export interface GetPurchaseRequestByIdResponse {
    success: boolean;
    message: string;
    data: PurchaseRequestDetails;
}

export interface MutatePurchaseRequestResponse {
    success: boolean;
    message: string;
    data?: PurchaseRequestDetails;
}

export interface PurchaseRequestListFilters {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyCreditorId?: string;
    warehouseId?: string;
    requiredByFrom?: string;
    requiredByTo?: string;
    startDate?: string;
    endDate?: string;
}

// --------------------------------------- Schema ---------------------------------------

export const purchaseRequestItemSchema = z.object({
    id: z.string().optional(),
    purchaseRequestItemId: z.string().optional(),
    companyStockDetailId: z.string().min(1, 'Stock item is required'),
    skuCode: z.string().optional(),
    description: z.string().optional(),
    requestedQuantity: z
        .number()
        .int('Quantity cannot have decimal values')
        .min(1, 'Quantity must be at least 1'),
    estimatedUnitCost: z.number().min(0).optional(),
    notes: z.string().optional(),
});

export const purchaseRequestCreateSchema = z.object({
    clientDocumentId: z.string().optional(),
    warehouseId: z.string().min(1, 'Warehouse is required'),
    requiredByDate: z.string().min(1, 'Required by date is required'),
    status: z.enum(PURCHASE_REQUEST_STATUSES).optional(),
    candidateSupplierIds: z.array(z.string()).optional(),
    notes: z.string().optional(),
    items: z.array(purchaseRequestItemSchema).min(1, 'At least one item is required'),
    timezone: z.string().optional(),
});

export type PurchaseRequestCreateSchema = z.infer<typeof purchaseRequestCreateSchema>;

// --------------------------------------- API ---------------------------------------

export async function getPurchaseRequestList(
    props: PurchaseRequestListFilters,
): Promise<GetPurchaseRequestListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.list.url,
            method: apiUrls.purchaseRequest.list.method,
            data: props,
        })
    ).data;
}

export const useGetPurchaseRequestList = (props: PurchaseRequestListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseRequest), props],
        queryFn: async () => await getPurchaseRequestList(props),
    });
};

export async function getPurchaseRequestById(id: string): Promise<GetPurchaseRequestByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.get.url,
            method: apiUrls.purchaseRequest.get.method,
            data: { id },
        })
    ).data;
}

export const useGetPurchaseRequestById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseRequest), id],
        queryFn: async () => await getPurchaseRequestById(id),
        enabled: !!id,
    });
};

export async function createPurchaseRequest(
    data: PurchaseRequestCreateSchema,
): Promise<MutatePurchaseRequestResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.create.url,
            method: apiUrls.purchaseRequest.create.method,
            data,
        })
    ).data;
}

export const useCreatePurchaseRequest = () => {
    return useMutation({ mutationFn: createPurchaseRequest });
};

export async function updatePurchaseRequest(
    data: Record<string, unknown>,
): Promise<MutatePurchaseRequestResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.update.url,
            method: apiUrls.purchaseRequest.update.method,
            data,
        })
    ).data;
}

export const useUpdatePurchaseRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePurchaseRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseRequest)] });
        },
    });
};

export async function closePurchaseRequest(id: string): Promise<MutatePurchaseRequestResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.close.url,
            method: apiUrls.purchaseRequest.close.method,
            data: { id },
        })
    ).data;
}

export const useClosePurchaseRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: closePurchaseRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseRequest)] });
        },
    });
};

export async function cancelPurchaseRequest(
    id: string,
    cancelReason?: string,
): Promise<MutatePurchaseRequestResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseRequest.cancel.url,
            method: apiUrls.purchaseRequest.cancel.method,
            data: { id, ...(cancelReason ? { cancelReason } : {}) },
        })
    ).data;
}

export const useCancelPurchaseRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, cancelReason }: { id: string; cancelReason?: string }) =>
            cancelPurchaseRequest(id, cancelReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseRequest)] });
        },
    });
};