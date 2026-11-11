import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- 3143 PRICE-MISMATCH CREDIT NOTE ---------------------------------------
//
// Creates a credit note for the price difference only. It does not return or
// increase stock. Example: invoiced price 100, correct price 90, quantity 2
// => credit amount 20.
//
// The backend calculates every variance from the original invoice price and the
// expected price - the FE must never send or trust client-calculated totals.
//
// Use /mt/create only when the original invoice is multi-tax.
//
// Protected actions may return HTTP 428 APPROVAL_REQUIRED; re-submit with the
// X-Approval-Token header after supervisor approval. Reusing the same
// clientDocumentId returns the original result and prevents duplicate posting.

// --------------------------------------- Types ---------------------------------------

export type PriceMismatchStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'POSTED' | string;

export interface PriceMismatchItemInput {
    originalInvoiceItemId: string;
    expectedUnitPrice: number;
    quantity: number;
}

export interface PriceMismatchItemPreview {
    originalInvoiceItemId?: string;
    description?: string;
    itemCode?: string;
    chargedUnitPrice?: number;
    expectedUnitPrice?: number;
    priceVarianceUnitAmount?: number;
    quantity?: number;
    priceVarianceAmount?: number;
    lineTotal?: number;
    [key: string]: unknown;
}

export interface PriceMismatchPreviewInput {
    originalDocumentId: string;
    companyDebtorId: string;
    priceMismatchReason?: string;
    items: PriceMismatchItemInput[];
}

export interface PriceMismatchPreviewResponse {
    success: boolean;
    message?: string;
    data?: {
        items?: PriceMismatchItemPreview[];
        totalAmount?: number;
        creditNoteAmount?: number;
        taxAmount?: number;
        [key: string]: unknown;
    } | null;
}

export async function previewPriceMismatch(
    data: PriceMismatchPreviewInput,
): Promise<PriceMismatchPreviewResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.preview.url,
            method: apiUrls.creditNotePriceMismatch.preview.method,
            data,
        })
    ).data;
}

export const usePriceMismatchPreview = () => {
    return useMutation({
        mutationFn: previewPriceMismatch,
    });
};

export function toPreviewItems(data: PriceMismatchPreviewResponse['data']): PriceMismatchItemPreview[] {
    if (!data) return [];
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data)) return data as PriceMismatchItemPreview[];
    return [];
}

// --------------------------------------- Create (normal / multi-tax) ---------------------------------------

export interface CreatePriceMismatchCreditNoteInput {
    creditNoteType: 'PRICE_MISMATCH';
    clientDocumentId: string;
    originalDocumentId: string;
    companyDebtorId: string;
    creditNoteDate: string;
    creditNoteMemo?: string;
    priceMismatchReason?: string;
    timezone: string;
    items: PriceMismatchItemInput[];
    approvalToken?: string;
}

export interface PriceMismatchRawItem extends PriceMismatchItemPreview {
    lineTotal?: number;
    unitPrice?: number;
    taxRateId?: string;
    taxName?: string;
    taxPercent?: number;
    CompanyStockDetail?: { itemCode?: string; description?: string } | null;
}

export interface PriceMismatchCreditNote {
    id?: string;
    creditNoteId?: string;
    creditNoteNumber?: string;
    invoiceNumber?: string;
    creditNoteDate?: string;
    creditNoteType?: 'STANDARD' | 'PRICE_MISMATCH';
    priceMismatchReason?: string;
    priceMismatchStatus?: PriceMismatchStatus;
    originalDocumentId?: string;
    companyDebtorId?: string;
    debtorName?: string;
    accountNumber?: string;
    clientDocumentId?: string;
    creditNoteAmount?: number;
    totalAmount?: number;
    amount?: number;
    goodsTotal?: number;
    taxAmount?: number;
    discountAmount?: number;
    unallocatedAmount?: number;
    creditNoteInclusive?: boolean;
    createdAt?: string;
    items?: PriceMismatchItemPreview[];
    creditNoteItems?: PriceMismatchRawItem[] | null;
    CompanyDebtor?: { id?: string; name?: string; accountNumber?: string } | null;
    customerDetails?: { name?: string; accountNumber?: string } | null;
    isMultiTax?: boolean;
    [key: string]: unknown;
}

export interface MutatePriceMismatchResponse {
    success: boolean;
    message?: string;
    data?: PriceMismatchCreditNote | null;
}

export async function createPriceMismatchCreditNote(
    data: CreatePriceMismatchCreditNoteInput,
): Promise<MutatePriceMismatchResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.create.url,
            method: apiUrls.creditNotePriceMismatch.create.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export async function createPriceMismatchCreditNoteMt(
    data: CreatePriceMismatchCreditNoteInput,
): Promise<MutatePriceMismatchResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.createMt.url,
            method: apiUrls.creditNotePriceMismatch.createMt.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCreatePriceMismatchCreditNote = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPriceMismatchCreditNote,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotePriceMismatch)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

export const useCreatePriceMismatchCreditNoteMt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPriceMismatchCreditNoteMt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotePriceMismatch)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

// --------------------------------------- List (normal / multi-tax) ---------------------------------------

export interface PriceMismatchListFilter {
    creditNoteType?: 'PRICE_MISMATCH' | string;
    priceMismatchStatus?: PriceMismatchStatus;
    companyDebtorId?: string;
    limit?: number;
    offset?: number;
}

export interface PriceMismatchListResponse {
    success: boolean;
    message?: string;
    data?: {
        count?: number;
        rows?: PriceMismatchCreditNote[];
        items?: PriceMismatchCreditNote[];
    } | null;
}

