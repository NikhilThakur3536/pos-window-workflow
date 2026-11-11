import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
// The price-match status values are shared between the rebate preview and the
// GRV price-match result.
import type { GrvPriceMatchStatus } from '../supplier-commitments';

// --------------------------------------- SUPPLIER ALLOWANCES ---------------------------------------
//
// Supplier allowances cover rebates, advertising, settlement, swell, incentive and
// other supplier-funded reductions. GRV create/update posts the earned rebate
// automatically (entryType EARNED), so the movement endpoints are only needed for
// manual adjustments such as supplier claims.
//
// The original GRV cost and tax are left untouched. The rebate-adjusted cost is
// stored separately, so allow an already-received GRV to be reversed without
// disturbing the recorded cost.

// --------------------------------------- SHARED TYPES ---------------------------------------

export const SUPPLIER_ALLOWANCE_TYPES = [
    'REBATE',
    'ADVERTISING',
    'SETTLEMENT',
    'SWELL',
    'INCENTIVE',
    'OTHER',
] as const;

export const SUPPLIER_ALLOWANCE_BASES = ['PERCENTAGE', 'FIXED_AMOUNT', 'PER_UNIT', 'TOTAL_DOCUMENT'] as const;

export const SUPPLIER_ALLOWANCE_MOVEMENT_ENTRY_TYPES = ['EARNED', 'CLAIMED', 'APPROVED', 'USED'] as const;

export type SupplierAllowanceType = (typeof SUPPLIER_ALLOWANCE_TYPES)[number];
export type SupplierAllowanceBasis = (typeof SUPPLIER_ALLOWANCE_BASES)[number];
export type SupplierAllowanceMovementEntryType = (typeof SUPPLIER_ALLOWANCE_MOVEMENT_ENTRY_TYPES)[number];

// Per-allowance breakdown returned on a calculation preview. Kept loose because the
// shape depends on the basis (percentage vs per-unit vs fixed amount).
export interface RebateBreakdown {
    allowanceId?: string;
    allowanceCode?: string;
    allowanceName?: string;
    allowanceType?: SupplierAllowanceType;
    basis?: SupplierAllowanceBasis;
    rate?: number;
    thresholdQuantity?: number | null;
    thresholdValue?: number | null;
    quantity?: number;
    value?: number;
    amount?: number;
    notes?: string | null;
    [key: string]: unknown;
}

export interface SupplierAllowanceStockDetail {
    id: string;
    code?: string | null;
    description?: string | null;
    [key: string]: unknown;
}

export interface SupplierAllowanceDetails {
    id: string;
    companyId?: string;
    domainId?: string;
    allowanceCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId?: string | null;
    categoryId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    allowanceType: SupplierAllowanceType;
    basis: SupplierAllowanceBasis;
    rate: number;
    thresholdQuantity?: number | null;
    thresholdValue?: number | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    notes?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    CompanyCreditor?: CompanyCreditor;
    CompanyStockDetail?: SupplierAllowanceStockDetail | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface SupplierAllowanceMovement {
    id: string;
    supplierAllowanceId: string;
    entryType: SupplierAllowanceMovementEntryType;
    amount: number;
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

export interface SupplierAllowanceGetResponse {
    success: boolean;
    message: string;
    data: SupplierAllowanceDetails & {
        movements?: SupplierAllowanceMovement[];
        // Running totals maintained by the backend ledger.
        totalEarned?: number;
        totalClaimed?: number;
        totalApproved?: number;
        totalUsed?: number;
        balance?: number;
    };
}

export interface SupplierAllowanceListFilters {
    companyCreditorId?: string;
    allowanceType?: string;
    activeOn?: string;
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
    isCsv?: boolean;
    csvLabel?: string;
}

export interface SupplierAllowanceListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SupplierAllowanceDetails[];
    };
}

export interface SupplierAllowanceSummaryResponse {
    success: boolean;
    message: string;
    data: {
        totalAllowances?: number;
        totalEarned?: number;
        totalClaimed?: number;
        totalApproved?: number;
        totalUsed?: number;
        outstandingBalance?: number;
        [key: string]: unknown;
    };
}

export interface RebateCalculationResponse {
    success: boolean;
    message: string;
    data: {
        rebateAmount?: number;
        effectiveUnitCost?: number;
        expectedUnitCost?: number | null;
        rebateBreakdown?: RebateBreakdown[];
        appliedAllowanceIds?: string[];
        priceMatchStatus?: GrvPriceMatchStatus;
        [key: string]: unknown;
    };
}

