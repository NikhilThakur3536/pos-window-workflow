import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import moment from 'moment';

// --------------------------------------- 3045 DEBTOR PAYMENT RECONCILIATION / 3046 AGEING ---------------------------------------
//
// Reconciliation compares receipts / credit notes, their allocations and invoice
// balances. It exposes summary, unmatched and mismatch lists, eligible invoices
// for a source (RECEIPT or CREDIT_NOTE), posting reconciliations and reversing
// them. Invoice ageing and credit allocation reuse the same eligible/reconcile/reverse
// endpoints.
//
// Only invoices of the same debtor can be selected and allocation can never exceed
// either the source's unallocated amount or the invoice's outstanding amount.
//
// Protected actions may return HTTP 428 APPROVAL_REQUIRED; re-submit with the
// X-Approval-Token header after supervisor approval.

// --------------------------------------- Shared types ---------------------------------------

export type ReconciliationSourceType = 'RECEIPT' | 'CREDIT_NOTE';

export interface AllocationLine {
    debtorInvoicingOrderId: string;
    allocatedAmount: number;
}

export interface ReconciliationFilters {
    companyDebtorId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

// --------------------------------------- Summary ---------------------------------------

export interface ReconciliationSummary {
    count?: number;
    matched?: number;
    unallocated?: number;
    mismatches?: number;
    sourceAmount?: number;
    allocatedAmount?: number;
    unallocatedAmount?: number;
    difference?: number;
    matchedCount?: number;
    matchedAmount?: number;
    unallocatedCount?: number;
    mismatchCount?: number;
    mismatchAmount?: number;
    totalCount?: number;
    totalAmount?: number;
    [key: string]: unknown;
}

export interface ReconciliationSummaryResponse {
    success: boolean;
    message?: string;
    data?: ReconciliationSummary | null;
}

export async function getReconciliationSummary(
    props: ReconciliationFilters,
): Promise<ReconciliationSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.summary.url,
            method: apiUrls.debtorReconciliation.summary.method,
            data: props,
        })
    ).data;
}

export function useGetReconciliationSummary(props: ReconciliationFilters) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.summary.url), props],
        queryFn: async () => await getReconciliationSummary(props),
    });
}

// --------------------------------------- Unmatched ---------------------------------------

export interface ReconciliationDebtorRef {
    id?: string;
    name?: string;
    accountNumber?: string;
    [key: string]: unknown;
}

export interface ReconciliationTenderLine {
    tenderType?: string;
    tender?: string;
    type?: string;
    name?: string;
    amount?: number;
    count?: number;
    [key: string]: unknown;
}

export interface ReconciliationSourceRow {
    id?: string;
    sourceId?: string;
    sourceType?: ReconciliationSourceType;
    referenceNumber?: string;
    sourceNumber?: string;
    sourceDate?: string;
    transactionDate?: string;
    companyDebtorId?: string;
    debtorName?: string;
    accountNumber?: string;
    debtor?: ReconciliationDebtorRef | null;
    tenderBreakdown?: ReconciliationTenderLine[];
    amount?: number;
    sourceAmount?: number;
    allocatedAmount?: number;
    calculatedUnallocated?: number;
    recordedUnallocated?: number;
    difference?: number;
    status?: string;
    unallocatedAmount?: number;
    [key: string]: unknown;
}

export function normalizeSourceRow(row: ReconciliationSourceRow): ReconciliationSourceRow {
    return {
        ...row,
        id: row.id ?? row.sourceId,
        sourceDate: row.sourceDate ?? row.transactionDate,
        amount: row.amount ?? row.sourceAmount,
        unallocatedAmount:
            row.unallocatedAmount ?? row.calculatedUnallocated ?? row.recordedUnallocated ?? 0,
    };
}

export interface ReconciliationListResponse {
    success: boolean;
    message?: string;
    data?: {
        count?: number;
        rows?: ReconciliationSourceRow[];
        items?: ReconciliationSourceRow[];
    } | null;
}

export async function getReconciliationUnmatched(
    props: ReconciliationFilters,
): Promise<ReconciliationListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.unmatched.url,
            method: apiUrls.debtorReconciliation.unmatched.method,
            data: props,
        })
    ).data;
}

