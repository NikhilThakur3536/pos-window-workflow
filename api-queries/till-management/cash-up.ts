import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import type { DenominationDetails } from './denominations';

// --------------------------------------- CASH UP ---------------------------------------

export type CashUpFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    tillId?: string;
    shiftId?: string;
    companyDebtorId?: string;
    fromDate?: string;
    toDate?: string;
};

export type CashUpTill = {
    id: string;
    name?: string;
    tillNumber?: string;
    terminalId?: string;
};

export type CashUpShift = {
    id: string;
    tillNumber?: string;
    tillId?: string;
    currentShiftNumber?: number;
    status?: string;
    cashierUserId?: string | null;
    userSessionId?: string | null;
    terminalId?: string | null;
    cashier?: CashUpUser | null;
};

export type CashUpStore = {
    id: string;
    name?: string;
    accountNumber?: string;
};

export type CashUpDenomination = {
    id: string;
    cashUpId?: string;
    denominationId: string;
    count: number;
    value?: string | null;
    createdAt?: string;
    updatedAt?: string;
    Denomination?: DenominationDetails | null;
    denomination?: {
        id: string;
        label?: string;
        conversionValue?: string;
        type?: string | null;
    } | null;
};

export type CashUpUser = {
    id: string;
    firstName?: string;
    lastName?: string;
    surname?: string;
    staffNumber?: string | number;
    email?: string;
};

export type CashUpVarianceAction = {
    id?: string;
    cashUpId?: string;
    tenderType?: string;
    expected?: string | number | null;
    declared?: string | number | null;
    variance?: string | number | null;
    reasonId?: string | null;
    notes?: string | null;
    approvalRequestId?: string | null;
    resolution?: string | null;
    resolvedById?: string | null;
    resolvedAt?: string | null;
    companyId?: string;
    domainId?: string;
    createdAt?: string;
    updatedAt?: string;
    type?: string;
    amount?: string | number;
    reason?: string;
    resolved?: boolean;
    resolvedBy?: CashUpUser | null;
};

export type CashUpDetails = {
    id: string;
    tillId: string;
    shiftId?: string | null;
    companyId?: string;
    domainId?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    cashUpDate: string;
    createdById?: string | null;
    createdByUser?: CashUpUser | null;
    createdByName?: string | null;
    submittedById?: string | null;
    submittedAt?: string | null;
    approvedById?: string | null;
    approvedAt?: string | null;
    rejectedById?: string | null;
    rejectedAt?: string | null;
    discountAmount?: string | null;
    couponAmount?: string | null;
    cashFloat?: string | null;
    cheques?: string | null;
    epos?: string | null;
    vouchersCashedIn?: string | null;
    other?: string | null;
    bankTransfers?: string | null;
    safeDrop?: string | null;
    createdAt: string;
    updatedAt: string;
    till?: CashUpTill | null;
    shift?: CashUpShift | null;
    store?: CashUpStore | null;
    warehouse?: unknown;
    denominations?: CashUpDenomination[];
    CashUpDenominations?: CashUpDenomination[];
    status?: string;
    resolution?: string | null;
    reviewMessage?: string | null;
    notes?: string | null;
    declaredTotal?: string | number | null;
    declaredTotals?: string | number | null;
    expectedTotal?: string | number | null;
    expectedTotals?: string | number | null;
    variance?: string | number | null;
    approvedBy?: CashUpUser | null;
    varianceActions?: CashUpVarianceAction[] | null;
    totalAmount?: number;
};

export interface GetCashUpResponse {
    success: boolean;
    message: string;
    data: {
        count?: number;
        rows?: CashUpDetails[];
        access?: {
            canViewAll?: boolean;
            ownerUserId?: string;
        };
        [key: string]: unknown;
    };
}

export async function getCashUps(props: CashUpFilterProps): Promise<GetCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.all.url,
            method: apiUrls.cashUp.all.method,
            data: props,
        })
    ).data;
}

export const useGetCashUps = (props: CashUpFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashUp), props],
        queryFn: async () => await getCashUps(props),
    });
};

export interface GetCashUpByIdResponse {
    success: boolean;
    message?: string;
    data: CashUpDetails;
}