// --------------------------------------- SCHEMAS ---------------------------------------

export const supplierAllowanceCreateSchema = z.object({
    allowanceCode: z.string().min(1, 'Allowance Code is required'),
    name: z.string().min(1, 'Name is required'),
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    companyStockDetailId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().optional().nullable(),
    allowanceType: z.enum(['REBATE', 'ADVERTISING', 'SETTLEMENT', 'SWELL', 'INCENTIVE', 'OTHER']),
    basis: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'PER_UNIT', 'TOTAL_DOCUMENT']),
    rate: z.number().min(0, 'Rate cannot be negative'),
    thresholdQuantity: z.number().min(0).optional().nullable(),
    thresholdValue: z.number().min(0).optional().nullable(),
    effectiveFrom: z.string().min(1, 'Effective From is required'),
    effectiveTo: z.string().min(1, 'Effective To is required'),
    notes: z.string().optional().nullable(),
});

export const supplierAllowanceUpdateSchema = z.object({
    id: z.string().min(1, 'Id is required'),
    allowanceCode: z.string().optional(),
    name: z.string().optional(),
    companyCreditorId: z.string().optional(),
    companyStockDetailId: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().optional().nullable(),
    allowanceType: z.enum(['REBATE', 'ADVERTISING', 'SETTLEMENT', 'SWELL', 'INCENTIVE', 'OTHER']).optional(),
    basis: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'PER_UNIT', 'TOTAL_DOCUMENT']).optional(),
    rate: z.number().min(0).optional(),
    thresholdQuantity: z.number().min(0).optional().nullable(),
    thresholdValue: z.number().min(0).optional().nullable(),
    effectiveFrom: z.string().optional(),
    effectiveTo: z.string().optional(),
    notes: z.string().optional().nullable(),
});

export const supplierAllowanceMovementPostSchema = z.object({
    supplierAllowanceId: z.string().min(1, 'Allowance is required'),
    entryType: z.enum(['EARNED', 'CLAIMED', 'APPROVED', 'USED']),
    amount: z.number().positive('Amount must be greater than zero'),
    sourceType: z.string().optional(),
    sourceDocumentId: z.string().optional(),
    sourceDocumentNumber: z.string().optional(),
    // Idempotency key so a retried approval cannot double-post the movement.
    clientDocumentId: z.string().optional(),
    reason: z.string().optional(),
});

export const supplierAllowanceMovementReverseSchema = z.object({
    movementId: z.string().min(1, 'Movement is required'),
    reason: z.string().min(1, 'Reason is required'),
});

export const supplierAllowanceCalculateSchema = z.object({
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    companyStockDetailId: z.string().min(1, 'Stock Item is required'),
    companyDebtorId: z.string().optional().nullable(),
    companyWarehouseId: z.string().min(1, 'Warehouse is required'),
    unitCost: z.number().min(0, 'Unit Cost is required'),
    quantity: z.number().min(0, 'Quantity is required'),
    asOf: z.string().optional(),
});

export type SupplierAllowanceCreateSchema = z.infer<typeof supplierAllowanceCreateSchema>;
export type SupplierAllowanceUpdateSchema = z.infer<typeof supplierAllowanceUpdateSchema>;
export type SupplierAllowanceMovementPostSchema = z.infer<typeof supplierAllowanceMovementPostSchema>;
export type SupplierAllowanceMovementReverseSchema = z.infer<typeof supplierAllowanceMovementReverseSchema>;
export type SupplierAllowanceCalculateSchema = z.infer<typeof supplierAllowanceCalculateSchema>;

// --------------------------------------- LIST ---------------------------------------

export async function getSupplierAllowances(
    props: SupplierAllowanceListFilters,
): Promise<SupplierAllowanceListResponse | void> {
    if (props?.isCsv) {
        return axiosDownloadCSV({ filters: props, key: 'supplierAllowance', label: props?.csvLabel });
    }
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.list.url,
            method: apiUrls.supplierAllowance.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierAllowances = (props: SupplierAllowanceListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierAllowance), props],
        queryFn: async () => await getSupplierAllowances(props),
    });
};

// --------------------------------------- GET BY ID ---------------------------------------

export async function getSupplierAllowanceById(id: string): Promise<SupplierAllowanceGetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.get.url,
            method: apiUrls.supplierAllowance.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSupplierAllowanceById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierAllowance), id],
        queryFn: async () => await getSupplierAllowanceById(id),
        enabled: !!id,
    });
};

