import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- OVER SUPPLY APPROVAL ---------------------------------------
//
// Raised when a requested quantity exceeds the remaining stock, either while
// allocating a store order or while creating a stock movement. The backend stores a
// pending approval request and answers HTTP 428 OVER_SUPPLY_APPROVAL_REQUIRED with
// the request id. A supervisor decides the request, after which the caller re-runs
// the original allocate / movement call and it succeeds.
//
// requestType distinguishes the two sources; orderSource records how the store order
// itself arrived, which is unrelated to who approves the over-supply.

export const OVER_SUPPLY_REQUEST_TYPES = ['STORE_ORDER_ALLOCATION', 'STOCK_TRANSFER'] as const;
export type OverSupplyRequestType = (typeof OVER_SUPPLY_REQUEST_TYPES)[number];

export const OVER_SUPPLY_DECISIONS = ['APPROVED', 'REJECTED'] as const;
export type OverSupplyDecision = (typeof OVER_SUPPLY_DECISIONS)[number];

export const OVER_SUPPLY_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type OverSupplyStatus = (typeof OVER_SUPPLY_STATUSES)[number];

export const OVER_SUPPLY_ORDER_SOURCES = ['POS', 'WEB', 'MOBILE', 'EDI', 'MANUAL'] as const;
export type OverSupplyOrderSource = (typeof OVER_SUPPLY_ORDER_SOURCES)[number];

export interface OverSupplyApprovalRecord {
    id: string;
    requestType?: OverSupplyRequestType;
    status?: OverSupplyStatus;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    warehouseId?: string | null;
    salesOrderId?: string | null;
    saleOrderId?: string | null;
    orderSource?: OverSupplyOrderSource | null;
    companyStockDetailId?: string | null;
    requestedQuantity?: number | null;
    orderedQuantity?: number | null;
    availableQuantity?: number | null;
    note?: string | null;
    decisionNote?: string | null;
    requestedAt?: string;
    requestedBy?: string | null;
    requestedByName?: string | null;
    requesterName?: string | null;
    lifecycleVersion?: number | null;
    decidedAt?: string | null;
    decidedBy?: string | null;
    rejectedBy?: string | null;
    rejectedAt?: string | null;
    rejectionReason?: string | null;
    overrideReason?: string | null;
    // Related document refs, so a supervisor can see what the request was for.
    salesOrderNumber?: string | null;
    companyStockDetail?: { id?: string; itemCode?: string | null; description?: string | null } | null;
    companyDebtor?: { id?: string; name?: string | null; accountNumber?: string | null } | null;
    companyWarehouse?: { id?: string; name?: string | null; warehouse?: string | null } | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface OverSupplyPendingFilters {
    status?: OverSupplyStatus;
    requestType?: OverSupplyRequestType;
    limit?: number;
    offset?: number;
}

export interface OverSupplyPendingResponse {
    success: boolean;
    message: string;
    data: {
        count?: number;
        rows?: OverSupplyApprovalRecord[];
        // Some deployments return a bare array.
        [key: string]: unknown;
    };
}

export interface OverSupplyGetResponse {
    success: boolean;
    message: string;
    data: OverSupplyApprovalRecord;
}

export async function getPendingOverSupplyApprovals(
    props: OverSupplyPendingFilters,
): Promise<OverSupplyPendingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.overSupplyApproval.pending.url,
            method: apiUrls.overSupplyApproval.pending.method,
            data: props,
        })
    ).data;
}

export const useGetPendingOverSupplyApprovals = (props: OverSupplyPendingFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.overSupplyApproval), 'pending', props],
        queryFn: async () => await getPendingOverSupplyApprovals(props),
    });
};

// --------------------------------------- GET DETAIL ---------------------------------------

export async function getOverSupplyApproval(id: string): Promise<OverSupplyGetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.overSupplyApproval.get.url,
            method: apiUrls.overSupplyApproval.get.method,
            data: { id },
        })
    ).data;
}

export const useGetOverSupplyApproval = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.overSupplyApproval), 'get', id],
        queryFn: async () => await getOverSupplyApproval(id as string),
        enabled: !!id,
    });
};

// --------------------------------------- DECIDE ---------------------------------------

export const overSupplyDecideSchema = z.object({
    approvalRequestId: z.string().min(1, 'Approval request is required'),
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().optional(),
});

export type OverSupplyDecideInput = z.infer<typeof overSupplyDecideSchema>;

export interface OverSupplyDecideResponse {
    success: boolean;
    message: string;
    data?: {
        // When true the backend already replayed the original allocation/movement, so the
        // caller must NOT re-submit. When false, reload the order/approval for state.
        autoExecuted?: boolean;
        autoExecutionError?: string | null;
        approvalRequestId?: string;
        status?: OverSupplyStatus;
        [key: string]: unknown;
    } | null;
}

export async function decideOverSupplyApproval(data: OverSupplyDecideInput): Promise<OverSupplyDecideResponse> {
    return (
        await axiosInstance({
            url: apiUrls.overSupplyApproval.decide.url,
            method: apiUrls.overSupplyApproval.decide.method,
            data,
        })
    ).data;
}

export const useDecideOverSupplyApproval = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: decideOverSupplyApproval,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.overSupplyApproval)] });
        },
    });
};