export async function getPriceMismatchCreditNotes(
    props: PriceMismatchListFilter,
): Promise<PriceMismatchListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.list.url,
            method: apiUrls.creditNotePriceMismatch.list.method,
            data: { creditNoteType: 'PRICE_MISMATCH', ...props },
        })
    ).data;
}

export function useGetPriceMismatchCreditNotes(props: PriceMismatchListFilter | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotePriceMismatch.list.url), props],
        enabled: !!props && (!!props.companyDebtorId || !!props.priceMismatchStatus),
        queryFn: async () => await getPriceMismatchCreditNotes(props as PriceMismatchListFilter),
    });
}

export async function getPriceMismatchCreditNotesMt(
    props: PriceMismatchListFilter,
): Promise<PriceMismatchListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.listMt.url,
            method: apiUrls.creditNotePriceMismatch.listMt.method,
            data: { creditNoteType: 'PRICE_MISMATCH', ...props },
        })
    ).data;
}

export function useGetPriceMismatchCreditNotesMt(props: PriceMismatchListFilter | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotePriceMismatch.listMt.url), props],
        enabled: !!props && (!!props.companyDebtorId || !!props.priceMismatchStatus),
        queryFn: async () => await getPriceMismatchCreditNotesMt(props as PriceMismatchListFilter),
    });
}

// --------------------------------------- Response normalization ---------------------------------------
//
// The list/get endpoints return a flat credit-note document: the debtor lives under
// CompanyDebtor/customerDetails, the amount is goodsTotal (+ tax when not inclusive),
// items come back as creditNoteItems with nested CompanyStockDetail, and the variance
// fields are strings. Everything is lifted/typed here so the UI can read the fields
// directly (debtorName, accountNumber, creditNoteAmount, isMultiTax, items, ...).

export function normalizePriceMismatchItem(item: PriceMismatchRawItem): PriceMismatchItemPreview {
    const stock = item?.CompanyStockDetail;
    return {
        ...item,
        itemCode: item?.itemCode || stock?.itemCode,
        description: item?.description || stock?.description,
        quantity: Number(item?.quantity || 0),
        unitPrice: Number(item?.unitPrice || 0),
        lineTotal: Number(item?.lineTotal || 0),
        chargedUnitPrice: Number(item?.chargedUnitPrice || 0),
        expectedUnitPrice: Number(item?.expectedUnitPrice || 0),
        priceVarianceUnitAmount: Number(item?.priceVarianceUnitAmount || 0),
        priceVarianceAmount: Number(item?.priceVarianceAmount || 0),
    };
}

export function normalizePriceMismatchCreditNote(
    row: PriceMismatchCreditNote,
    isMultiTaxList?: boolean,
): PriceMismatchCreditNote {
    const rawItems = Array.isArray(row.creditNoteItems)
        ? row.creditNoteItems
        : Array.isArray(row.items)
          ? (row.items as PriceMismatchRawItem[])
          : [];
    const items = rawItems.map(normalizePriceMismatchItem);
    const goodsTotal = Number(row.goodsTotal || 0);
    const taxAmount = Number(row.taxAmount || 0);
    const fallbackAmount = row.creditNoteInclusive ? goodsTotal : goodsTotal + taxAmount;
    const taxRateIds = new Set(items.map((item) => item.taxRateId).filter(Boolean));
    return {
        ...row,
        creditNoteNumber: row.creditNoteNumber || row.invoiceNumber,
        debtorName: row.debtorName || row.CompanyDebtor?.name || row.customerDetails?.name || undefined,
        accountNumber:
            row.accountNumber || row.CompanyDebtor?.accountNumber || row.customerDetails?.accountNumber || undefined,
        creditNoteAmount: Number(
            row.creditNoteAmount ?? row.totalAmount ?? row.amount ?? fallbackAmount,
        ),
        isMultiTax: typeof row.isMultiTax === 'boolean' ? row.isMultiTax : isMultiTaxList ?? taxRateIds.size > 1,
        items,
    };
}

export function toPriceMismatchRows(
    data: PriceMismatchListResponse['data'],
    isMultiTaxList?: boolean,
): PriceMismatchCreditNote[] {
    let rows: PriceMismatchCreditNote[] = [];
    if (!data) rows = [];
    else if (Array.isArray(data.rows)) rows = data.rows;
    else if (Array.isArray(data.items)) rows = data.items;
    else rows = [];
    return rows.map((row) => normalizePriceMismatchCreditNote(row, isMultiTaxList));
}

// --------------------------------------- Get (normal / multi-tax) ---------------------------------------

export interface GetPriceMismatchCreditNoteInput {
    creditNoteId: string;
}

export async function getPriceMismatchCreditNote(
    input: GetPriceMismatchCreditNoteInput,
): Promise<MutatePriceMismatchResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.get.url,
            method: apiUrls.creditNotePriceMismatch.get.method,
            data: input,
        })
    ).data;
}

export async function getPriceMismatchCreditNoteMt(
    input: GetPriceMismatchCreditNoteInput,
): Promise<MutatePriceMismatchResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotePriceMismatch.getMt.url,
            method: apiUrls.creditNotePriceMismatch.getMt.method,
            data: input,
        })
    ).data;
}

export const useGetPriceMismatchCreditNote = (creditNoteId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotePriceMismatch.get.url), creditNoteId],
        enabled: !!creditNoteId,
        queryFn: async () => await getPriceMismatchCreditNote({ creditNoteId: creditNoteId as string }),
    });
};

export const useGetPriceMismatchCreditNoteMt = (creditNoteId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotePriceMismatch.getMt.url), creditNoteId],
        enabled: !!creditNoteId,
        queryFn: async () => await getPriceMismatchCreditNoteMt({ creditNoteId: creditNoteId as string }),
    });
};