// --------------------------------------- CREATE ---------------------------------------

export interface SaveSupplierAllowanceInput {
    id?: string;
    allowanceCode: string;
    name: string;
    companyCreditorId: string;
    companyStockDetailId?: string | null;
    categoryId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    allowanceType: SupplierAllowanceType;
    basis: SupplierAllowanceBasis;
    rate: number;
    thresholdQuantity?: number | null;
    thresholdValue?: number | null;
    effectiveFrom: string;
    effectiveTo: string;
    notes?: string | null;
    approvalToken?: string;
}

export interface MutateSupplierAllowanceResponse {
    success: boolean;
    message: string;
    data?: SupplierAllowanceDetails | null;
}

export async function saveSupplierAllowance(data: SaveSupplierAllowanceInput): Promise<MutateSupplierAllowanceResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: data?.id ? apiUrls.supplierAllowance.update.url : apiUrls.supplierAllowance.create.url,
            method: data?.id ? apiUrls.supplierAllowance.update.method : apiUrls.supplierAllowance.create.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

const useInvalidateSupplierAllowances = () => {
    const queryClient = useQueryClient();
    return (extra?: string) => {
        queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierAllowance)] });
        if (extra) queryClient.invalidateQueries({ queryKey: [extra] });
    };
};

export const useCreateSupplierAllowance = () => {
    const invalidate = useInvalidateSupplierAllowances();
    return useMutation({
        mutationFn: saveSupplierAllowance,
        onSuccess: () => invalidate(),
    });
};

export const useUpdateSupplierAllowance = () => {
    const invalidate = useInvalidateSupplierAllowances();
    return useMutation({
        mutationFn: saveSupplierAllowance,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- DELETE ---------------------------------------

export async function removeSupplierAllowance(data: {
    id: string;
    approvalToken?: string;
}): Promise<MutateSupplierAllowanceResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.delete.url,
            method: apiUrls.supplierAllowance.delete.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useRemoveSupplierAllowance = () => {
    const invalidate = useInvalidateSupplierAllowances();
    return useMutation({
        mutationFn: removeSupplierAllowance,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- CALCULATE ---------------------------------------
//
// Preview the rebate that would apply to a candidate GRV line, before the GRV is
// created. Rebate is also calculated automatically on GRV create/update; this
// endpoint is purely for showing the operator what to expect.

export async function calculateRebate(data: SupplierAllowanceCalculateSchema): Promise<RebateCalculationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.calculate.url,
            method: apiUrls.supplierAllowance.calculate.method,
            data,
        })
    ).data;
}

export const useCalculateRebate = () => {
    return useMutation({
        mutationFn: calculateRebate,
    });
};

// --------------------------------------- MOVEMENTS ---------------------------------------

export type SupplierAllowanceMovementPostInput = SupplierAllowanceMovementPostSchema & {
    approvalToken?: string;
};

export async function postSupplierAllowanceMovement(
    data: SupplierAllowanceMovementPostInput,
): Promise<MutateSupplierAllowanceResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.movementPost.url,
            method: apiUrls.supplierAllowance.movementPost.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const usePostSupplierAllowanceMovement = () => {
    const invalidate = useInvalidateSupplierAllowances();
    return useMutation({
        mutationFn: postSupplierAllowanceMovement,
        onSuccess: () => invalidate(),
    });
}

export async function reverseSupplierAllowanceMovement(data: {
    movementId: string;
    reason: string;
    approvalToken?: string;
}): Promise<MutateSupplierAllowanceResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.movementReverse.url,
            method: apiUrls.supplierAllowance.movementReverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseSupplierAllowanceMovement = () => {
    const invalidate = useInvalidateSupplierAllowances();
    return useMutation({
        mutationFn: reverseSupplierAllowanceMovement,
        onSuccess: () => invalidate(),
    });
};

// --------------------------------------- SUMMARY ---------------------------------------

export async function getSupplierAllowanceSummary(data: {
    companyCreditorId?: string;
    allowanceType?: string;
}): Promise<SupplierAllowanceSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierAllowance.summary.url,
            method: apiUrls.supplierAllowance.summary.method,
            data,
        })
    ).data;
}

export const useGetSupplierAllowanceSummary = (data: { companyCreditorId?: string; allowanceType?: string }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierAllowance), 'summary', data],
        queryFn: async () => await getSupplierAllowanceSummary(data),
    });
};