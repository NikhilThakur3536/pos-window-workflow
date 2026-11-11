import { apiUrls, axiosDownloadCSV, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

// --------------------------------------- INVOICE CHECKING ---------------------------------------

export interface InvoiceCheckingFilter {
    limit?: number;
    offset?: number;
    search?: string;
    fromDate?: string;
    toDate?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    companyCreditorId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    discrepancyType?: string;
    isCsv?: boolean;
    csvLabel?: string;
    exportCsv?: boolean;
}

export interface InvoiceCheckingReportRow {
    id: string;
    [key: string]: unknown;
}

export interface GetInvoiceCheckingReportResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: InvoiceCheckingReportRow[];
    };
}

// Single unified report endpoint; the report screens only differ by discrepancyType.
export const INVOICE_REPORT_DISCREPANCY_TYPES = {
    shortage: 'SHORT',
    goodsReturn: 'DAMAGED',
    barcodeMismatch: 'WRONG_ITEM',
} as const;

async function fetchInvoiceCheckingReport(
    discrepancyType: string,
    props: InvoiceCheckingFilter,
    csvKey: 'shortageReport' | 'goodsReturnReport' | 'barcodeMismatchReport' | 'report',
    csvLabel: string,
): Promise<GetInvoiceCheckingReportResponse | void> {
    const body: InvoiceCheckingFilter = {
        ...props,
        discrepancyType,
        startDate: props.startDate || props.fromDate,
        endDate: props.endDate || props.toDate,
    };
    if (props.isCsv) {
        const apiEntry = (apiUrls.invoiceChecking as Record<string, { url: string; method: string }>)[csvKey];
        const response = await axiosInstance({
            url: apiEntry.url,
            method: apiEntry.method,
            data: body,
            // The report endpoints answer with the raw xlsx/csv bytes. responseType blob keeps
            // the binary intact — the default json/utf8 transform corrupts the file.
            responseType: 'blob',
            headers: {
                Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

        const contentDisposition = (response.headers?.['content-disposition'] as string) || '';
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
        const fileName =
            filenameMatch?.[1]?.replace(/"/g, '') ||
            `${(props.csvLabel || csvLabel).replace(/[^\w\-]+/g, '_')}_${discrepancyType}.xlsx`;

        const blob = new Blob([response.data as BlobPart], {
            type:
                (response.headers?.['content-type'] as string) ||
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } else {
        return (
            await axiosInstance({
                url: apiUrls.invoiceChecking.report.url,
                method: apiUrls.invoiceChecking.report.method,
                data: body,
            })
        ).data;
    }
}

// --------------------------------------- Shortage Report ---------------------------------------

export async function getShortageReport(props: InvoiceCheckingFilter) {
    return fetchInvoiceCheckingReport(
        INVOICE_REPORT_DISCREPANCY_TYPES.shortage,
        props,
        'shortageReport',
        'Shortage_Report',
    );
}

export const useGetShortageReport = (props: InvoiceCheckingFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'shortageReport', props],
        queryFn: async () => await getShortageReport(props),
    });
};

// --------------------------------------- Goods Return Report ---------------------------------------

export async function getGoodsReturnReport(props: InvoiceCheckingFilter) {
    return fetchInvoiceCheckingReport(
        INVOICE_REPORT_DISCREPANCY_TYPES.goodsReturn,
        props,
        'goodsReturnReport',
        'Goods_Return_Report',
    );
}

export const useGetGoodsReturnReport = (props: InvoiceCheckingFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'goodsReturnReport', props],
        queryFn: async () => await getGoodsReturnReport(props),
    });
};

// --------------------------------------- Barcode Mismatch Report ---------------------------------------

export async function getBarcodeMismatchReport(props: InvoiceCheckingFilter) {
    return fetchInvoiceCheckingReport(
        INVOICE_REPORT_DISCREPANCY_TYPES.barcodeMismatch,
        props,
        'barcodeMismatchReport',
        'Barcode_Mismatch_Report',
    );
}

export const useGetBarcodeMismatchReport = (props: InvoiceCheckingFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'barcodeMismatchReport', props],
        queryFn: async () => await getBarcodeMismatchReport(props),
    });
};

// --------------------------------------- Discrepancy Report (all types) ---------------------------------------

