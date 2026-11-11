import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';


// --------------------------------------- SUPPLIER QUOTATION ---------------------------------------
// Backlogs 3219, 3220, 3221 — Record quotes received from candidate suppliers against a
// PR, compare side-by-side, then convert selected lines into Purchase Orders
// (one PO per supplier, one atomic transaction).
// Status enum: DRAFT | RECEIVED | SELECTED | CANCELLED

export const SUPPLIER_QUOTATION_STATUSES = ['DRAFT', 'RECEIVED', 'SELECTED', 'CANCELLED'] as const;
export type SupplierQuotationStatus = (typeof SUPPLIER_QUOTATION_STATUSES)[number];

// --------------------------------------- Types ---------------------------------------

export interface SupplierQuotationTaxRateRef {
    id?: string;
    name?: string | null;
    taxType?: string | null;
    taxRatePercent?: number | null;
}

export interface SupplierQuotationItem {
    id?: string;
    supplierQuotationId?: string;
    supplierQuotationItemId?: string;
    purchaseRequestItemId?: string;
    companyStockDetailId?: string;
    companyTaxRateId?: string;
    skuCode?: string;
    description?: string;
    quotedQuantity: string | number;
    quotedUnitPrice: string | number;
    discountPct?: string | number;
    taxPct?: string | number;
    leadTimeDays?: number;
    notes?: string | null;
    status?: string;
    netUnitPrice?: string | number;
    effectiveUnitCost?: string | number;
    discountAmount?: string | number;
    taxAmount?: string | number;
    lineTotal?: string | number;
    CompanyStockDetail?: StockDetails;
    CompanyTaxRate?: SupplierQuotationTaxRateRef | null;
    PurchaseRequestItem?: SupplierQuotationPurchaseRequestItemRef | null;
}

export interface SupplierQuotationPurchaseRequestItemRef {
    id?: string;
    requestedQuantity?: string | number;
    estimatedUnitCost?: string | number;
    uom?: string;
    description?: string;
}

export interface SupplierQuotationPurchaseRequestRef {
    id: string;
    prNumber?: string;
    status?: string;
    warehouseId?: string;
    requiredByDate?: string;
}

export interface SupplierQuotationTotals {
    goodsTotal?: string | number;
    taxAmount?: string | number;
    discountAmount?: string | number;
    grandTotal?: string | number;
}

export interface SupplierQuotationPurchaseOrderRef {
    id?: string;
    poNumber?: string;
    orderNumber?: string;
    status?: string;
    grandTotal?: string | number;
}

export interface SupplierQuotationDetails {
    id: string;
    clientDocumentId?: string | null;
    quotationNumber?: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: SupplierQuotationStatus | string;
    purchaseRequestId?: string;
    companyCreditorId?: string;
    CompanyCreditor?: CompanyCreditor;
    PurchaseRequest?: SupplierQuotationPurchaseRequestRef | null;
    quotationDate?: string;
    validUntil?: string;
    paymentTerms?: string;
    deliveryTerms?: string;
    attachmentUrl?: string | null;
    notes?: string;
    totalQuantity?: string | number;
    itemCount?: string | number;
    grandTotal?: string | number;
    isExpired?: boolean;
    selectedAt?: string | null;
    cancelReason?: string | null;
    totals?: SupplierQuotationTotals | null;
    purchaseOrders?: SupplierQuotationPurchaseOrderRef[];
    items?: SupplierQuotationItem[];
    SupplierQuotationItems?: SupplierQuotationItem[];
}

export interface GetSupplierQuotationListResponse {
    success: boolean;
    message: string;
    data: SupplierQuotationDetails[];
    total: number;
    limit?: number;
    offset?: number;
}

export interface GetSupplierQuotationByIdResponse {
    success: boolean;
    message: string;
    data: SupplierQuotationDetails;
}

export interface MutateSupplierQuotationResponse {
    success: boolean;
    message: string;
    data?: SupplierQuotationDetails;
}

export interface SupplierQuotationListFilters {
    limit?: number;
    offset?: number;
    search?: string;
    purchaseRequestId?: string;
    companyCreditorId?: string;
    status?: string;
}