export function useGetReconciliationUnmatched(props: ReconciliationFilters | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.unmatched.url), props],
        enabled: !!props && Object.keys(props).length > 0,
        queryFn: async () => await getReconciliationUnmatched(props as ReconciliationFilters),
    });
}

export function toReconciliationRows(data: ReconciliationListResponse['data']): ReconciliationSourceRow[] {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows.map(normalizeSourceRow);
    if (Array.isArray(data.items)) return data.items.map(normalizeSourceRow);
    return [];
}

// --------------------------------------- Mismatches ---------------------------------------

export interface ReconciliationMismatchRow {
    id?: string;
    debtorInvoicingOrderId?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    companyDebtorId?: string;
    debtorName?: string;
    accountNumber?: string;
    debtor?: ReconciliationDebtorRef | null;
    sourceType?: ReconciliationSourceType;
    sourceId?: string;
    sourceNumber?: string;
    invoiceOutstandingAmount?: number;
    allocatedAmount?: number;
    varianceAmount?: number;
    [key: string]: unknown;
}

export async function getReconciliationMismatches(
    props: ReconciliationFilters,
): Promise<ReconciliationListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.mismatches.url,
            method: apiUrls.debtorReconciliation.mismatches.method,
            data: props,
        })
    ).data;
}

export function useGetReconciliationMismatches(props: ReconciliationFilters) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.mismatches.url), props],
        queryFn: async () => await getReconciliationMismatches(props),
    });
}

// --------------------------------------- Eligible invoices for a source ---------------------------------------

export interface ReconciliationEligibleInput {
    sourceType: ReconciliationSourceType;
    sourceId: string;
    limit?: number;
}

export interface ReconciliationEligibleInvoice {
    debtorInvoicingOrderId?: string;
    id?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    companyDebtorId?: string;
    debtorName?: string;
    accountNumber?: string;
    debtor?: ReconciliationDebtorRef | null;
    outstandingAmount?: number;
    unallocatedAmount?: number;
    invoiceTotal?: number;
    [key: string]: unknown;
}

export interface ReconciliationEligibleResponse {
    success: boolean;
    message?: string;
    data?:
        | ReconciliationEligibleInvoice[]
        | { invoices?: ReconciliationEligibleInvoice[]; rows?: ReconciliationEligibleInvoice[]; count?: number }
        | null;
}

export async function getReconciliationEligible(
    props: ReconciliationEligibleInput,
): Promise<ReconciliationEligibleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.eligible.url,
            method: apiUrls.debtorReconciliation.eligible.method,
            data: props,
        })
    ).data;
}

export function useGetReconciliationEligible(props: ReconciliationEligibleInput | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.eligible.url), props],
        enabled: !!props?.sourceId,
        staleTime: 0,
        gcTime: 0,
        queryFn: async () => await getReconciliationEligible(props as ReconciliationEligibleInput),
    });
}

export function toEligibleInvoices(
    data: ReconciliationEligibleResponse['data'],
): ReconciliationEligibleInvoice[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.invoices)) return data.invoices;
    if (Array.isArray(data.rows)) return data.rows;
    return [];
}

// --------------------------------------- Reconciliation batch ---------------------------------------

export interface ReconciliationBatch {
    id?: string;
    allocationBatchId?: string;
    allocationNumber?: string;
    allocationType?: 'SINGLE' | 'GROUP' | 'REVERSAL';
    clientDocumentId?: string;
    sourceType?: ReconciliationSourceType;
    sourceId?: string;
    sourceNumber?: string;
    allocationDate?: string;
    totalAllocated?: number;
    status?: string;
    reversalOfId?: string | null;
    reversalReason?: string | null;
    reversedAt?: string | null;
    reversedBy?: string | null;
    createdAt?: string;
    items?: AllocationLine[];
    [key: string]: unknown;
}

export interface ReconcileInput {
    sourceType: ReconciliationSourceType;
    sourceId: string;
    clientDocumentId: string;
    allocationDate: string;
    allocations: AllocationLine[];
    timezone?: string;
    approvalToken?: string;
}

export interface ReconcileResponse {
    success: boolean;
    message?: string;
    data?: ReconciliationBatch | null;
}

