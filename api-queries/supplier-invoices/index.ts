import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';


// --------------------------------------- SUPPLIER INVOICE ---------------------------------------
// Backlog 3222 — Record the supplier's invoice (before or after goods arrive).
// Posting finalises the document only — no stock movement, no ledger entry, no payment.
// Status enum: DRAFT | POSTED | CANCELLED.
// Server calculates lineTotal, goodsTotal, discountAmount, taxAmount, grandTotal.

export const SUPPLIER_INVOICE_STATUSES = ['DRAFT', 'POSTED', 'CANCELLED'] as const;
export type SupplierInvoiceStatus = (typeof SUPPLIER_INVOICE_STATUSES)[number];

// --------------------------------------- Types ---------------------------------------

export interface SupplierInvoiceItem {
    id?: string;
    supplierInvoiceItemId?: string;
    companyStockDetailId: string;
    companyTaxRateId?: string | null;
    skuCode?: string;
    description?: string;
    quantity: string | number;
    unitPrice: string | number;
    discountPct?: string | number;
    taxPct?: string | number;
    lineTotal?: string | number;
    purchaseOrderItemId?: string | null;
    CompanyStockDetail?: StockDetails;
}

export interface SupplierInvoicePurchaseOrderRef {
    id?: string;
    poNumber?: string;
    status?: string;
    grandTotal?: string | number;
    totalQuantity?: string | number;
}

export interface SupplierInvoiceGrvRef {
    id?: string;
    invoiceNumber?: string;
    grvNumber?: string;
    grvDate?: string;
    totalQuantity?: string | number;
    goodsTotal?: string | number;
    purchaseOrderId?: string | null;
}

export interface SupplierInvoiceComparisonTotal {
    quantity?: number;
    value?: number;
}

export interface SupplierInvoiceComparisonDifferences {
    orderVsInvoice?: SupplierInvoiceComparisonTotal | null;
    invoiceVsReceived?: SupplierInvoiceComparisonTotal | null;
    orderVsReceived?: SupplierInvoiceComparisonTotal | null;
}

export interface SupplierInvoiceComparisonDoc {
    id?: string;
    poNumber?: string;
    invoiceNumber?: string;
    grvNumber?: string;
    status?: string;
    companyCreditorId?: string;
    invoiceDate?: string;
    grvDate?: string;
    purchaseOrderId?: string | null;
    supplierInvoiceId?: string | null;
    supplierInvoiceNumber?: string;
    grandTotal?: string | number;
    totalQuantity?: string | number;
}

export interface SupplierInvoiceComparisonLine {
    companyStockDetailId: string;
    skuCode?: string;
    description?: string;
    uom?: string;
    ordered?: SupplierInvoiceComparisonTotal;
    invoiced?: SupplierInvoiceComparisonTotal;
    received?: SupplierInvoiceComparisonTotal;
    differences?: SupplierInvoiceComparisonDifferences;
}

export interface SupplierInvoiceComparisonTotals {
    ordered?: SupplierInvoiceComparisonTotal;
    invoiced?: SupplierInvoiceComparisonTotal;
    received?: SupplierInvoiceComparisonTotal;
    differences?: SupplierInvoiceComparisonDifferences;
}

export interface SupplierInvoiceComparison {
    anchor?: { type?: string; id?: string } | null;
    hasPurchaseOrder?: boolean;
    differenceRule?: string;
    documents?: {
        purchaseOrder?: SupplierInvoiceComparisonDoc | null;
        supplierInvoices?: SupplierInvoiceComparisonDoc[];
        goodsReceivingOrders?: SupplierInvoiceComparisonDoc[];
    } | null;
    totals?: SupplierInvoiceComparisonTotals | null;
    receivedFreeQuantity?: number;
    matchStatus?: string;
    lines?: SupplierInvoiceComparisonLine[];
}

export interface SupplierInvoiceDetails {
    id: string;
    clientDocumentId?: string;
    invoiceNumber?: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: SupplierInvoiceStatus | string;
    companyCreditorId?: string;
    CompanyCreditor?: CompanyCreditor;
    purchaseOrderId?: string;
    PurchaseOrder?: SupplierInvoicePurchaseOrderRef | null;
    invoiceDate?: string;
    dueDate?: string;
    notes?: string;
    attachmentUrl?: string | null;
    goodsTotal?: string | number;
    discountAmount?: string | number;
    taxAmount?: string | number;
    grandTotal?: string | number;
    totalQuantity?: string | number;
    cancelReason?: string | null;
    postedAt?: string | null;
    postedById?: string;
    postedByUser?: string;
    addedByUser?: string;
    cancelledAt?: string | null;
    cancelledByUser?: string | null;
    goodsReceivingOrders?: SupplierInvoiceGrvRef[];
    comparison?: SupplierInvoiceComparison | null;
    items?: SupplierInvoiceItem[];
    SupplierInvoiceItems?: SupplierInvoiceItem[];
}