export interface DiscrepancyReportSummaryByType {
    count: number;
    expectedQty: number;
    actualQty: number;
    varianceQty: number;
    totalValue: number;
}

export interface DiscrepancyReportSummary {
    totalSessions: number;
    totalDiscrepanciesCount: number;
    totalExpectedQuantity: number;
    totalActualQuantity: number;
    totalShortageQuantity: number;
    totalShortageValue: number;
    totalExcessQuantity: number;
    totalDamagedQuantity: number;
    summaryByDiscrepancyType: Record<string, DiscrepancyReportSummaryByType>;
}

export interface DiscrepancyReportItemizedRow {
    sessionId?: string;
    direction?: string;
    sourceDocumentType?: string;
    sourceDocumentNumber?: string;
    warehouseId?: string | null;
    warehouseName?: string;
    companyName?: string;
    debtorName?: string;
    companyCreditorName?: string;
    companyDebtorName?: string;
    storeName?: string;
    supplierName?: string;
    companyStockDetailId?: string;
    itemCode?: string;
    itemDescription?: string;
    sequenceNo?: number;
    discrepancyType?: string;
    expectedQuantity?: number;
    actualQuantity?: number;
    shortageQuantity?: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    unresolvedQuantity?: number;
    unitPrice?: number;
    shortageValue?: number;
    reason?: string;
    expectedBarcode?: string;
    scannedBarcode?: string;
    discrepancyStatus?: string;
    sessionStatus?: string;
    checkedBy?: string;
    date?: string;
}

export interface GetDiscrepancyReportResponse {
    success: boolean;
    message?: string;
    data: {
        summary: DiscrepancyReportSummary;
        itemizedRows: DiscrepancyReportItemizedRow[];
    };
}

export async function getDiscrepancyReport(props: InvoiceCheckingFilter) {
    return (await fetchInvoiceCheckingReport(
        (props.discrepancyType as string) || INVOICE_REPORT_DISCREPANCY_TYPES.shortage,
        props,
        'report',
        'Discrepancy_Report',
    )) as unknown as GetDiscrepancyReportResponse | void;
}

export const useGetDiscrepancyReport = (props: InvoiceCheckingFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'discrepancyReport', props],
        queryFn: async () => await getDiscrepancyReport(props),
    });
};

// --------------------------------------- Reason Master (Shared Stock Adjustment Reason) ---------------------------------------
//
// Warehouse and retail use the SAME reason master via /api/company/stockAdjustmentReason/*.
// Only ACTIVE reasons are selectable for new transactions. Responses retain reasonId,
// reason (text snapshot) and notes for historical reporting.

export interface ShortageReturnReason {
    id: string;
    reason?: string;
    description?: string;
    timezone?: string;
    status?: 'ACTIVE' | 'INACTIVE' | string;
    ledgerAccountId?: string;
    name?: string;
    active?: boolean;
    isActive?: boolean;
    type?: 'SHORTAGE' | 'RETURN' | string;
    createdAt?: string;
    updatedAt?: string;
}

export interface GetReasonMasterResponse {
    success: boolean;
    message: string;
    count: number;
    data: ShortageReturnReason[];
}

export interface ReasonMasterFilter {
    limit?: number;
    offset?: number;
    search?: string;
    type?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
}

export async function getReasonMasterList(props: ReasonMasterFilter): Promise<GetReasonMasterResponse | void> {
    if (props.isCsv) {
        axiosDownloadCSV({
            filters: props,
            key: 'invoiceChecking',
            listType: 'reasonMasterList',
            label: props.csvLabel || 'Invoice_Checking_Reason_Master',
        });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.stockAdjustmentReason.all.url,
                method: apiUrls.stockAdjustmentReason.all.method,
                data: props,
            })
        ).data;
    }
}

export const useGetReasonMasterList = (props: ReasonMasterFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockAdjustmentReason.all), 'reasonMasterList', props],
        queryFn: async () => await getReasonMasterList(props),
    });
};

export const shortageReturnReasonSchema = z.object({
    reason: z.string().min(1, 'Reason is required'),
    description: z.string().optional(),
    timezone: z.string().min(1, 'Timezone is required'),
    status: z.enum(['ACTIVE', 'INACTIVE']),
    ledgerAccountId: z.string().optional(),
});

