import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- 3020 END-OF-DAY / Z-REPORT ---------------------------------------
//
// The endOfDay endpoints are keyed by `tradingDate` (YYYY-MM-DD) for a terminal
// (Terminal-Id is attached automatically by the axios interceptor). Once a
// trading day is closed, normal and multi-tax POS sale/refund APIs reject
// further transactions for that terminal + trading date.
//
//   preview  /api/company/endOfDay/preview
//   close    /api/company/endOfDay/close
//   get      /api/company/endOfDay/get
//   all      /api/company/endOfDay/all
//   reopen   /api/company/endOfDay/reopen
//
// If cash variance exists, resend close with approveVariance: true and a
// varianceReason. If a protected action returns 428 APPROVAL_REQUIRED, re-submit
// the same payload with the X-Approval-Token header.

// --------------------------------------- Types ---------------------------------------

export type EndOfDayCloseStatus = 'OPEN' | 'CLOSED' | 'REOPENED' | string;

export interface EndOfDayTenderTotals {
    tenderType?: string;
    tenderName?: string;
    tenderCode?: string;
    count?: number;
    amount?: number;
    [key: string]: unknown;
}

export interface EndOfDayTaxTotals {
    taxCode?: string;
    taxName?: string;
    taxableValue?: number;
    taxAmount?: number;
    [key: string]: unknown;
}

export interface EndOfDaySnapshot {
    tradingDate?: string;
    tradingDayId?: string;
    tillId?: string;
    tillName?: string;
    terminalId?: string;
    companyWarehouseId?: string | null;
    closeStatus?: EndOfDayCloseStatus;
    closeVersion?: number;
    openedAt?: string | null;
    closedAt?: string | null;
    openingFloat?: number;
    grossSales?: number;
    netSales?: number;
    discounts?: number;
    refunds?: number;
    voidAmount?: number;
    transactionCount?: number;
    tenders?: EndOfDayTenderTotals[];
    tax?: EndOfDayTaxTotals[];
    cashVariance?: number | null;
    varianceApproved?: boolean;
    varianceReason?: string | null;
    [key: string]: unknown;
}

// --------------------------------------- Preview ---------------------------------------

export interface EndOfDayPreviewInput {
    tradingDate: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
}

export interface EndOfDayCountSummary {
    documentCount?: number;
    totalQuantity?: number;
    totalAmount?: number;
}

export interface EndOfDayCashUp {
    count?: number;
    expectedCash?: number;
    declaredCash?: number;
    variance?: number;
}

export interface EndOfDayBlockers {
    openShifts?: Array<unknown>;
    missingCashUp?: boolean;
    unresolvedVariance?: boolean;
}

export interface EndOfDayPreviewScope {
    companyId?: string | null;
    domainId?: string | null;
    terminalId?: string | null;
    tradingDate?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    [key: string]: unknown;
}

export interface EndOfDayPreviewData {
    scope?: EndOfDayPreviewScope;
    sales?: EndOfDayCountSummary;
    refunds?: EndOfDayCountSummary;
    netSalesAmount?: number;
    tenders?: EndOfDayTenderTotals[];
    cashUp?: EndOfDayCashUp;
    blockers?: EndOfDayBlockers;
    calculatedAt?: string | null;
    closeStatus?: EndOfDayCloseStatus;
    closeVersion?: number;
    canClose?: boolean;
    [key: string]: unknown;
}

export interface EndOfDayPreviewResponse {
    success: boolean;
    message?: string;
    data?: EndOfDayPreviewData | null;
}

export function toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

export function toText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value instanceof Date) return value.toISOString();
    return '';
}

export async function getEndOfDayPreview(props: EndOfDayPreviewInput): Promise<EndOfDayPreviewResponse> {
    return (
        await axiosInstance({
            url: apiUrls.endOfDay.preview.url,
            method: apiUrls.endOfDay.preview.method,
            data: props,
        })
    ).data;
}

export const useGetEndOfDayPreview = (props: EndOfDayPreviewInput | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.endOfDay.preview.url), props],
        enabled: !!props?.tradingDate,
        queryFn: async () => await getEndOfDayPreview(props as EndOfDayPreviewInput),
    });
};

// --------------------------------------- Close ---------------------------------------

export interface CloseEndOfDayInput {
    tradingDate: string;
    clientDocumentId?: string;
    closeVersion?: number;
    approveVariance?: boolean;
    varianceReason?: string;
    reason?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    approvalToken?: string;
}

export interface EndOfDayMutateResponse {
    success: boolean;
    message?: string;
    data?: EndOfDaySnapshot | null;
}

export async function closeEndOfDay(data: CloseEndOfDayInput): Promise<EndOfDayMutateResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.endOfDay.close.url,
            method: apiUrls.endOfDay.close.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCloseEndOfDay = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: closeEndOfDay,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.endOfDay)] });
        },
    });
};

// --------------------------------------- Get (single) ---------------------------------------

export interface GetEndOfDayInput {
    tradingDate: string;
}

export interface GetEndOfDayResponse {
    success: boolean;
    message?: string;
    data?: EndOfDaySnapshot | null;
}

export async function getEndOfDay(props: GetEndOfDayInput): Promise<GetEndOfDayResponse> {
    return (
        await axiosInstance({
            url: apiUrls.endOfDay.get.url,
            method: apiUrls.endOfDay.get.method,
            data: props,
        })
    ).data;
}

export const useGetEndOfDay = (props: GetEndOfDayInput | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.endOfDay.get.url), props],
        enabled: !!props?.tradingDate,
        queryFn: async () => await getEndOfDay(props as GetEndOfDayInput),
    });
};

// --------------------------------------- All (list of Z-reports) ---------------------------------------

export interface EndOfDayListInput {
    closeStatus?: EndOfDayCloseStatus;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
}

export interface EndOfDayListResponseData {
    count?: number;
    rows?: EndOfDaySnapshot[];
    items?: EndOfDaySnapshot[];
}

export interface EndOfDayListResponse {
    success: boolean;
    message?: string;
    data?: EndOfDayListResponseData | null;
}

export async function getEndOfDayList(props: EndOfDayListInput): Promise<EndOfDayListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.endOfDay.all.url,
            method: apiUrls.endOfDay.all.method,
            data: props,
        })
    ).data;
}

export const useGetEndOfDayList = (props: EndOfDayListInput | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.endOfDay.all.url), props],
        enabled: !!(props?.fromDate && props?.toDate),
        queryFn: async () => await getEndOfDayList(props as EndOfDayListInput),
    });
};

export function toEndOfDayRows(data: EndOfDayListResponse['data']): EndOfDaySnapshot[] {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    return [];
}

// --------------------------------------- Reopen ---------------------------------------

export interface ReopenEndOfDayInput {
    tradingDate: string;
    closeVersion: number;
    reason?: string;
    approvalToken?: string;
}

export async function reopenEndOfDay(data: ReopenEndOfDayInput): Promise<EndOfDayMutateResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.endOfDay.reopen.url,
            method: apiUrls.endOfDay.reopen.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReopenEndOfDay = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reopenEndOfDay,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.endOfDay)] });
        },
    });
};