export interface GetSupplierInvoiceListResponse {
    success: boolean;
    message: string;
    data: SupplierInvoiceDetails[];
    total: number;
    limit?: number;
    offset?: number;
}

export interface GetSupplierInvoiceByIdResponse {
    success: boolean;
    message: string;
    data: SupplierInvoiceDetails;
}

export interface MutateSupplierInvoiceResponse {
    success: boolean;
    message: string;
    data?: SupplierInvoiceDetails;
}

export interface SupplierInvoiceListFilters {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyCreditorId?: string;
}

// --------------------------------------- Schema ---------------------------------------

export const supplierInvoiceItemSchema = z.object({
    id: z.string().optional(),
    companyStockDetailId: z.string().min(1, 'Stock item is required'),
    companyTaxRateId: z.string().optional(),
    skuCode: z.string().optional(),
    description: z.string().optional(),
    uom: z.string().optional(),
    quantity: z
        .number()
        .int('Quantity cannot have decimal values')
        .min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be at least 0'),
    discountPct: z.number().min(0).max(100).optional(),
    taxPct: z.number().min(0).max(100).optional(),
});

export const supplierInvoiceCreateSchema = z.object({
    clientDocumentId: z.string().optional(),
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    purchaseOrderId: z.string().optional(),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(supplierInvoiceItemSchema).min(1, 'At least one item is required'),
    timezone: z.string().optional(),
});

export type SupplierInvoiceCreateSchema = z.infer<typeof supplierInvoiceCreateSchema>;
export type InvoiceEditableItem = z.infer<typeof supplierInvoiceItemSchema>;

// --------------------------------------- API ---------------------------------------

export async function getSupplierInvoiceList(
    props: SupplierInvoiceListFilters,
): Promise<GetSupplierInvoiceListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.list.url,
            method: apiUrls.supplierInvoice.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierInvoiceList = (
    props: SupplierInvoiceListFilters,
    options?: { enabled?: boolean },
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierInvoice), props],
        queryFn: async () => await getSupplierInvoiceList(props),
        enabled: options?.enabled ?? true,
    });
};

export async function getSupplierInvoiceById(id: string): Promise<GetSupplierInvoiceByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.get.url,
            method: apiUrls.supplierInvoice.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSupplierInvoiceById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierInvoice), id],
        queryFn: async () => await getSupplierInvoiceById(id),
        enabled: !!id,
    });
};

export async function createSupplierInvoice(
    data: SupplierInvoiceCreateSchema,
): Promise<MutateSupplierInvoiceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.create.url,
            method: apiUrls.supplierInvoice.create.method,
            data,
        })
    ).data;
}

export const useCreateSupplierInvoice = () => {
    return useMutation({ mutationFn: createSupplierInvoice });
};

export async function updateSupplierInvoice(
    data: Record<string, unknown>,
): Promise<MutateSupplierInvoiceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.update.url,
            method: apiUrls.supplierInvoice.update.method,
            data,
        })
    ).data;
}

export const useUpdateSupplierInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSupplierInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierInvoice)] });
        },
    });
};

export async function postSupplierInvoice(id: string): Promise<MutateSupplierInvoiceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.post.url,
            method: apiUrls.supplierInvoice.post.method,
            data: { id },
        })
    ).data;
}

export const usePostSupplierInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postSupplierInvoice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierInvoice)] });
        },
    });
};

export async function cancelSupplierInvoice(
    id: string,
    cancelReason?: string,
): Promise<MutateSupplierInvoiceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierInvoice.cancel.url,
            method: apiUrls.supplierInvoice.cancel.method,
            data: { id, ...(cancelReason ? { cancelReason } : {}) },
        })
    ).data;
}

export const useCancelSupplierInvoice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, cancelReason }: { id: string; cancelReason?: string }) =>
            cancelSupplierInvoice(id, cancelReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierInvoice)] });
        },
    });
};