export async function getCashUpById(id: string): Promise<GetCashUpByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.get.url,
            method: apiUrls.cashUp.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCashUp = (id?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashUp.get.url), id],
        queryFn: async () => await getCashUpById(id as string),
        enabled: !!id,
    });
};

export const useGetShiftCashUps = (shiftId?: string, enabled = true) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.cashUp), 'shift', shiftId],
        queryFn: () => getCashUps({ shiftId, limit: 25, offset: 0 }),
        enabled: !!shiftId && enabled,
        refetchOnWindowFocus: true,
    });

export const cashUpDenominationItem = z.object({
    denominationId: z.string().min(1, 'Denomination is required'),
    count: z.number().min(0, 'Count is required'),
});

export const CASH_UP_STATUSES = ['DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'] as const;
export type CashUpStatus = (typeof CASH_UP_STATUSES)[number];

export const CASH_UP_RESOLUTIONS = [
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'RECOUNT',
    'INVESTIGATE',
    'SAFE_ADJUSTMENT',
] as const;
export type CashUpResolution = (typeof CASH_UP_RESOLUTIONS)[number];

export const cashUpSchema = z.object({
    tillId: z.string().min(1, 'Till is required'),
    shiftId: z.string().optional(),
    cashUpDate: z.string().min(1, 'Cash up date is required'),
    companyDebtorId: z.string().optional(),
    // Declared counted cash for the shift, sent as a 2-decimal string. The server
    // derives declaredTotal/expectedTotal/variance from this plus the denominations.
    cashFloat: z.union([z.string(), z.number()]).optional(),
    status: z.enum(CASH_UP_STATUSES).optional(),
    denominations: z.array(cashUpDenominationItem),
});

export type CashUpSchema = z.infer<typeof cashUpSchema>;

// The backend sets status to DRAFT on create, so it is deliberately excluded here.
export type CreateCashUpPayload = Omit<CashUpSchema, 'status'> & { id?: string };

export type MutateCashUpResponse = {
    success: boolean;
    message?: string;
    data?: CashUpDetails;
};

export interface CashUpUpdatePayload extends Partial<CashUpSchema> {
    id: string;
    status?: CashUpStatus;
    resolution?: CashUpResolution;
    notes?: string;
}

export async function createCashUp(data: CreateCashUpPayload): Promise<MutateCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.create.url,
            method: apiUrls.cashUp.create.method,
            data,
        })
    ).data;
}

export const useCreateCashUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCashUp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashUp)] });
        },
    });
};

export async function updateCashUp(data: CashUpUpdatePayload): Promise<MutateCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.update.url,
            method: apiUrls.cashUp.update.method,
            data,
        })
    ).data;
}

export const useUpdateCashUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCashUp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashUp)] });
        },
    });
};

export async function removeCashUp(id: string): Promise<MutateCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.delete.url,
            method: apiUrls.cashUp.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCashUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCashUp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashUp)] });
        },
    });
};

// --------------------------------------- 3048 CASH-UP SALES & NON-BANKABLE TOTALS ---------------------------------------
//
// Returns the total sales breakdown along with non-bankable transaction totals
// for the cash-up settlement.
//
//   POST /api/company/cashUp/tenders
//   {
//     "dateFrom": "2026-08-08",
//     "dateTo": "2026-09-08",
//     // "isCsv": true,
//     // "tillId": "till-uuid-here"
//   }

export interface CashUpTendersFilter {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    tillId?: string;
    shiftId?: string;
    sourceTypes?: string[];
    isCsv?: boolean;
}

// One line of the `report` array. Note this is NOT a generic tender row: the endpoint
// breaks sales down by saleType/tenderTypeId, and carries the collection, refund and
// bankability detail alongside the amount.
export interface CashUpTenderRow {
    saleType?: string;
    tenderTypeId?: string;
    sourceType?: string | null;
    description?: string;
    // Number of documents of this tender.
    count?: number;
    // Denomination/note detail carried by this line, when the backend sends it.
    detail?: number;
    // Net amount for this tender after refunds.
    amount?: number;
    // Total taken before refunds.
    grossCollection?: number;
    refundAmount?: number;
    isBankable?: boolean;
    // Tolerated for payloads that include a row id.
    id?: string;
    [key: string]: unknown;
}

