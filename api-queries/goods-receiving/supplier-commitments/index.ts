import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import type { RebateBreakdown } from '../supplier-allowances';

// --------------------------------------- SUPPLIER COMMITMENTS ---------------------------------------
//
// Supplier purchase commitments track a committed quantity and/or value against a
// supplier over a period, optionally scoped to a SKU, category, store, warehouse or
// specific supplier deal.
//
// GRV RECEIVED consumption is posted automatically, including for direct GRVs raised
// without a purchase order. The consume endpoint is only needed to post ORDERED or
// INVOICED consumption ahead of the goods arriving.

// --------------------------------------- SHARED TYPES ---------------------------------------

export const SUPPLIER_COMMITMENT_MOVEMENT_TYPES = ['ORDERED', 'RECEIVED', 'INVOICED'] as const;

export type SupplierCommitmentMovementType = (typeof SUPPLIER_COMMITMENT_MOVEMENT_TYPES)[number];

// Where a cost/price expectation came from. "NONE" means the backend found no
// reference price, so the variance cannot be assessed.
export const GRV_PRICE_MATCH_SOURCES = [
    'PURCHASE_ORDER',
    'SUPPLIER_DEAL',
    'SUPPLIER_PRICING',
    'LAST_PURCHASE',
    'NONE',
] as const;

// "NONE" is also used as a match source, but a status of NONE is not returned.
export const GRV_PRICE_MATCH_STATUSES = [
    'MATCHED',
    'WARNING',
    'APPROVAL_REQUIRED',
    'CLAIM_REQUIRED',
    'DISPUTED',
] as const;

export type GrvPriceMatchSource = (typeof GRV_PRICE_MATCH_SOURCES)[number];
export type GrvPriceMatchStatus = (typeof GRV_PRICE_MATCH_STATUSES)[number];

export interface SupplierCommitmentStockDetail {
    id: string;
    code?: string | null;
    description?: string | null;
    [key: string]: unknown;
}

export interface SupplierCommitmentDetails {
    id: string;
    companyId?: string;
    domainId?: string;
    commitmentCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId?: string | null;
    categoryId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    // Ties the commitment to an active supplier deal, if any.
    supplierDealId?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    committedQuantity?: number | null;
    committedValue?: number | null;
    allowOverCommitment?: boolean;
    notes?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    CompanyCreditor?: CompanyCreditor;
    CompanyStockDetail?: SupplierCommitmentStockDetail | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface SupplierCommitmentMovement {
    id: string;
    supplierPurchaseCommitmentId: string;
    movementType: SupplierCommitmentMovementType;
    quantity?: number | null;
    value?: number | null;
    sourceType?: string | null;
    sourceDocumentId?: string | null;
    sourceDocumentNumber?: string | null;
    clientDocumentId?: string | null;
    reason?: string | null;
    movementDate?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface SupplierCommitmentGetResponse {
    success: boolean;
    message: string;
    data: SupplierCommitmentDetails & {
        movements?: SupplierCommitmentMovement[];
        // Consumed totals maintained by the backend.
        totalOrderedQuantity?: number;
        totalReceivedQuantity?: number;
        totalInvoicedQuantity?: number;
        totalOrderedValue?: number;
        totalReceivedValue?: number;
        totalInvoicedValue?: number;
        remainingQuantity?: number;
        remainingValue?: number;
        isOverCommitted?: boolean;
    };
}

export interface SupplierCommitmentListFilters {
    companyCreditorId?: string;
    companyWarehouseId?: string;
    activeOn?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    isCsv?: boolean;
    csvLabel?: string;
}

export interface SupplierCommitmentListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SupplierCommitmentDetails[];
    };
}

export interface SupplierCommitmentSummaryResponse {
    success: boolean;
    message: string;
    data: {
        totalCommitments?: number;
        totalCommittedQuantity?: number;
        totalCommittedValue?: number;
        totalReceivedQuantity?: number;
        totalReceivedValue?: number;
        remainingQuantity?: number;
        remainingValue?: number;
        [key: string]: unknown;
    };
}

// --------------------------------------- SCHEMAS ---------------------------------------

export const supplierCommitmentCreateSchema = z.object({
    commitmentCode: z.string().min(1, 'Commitment Code is required'),
    name: z.string().min(1, 'Name is required'),
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    // All scope fields are optional; leaving them blank applies the commitment
    // to everything for that supplier.
    companyStockDetailId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().optional().nullable(),
    supplierDealId: z.string().optional().nullable(),
    periodStart: z.string().min(1, 'Period Start is required'),
    periodEnd: z.string().min(1, 'Period End is required'),
    committedQuantity: z.number().min(0).optional().nullable(),
    committedValue: z.number().min(0).optional().nullable(),
    allowOverCommitment: z.boolean().optional(),
    notes: z.string().optional().nullable(),
});