// --------------------------------------- Schema ---------------------------------------

export const supplierQuotationItemSchema = z.object({
    id: z.string().optional(),
    purchaseRequestItemId: z.string().optional(),
    companyStockDetailId: z.string().optional(),
    companyTaxRateId: z.string().optional(),
    quotedQuantity: z
        .number()
        .int('Quantity cannot have decimal values')
        .min(1, 'Quoted quantity must be at least 1'),
    quotedUnitPrice: z.number().min(0, 'Quoted unit price must be at least 0'),
    discountPct: z.number().min(0).max(100).optional(),
    taxPct: z.number().min(0).max(100).optional(),
    leadTimeDays: z.number().int('Lead time must be whole days').min(0).optional(),
});

export const supplierQuotationCreateSchema = z
    .object({
        clientDocumentId: z.string().optional(),
        purchaseRequestId: z.string().min(1, 'Purchase request is required'),
        companyCreditorId: z.string().min(1, 'Supplier is required'),
        quotationDate: z.string().min(1, 'Quotation date is required'),
        validUntil: z.string().optional(),
        status: z.enum(SUPPLIER_QUOTATION_STATUSES).optional(),
        paymentTerms: z.string().optional(),
        deliveryTerms: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(supplierQuotationItemSchema).min(1, 'At least one item is required'),
        timezone: z.string().optional(),
    })
    .refine((data) => !data.validUntil || !data.quotationDate || data.validUntil >= data.quotationDate, {
        path: ['validUntil'],
        message: 'validUntil must be greater than or equal to quotationDate',
    });

export type SupplierQuotationCreateSchema = z.infer<typeof supplierQuotationCreateSchema>;

// --------------------------------------- Compare quotes ---------------------------------------

export interface CompareQuotesPurchaseRequest {
    id: string;
    prNumber?: string;
    status?: string;
    warehouseId?: string;
    warehouse?: { id?: string; warehouse?: string; description?: string } | null;
    requiredByDate?: string;
}

export interface CompareQuotesLastPurchase {
    unitPrice?: number | string;
    grvDate?: string;
    supplierId?: string;
    grvId?: string;
    supplierName?: string;
}

export interface CompareQuoteRow {
    supplierQuotationId?: string;
    quotationNumber?: string;
    quotationStatus?: string;
    taxInclusive?: boolean;
    supplierQuotationItemId?: string;
    companyCreditorId?: string;
    supplierName?: string;
    quotationDate?: string;
    validUntil?: string;
    isExpired?: boolean;
    paymentTerms?: string;
    deliveryTerms?: string;
    quotedUnitPrice?: number | string;
    discountPct?: number;
    taxPct?: number;
    netUnitPrice?: number | string;
    effectiveUnitCost?: number | string;
    availableQuantity?: number | string;
    coversRequestedQuantity?: boolean;
    effectiveLineCost?: number | string;
    leadTimeDays?: number | null;
    lastPaidUnitPrice?: number | string;
    lastPaidDate?: string;
    lastPaidSupplierName?: string;
    differenceFromLastPaid?: number | string;
    differenceFromLastPaidPct?: number | string;
    supplierLastPaidUnitPrice?: number | null;
    supplierLastPaidDate?: string | null;
    supplierHistoricalLowestPrice?: number | null;
    supplierGrade?: string;
    alreadyOrdered?: boolean;
    notes?: string | null;
    isLowestEffectiveCost?: boolean;
}

export interface CompareQuoteItem {
    purchaseRequestItemId?: string;
    companyStockDetailId?: string;
    skuCode?: string;
    description?: string;
    uom?: string;
    requestedQuantity?: number;
    estimatedUnitCost?: number;
    lastPurchase?: CompareQuotesLastPurchase | null;
    quoteCount?: number;
    quotes?: CompareQuoteRow[];
}

export interface CompareQuotesSupplierSummary {
    companyCreditorId?: string;
    supplierName?: string;
    quotedLines?: number;
    lowestCostLines?: number;
    totalEffectiveCost?: number | string;
    coversAllItems?: boolean;
}