export type ShortageReturnReasonPayload = z.infer<typeof shortageReturnReasonSchema>;

export async function createReasonMaster(data: ShortageReturnReasonPayload) {
    return (
        await axiosInstance({
            url: apiUrls.stockAdjustmentReason.create.url,
            method: apiUrls.stockAdjustmentReason.create.method,
            data,
        })
    ).data;
}

export const useCreateReasonMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createReasonMaster,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stockAdjustmentReason.all), 'reasonMasterList'],
            }),
    });
};

export async function updateReasonMaster(data: Partial<ShortageReturnReasonPayload> & { id: string }) {
    return (
        await axiosInstance({
            url: apiUrls.stockAdjustmentReason.update.url,
            method: apiUrls.stockAdjustmentReason.update.method,
            data,
        })
    ).data;
}

export const useUpdateReasonMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateReasonMaster,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stockAdjustmentReason.all), 'reasonMasterList'],
            }),
    });
};

export interface GetReasonMasterByIdResponse {
    success: boolean;
    message: string;
    data: ShortageReturnReason;
}

export async function getReasonMasterById(id: string): Promise<GetReasonMasterByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockAdjustmentReason.get.url,
            method: apiUrls.stockAdjustmentReason.get.method,
            data: { id },
        })
    ).data;
}

export const useGetReasonMasterById = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockAdjustmentReason.get), 'reasonMasterById', id],
        queryFn: async () => await getReasonMasterById(id as string),
        enabled: !!id,
    });
};

// Delete removes the master record for good. Historical transactions keep the
// snapshot of reason/description they were recorded against.
export async function deleteReasonMaster(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.stockAdjustmentReason.delete.url,
            method: apiUrls.stockAdjustmentReason.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteReasonMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteReasonMaster,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stockAdjustmentReason.all), 'reasonMasterList'],
            }),
    });
};

// --------------------------------------- Invoice Checking Workflow ---------------------------------------
//
// An invoice-check session moves through the delivery status flow:
//   OPEN -> CHECKING -> REVIEW -> APPROVED   (or CANCELLED)
// Opening the check creates the session (OPEN). Physical counting (check) moves
// it to CHECKING, or straight to REVIEW when no discrepancies exist. Resolving
// all discrepancies moves it to REVIEW. Manager sign-off moves it to APPROVED.
// Check / resolve / approve / cancel are protected actions and may respond with
// HTTP 428 APPROVAL_REQUIRED; resubmit with an X-Approval-Token header.

export const INVOICE_CHECK_DIRECTIONS = ['INCOMING', 'OUTGOING'] as const;
export type InvoiceCheckDirection = (typeof INVOICE_CHECK_DIRECTIONS)[number];

export const INVOICE_CHECK_STATUSES = ['OPEN', 'CHECKING', 'REVIEW', 'APPROVED', 'POSTED', 'CANCELLED'] as const;
export type InvoiceCheckStatus = (typeof INVOICE_CHECK_STATUSES)[number];

export const INVOICE_DISCREPANCY_ACTIONS = ['ACCEPT', 'RETURN', 'CLAIM', 'ADJUST', 'REJECT'] as const;
export type InvoiceDiscrepancyAction = (typeof INVOICE_DISCREPANCY_ACTIONS)[number];

// Linkage documents available when resolving a discrepancy. RETURNED_GOODS and
// RETURN_NOTE are intentionally absent: the Goods Return screen posts to
// /api/company/debitNote/create, so a goods return IS a Debit Note and the
// backend reverses stock off that document.
export const INVOICE_LINKED_DOCUMENT_TYPES = [
    'DEBIT_NOTE',
    'CREDIT_NOTE',
    'GOODS_RECEIVING_CLAIM',
    'STOCK_MOVEMENT',
] as const;
export type InvoiceLinkedDocumentType = (typeof INVOICE_LINKED_DOCUMENT_TYPES)[number];