export const supplierCommitmentUpdateSchema = z.object({
    id: z.string().min(1, 'Id is required'),
    commitmentCode: z.string().optional(),
    name: z.string().optional(),
    companyCreditorId: z.string().optional(),
    companyStockDetailId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().optional().nullable(),
    supplierDealId: z.string().optional().nullable(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    committedQuantity: z.number().min(0).optional().nullable(),
    committedValue: z.number().min(0).optional().nullable(),
    allowOverCommitment: z.boolean().optional(),
    notes: z.string().optional().nullable(),
});

export const supplierCommitmentConsumeSchema = z.object({
    supplierPurchaseCommitmentId: z.string().min(1, 'Commitment is required'),
    movementType: z.enum(['ORDERED', 'RECEIVED', 'INVOICED']),
    quantity: z.number().min(0).optional().nullable(),
    value: z.number().min(0).optional().nullable(),
    sourceType: z.string().optional(),
    sourceDocumentId: z.string().optional(),
    sourceDocumentNumber: z.string().optional(),
    // Idempotency key so a retried approval cannot double-consume.
    clientDocumentId: z.string().optional(),
});

export const supplierCommitmentMovementReverseSchema = z.object({
    movementId: z.string().min(1, 'Movement is required'),
    reason: z.string().min(1, 'Reason is required'),
});

export type SupplierCommitmentCreateSchema = z.infer<typeof supplierCommitmentCreateSchema>;
export type SupplierCommitmentUpdateSchema = z.infer<typeof supplierCommitmentUpdateSchema>;
export type SupplierCommitmentConsumeSchema = z.infer<typeof supplierCommitmentConsumeSchema>;
export type SupplierCommitmentMovementReverseSchema = z.infer<typeof supplierCommitmentMovementReverseSchema>;

// --------------------------------------- LIST ---------------------------------------

export async function getSupplierCommitments(
    props: SupplierCommitmentListFilters,
): Promise<SupplierCommitmentListResponse | void> {
    if (props?.isCsv) {
        return axiosDownloadCSV({ filters: props, key: 'supplierCommitment', label: props?.csvLabel });
    }
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.list.url,
            method: apiUrls.supplierCommitment.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierCommitments = (props: SupplierCommitmentListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierCommitment), props],
        queryFn: async () => await getSupplierCommitments(props),
    });
};

// --------------------------------------- GET BY ID ---------------------------------------

export async function getSupplierCommitmentById(id: string): Promise<SupplierCommitmentGetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.get.url,
            method: apiUrls.supplierCommitment.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSupplierCommitmentById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierCommitment), id],
        queryFn: async () => await getSupplierCommitmentById(id),
        enabled: !!id,
    });
};

// --------------------------------------- CREATE ---------------------------------------

export interface SaveSupplierCommitmentInput {
    id?: string;
    commitmentCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId?: string | null;
    categoryId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    supplierDealId?: string | null;
    periodStart: string;
    periodEnd: string;
    committedQuantity?: number | null;
    committedValue?: number | null;
    allowOverCommitment?: boolean;
    notes?: string | null;
    approvalToken?: string;
}

export interface MutateSupplierCommitmentResponse {
    success: boolean;
    message: string;
    data?: SupplierCommitmentDetails | null;
}

export async function saveSupplierCommitment(
    data: SaveSupplierCommitmentInput,
): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: data?.id ? apiUrls.supplierCommitment.update.url : apiUrls.supplierCommitment.create.url,
            method: data?.id ? apiUrls.supplierCommitment.update.method : apiUrls.supplierCommitment.create.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

const useInvalidateSupplierCommitments = () => {
    const queryClient = useQueryClient();
    return (extra?: string) => {
        queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierCommitment)] });
        if (extra) queryClient.invalidateQueries({ queryKey: [extra] });
    };
};

export const useCreateSupplierCommitment = () => {
    const invalidate = useInvalidateSupplierCommitments();
    return useMutation({
        mutationFn: saveSupplierCommitment,
        onSuccess: () => invalidate(),
    });
};