export interface CompareQuotesData {
    purchaseRequest?: CompareQuotesPurchaseRequest;
    basis?: Record<string, unknown>;
    quotationCount?: number;
    items?: CompareQuoteItem[];
    suppliers?: CompareQuotesSupplierSummary[];
}

export interface CompareQuotesResponse {
    success: boolean;
    message: string;
    data?: CompareQuotesData | null;
}

// --------------------------------------- Convert to POs ---------------------------------------

export interface ConvertSelection {
    supplierQuotationItemId?: string;
    companyStockDetailId?: string;
    supplierQuotationId?: string;
}

export interface ConvertSupplier {
    companyCreditorId: string;
    paymentTerms?: string;
    notes?: string;
}

export interface ConvertToPurchaseOrdersInput {
    purchaseRequestId: string;
    clientDocumentId?: string;
    expectedDeliveryDate?: string;
    selections: ConvertSelection[];
    suppliers: ConvertSupplier[];
}

export interface ConvertToPurchaseOrdersResponse {
    success: boolean;
    message: string;
    data?: {
        poGroupId: string;
        purchaseOrders: unknown[];
    };
}

// --------------------------------------- API ---------------------------------------

export async function getSupplierQuotationList(
    props: SupplierQuotationListFilters,
): Promise<GetSupplierQuotationListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.list.url,
            method: apiUrls.supplierQuotation.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierQuotationList = (props: SupplierQuotationListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierQuotation), props],
        queryFn: async () => await getSupplierQuotationList(props),
    });
};

export async function getSupplierQuotationById(id: string): Promise<GetSupplierQuotationByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.get.url,
            method: apiUrls.supplierQuotation.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSupplierQuotationById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierQuotation), id],
        queryFn: async () => await getSupplierQuotationById(id),
        enabled: !!id,
    });
};

export async function createSupplierQuotation(
    data: SupplierQuotationCreateSchema,
): Promise<MutateSupplierQuotationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.create.url,
            method: apiUrls.supplierQuotation.create.method,
            data,
        })
    ).data;
}

export const useCreateSupplierQuotation = () => {
    return useMutation({ mutationFn: createSupplierQuotation });
};

export async function updateSupplierQuotation(
    data: Record<string, unknown>,
): Promise<MutateSupplierQuotationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.update.url,
            method: apiUrls.supplierQuotation.update.method,
            data,
        })
    ).data;
}

export const useUpdateSupplierQuotation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSupplierQuotation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierQuotation)] });
        },
    });
};

export async function cancelSupplierQuotation(
    id: string,
    cancelReason?: string,
): Promise<MutateSupplierQuotationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.cancel.url,
            method: apiUrls.supplierQuotation.cancel.method,
            data: { id, ...(cancelReason ? { cancelReason } : {}) },
        })
    ).data;
}

export const useCancelSupplierQuotation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, cancelReason }: { id: string; cancelReason?: string }) =>
            cancelSupplierQuotation(id, cancelReason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierQuotation)] });
        },
    });
};

export async function compareSupplierQuotes(
    purchaseRequestId: string,
): Promise<CompareQuotesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.compareQuotes.url,
            method: apiUrls.supplierQuotation.compareQuotes.method,
            data: { purchaseRequestId },
        })
    ).data;
}

export const useCompareSupplierQuotes = (purchaseRequestId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierQuotation), 'compare', purchaseRequestId],
        queryFn: async () => await compareSupplierQuotes(purchaseRequestId),
        enabled: !!purchaseRequestId,
    });
};

export async function convertSupplierQuotations(
    data: ConvertToPurchaseOrdersInput,
): Promise<ConvertToPurchaseOrdersResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierQuotation.convertToPurchaseOrders.url,
            method: apiUrls.supplierQuotation.convertToPurchaseOrders.method,
            data,
        })
    ).data;
}

export const useConvertSupplierQuotations = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: convertSupplierQuotations,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.purchaseOrder)] });
        },
    });
};