export async function postReconciliation(data: ReconcileInput): Promise<ReconcileResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.reconcile.url,
            method: apiUrls.debtorReconciliation.reconcile.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const usePostReconciliation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postReconciliation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReconciliation)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements)] });
        },
    });
};

// Get one reconciliation batch.

export interface GetReconciliationBatchInput {
    allocationBatchId: string;
}

export async function getReconciliationBatch(
    input: GetReconciliationBatchInput,
): Promise<ReconcileResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.get.url,
            method: apiUrls.debtorReconciliation.get.method,
            data: input,
        })
    ).data;
}

export const useGetReconciliationBatch = (allocationBatchId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.get.url), allocationBatchId],
        enabled: !!allocationBatchId,
        queryFn: async () =>
            await getReconciliationBatch({ allocationBatchId: allocationBatchId as string }),
    });
};

// Reverse reconciliation.

export interface ReverseReconciliationInput {
    allocationBatchId: string;
    reason?: string;
    approvalToken?: string;
}

export async function reverseReconciliation(
    data: ReverseReconciliationInput,
): Promise<ReconcileResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.reverse.url,
            method: apiUrls.debtorReconciliation.reverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseReconciliation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reverseReconciliation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReconciliation)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements)] });
        },
    });
};

// --------------------------------------- 3046 Ageing ---------------------------------------

export type AgeingBucketKey =
    | 'CURRENT'
    | 'D30'
    | 'D60'
    | 'D90'
    | 'D120'
    | 'D150'
    | 'D180';

export interface AgeingBucket {
    key: AgeingBucketKey;
    label: string;
    fromDays: number;
    toDays: number | null;
    amount?: number;
    count?: number;
    [key: string]: unknown;
}

export interface AgeingInvoice {
    debtorInvoicingOrderId?: string;
    id?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    bucket?: AgeingBucketKey;
    bucketLabel?: string;
    outstandingAmount?: number;
    invoiceTotal?: number;
    [key: string]: unknown;
}

export interface AgeingUnallocated {
    receiptAmount?: number;
    receiptCount?: number;
    creditNoteAmount?: number;
    creditNoteCount?: number;
    totalAmount?: number;
    [key: string]: unknown;
}

export interface AgeingBuckets {
    current?: number;
    days30?: number;
    days60?: number;
    days90?: number;
    days120?: number;
    days150?: number;
    days180?: number;
    [key: string]: number | undefined;
}

export interface AgeingTotals {
    periodDebits?: number;
    periodCredits?: number;
    totalOutstandingInvoices?: number;
    unallocatedCredits?: number;
    totalDue?: number;
    [key: string]: unknown;
}

export interface AgeingStatementRow {
    id?: string;
    sourceDocumentId?: string;
    sourceType?: string;
    transactionDate?: string;
    dueDate?: string | null;
    reference?: string;
    type?: string;
    description?: string;
    debit?: number;
    credit?: number;
    amountDue?: number;
    balance?: number;
    [key: string]: unknown;
}

export interface AgeingInput {
    companyDebtorId: string;
    asOfDate: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface AgeingData {
    statementDate?: string;
    period?: { dateFrom?: string; dateTo?: string };
    broughtForward?: number;
    rows?: AgeingStatementRow[];
    ageing?: AgeingBuckets;
    totals?: AgeingTotals;
    buckets?: AgeingBucket[];
    invoices?: AgeingInvoice[];
    unallocated?: AgeingUnallocated;
    [key: string]: unknown;
}

export interface AgeingResponse {
    success: boolean;
    message?: string;
    data?: AgeingData | null;
}

export async function getDebtorAgeing(props: AgeingInput): Promise<AgeingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReconciliation.ageing.url,
            method: apiUrls.debtorReconciliation.ageing.method,
            data: props,
        })
    ).data;
}

export function useGetDebtorAgeing(props: AgeingInput | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReconciliation.ageing.url), props],
        enabled: !!props?.companyDebtorId,
        queryFn: async () => await getDebtorAgeing(props as AgeingInput),
    });
}