// Which linkage types each action accepts. ACCEPT and REJECT resolve the line on
// their own and require no linkage.
export const INVOICE_LINKED_DOCUMENT_TYPES_BY_ACTION: Record<string, readonly InvoiceLinkedDocumentType[]> = {
    RETURN: ['DEBIT_NOTE', 'CREDIT_NOTE', 'STOCK_MOVEMENT'],
    CLAIM: ['DEBIT_NOTE', 'CREDIT_NOTE', 'GOODS_RECEIVING_CLAIM'],
    ADJUST: ['DEBIT_NOTE', 'CREDIT_NOTE', 'STOCK_MOVEMENT'],
    ACCEPT: [],
    REJECT: [],
};

export const linkedDocumentTypesForAction = (action?: string): readonly InvoiceLinkedDocumentType[] =>
    INVOICE_LINKED_DOCUMENT_TYPES_BY_ACTION[action || ''] || [];

// The backend accepts either the document UUID or its printed number, so the
// picker sends the printed number when the source row exposes one and falls back
// to the UUID otherwise (goods receiving claims carry no printed number).
export interface InvoiceLinkageDocument {
    id: string;
    value: string;
    label: string;
    meta?: string;
}

const LINKAGE_NUMBER_FIELDS = [
    'debitNoteNumber',
    'creditNoteNumber',
    'claimNumber',
    'number',
    'documentNumber',
    'stockMovementNumber',
    'movementNumber',
    'reference',
    'referenceNumber',
    'supplierInvoiceNumber',
];

const pickString = (row: Record<string, unknown>, keys: string[]): string | undefined => {
    for (const key of keys) {
        const value = row[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
        if (typeof value === 'number') return String(value);
    }
    return undefined;
};

const normalizeLinkageRow = (raw: unknown): InvoiceLinkageDocument | null => {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const id = pickString(row, ['id', 'stockMovementId', 'claimId']);
    if (!id) return null;

    const number = pickString(row, LINKAGE_NUMBER_FIELDS);
    const date = pickString(row, ['debitNoteDate', 'creditNoteDate', 'claimDate', 'movementDate', 'date', 'createdAt']);
    const party =
        (row.CompanyCreditor as { name?: string } | undefined)?.name ||
        (row.CompanyDebtor as { name?: string } | undefined)?.name ||
        pickString(row, ['name']);

    const label = number || id;
    return {
        id,
        value: number || id,
        label,
        meta: [date, party].filter(Boolean).join(' · ') || undefined,
    };
};

const extractRows = (payload: unknown): unknown[] => {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return [];
    const data = (payload as { data?: unknown }).data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { rows?: unknown }).rows)) {
        return (data as { rows: unknown[] }).rows;
    }
    return [];
};

export async function getInvoiceLinkageDocuments(
    type: InvoiceLinkedDocumentType,
): Promise<{ success: boolean; message?: string; data: InvoiceLinkageDocument[] }> {
    const map = {
        DEBIT_NOTE: apiUrls.goodsReturn.list,
        CREDIT_NOTE: apiUrls.creditNotes.list,
        GOODS_RECEIVING_CLAIM: apiUrls.goodsReceivingClaims.all,
        STOCK_MOVEMENT: apiUrls.stockMovements.all,
    } as const;
    const endpoint = map[type];

    const response = await axiosInstance({
        url: endpoint.url,
        method: endpoint.method,
        data: { limit: 100 },
    });

    const rows = extractRows(response?.data)
        .map((row) => normalizeLinkageRow(row))
        .filter((row): row is InvoiceLinkageDocument => !!row);

    return { success: true, data: rows };
}

export const useGetInvoiceLinkageDocuments = (type?: InvoiceLinkedDocumentType) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'linkage-documents', type],
        queryFn: () => getInvoiceLinkageDocuments(type as InvoiceLinkedDocumentType),
        enabled: !!type,
        staleTime: 60 * 1000,
    });
};

export const INVOICE_DISCREPANCY_TYPES = [
    'SHORT',
    'EXCESS',
    'DAMAGED',
    'WRONG_ITEM',
    'PRICE',
    'EXPIRY',
    'NONE',
] as const;
export type InvoiceDiscrepancyType = (typeof INVOICE_DISCREPANCY_TYPES)[number];

export const INVOICE_SOURCE_DOCUMENT_TYPES = [
    'GRV',
    'PURCHASE_ORDER',
    'GOODS_RECEIVING',
    'SALES_ORDER',
    // 'DELIVERY_NOTE',
    // 'OTHER',
] as const;
export type InvoiceSourceDocumentType = (typeof INVOICE_SOURCE_DOCUMENT_TYPES)[number];

