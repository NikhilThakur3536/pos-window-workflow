import { apiUrls, axiosDownloadCSV, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment-timezone';
import { z } from 'zod';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';

const validTimezones = moment.tz.names();

// --------------------------------------- PURCHASE ORDERS ---------------------------------------

export const PURCHASE_ORDER_STATUSES = [
    'DRAFT',
    'PENDING_APPROVAL',
    'APPROVED',
    'SENT',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export const DELIVERY_CYCLES = ['Daily', 'Weekly', 'Monthly', 'Once Off'] as const;

// --------------------------------------- Types ---------------------------------------

export interface PurchaseOrderItem {
    id?: string;
    purchaseOrderItemId?: string;
    purchaseRequestItemId?: string;
    supplierQuotationItemId?: string;
    companyStockDetailId: string;
    skuCode?: string;
    barcode?: string;
    description?: string;
    companyTaxRateId?: string;
    uom?: string;
    orderedQuantity: number;
    agreedUnitCost: number;
    discountPercentage?: number;
    taxPercentage?: number;
    expectedDeliveryDate?: string;
    qualityNotes?: string;
    receivedQuantity?: number | string;
    netCost?: number | string;
    lineTotal?: number | string;
    discountAmount?: number | string;
    taxAmount?: number | string;
    CompanyStockDetail?: StockDetails;
}

export interface PurchaseOrderDetails {
    id: string;
    orderNumber?: string;
    poNumber?: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: PurchaseOrderStatus | string;
    companyCreditorId: string;
    CompanyCreditor?: CompanyCreditor;
    warehouseId?: string;
    orderDate?: string;
    expectedDeliveryDate?: string;
    deliveryCycle?: string;
    goodsTotal?: string | number;
    discountAmount?: string | number;
    taxAmount?: string | number;
    grandTotal?: string | number;
    totalQuantity?: string | number;
    receivedQuantity?: string | number;
    notes?: string;
    qualityNotes?: string;
    paymentTerms?: string;
    poGroupId?: string | null;
    poGroupName?: string | null;
    cancelReason?: string;
    confirmationNotes?: string;
    sentAt?: string | null;
    confirmedAt?: string | null;
    cancelledAt?: string | null;
    pdfUrl?: string | null;
    pdfGeneratedAt?: string | null;
    addedByUser?: string;
    items?: PurchaseOrderItem[];
    PurchaseOrderItems?: (PurchaseOrderItem & { id?: string; companyTaxRateId?: string })[];
    orderItems?: PurchaseOrderItem[];
}

export interface PurchaseOrderTraceEntry {
    id: string;
    action?: string;
    description?: string;
    createdAt?: string;
    status?: string;
    [key: string]: unknown;
}

export interface TraceGoodsReceivedVoucher {
    id?: string;
    grvNumber?: string;
    referenceNumber?: string;
    receivedAt?: string;
    status?: string;
    receivedQuantity?: number | string;
    items?: unknown[];
    [key: string]: unknown;
}

export interface TraceCommercialEntry {
    id?: string;
    documentType?: string;
    documentNumber?: string;
    documentId?: string;
    amount?: number | string;
    status?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface PurchaseOrderTraceData {
    traceOrigin?: string;
    purchaseOrder?: PurchaseOrderDetails;
    goodsReceivedVouchers?: TraceGoodsReceivedVoucher[];
    commercialTraceMap?: TraceCommercialEntry[];
    [key: string]: unknown;
}

export interface GetPurchaseOrderTraceResponse {
    success: boolean;
    message?: string;
    data: PurchaseOrderTraceData;
}

export interface GetPurchaseOrderListResponse {
    success: boolean;
    message: string;
    data: PurchaseOrderDetails[];
    total: number;
    limit?: number;
    offset?: number;
}

export interface GetPurchaseOrderByIdResponse {
    success: boolean;
    message: string;
    data: PurchaseOrderDetails;
}

export interface MutatePurchaseOrderResponse {
    success: boolean;
    message: string;
    data?: PurchaseOrderDetails;
}

export interface PurchaseOrderPdfData {
    orderId?: string;
    poNumber?: string;
    pdfUrl?: string;
    pdfLocalPath?: string;
}

export interface GetPurchaseOrderPdfResponse {
    success: boolean;
    message?: string;
    data?: PurchaseOrderPdfData;
}

export interface PurchaseOrderListFilters {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyCreditorId?: string;
    poGroupId?: string;
    isCsv?: boolean;
    csvLabel?: string;
}

export interface PurchaseOrderProductHistoryFilters {
    productIds: string[];
}

export interface PurchaseOrderRecentPurchase {
    purchasePrice?: number | string;
    purchaseDate?: string;
    supplierId?: string;
    supplierName?: string;
    grvNumber?: string;
    quantity?: number | string;
    freeStock?: number | string;
    lineTotal?: number | string;
    discountPercentage?: number | string;
    discountAmount?: number | string;
    taxPercent?: number | string;
    taxAmount?: number | string;
    warehouseId?: string | null;
    [key: string]: unknown;
}

export interface PurchaseOrderProductHistoryRow {
    companyStockDetailId: string;
    lastPurchasePrice?: number;
    lastPurchaseDate?: string;
    lastSupplierId?: string;
    lastSupplierName?: string;
    lastGrvNumber?: string;
    // Response changes: up to the last 2 GRV purchase records (most recent first).
    recentPurchases?: PurchaseOrderRecentPurchase[];
    // Response changes: convenience fields for the transaction BEFORE the last purchase.
    secondLastPurchasePrice?: number;
    secondLastSupplierName?: string;
    lowestPurchasePrice?: number;
    lowestPurchase?: PurchaseOrderRecentPurchase;
    highestPurchasePrice?: number;
    highestPurchase?: PurchaseOrderRecentPurchase;
    averagePurchasePrice?: number;
    totalPurchaseCount?: number;
    [key: string]: unknown;
}

export interface GetPurchaseOrderProductHistoryResponse {
    success: boolean;
    message: string;
    data: PurchaseOrderProductHistoryRow[];
}

export type MultiSupplierPOItem = PurchaseOrderItem;

export interface MultiSupplierPOSupplier {
    companyCreditorId: string;
    paymentTerms?: string;
    items: MultiSupplierPOItem[];
}

export interface CreateMultiSupplierPOInput {
    expectedDeliveryDate: string;
    paymentTerms?: string;
    notes?: string;
    suppliers: MultiSupplierPOSupplier[];
}

export interface MultiSupplierPOCreated {
    id: string;
    poNumber?: string;
    orderNumber?: string;
    companyCreditorId: string;
    poGroupId?: string | null;
    paymentTerms?: string;
    totalQuantity: number;
    grandTotal: number;
    items?: PurchaseOrderItem[];
    [key: string]: unknown;
}

export interface CreateMultiSupplierPOResponse {
    success: boolean;
    message: string;
    data?: {
        poGroupId: string;
        supplierCount: number;
        purchaseOrders: MultiSupplierPOCreated[];
    };
}

// --------------------------------------- Schemas ---------------------------------------

export const purchaseOrderItemSchema = z.object({
    purchaseOrderItemId: z.string().optional(),
    purchaseRequestItemId: z.string().optional(),
    supplierQuotationItemId: z.string().optional(),
    companyStockDetailId: z.string().min(1, 'Stock item is required'),
    skuCode: z.string().optional(),
    barcode: z.string().optional(),
    description: z.string().optional(),
    companyTaxRateId: z.string().optional(),
    uom: z.string().optional(),
    orderedQuantity: z.number().int('Quantity cannot have decimal values').min(1, 'Quantity must be at least 1'),
    agreedUnitCost: z.number().min(0, 'Unit cost must be at least 0'),
    discountPercentage: z.number().min(0).max(100).optional(),
    taxPercentage: z.number().min(0).max(100).optional(),
    expectedDeliveryDate: z.string().optional(),
    qualityNotes: z.string().optional(),
});

export const purchaseOrderBaseSchema = z.object({
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    purchaseRequestId: z.string().optional(),
    supplierQuotationId: z.string().optional(),
    clientDocumentId: z.string().optional(),
    warehouseId: z.string().min(1, 'Warehouse is required'),
    expectedDeliveryDate: z.string().min(1, 'Expected delivery date is required'),
    deliveryCycle: z.string().min(1, 'Delivery cycle is required'),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    qualityNotes: z.string().optional(),
    items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required'),
});

export const purchaseOrderCreateSchema = purchaseOrderBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type PurchaseOrderCreateSchema = z.infer<typeof purchaseOrderCreateSchema>;

export const purchaseOrderUpdateSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    status: z.enum(PURCHASE_ORDER_STATUSES),
    paymentTerms: z.string().optional(),
    cancelReason: z.string().optional(),
    confirmationNotes: z.string().optional(),
});

export type PurchaseOrderUpdateSchema = z.infer<typeof purchaseOrderUpdateSchema>;

// --------------------------------------- Multi-supplier create schema ---------------------------------------

export const multiSupplierSupplierSchema = z.object({
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    paymentTerms: z.string().optional(),
    items: z.array(purchaseOrderItemSchema).min(1, 'At least one item is required per supplier'),
});

export const multiSupplierCreateSchema = z.object({
    expectedDeliveryDate: z.string().min(1, 'Expected delivery date is required'),
    poGroupName: z.string().optional(),
    paymentTerms: z.string().optional(),
    notes: z.string().optional(),
    suppliers: z
        .array(multiSupplierSupplierSchema)
        .min(2, 'A multi-supplier purchase order needs at least 2 suppliers (use a single-supplier PO for 1 supplier)'),
});

export type MultiSupplierCreateSchema = z.infer<typeof multiSupplierCreateSchema>;

// --------------------------------------- List (with CSV export) ---------------------------------------

export async function getPurchaseOrderList(
    props: PurchaseOrderListFilters,
): Promise<GetPurchaseOrderListResponse | void> {
    if (props.isCsv) {
        axiosDownloadCSV({
            filters: props,
            key: 'purchaseOrder',
            label: props.csvLabel,
        });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.purchaseOrder.list.url,
                method: apiUrls.purchaseOrder.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetPurchaseOrderList = (props: PurchaseOrderListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseOrder.list), props],
        queryFn: async () => await getPurchaseOrderList(props),
    });
};

