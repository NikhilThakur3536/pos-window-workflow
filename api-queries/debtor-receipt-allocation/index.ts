import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- 3022 GROUP DEBTOR PAYMENT ALLOCATION ---------------------------------------
//
// One debtor receipt can be allocated across invoices belonging to debtors that
// share the same debtor group. Before using the flow the relevant debtors must
// have companyDebtorGroupId assigned.
//
// Endpoints:
//   eligible / allocate / get / list / reverse  under /api/company/debtorReceiptAllocation/group
//
// Idempotency: each submission must carry a stable, unique clientDocumentId.
// Reusing the same value returns the original result and prevents duplicate postings.
//
// Protected actions may return HTTP 428 APPROVAL_REQUIRED; re-submit the same
// payload with the X-Approval-Token header after the supervisor approves.

// --------------------------------------- Types ---------------------------------------

export type GroupAllocationType = 'SINGLE' | 'GROUP' | 'REVERSAL';

export interface GroupAllocationLine {
    debtorInvoicingOrderId: string;
    allocatedAmount: number;
}

// Eligibility: invoices of the same debtor group that can absorb this receipt.

export interface GroupEligibleRequest {
    debtorReceiptId: string;
    companyDebtorId?: string;
    limit?: number;
}

export interface GroupEligibleInvoice {
    debtorInvoicingOrderId?: string;
    id?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    companyDebtorId?: string;
    debtorName?: string;
    accountNumber?: string;
    companyDebtorGroupId?: string;
    debtorGroupId?: string;
    outstandingAmount?: number;
    unallocatedAmount?: number;
    invoiceTotal?: number;
    currency?: string;
    [key: string]: unknown;
}

export interface GroupEligibleResponse {
    success: boolean;
    message?: string;
    data?:
        | GroupEligibleInvoice[]
        | {
              group?: { id?: string; groupId?: string; description?: string; [key: string]: unknown };
              activeDebtors?: Array<{ id?: string; name?: string; accountNumber?: string; [key: string]: unknown }>;
              unallocatedAmount?: number;
              receipt?: { id?: string; unallocatedAmount?: number; [key: string]: unknown };
              openInvoices?: GroupEligibleInvoice[];
              invoices?: GroupEligibleInvoice[];
              rows?: GroupEligibleInvoice[];
              count?: number;
              [key: string]: unknown;
          }
        | null;
}

export async function getGroupEligibleInvoices(props: GroupEligibleRequest): Promise<GroupEligibleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocationGroup.eligible.url,
            method: apiUrls.debtorReceiptAllocationGroup.eligible.method,
            data: props,
        })
    ).data;
}

export function useGetGroupEligibleInvoices(props: GroupEligibleRequest | null) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocationGroup.eligible.url), props],
        enabled: !!props?.debtorReceiptId,
        queryFn: async () => await getGroupEligibleInvoices(props as GroupEligibleRequest),
    });
}

// Normalize the optional array / { openInvoices } / { invoices } / { rows } response shapes.

export function toGroupEligibleInvoices(data: GroupEligibleResponse['data']): GroupEligibleInvoice[] {
    if (!data) return [];
    let list: GroupEligibleInvoice[] = [];
    if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.openInvoices)) list = data.openInvoices;
    else if (Array.isArray(data.invoices)) list = data.invoices;
    else if (Array.isArray(data.rows)) list = data.rows;

    return list.map((inv) => ({
        ...inv,
        outstandingAmount: Number(inv.outstandingAmount ?? inv.unallocatedAmount ?? inv.unpaidBalance ?? 0),
    }));
}

// Allocate one receipt across group invoices.

export interface GroupAllocateInput {
    debtorReceiptId: string;
    // Required by the caller for idempotency: resubmitting the same value returns the
    // original batch instead of creating a duplicate posting.
    clientDocumentId: string;
    allocations: GroupAllocationLine[];
    // The backend resolves the group from the receipt's debtor and creates the batch,
    // so the group id is not sent.
    companyDebtorGroupId?: string;
    allocationDate?: string;
    timezone?: string;
    approvalToken?: string;
}

export interface GroupAllocationBatchItem {
    debtorInvoicingOrderId?: string;
    invoiceNumber?: string;
    allocatedAmount?: number | string;
    invoice?: GroupAllocationParty | string | null;
    targetDebtor?: GroupAllocationParty | string | null;
    sourceDebtor?: GroupAllocationParty | string | null;
    receipt?: GroupAllocationParty | string | null;
    group?: GroupAllocationParty | string | null;
    [key: string]: unknown;
}

// Party / actor blobs the backend embeds on a batch (receipt, source debtor, group, user).