export interface InvoiceCheckingItemRecord {
    // Present once a check has been recorded; the open response exposes the same value
    // under data.discrepancies[].id.
    id?: string;
    sequenceNo?: number;
    companyStockDetailId: string;
    itemCode?: string;
    description?: string;
    expectedQuantity: number;
    expectedUnitPrice?: number;
    batchNumber?: string;
    expiryDate?: string;
    actualQuantity?: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    unresolvedQuantity?: number;
    discrepancyType?: string;
    reason?: string;
    actualUnitPrice?: number;
    photoUrls?: string[];
}

export interface InvoiceCheckUserRef {
    id: string;
    firstName?: string;
    surname?: string;
    staffNumber?: number;
    email?: string;
}

export interface InvoiceCheckPartyRef {
    id?: string;
    name?: string;
    accountNumber?: string;
    emailAddress?: string | null;
    cellphoneNumber?: string | null;
}

// The warehouse object is keyed on `warehouse`/`description`, not `name`.
export interface InvoiceCheckWarehouseRef {
    id?: string;
    warehouse?: string;
    description?: string | null;
    status?: string;
    excludeFromAvailableStock?: boolean;
}

export interface InvoiceCheckSourceDocumentRef {
    type?: string;
    id?: string;
    number?: string | null;
    reference?: string | null;
}

// Server-computed roll-up of the discrepancy lines on the session.
export interface InvoiceCheckSummary {
    lineCount?: number;
    openCount?: number;
    resolvedCount?: number;
    discrepancyCount?: number;
    expectedQuantity?: number;
    actualQuantity?: number;
    acceptedQuantity?: number;
    rejectedQuantity?: number;
    unresolvedQuantity?: number;
    totalValue?: number;
    varianceValue?: number;
}

export interface InvoiceCheckingStockDetail {
    id: string;
    itemCode?: string;
    description?: string;
    alternativeDescription?: string | null;
    barcode?: string | null;
    unitCode?: string | null;
}

export interface InvoiceCheckResolution {
    id?: string;
    action?: string;
    quantity?: string | number;
    reason?: string;
    linkedDocumentType?: string;
    linkedDocumentId?: string;
    status?: string;
}

export interface InvoiceCheckDiscrepancy {
    id?: string;
    sequenceNo?: number;
    companyStockDetailId?: string;
    itemCode?: string;
    description?: string;
    expectedQuantity?: string | number;
    actualQuantity?: string | number;
    acceptedQuantity?: string | number;
    rejectedQuantity?: string | number;
    unresolvedQuantity?: string | number;
    quantity?: string | number;
    discrepancyType?: string;
    expectedUnitPrice?: string | number | null;
    actualUnitPrice?: string | number | null;
    reasonId?: string | null;
    reason?: string | null;
    notes?: string | null;
    photoUrls?: string[] | null;
    batchNumber?: string | null;
    expiryDate?: string | null;
    status?: string;
    expectedBarcode?: string | null;
    scannedBarcode?: string | null;
    stockDetail?: InvoiceCheckingStockDetail | null;
    resolutions?: InvoiceCheckResolution[];
    // Signed deltas against the expected line: actual - expected, and its money value.
    varianceQuantity?: number;
    lineValue?: number;
    varianceValue?: number;
    createdBy?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface InvoiceCheckingSession {
    id: string;
    clientDocumentId?: string;
    sourceDocumentType?: string;
    sourceDocumentId?: string | null;
    sourceDocumentNumber?: string;
    direction?: InvoiceCheckDirection;
    companyDebtorId?: string | null;
    companyDebtorName?: string;
    companyCreditorId?: string | null;
    companyCreditorName?: string;
    companyDebtor?: InvoiceCheckPartyRef | null;
    companyCreditor?: InvoiceCheckPartyRef | null;
    warehouseId?: string | null;
    warehouseName?: string;
    warehouse?: InvoiceCheckWarehouseRef | null;
    sourceDocument?: InvoiceCheckSourceDocumentRef | null;
    summary?: InvoiceCheckSummary | null;
    locationId?: string | null;
    stockMovementDocumentId?: string | null;
    notes?: string | null;
    status: InvoiceCheckStatus;
    checkoutStage?: string;
    items?: InvoiceCheckingItemRecord[];
    discrepancies?: InvoiceCheckDiscrepancy[];
    checkedBy?: string | null;
    approvedBy?: string | null;
    postedBy?: string | null;
    createdBy?: string | null;
    checkedByUser?: InvoiceCheckUserRef | null;
    approvedByUser?: InvoiceCheckUserRef | null;
    postedByUser?: InvoiceCheckUserRef | null;
    createdByUser?: InvoiceCheckUserRef | null;
    startedAt?: string;
    completedAt?: string | null;
    createdByUserId?: string;
    createdByName?: string;
    checkedById?: string;
    checkedByName?: string;
    checkedAt?: string;
    resolvedById?: string;
    resolvedByName?: string;
    resolvedAt?: string;
    approvedById?: string;
    approvedByName?: string;
    approvedAt?: string;
    postedById?: string;
    postedByName?: string;
    postedAt?: string;
    cancelledById?: string;
    cancelledByName?: string;
    cancelledAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface InvoiceCheckListFilter {
    limit?: number;
    offset?: number;
    search?: string;
    status?: InvoiceCheckStatus | string;
    direction?: InvoiceCheckDirection | string;
    sourceDocumentType?: string;
    companyDebtorId?: string;
}

export interface GetInvoiceCheckListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: InvoiceCheckingSession[];
    };
}