// --------------------------------------- Get by id ---------------------------------------

export async function getPurchaseOrderById(orderId: string): Promise<GetPurchaseOrderByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.get.url,
            method: apiUrls.purchaseOrder.get.method,
            data: { orderId },
        })
    ).data;
}

export const useGetPurchaseOrderById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseOrder), id],
        queryFn: async () => await getPurchaseOrderById(id),
        enabled: !!id,
    });
};

// --------------------------------------- Create ---------------------------------------

export async function createPurchaseOrder(data: PurchaseOrderCreateSchema): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.create.url,
            method: apiUrls.purchaseOrder.create.method,
            data,
        })
    ).data;
}

export const useCreatePurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

// --------------------------------------- Update (status transitions) ---------------------------------------

export async function updatePurchaseOrder(data: PurchaseOrderUpdateSchema): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.update.url,
            method: apiUrls.purchaseOrder.update.method,
            data,
        })
    ).data;
}

export const useUpdatePurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

// --------------------------------------- Approve / Send / Supplier Confirm / Cancel ---------------------------------------

export interface ApprovePurchaseOrderInput {
    id: string;
}

export interface SendPurchaseOrderInput {
    id: string;
    sendMethod?: string;
    recipient?: string;
}

export interface SupplierConfirmPurchaseOrderInput {
    id: string;
    confirmationNotes?: string;
}
export interface ConfirmCancelPurchaseOrderInput {
    id: string;
    cancelReason?: string;
}