export interface GroupAllocationParty {
    id?: string;
    groupId?: string;
    groupCode?: string;
    code?: string;
    description?: string;
    name?: string;
    firstName?: string;
    surname?: string;
    accountNumber?: string;
    referenceNumber?: string;
    receiptNumber?: string;
    receiptDate?: string;
    [key: string]: unknown;
}

export interface GroupAllocationBatch {
    id?: string;
    // Retained only so a completed batch can be reversed.
    allocationBatchId?: string;
    // The human-facing reference the backend generates for the batch.
    batchNumber?: string;
    allocationNumber?: string;
    allocationType?: GroupAllocationType;
    clientDocumentId?: string;
    companyDebtorGroupId?: string;
    debtorReceiptId?: string;
    receiptNumber?: string;
    allocationDate?: string;
    totalAllocated?: number;
    status?: string;
    reversalOfId?: string | null;
    reversalReason?: string | null;
    reversedAt?: string | null;
    reversedBy?: string | null;
    createdAt?: string;
    items?: GroupAllocationBatchItem[];
    // Batch view payload: /group/get returns these at the top level and the
    // allocation lines under rows[] (items[] kept as a fallback shape).
    rows?: GroupAllocationBatchItem[];
    receipt?: GroupAllocationParty | string | null;
    sourceDebtor?: GroupAllocationParty | string | null;
    group?: GroupAllocationParty | string | null;
    groupName?: string;
    invoiceCount?: number;
    // The list payload counts the number of allocation lines as allocationCount.
    allocationCount?: number;
    // The get payload reports the count of allocation rows at the top level.
    count?: number;
    allocatedBy?: string;
    allocatedByUser?: GroupAllocationParty | string | null;
    reversed?: boolean | string | null;
    [key: string]: unknown;
}

export interface MutateGroupAllocationResponse {
    success: boolean;
    message?: string;
    data?: GroupAllocationBatch | null;
}

export async function allocateReceiptToGroup(
    data: GroupAllocateInput,
): Promise<MutateGroupAllocationResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocationGroup.allocate.url,
            method: apiUrls.debtorReceiptAllocationGroup.allocate.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useAllocateReceiptToGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: allocateReceiptToGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceiptAllocationGroup)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements)] });
        },
    });
};

// Get one allocation batch.

export interface GetGroupAllocationBatchInput {
    allocationBatchId: string;
}

export interface GetGroupAllocationBatchResponse {
    success: boolean;
    message?: string;
    data?: GroupAllocationBatch | null;
}

export async function getGroupAllocationBatch(
    input: GetGroupAllocationBatchInput,
): Promise<GetGroupAllocationBatchResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocationGroup.get.url,
            method: apiUrls.debtorReceiptAllocationGroup.get.method,
            data: input,
        })
    ).data;
}

export const useGetGroupAllocationBatch = (allocationBatchId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocationGroup.get.url), allocationBatchId],
        enabled: !!allocationBatchId,
        queryFn: async () => await getGroupAllocationBatch({ allocationBatchId: allocationBatchId as string }),
    });
};

// Allocation history.

export interface GroupAllocationListFilter {
    companyDebtorGroupId?: string;
    debtorReceiptId?: string;
    status?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}

export interface GroupAllocationListResponse {
    success: boolean;
    message?: string;
    data?: {
        count?: number;
        rows?: GroupAllocationBatch[];
        batches?: GroupAllocationBatch[];
    } | null;
}

export async function getGroupAllocationHistory(
    props: GroupAllocationListFilter,
): Promise<GroupAllocationListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocationGroup.list.url,
            method: apiUrls.debtorReceiptAllocationGroup.list.method,
            data: props,
        })
    ).data;
}

export function useGetGroupAllocationHistory(props: GroupAllocationListFilter) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocationGroup.list.url), props],
        queryFn: async () => await getGroupAllocationHistory(props),
    });
}

export function toGroupAllocationBatches(data: GroupAllocationListResponse['data']): GroupAllocationBatch[] {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.batches)) return data.batches;
    return [];
}

// Reverse a complete allocation batch.

export interface ReverseGroupAllocationBatchInput {
    allocationBatchId: string;
    reason: string;
    approvalToken?: string;
}

export async function reverseGroupAllocationBatch(
    data: ReverseGroupAllocationBatchInput,
): Promise<MutateGroupAllocationResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocationGroup.reverse.url,
            method: apiUrls.debtorReceiptAllocationGroup.reverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseGroupAllocationBatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reverseGroupAllocationBatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceiptAllocationGroup)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements)] });
        },
    });
};