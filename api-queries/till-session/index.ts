import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { TillDetails } from '@/api-queries/masters/tills';

// --------------------------------------- TILL SESSION ---------------------------------------
//
// The backend binds Terminal-Id to the authenticated login session. The client only
// forwards that saved terminal for open/close operations; it never infers it from a
// selected till or a cached till session.

export type TillSessionStatus = 'ACTIVE' | 'OPEN' | 'CLOSED';

export interface TillSession {
    id: string;
    tillId: string;
    userId: string;
    companyId: string;
    domainId?: string;
    status: TillSessionStatus;
    openingFloat?: number | string | null;
    openedAt?: string;
    closedAt?: string | null;
    cashUpId?: string | null;
    till?: TillDetails | null;
    user?: { id?: string; firstName?: string; surname?: string } | null;
    createdAt?: string;
    updatedAt?: string;
}

// A till session is considered open when the backend reports it as ACTIVE (the
// value returned by /api/company/tillAssign/session/active and /open) or OPEN.
export function isTillSessionActive(session: TillSession | null | undefined): session is TillSession {
    return !!session && (session.status === 'ACTIVE' || session.status === 'OPEN');
}

export interface GetActiveTillSessionResponse {
    success: boolean;
    message?: string;
    data?: TillSession | null;
}

export async function getActiveTillSession(): Promise<GetActiveTillSessionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.session.active.url,
            method: apiUrls.userTills.session.active.method,
            data: {},
        })
    ).data;
}

export interface CurrentUserSession {
    sessionId?: string;
    id?: string;
    userId?: string;
    status?: string;
    clientType?: string;
    terminalId?: string;
    installationId?: string;
    eligibleTills?: Array<{ id: string; rosterAssignmentId?: string }>;
    sessionExpiresAt?: string;
}

export async function getCurrentUserSession(): Promise<{
    success: boolean;
    message?: string;
    data?: CurrentUserSession | null;
}> {
    return (
        await axiosInstance({
            url: '/api/company/userMonitoring/sessions/current',
            method: 'POST',
            data: {},
        })
    ).data;
}

export const useGetCurrentUserSession = (enabled = true) =>
    useQuery({
        queryKey: ['userMonitoring', 'sessions', 'current'],
        queryFn: getCurrentUserSession,
        enabled,
        refetchOnWindowFocus: true,
    });

export const useActiveTillSession = (enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userTills.session.active)],
        queryFn: async () => await getActiveTillSession(),
        enabled,
    });
};

export interface OpenTillSessionInput {
    tillId: string;
    openingFloat?: number;
    rosterAssignmentId?: string;
}

export async function openTillSession(
    data: OpenTillSessionInput,
    terminalId: string,
): Promise<{ success: boolean; message?: string; data?: TillSession }> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.session.open.url,
            method: apiUrls.userTills.session.open.method,
            data,
            headers: { 'Terminal-Id': terminalId },
        })
    ).data;
}

export const useOpenTillSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ data, terminalId }: { data: OpenTillSessionInput; terminalId: string }) =>
            openTillSession(data, terminalId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills.session.active)] });
        },
    });
};

export interface CloseTillSessionInput {
    cashUpId: string;
}

export async function closeTillSession(
    data: CloseTillSessionInput,
    terminalId: string,
): Promise<{ success: boolean; message?: string; data?: TillSession | null }> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.session.close.url,
            method: apiUrls.userTills.session.close.method,
            data,
            headers: { 'Terminal-Id': terminalId },
        })
    ).data;
}

export const useCloseTillSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ data, terminalId }: { data: CloseTillSessionInput; terminalId: string }) =>
            closeTillSession(data, terminalId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills.session.active)] });
        },
    });
};

// --------------------------------------- TILL BALANCE STATUS ---------------------------------------

export interface TillBalanceStatus {
    isAboveThreshold: boolean;
    excess: number;
    message?: string;
}

export interface GetTillBalanceStatusResponse {
    success: boolean;
    message?: string;
    data?: TillBalanceStatus | null;
}

export async function getTillBalanceStatus(id: string): Promise<GetTillBalanceStatusResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.balanceStatus.url,
            method: apiUrls.masters.tills.balanceStatus.method,
            data: { id },
        })
    ).data;
}

export const useGetTillBalanceStatus = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.tills.balanceStatus), id],
        queryFn: async () => await getTillBalanceStatus(id as string),
        enabled: !!id,
    });
};

// --------------------------------------- LIVE TILL CASHIER REPORT ---------------------------------------
//
// Backlog 3023: the cashier drawer amount during a sale comes from
// /api/company/reports/till-cashier and is available as soon as the session is
// open. A Cash-Up is only required to close the session, so this report is
// polled (rather than read from Cash-Up) to show the live drawer balance.

export interface TillCashierReportRow {
    cashierName?: string;
    netDrawerBalance?: number;
    openingFloat?: number;
    tillId?: string;
    tillName?: string;
    totalCashSales?: number;
    totalDropsToSafe?: number;
    totalPayouts?: number;
    totalRefunds?: number;
    transactionCount?: number;
}

export interface GetTillCashierReportResponse {
    success?: boolean;
    message?: string;
    count?: number;
    data?: TillCashierReportRow[];
    summary?: {
        totalCashSales?: number;
        totalDropsToSafe?: number;
        totalRefunds?: number;
        totalCashCurrentlyInTills?: number;
    };
}

export type TillCashierReportFilter = {
    tillId?: string;
    userId?: string;
    companyDebtorId?: string;
    fromDate?: string;
    toDate?: string;
};

export async function getTillCashierReport(
    filter: TillCashierReportFilter,
): Promise<GetTillCashierReportResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.report.url,
            method: apiUrls.userTills.report.method,
            data: filter,
        })
    ).data;
}

// Live drawer balance for the current session's till. Polled while the session is
// open so the cashier always sees the amount physically in the drawer.
export const useGetLiveTillDrawerBalance = (filter: TillCashierReportFilter, enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userTills.report.url), 'live-drawer', filter],
        queryFn: async () => await getTillCashierReport(filter),
        enabled: enabled && !!filter.tillId,
        refetchInterval: 30_000,
        refetchOnWindowFocus: true,
    });
};


export async function getActiveShiftSession(): Promise<any> {
    return (
        await axiosInstance({
            url: '/api/company/shift/current',
            method: 'POST',
            data: {},
        })
    ).data;
}

export async function openNewShift(data: { tillId: string; openingFloat?: number }): Promise<any> {
    return (
        await axiosInstance({
            url: '/api/company/shift/open',
            method: 'POST',
            data,
        })
    ).data;
}

export async function handoverShift(data: { cashUpId: string; handoverRequestId: string }): Promise<any> {
    return (
        await axiosInstance({
            url: '/api/company/shift/handover',
            method: 'POST',
            data,
        })
    ).data;
}

export async function recoverShiftHandover(data: {
    shiftId: string;
    cashUpId: string;
    handoverRequestId: string;
    reason: string;
}): Promise<any> {
    return (
        await axiosInstance({
            url: '/api/company/shift/handover/recover',
            method: 'POST',
            data,
        })
    ).data;
}