export async function approvePurchaseOrder(data: ApprovePurchaseOrderInput): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.approve.url,
            method: apiUrls.purchaseOrder.approve.method,
            data,
        })
    ).data;
}

export async function sendPurchaseOrder(data: SendPurchaseOrderInput): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.send.url,
            method: apiUrls.purchaseOrder.send.method,
            data,
        })
    ).data;
}

export async function supplierConfirmPurchaseOrder(
    data: SupplierConfirmPurchaseOrderInput,
): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.supplierConfirm.url,
            method: apiUrls.purchaseOrder.supplierConfirm.method,
            data,
        })
    ).data;
}

export async function cancelPurchaseOrder(data: ConfirmCancelPurchaseOrderInput): Promise<MutatePurchaseOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.cancelPo.url,
            method: apiUrls.purchaseOrder.cancelPo.method,
            data: { id: data.id, ...(data.cancelReason ? { cancelReason: data.cancelReason } : {}) },
        })
    ).data;
}

export const useApprovePurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approvePurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

export const useSendPurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: sendPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

export const useSupplierConfirmPurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: supplierConfirmPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

export const useCancelPurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

// --------------------------------------- Product history ---------------------------------------

export async function getPurchaseOrderProductHistory(
    props: PurchaseOrderProductHistoryFilters,
): Promise<GetPurchaseOrderProductHistoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.productHistory.url,
            method: apiUrls.purchaseOrder.productHistory.method,
            data: props,
        })
    ).data;
}

export const useGetPurchaseOrderProductHistory = (props: PurchaseOrderProductHistoryFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseOrder), 'product-history', props],
        queryFn: async () => await getPurchaseOrderProductHistory(props),
        enabled: (props.productIds || []).length > 0,
    });
};

// --------------------------------------- Multi-supplier create ---------------------------------------

export async function createMultiSupplierPurchaseOrder(
    data: CreateMultiSupplierPOInput,
): Promise<CreateMultiSupplierPOResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.createMultiSupplier.url,
            method: apiUrls.purchaseOrder.createMultiSupplier.method,
            data,
        })
    ).data;
}

export const useCreateMultiSupplierPurchaseOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createMultiSupplierPurchaseOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};

// --------------------------------------- Generate PDF ---------------------------------------

export async function generatePurchaseOrderPdf(orderId: string): Promise<GetPurchaseOrderPdfResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.generatePdf.url,
            method: apiUrls.purchaseOrder.generatePdf.method,
            data: { orderId },
        })
    ).data;
}

export const useGeneratePurchaseOrderPdf = () => {
    return useMutation({ mutationFn: generatePurchaseOrderPdf });
};

// --------------------------------------- Trace ---------------------------------------

export async function getPurchaseOrderTrace(purchaseOrderId: string): Promise<GetPurchaseOrderTraceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.purchaseOrder.trace.url,
            method: apiUrls.purchaseOrder.trace.method,
            data: { purchaseOrderId },
        })
    ).data;
}

export const useGetPurchaseOrderTrace = (purchaseOrderId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseOrder), 'trace', purchaseOrderId],
        queryFn: async () => await getPurchaseOrderTrace(purchaseOrderId),
        enabled: !!purchaseOrderId,
    });
};