export const useUpdateSupplierCommitment = () => {
    const invalidate = useInvalidateSupplierCommitments();
    return useMutation({
        mutationFn: saveSupplierCommitment,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- DELETE ---------------------------------------

export async function removeSupplierCommitment(data: {
    id: string;
    approvalToken?: string;
}): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.delete.url,
            method: apiUrls.supplierCommitment.delete.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useRemoveSupplierCommitment = () => {
    const invalidate = useInvalidateSupplierCommitments();
    return useMutation({
        mutationFn: removeSupplierCommitment,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- CONSUME ---------------------------------------

export type SupplierCommitmentConsumeInput = SupplierCommitmentConsumeSchema & {
    approvalToken?: string;
};

export async function consumeSupplierCommitment(
    data: SupplierCommitmentConsumeInput,
): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.consume.url,
            method: apiUrls.supplierCommitment.consume.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useConsumeSupplierCommitment = () => {
    const invalidate = useInvalidateSupplierCommitments();
    return useMutation({
        mutationFn: consumeSupplierCommitment,
        onSuccess: () => invalidate(),
    });
};

export async function reverseSupplierCommitmentMovement(data: {
    movementId: string;
    reason: string;
    approvalToken?: string;
}): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.movementReverse.url,
            method: apiUrls.supplierCommitment.movementReverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseSupplierCommitmentMovement = () => {
    const invalidate = useInvalidateSupplierCommitments();
    return useMutation({
        mutationFn: reverseSupplierCommitmentMovement,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- SUMMARY ---------------------------------------

export async function getSupplierCommitmentSummary(data: {
    companyCreditorId?: string;
    activeOn?: string;
}): Promise<SupplierCommitmentSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierCommitment.summary.url,
            method: apiUrls.supplierCommitment.summary.method,
            data,
        })
    ).data;
}

export const useGetSupplierCommitmentSummary = (data: { companyCreditorId?: string; activeOn?: string }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierCommitment), 'summary', data],
        queryFn: async () => await getSupplierCommitmentSummary(data),
    });
};

// --------------------------------------- GRV PRICE MATCH ---------------------------------------
//
// The GRV create/update response already includes the price-match result, so these
// are only needed to re-read it later, or to approve/dispute an open variance.

export interface GrvPriceMatchItem {
    companyStockDetailId?: string;
    // Cost as captured on the GRV, which is never modified by the rebate calc.
    unitCost?: number;
    expectedUnitCost?: number | null;
    effectiveUnitCost?: number;
    rebateAmount?: number;
    rebateBreakdown?: RebateBreakdown[];
    matchSource?: GrvPriceMatchSource;
    priceMatchStatus?: GrvPriceMatchStatus;
    priceMatchNotes?: string;
    costVarianceAmount?: number;
    costVariancePercent?: number;
    supplierDealId?: string | null;
    [key: string]: unknown;
}

export interface GrvPriceMatchDetails {
    goodsReceivingOrderId: string;
    goodsReceivingOrderNumber?: string;
    priceMatchStatus?: GrvPriceMatchStatus;
    supplierPurchaseCommitmentId?: string | null;
    rebateValue?: number;
    grossValue?: number;
    netPayableValue?: number;
    rebateBreakdown?: RebateBreakdown[];
    rebateCalculatedAt?: string;
    items?: GrvPriceMatchItem[];
    // Some deployments return the line breakdown as `rows`; keep both supported.
    rows?: GrvPriceMatchItem[];
    [key: string]: unknown;
}

export interface GrvPriceMatchGetResponse {
    success: boolean;
    message: string;
    data: GrvPriceMatchDetails;
}

export async function getGrvPriceMatch(data: { goodsReceivingOrderId: string }): Promise<GrvPriceMatchGetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.priceMatch.get.url,
            method: apiUrls.creditorGoodsReceiving.priceMatch.get.method,
            data,
        })
    ).data;
}

export const useGetGrvPriceMatch = (goodsReceivingOrderId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditorGoodsReceiving.priceMatch.get), goodsReceivingOrderId],
        queryFn: async () => await getGrvPriceMatch({ goodsReceivingOrderId }),
        enabled: !!goodsReceivingOrderId,
    });
};

export const grvPriceMatchApproveSchema = z.object({
    goodsReceivingOrderId: z.string().min(1, 'GRV is required'),
    reason: z.string().min(1, 'Reason is required'),
});

export const grvPriceMatchDisputeSchema = grvPriceMatchApproveSchema;

export type GrvPriceMatchApproveSchema = z.infer<typeof grvPriceMatchApproveSchema>;

// approve/dispute may return 428 APPROVAL_REQUIRED. approvalToken is stripped from
// the body and sent as X-Approval-Token so the retry carries the original payload.
export async function approveGrvPriceMatch(data: {
    goodsReceivingOrderId: string;
    reason: string;
    approvalToken?: string;
}): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.priceMatch.approve.url,
            method: apiUrls.creditorGoodsReceiving.priceMatch.approve.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useApproveGrvPriceMatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveGrvPriceMatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditorGoodsReceiving.priceMatch.get)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditorGoodsReceiving)] });
        },
    });
};

export async function disputeGrvPriceMatch(data: {
    goodsReceivingOrderId: string;
    reason: string;
    approvalToken?: string;
}): Promise<MutateSupplierCommitmentResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.priceMatch.dispute.url,
            method: apiUrls.creditorGoodsReceiving.priceMatch.dispute.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useDisputeGrvPriceMatch = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: disputeGrvPriceMatch,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditorGoodsReceiving.priceMatch.get)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditorGoodsReceiving)] });
        },
    });
};