const DEFAULT_BUCKETS: AgeingBucket[] = [
    { key: 'CURRENT', label: 'Current', fromDays: 0, toDays: 30 },
    { key: 'D30', label: '30 days', fromDays: 31, toDays: 60 },
    { key: 'D60', label: '60 days', fromDays: 61, toDays: 90 },
    { key: 'D90', label: '90 days', fromDays: 91, toDays: 120 },
    { key: 'D120', label: '120 days', fromDays: 121, toDays: 150 },
    { key: 'D150', label: '150 days', fromDays: 151, toDays: 180 },
    { key: 'D180', label: '180+ days', fromDays: 181, toDays: null },
];

const AGEING_KEY_TO_BUCKET: Record<string, AgeingBucketKey> = {
    current: 'CURRENT',
    days30: 'D30',
    days60: 'D60',
    days90: 'D90',
    days120: 'D120',
    days150: 'D150',
    days180: 'D180',
};

export function toAgeingBuckets(data: AgeingData | null | undefined): AgeingBucket[] {
    if (data?.buckets && data.buckets.length) return data.buckets;
    if (data?.ageing) {
        return DEFAULT_BUCKETS.map((bucket) => {
            const sourceKey = Object.entries(AGEING_KEY_TO_BUCKET).find(([, key]) => key === bucket.key)?.[0];
            return { ...bucket, amount: sourceKey ? Number(data.ageing?.[sourceKey] || 0) : 0 };
        });
    }
    return DEFAULT_BUCKETS.map((bucket) => ({
        ...bucket,
        amount: Number(data?.[bucket.key] ?? data?.[bucket.label as keyof AgeingData] ?? 0),
    }));
}

export function toAgeingUnallocated(data: AgeingData | null | undefined): AgeingUnallocated | undefined {
    if (data?.unallocated) return data.unallocated;
    if (!data?.totals) return undefined;
    const unallocatedCredits = Number(data.totals.unallocatedCredits || 0);
    return {
        creditNoteAmount: unallocatedCredits,
        creditNoteCount: 0,
        receiptAmount: 0,
        receiptCount: 0,
        totalAmount: unallocatedCredits,
    };
}

export function toAgeingInvoices(data: AgeingData | null | undefined, asOfDate?: string): AgeingInvoice[] {
    if (!data) return [];
    if (Array.isArray(data.invoices) && data.invoices.length) return data.invoices;
    const rows = data.rows;
    if (!Array.isArray(rows) || !rows.length) return [];
    const asOf = asOfDate || data.statementDate || moment().format('YYYY-MM-DD');
    const bucketForDue = (dueDate?: string | null): { bucket: AgeingBucketKey; bucketLabel: string } => {
        const bucketOf = (key: AgeingBucketKey): { bucket: AgeingBucketKey; bucketLabel: string } => ({
            bucket: key,
            bucketLabel: DEFAULT_BUCKETS.find((b) => b.key === key)?.label || key,
        });
        if (!dueDate) return bucketOf('CURRENT');
        const days = Math.max(0, moment(asOf).startOf('day').diff(moment(dueDate).startOf('day'), 'days'));
        if (days <= 30) return bucketOf('CURRENT');
        if (days <= 60) return bucketOf('D30');
        if (days <= 90) return bucketOf('D60');
        if (days <= 120) return bucketOf('D90');
        if (days <= 150) return bucketOf('D120');
        if (days <= 180) return bucketOf('D150');
        return bucketOf('D180');
    };
    return rows
        .filter((row) => {
            const outstanding = Number(row.amountDue ?? row.balance ?? row.debit ?? 0);
            const isInvoiceType = row.type === 'IN' || row.sourceType === 'ACCOUNT_SALE' || (row.description || '').toLowerCase() === 'invoice';
            return isInvoiceType && outstanding > 0;
        })
        .map((row) => {
            const { bucket, bucketLabel } = bucketForDue(row.dueDate);
            return {
                id: row.sourceDocumentId || row.id,
                debtorInvoicingOrderId: row.sourceDocumentId,
                invoiceNumber: row.reference || 'N/A',
                invoiceDate: row.transactionDate,
                invoiceTotal: Number(row.debit || 0),
                outstandingAmount: Number(row.amountDue ?? row.balance ?? row.debit ?? 0),
                bucket,
                bucketLabel,
            };
        });
}