export async function getInvoiceCheckList(props: InvoiceCheckListFilter): Promise<GetInvoiceCheckListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.all.url,
            method: apiUrls.invoiceChecking.all.method,
            data: props,
        })
    ).data;
}

export const useGetInvoiceCheckList = (props: InvoiceCheckListFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'all', props],
        queryFn: async () => await getInvoiceCheckList(props),
    });
};

export interface GetInvoiceCheckByIdResponse {
    success: boolean;
    message: string;
    data: InvoiceCheckingSession;
}

export async function getInvoiceCheckById(id: string): Promise<GetInvoiceCheckByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.get.url,
            method: apiUrls.invoiceChecking.get.method,
            data: { id },
        })
    ).data;
}

export const useGetInvoiceCheckById = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.invoiceChecking), 'get', id],
        enabled: !!id,
        queryFn: async () => await getInvoiceCheckById(id as string),
    });
};

// Open a new invoice-checking session (from a supplier invoice or a retail store delivery).

export interface OpenInvoiceCheckItemInput {
    companyStockDetailId: string;
    expectedQuantity: number;
    expectedUnitPrice?: number;
    batchNumber?: string;
    expiryDate?: string;
}

export interface OpenInvoiceCheckInput {
    clientDocumentId: string;
    sourceDocumentType: string;
    sourceDocumentId?: string;
    sourceDocumentNumber?: string;
    direction: InvoiceCheckDirection;
    companyDebtorId?: string;
    companyCreditorId?: string;
    warehouseId?: string;
    notes?: string;
    items: OpenInvoiceCheckItemInput[];
}

export const openInvoiceCheckSchema = z.object({
    clientDocumentId: z.string().min(1, 'Client document id is required'),
    sourceDocumentType: z.string().min(1, 'Source document type is required'),
    sourceDocumentId: z.string().optional(),
    sourceDocumentNumber: z.string().optional(),
    direction: z.enum(INVOICE_CHECK_DIRECTIONS),
    companyDebtorId: z.string().optional(),
    companyCreditorId: z.string().optional(),
    warehouseId: z.string().optional(),
    notes: z.string().optional(),
    items: z
        .array(
            z.object({
                companyStockDetailId: z.string().min(1, 'Product is required'),
                expectedQuantity: z.number().min(1, 'Expected quantity must be at least 1'),
                expectedUnitPrice: z.number().min(0).optional(),
                batchNumber: z.string().optional(),
                expiryDate: z.string().optional(),
            }),
        )
        .min(1, 'At least one item is required'),
});

export async function openInvoiceCheck(
    data: OpenInvoiceCheckInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.open.url,
            method: apiUrls.invoiceChecking.open.method,
            data,
        })
    ).data;
}

export const useOpenInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: openInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};

// Bind a source document to an existing session (prefill expected items).