export interface CashUpTendersTotals {
    totalCollection?: number;
    grossCollection?: number;
    refundAmount?: number;
    transactionCount?: number;
    salesTransactionCount?: number;
    refundTransactionCount?: number;
}

export interface CashUpTendersBankableTotals {
    bankableTotal?: number;
    nonBankableTotal?: number;
    cashInDrawer?: number;
}

export interface CashUpTendersAppliedFilters {
    companyIds?: string[];
    terminalIds?: string[];
    tenderTypeIds?: string[];
    sourceTypes?: string[];
    companyDebtorId?: string | null;
    dateFrom?: string;
    dateTo?: string;
}

export interface CashUpTendersData {
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    tillId?: string;
    report?: CashUpTenderRow[];
    // Untyped on the backend as far as we consume it; surfaced for the preview only.
    collections?: unknown[];
    totals?: CashUpTendersTotals;
    bankableTotals?: CashUpTendersBankableTotals;
    reconciliationWarnings?: unknown[];
    appliedFilters?: CashUpTendersAppliedFilters;
    [key: string]: unknown;
}

export interface GetCashUpTendersResponse {
    success: boolean;
    message?: string;
    data?: CashUpTendersData | null;
}

export async function getCashUpTenders(props: CashUpTendersFilter): Promise<GetCashUpTendersResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.tenders.url,
            method: apiUrls.cashUp.tenders.method,
            data: props,
        })
    ).data;
}

export const useGetCashUpTenders = (props: CashUpTendersFilter, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashUp.tenders.url), props],
        queryFn: async () => await getCashUpTenders(props),
        ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    });
};

export function toCashUpTenderRows(data: GetCashUpTendersResponse['data']): CashUpTenderRow[] {
    if (!data) return [];
    // The endpoint returns the breakdown under `report`. The other keys are tolerated
    // in case the shape varies, but `report` is what the backend actually sends.
    if (Array.isArray(data.report)) return data.report;
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    return [];
}

export function toNonBankableRows(data: GetCashUpTendersResponse['data']): CashUpTenderRow[] {
    return toCashUpTenderRows(data).filter((row) => row.isBankable === false);
}

// --------------------------------------- CASH UP LIFECYCLE ACTIONS ---------------------------------------
//
// Status is never set by the create call; the backend opens every cash-up as DRAFT and
// the only way forward is one of the actions below, each gated by its own permission:
//
//   DRAFT -> SUBMITTED                  CASHUP_SUBMIT
//   SUBMITTED -> review resolution      CASHUP_APPROVE
// A submitted cash-up is reviewed directly. The server may auto-approve a zero-variance
// cash-up; clients must always refresh the saved record and never infer approval locally.

export interface SubmitCashUpPayload {
    id: string;
    status: 'SUBMITTED';
    notes?: string;
}

export async function submitCashUp(data: SubmitCashUpPayload): Promise<MutateCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.update.url,
            method: apiUrls.cashUp.update.method,
            data,
        })
    ).data;
}

export const useSubmitCashUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitCashUp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashUp)] });
        },
    });
};

export type CashUpDecision = 'APPROVE' | 'RECOUNT' | 'INVESTIGATE' | 'REJECT';

export interface DecideCashUpPayload {
    id: string;
    decision: CashUpDecision;
    notes?: string;
}

const DECISION_PAYLOADS: Record<CashUpDecision, Omit<CashUpUpdatePayload, 'id'>> = {
    // Accept the counted variance and approve.
    APPROVE: { status: 'APPROVED', resolution: 'ACCEPTED' },
    // Approve but send it back for a recount.
    RECOUNT: { status: 'APPROVED', resolution: 'RECOUNT' },
    INVESTIGATE: { status: 'APPROVED', resolution: 'INVESTIGATE' },
    // A rejection carries no resolution.
    REJECT: { status: 'REJECTED' },
};

export async function decideCashUp(data: DecideCashUpPayload): Promise<MutateCashUpResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashUp.update.url,
            method: apiUrls.cashUp.update.method,
            data: {
                id: data.id,
                ...DECISION_PAYLOADS[data.decision],
                ...(data.notes ? { notes: data.notes } : {}),
            },
        })
    ).data;
}

export const useDecideCashUp = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: decideCashUp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashUp)] });
        },
    });
};