export async function validateInvoiceSource(data: {
    sourceDocumentType: string;
    sourceDocumentId: string;
}): Promise<{ success: boolean; message: string; data?: Partial<InvoiceCheckingSession> }> {
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.validateSource.url,
            method: apiUrls.invoiceChecking.validateSource.method,
            data,
        })
    ).data;
}

export const useValidateInvoiceSource = () => {
    return useMutation({
        mutationFn: validateInvoiceSource,
    });
};

// Record (check) actual quantities, counting accepted/rejected/unresolved quantities per line.

export interface CheckInvoiceCheckItemInput {
    // The discrepancy id from the open response (data.discrepancies[].id). This is how the
    // backend matches a checked line back to the expected line, so prefer it over sequenceNo.
    id?: string;
    sequenceNo?: number;
    expectedQuantity?: number;
    actualQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    unresolvedQuantity: number;
    discrepancyType?: string;
    reasonId?: string;
    reason?: string;
    notes?: string;
    expectedBarcode?: string;
    scannedBarcode?: string;
    actualUnitPrice?: number;
    photoUrls?: string[];
}

export interface CheckInvoiceCheckInput {
    id: string;
    direction?: InvoiceCheckDirection;
    items: CheckInvoiceCheckItemInput[];
    approvalToken?: string;
}

export async function checkInvoiceCheck(
    data: CheckInvoiceCheckInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.check.url,
            method: apiUrls.invoiceChecking.check.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCheckInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};

// Resolve discrepancies (link supplier returns / credit notes to the session).

export interface InvoiceCheckResolutionInput {
    discrepancyId?: string;
    action?: InvoiceDiscrepancyAction;
    quantity?: number;
    reasonId?: string;
    reason?: string;
    linkedDocumentType?: InvoiceLinkedDocumentType;
    linkedDocumentId?: string;
}

export interface ResolveInvoiceCheckInput {
    id: string;
    reasonId?: string;
    reason?: string;
    resolutions: InvoiceCheckResolutionInput[];
    approvalToken?: string;
}

export async function resolveInvoiceCheck(
    data: ResolveInvoiceCheckInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.invoiceChecking.resolve.url,
            method: apiUrls.invoiceChecking.resolve.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useResolveInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};

// Approve / post / cancel are protected lifecycle actions.

// Posting a check that had a variance is a supervisor-gated action. The backend answers with
// HTTP 428 and the approver's token must then be resent as approvalTokens[<actionCode>].
export const INVOICE_CHECK_APPROVE_ACTION_CODE = 'INVOICE_CHECK_APPROVE';

export interface InvoiceCheckLifecycleInput {
    id: string;
    reason?: string;
    approvalToken?: string;
    // Action code the token was granted for. Defaults to INVOICE_CHECK_APPROVE for post.
    approvalActionCode?: string;
}

async function invoiceCheckLifecycle(
    api: { url: string; method: string },
    data: InvoiceCheckLifecycleInput,
    defaultActionCode?: string,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    const { approvalToken, approvalActionCode, ...payload } = data;
    const actionCode = approvalActionCode || defaultActionCode;
    return (
        await axiosInstance({
            url: api.url,
            method: api.method,
            data: {
                ...payload,
                // Documented retry shape: {"approvalTokens": {"<ACTION_CODE>": "<token>"}}.
                ...(approvalToken && actionCode ? { approvalTokens: { [actionCode]: approvalToken } } : {}),
            },
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export async function approveInvoiceCheck(
    data: InvoiceCheckLifecycleInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    return invoiceCheckLifecycle(apiUrls.invoiceChecking.approve, data);
}

export const useApproveInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};

export async function postInvoiceCheck(
    data: InvoiceCheckLifecycleInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    return invoiceCheckLifecycle(apiUrls.invoiceChecking.post, data, INVOICE_CHECK_APPROVE_ACTION_CODE);
}

export const usePostInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};

export async function cancelInvoiceCheck(
    data: InvoiceCheckLifecycleInput,
): Promise<{ success: boolean; message: string; data?: InvoiceCheckingSession }> {
    return invoiceCheckLifecycle(apiUrls.invoiceChecking.cancel, data);
}

export const useCancelInvoiceCheck = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelInvoiceCheck,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.invoiceChecking)] });
        },
    });
};
