import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- CASH OFFICE (3200-3208) ---------------------------------------
// All Cash Office endpoints are POST with a JSON body. Company-Id and Authorization
// are attached globally by the axios request interceptor. Actions guarded by backend
// security send HTTP 428 APPROVAL_REQUIRED; the UI completes the fingerprint/password
// approval flow and retries the same mutation with an approvalToken which is passed
// as the X-Approval-Token header.

// --------------------------------------- TYPES ---------------------------------------

export interface CashOfficeDenomination {
    denominationId: string;
    quantity: number;
}

export interface CashOfficeConfiguration {
    id: string;
    code: string;
    name: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    safeId?: string | null;
    cashThresholdAmount: number;
    invoicePaymentThresholdAmount: number;
    autoHandoverEnabled: boolean;
    manualHandoverEnabled: boolean;
    varianceApprovalLimit: number;
    receiptPrefix?: string;
    pendingEscalationMinutes: number;
    status?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

export type CashOfficeSessionStatus = 'OPEN' | 'CLOSED' | 'REOPENED';

export interface CashOfficeSession {
    id: string;
    cashOfficeId?: string;
    cashOffice?: CashOfficeConfiguration | null;
    sessionNumber?: string | null;
    businessDate?: string;
    status?: CashOfficeSessionStatus;
    openingCashAmount?: number;
    openingChequeAmount?: number;
    closingCashAmount?: number;
    closingChequeAmount?: number;
    variance?: number;
    openedBy?: string;
    openedByName?: string;
    closedBy?: string;
    closedByName?: string;
    closedAt?: string;
    clientDocumentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CashOfficeHandoverUser {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    staffNumber?: number | string | null;
    name?: string | null;
}

export interface CashOfficeHandoverTill {
    id: string;
    name?: string | null;
    tillNumber?: string | null;
    companyDebtorId?: string | null;
}

export interface CashOfficeHandoverCashOffice {
    id: string;
    code?: string | null;
    name?: string | null;
    safeId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
}

export interface CashOfficeHandoverSafe {
    id: string;
    name?: string | null;
    code?: string | null;
}

export interface CashOfficeHandover {
    id: string;
    cashOfficeSessionId?: string;
    cashOfficeSession?: CashOfficeSession | null;
    cashOfficeId?: string | null;
    cashOffice?: CashOfficeHandoverCashOffice | null;
    tillId?: string | null;
    tillName?: string | null;
    till?: CashOfficeHandoverTill | null;
    safe?: CashOfficeHandoverSafe | null;
    shiftId?: string | null;
    requestType?: 'MANUAL' | 'AUTO';
    sourceType?: string | null;
    sourceId?: string | null;
    declaredCashAmount?: number | string;
    declaredChequeAmount?: number | string;
    countedCashAmount?: number | string;
    countedChequeAmount?: number | string;
    variance?: number | string;
    varianceAmount?: number | string;
    varianceReason?: string | null;
    denominations?: CashOfficeDenomination[];
    status?:
        | 'REQUESTED'
        | 'CLAIMED'
        | 'COUNTED'
        | 'PENDING_APPROVAL'
        | 'RECEIVED'
        | 'ACKNOWLEDGED'
        | 'REJECTED'
        | 'REVERSED';
    receiptNumber?: string | null;
    tillSafeTransactionId?: string | null;
    requestedById?: string | null;
    claimedById?: string | null;
    receivedById?: string | null;
    acknowledgedById?: string | null;
    approvalRequestId?: string | null;
    requestedAt?: string | null;
    claimedAt?: string | null;
    countedAt?: string | null;
    receivedAt?: string | null;
    acknowledgedAt?: string | null;
    countedBy?: string | null;
    countedByName?: string | null;
    receivedBy?: string | null;
    receivedByName?: string | null;
    requestedByName?: string | null;
    claimedByName?: string | null;
    acknowledgedByName?: string | null;
    requestedByUser?: CashOfficeHandoverUser | null;
    claimedByUser?: CashOfficeHandoverUser | null;
    receivedByUser?: CashOfficeHandoverUser | null;
    acknowledgedByUser?: CashOfficeHandoverUser | null;
    clerkName?: string | null;
    rejectReason?: string | null;
    clientDocumentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export type CashOfficeTransactionStatus =
    | 'DRAFT'
    | 'SUBMITTED'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'POSTED'
    | 'IN_TRANSIT'
    | 'REVERSED'
    | 'REJECTED'
    | 'CANCELLED';

export interface CashOfficeTransaction {
    id: string;
    cashOfficeSessionId?: string;
    transactionType?:
        | 'PAYOUT'
        | 'EXPENSE'
        | 'WAGE'
        | 'SUPPLIER_PAYMENT'
        | 'REFUND'
        | 'TRANSFER'
        | 'TRANSFER_OUT'
        | 'TRANSFER_IN'
        | 'BANK_DEPOSIT'
        | 'BANK_WITHDRAWAL'
        | 'RECEIPT';
    cashAmount?: number;
    chequeAmount?: number;
    amount?: number;
    tenderType?: string;
    tenderTypeId?: string;
    /**
     * Backend now returns separate status fields. `status` is kept for older
     * responses; prefer `transactionStatus` for the row badge and actions.
     */
    status?: CashOfficeTransactionStatus;
    transactionStatus?: CashOfficeTransactionStatus;
    /** Status of the cash-office session linked to this transaction. */
    cashOfficeSessionStatus?: CashOfficeSessionStatus;
    isCashOfficeSessionOpen?: boolean;
    cashOfficeSession?: CashOfficeSession | null;
    recipientType?: string | null;
    recipientId?: string | null;
    recipientName?: string | null;
    sourceDocumentType?: string | null;
    sourceDocumentId?: string | null;
    reason?: string | null;
    attachmentUrls?: string[];
    destinationCashOfficeId?: string | null;
    destinationCashOfficeName?: string | null;
    bankAccountId?: string | null;
    /** Display details of the linked bank account (list/get responses). */
    bankAccount?: {
        id: string;
        code: string;
        name: string;
        bankName: string;
        accountNumber: string;
        accountHolder?: string | null;
        branchCode?: string | null;
        accountType?: string | null;
        currencyCode?: string | null;
        status?: string;
    } | null;
    bankReference?: string | null;
    bankTransactionDate?: string | null;
    depositSlipUrl?: string | null;
    receivedAmount?: number | null;
    postedAt?: string | null;
    reversedAt?: string | null;
    reversedReason?: string | null;
    clientDocumentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CashOfficeReconciliation {
    id: string;
    cashOfficeSessionId?: string;
    countedCashAmount?: number;
    countedChequeAmount?: number;
    variance?: number;
    varianceReason?: string | null;
    status?: 'SUBMITTED' | 'APPROVED' | 'CLOSED';
    submittedBy?: string;
    approvedBy?: string | null;
    clientDocumentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CashOfficeReconciliationPreview {
    summary: Record<string, number>;
    expected: {
        expectedCashAmount?: number;
        expectedChequeAmount?: number;
        expectedTotal?: number;
    };
    blockers: {
        openHandovers?: number;
        pendingTransactions?: number;
    };
    canClose: boolean;
}

export interface CashOfficeReportRow {
    id?: string;
    [key: string]: unknown;
}

export interface GetCashOfficeListResponse<T> {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: T[];
    };
}

export interface MutateCashOfficeResponse<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
}

// Generate a clientDocumentId for idempotent/offline retries. The same id must be
// reused when retrying the same request.
export function generateCashOfficeDocumentId(prefix: string): string {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const seq = String(Math.floor(100000 + Math.random() * 900000));
    return `${prefix}-${ymd}-${seq}`;
}

// --------------------------------------- CONFIGURATION (3200) ---------------------------------------

export interface CashOfficeConfigurationInput {
    code: string;
    name: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    safeId?: string | null;
    cashThresholdAmount: number;
    invoicePaymentThresholdAmount: number;
    autoHandoverEnabled: boolean;
    manualHandoverEnabled: boolean;
    varianceApprovalLimit: number;
    receiptPrefix?: string;
    pendingEscalationMinutes: number;
}

export interface UpdateCashOfficeConfigurationInput {
    id: string;
    code?: string;
    name?: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    safeId?: string | null;
    cashThresholdAmount?: number;
    invoicePaymentThresholdAmount?: number;
    autoHandoverEnabled?: boolean;
    manualHandoverEnabled?: boolean;
    varianceApprovalLimit?: number;
    receiptPrefix?: string;
    pendingEscalationMinutes?: number;
    status?: 'ACTIVE' | 'INACTIVE';
}

export type CashOfficeConfigurationFilterProps = {
    companyDebtorId?: string;
    companyWarehouseId?: string;
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
};

export async function getCashOfficeConfigurations(
    props: CashOfficeConfigurationFilterProps,
): Promise<GetCashOfficeListResponse<CashOfficeConfiguration>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.configurationList.url,
            method: apiUrls.cashOffice.configurationList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeConfigurations = (props: CashOfficeConfigurationFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'configuration-list', props],
        queryFn: async () => await getCashOfficeConfigurations(props),
    });
};

export async function createCashOfficeConfiguration(
    data: CashOfficeConfigurationInput,
): Promise<MutateCashOfficeResponse<CashOfficeConfiguration>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.configurationCreate.url,
            method: apiUrls.cashOffice.configurationCreate.method,
            data,
        })
    ).data;
}

export const useCreateCashOfficeConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCashOfficeConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'configuration-list'] });
        },
    });
};

export async function updateCashOfficeConfiguration(
    data: UpdateCashOfficeConfigurationInput,
): Promise<MutateCashOfficeResponse<CashOfficeConfiguration>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.configurationUpdate.url,
            method: apiUrls.cashOffice.configurationUpdate.method,
            data,
        })
    ).data;
}

export const useUpdateCashOfficeConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCashOfficeConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'configuration-list'] });
        },
    });
};

export async function changeCashOfficeConfigurationStatus(data: {
    id: string;
    status: 'ACTIVE' | 'INACTIVE';
}): Promise<MutateCashOfficeResponse<CashOfficeConfiguration>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.configurationChangeStatus.url,
            method: apiUrls.cashOffice.configurationChangeStatus.method,
            data,
        })
    ).data;
}

export const useChangeCashOfficeConfigurationStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: changeCashOfficeConfigurationStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'configuration-list'] });
        },
    });
};

// --------------------------------------- PAYMENT ROUTING & PAYMENT METHODS ---------------------------------------
// Before collecting an invoice/cart payment the POS calls payment-routing/check.
// Route "POS" keeps the payment at the checkout; route "CASH_OFFICE" means the
// payment must be collected at the Cash Office (amount exceeded the threshold).
// Payment methods are listed through payment-method/list instead of directly
// reading tender masters.

export type CashOfficePaymentRoute = 'POS' | 'CASH_OFFICE';

export interface CashOfficePaymentRoutingCheckPayload {
    invoiceAmount: number;
    companyDebtorId?: string;
    companyWarehouseId?: string;
}

export interface CashOfficePaymentRoutingResult {
    route: CashOfficePaymentRoute;
    cashOfficeRequired: boolean;
    invoiceAmount: number;
    thresholdAmount: number;
    cashOffice?: Record<string, unknown> | null;
}

export interface CashOfficePaymentMethod {
    id: string;
    type: string;
    code?: string;
    name?: string;
    description?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    parentTenderId?: string | null;
    isParentNull?: boolean;
    isDiscountParent?: boolean;
    [key: string]: unknown;
}

export async function checkCashOfficePaymentRouting(
    data: CashOfficePaymentRoutingCheckPayload,
): Promise<MutateCashOfficeResponse<CashOfficePaymentRoutingResult>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.paymentRoutingCheck.url,
            method: apiUrls.cashOffice.paymentRoutingCheck.method,
            data,
        })
    ).data;
}

export const useCheckCashOfficePaymentRouting = () => {
    return useMutation({ mutationFn: checkCashOfficePaymentRouting });
};

export async function getCashOfficePaymentMethods(props: {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
}): Promise<GetCashOfficeListResponse<CashOfficePaymentMethod>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.paymentMethodList.url,
            method: apiUrls.cashOffice.paymentMethodList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficePaymentMethods = (
    props: { limit?: number; offset?: number; search?: string; status?: string },
    enabled: boolean = true,
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'payment-methods', props],
        queryFn: async () => await getCashOfficePaymentMethods(props),
        enabled,
    });
};

// --------------------------------------- SESSION (3201) ---------------------------------------

export interface OpenSessionPreviewInput {
    cashOfficeId: string;
    businessDate: string;
    openingCashAmount?: number;
    openingChequeAmount?: number;
}

export interface OpenSessionPreviewResult {
    cashOfficeId?: string;
    businessDate?: string;
    openingCashAmount?: number;
    openingChequeAmount?: number;
    carryForwardCashAmount?: number;
    carryForwardChequeAmount?: number;
    [key: string]: unknown;
}

export async function previewOpenCashOfficeSession(
    data: OpenSessionPreviewInput,
): Promise<MutateCashOfficeResponse<OpenSessionPreviewResult>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionOpenPreview.url,
            method: apiUrls.cashOffice.sessionOpenPreview.method,
            data,
        })
    ).data;
}

export const usePreviewOpenCashOfficeSession = () => {
    return useMutation({ mutationFn: previewOpenCashOfficeSession });
};

export interface OpenSessionInput {
    cashOfficeId: string;
    businessDate: string;
    openingCashAmount?: number;
    openingChequeAmount?: number;
    clientDocumentId: string;
}

export async function openCashOfficeSession(
    data: OpenSessionInput,
): Promise<MutateCashOfficeResponse<CashOfficeSession>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionOpen.url,
            method: apiUrls.cashOffice.sessionOpen.method,
            data,
        })
    ).data;
}

export const useOpenCashOfficeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: openCashOfficeSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session-current'] });
        },
    });
};

export async function getCashOfficeSessionCurrent(data: {
    cashOfficeId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeSession>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionCurrent.url,
            method: apiUrls.cashOffice.sessionCurrent.method,
            data,
        })
    ).data;
}

export const useGetCashOfficeSessionCurrent = (cashOfficeId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'session-current', cashOfficeId],
        queryFn: async () => await getCashOfficeSessionCurrent({ cashOfficeId }),
        enabled: !!cashOfficeId,
        // A session belongs to one cash office. Drop the cached entry instead of
        // reusing it when the selected office changes or the screen remounts.
        staleTime: 0,
        gcTime: 0,
        refetchOnMount: 'always',
    });
};

export type CashOfficeSessionFilterProps = {
    cashOfficeId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export async function getCashOfficeSessions(
    props: CashOfficeSessionFilterProps,
): Promise<GetCashOfficeListResponse<CashOfficeSession>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionList.url,
            method: apiUrls.cashOffice.sessionList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeSessions = (props: CashOfficeSessionFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'session-list', props],
        queryFn: async () => await getCashOfficeSessions(props),
    });
};

export async function closeCashOfficeSession(data: {
    cashOfficeReconciliationId: string;
    reason?: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeSession>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionClose.url,
            method: apiUrls.cashOffice.sessionClose.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCloseCashOfficeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: closeCashOfficeSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session-current'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function reopenCashOfficeSession(data: {
    cashOfficeSessionId: string;
    reason?: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeSession>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.sessionReopen.url,
            method: apiUrls.cashOffice.sessionReopen.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReopenCashOfficeSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reopenCashOfficeSession,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session-current'] });
        },
    });
};

// --------------------------------------- HANDOVERS (3202-3203) ---------------------------------------

export interface RequestHandoverInput {
    cashOfficeSessionId: string;
    tillId?: string;
    shiftId?: string;
    requestType: 'MANUAL' | 'AUTO';
    declaredCashAmount?: number;
    declaredChequeAmount?: number;
    clientDocumentId: string;
    denominations?: CashOfficeDenomination[];
}

export async function requestCashOfficeHandover(
    data: RequestHandoverInput,
): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverRequest.url,
            method: apiUrls.cashOffice.handoverRequest.method,
            data,
        })
    ).data;
}

export const useRequestCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: requestCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
        },
    });
};

export type HandoverFilterProps = {
    cashOfficeId?: string;
    cashOfficeSessionId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export async function getCashOfficeHandovers(
    props: HandoverFilterProps,
): Promise<GetCashOfficeListResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverList.url,
            method: apiUrls.cashOffice.handoverList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeHandovers = (props: HandoverFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'handover-list', props],
        queryFn: async () => await getCashOfficeHandovers(props),
    });
};

export async function claimCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverClaim.url,
            method: apiUrls.cashOffice.handoverClaim.method,
            data,
        })
    ).data;
}

export const useClaimCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: claimCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
        },
    });
};

export async function countCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
    countedCashAmount: number;
    countedChequeAmount?: number;
    varianceReason?: string | null;
    denominations?: CashOfficeDenomination[];
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverCount.url,
            method: apiUrls.cashOffice.handoverCount.method,
            data,
        })
    ).data;
}

export const useCountCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: countCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
        },
    });
};

export async function receiveCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverReceive.url,
            method: apiUrls.cashOffice.handoverReceive.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReceiveCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: receiveCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function approveCashOfficeHandoverVariance(data: {
    cashOfficeHandoverId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverApproveVariance.url,
            method: apiUrls.cashOffice.handoverApproveVariance.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useApproveCashOfficeHandoverVariance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveCashOfficeHandoverVariance,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
        },
    });
};

export interface CashOfficeReceiptPayment {
    tenderTypeId: string;
    tenderType?: string;
    amount: number;
    referenceNumber?: string;
    [key: string]: unknown;
}

export interface CreateCashOfficeReceiptInput {
    cashOfficeId: string;
    cashOfficeSessionId: string;
    debtorInvoicingOrderId: string;
    companyDebtorId: string;
    tenderTypeId: string;
    amount: number;
    reference?: string;
    clientDocumentId?: string;
    /** Supervisor token issued by a 428 APPROVAL_REQUIRED response. */
    approvalToken?: string;
    [key: string]: unknown;
}

export interface CreateCashOfficeReceiptResponse {
    success: boolean;
    message?: string;
    data?: unknown;
}

export async function createCashOfficeReceipt(
    input: CreateCashOfficeReceiptInput,
): Promise<CreateCashOfficeReceiptResponse> {
    const { approvalToken, ...payload } = input;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.receiptCreate.url,
            method: apiUrls.cashOffice.receiptCreate.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCreateCashOfficeReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateCashOfficeReceiptInput) => createCashOfficeReceipt(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice)] });
        },
    });
};

export async function getCashOfficeHandoverReceipt(data: {
    cashOfficeHandoverId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverReceipt.url,
            method: apiUrls.cashOffice.handoverReceipt.method,
            data,
        })
    ).data;
}

export const useGetCashOfficeHandoverReceipt = (cashOfficeHandoverId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'handover-receipt', cashOfficeHandoverId],
        queryFn: async () => await getCashOfficeHandoverReceipt({ cashOfficeHandoverId }),
        enabled: !!cashOfficeHandoverId,
    });
};

export async function acknowledgeCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverAcknowledge.url,
            method: apiUrls.cashOffice.handoverAcknowledge.method,
            data,
        })
    ).data;
}

export const useAcknowledgeCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: acknowledgeCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
        },
    });
};

export async function rejectCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
    reason?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverReject.url,
            method: apiUrls.cashOffice.handoverReject.method,
            data,
        })
    ).data;
}

export const useRejectCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: rejectCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
        },
    });
};

export async function reverseCashOfficeHandover(data: {
    cashOfficeHandoverId: string;
    reason?: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeHandover>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.handoverReverse.url,
            method: apiUrls.cashOffice.handoverReverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseCashOfficeHandover = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reverseCashOfficeHandover,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'handover'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
        },
    });
};

// --------------------------------------- TRANSACTIONS (3204) ---------------------------------------

export const CASH_OFFICE_PAYMENT_TYPES = ['PAYOUT', 'EXPENSE', 'WAGE', 'SUPPLIER_PAYMENT', 'REFUND', 'RECEIPT'];

export interface CreateCashOfficeTransactionInput {
    cashOfficeSessionId: string;
    transactionType: string;
    cashAmount: number;
    chequeAmount: number;
    amount: number;
    tenderType?: string;
    tenderTypeId?: string;
    sourceDocumentType?: string;
    sourceDocumentId?: string;
    recipientType?: string;
    recipientId?: string;
    recipientName?: string;
    reason?: string;
    attachmentUrls?: string[];
    clientDocumentId: string;
    approvalToken?: string;
}

/** Payment types that must carry a source document before they can be submitted/posted. */
export const CASH_OFFICE_SOURCE_REQUIRED_TYPES = ['PAYOUT', 'EXPENSE', 'WAGE', 'SUPPLIER_PAYMENT', 'REFUND'];


/**
 * Mirrors the backend rule: both fields together, type = code made of letters,
 * digits and underscores (2-80), reference = the id picked from the document list.
 * Returns an error message or null.
 */
export function validateCashOfficeSource(type: string, ref: string, required: boolean): string | null {
    const t = (type || '').trim();
    const r = (ref || '').trim();
    if (!t && !r) return required ? 'Source Document Type and Source Reference are required for this payment.' : null;
    if (!t) return 'Select a Source Document Type.';
    if (!r) return 'Select the Source Reference from the list.';
    if (!/^[A-Za-z0-9_ ]{2,80}$/.test(t)) return 'Source Document Type may contain only letters, numbers and underscores.';
    if (r.length > 100) return 'Source Reference must be 100 characters or fewer.';
    return null;
}

export async function createCashOfficeTransaction(
    data: CreateCashOfficeTransactionInput,
): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionCreate.url,
            method: apiUrls.cashOffice.transactionCreate.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useCreateCashOfficeTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCashOfficeTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function updateCashOfficeTransactionDraft(data: {
    cashOfficeTransactionId: string;
    cashAmount?: number;
    chequeAmount?: number;
    amount?: number;
    reason?: string;
    sourceDocumentType?: string;
    sourceDocumentId?: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionUpdateDraft.url,
            method: apiUrls.cashOffice.transactionUpdateDraft.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useUpdateCashOfficeTransactionDraft = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCashOfficeTransactionDraft,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
        },
    });
};

export async function submitCashOfficeTransaction(data: {
    cashOfficeTransactionId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionSubmit.url,
            method: apiUrls.cashOffice.transactionSubmit.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useSubmitCashOfficeTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitCashOfficeTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
        },
    });
};

export async function postCashOfficeTransaction(data: {
    cashOfficeTransactionId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionPost.url,
            method: apiUrls.cashOffice.transactionPost.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const usePostCashOfficeTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postCashOfficeTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'dashboard'] });
        },
    });
};

export type CashOfficeTransactionFilterProps = {
    cashOfficeId?: string;
    cashOfficeSessionId?: string;
    transactionType?: string;
    limit?: number;
    offset?: number;
};

export async function getCashOfficeTransactions(
    props: CashOfficeTransactionFilterProps,
): Promise<GetCashOfficeListResponse<CashOfficeTransaction>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionList.url,
            method: apiUrls.cashOffice.transactionList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeTransactions = (props: CashOfficeTransactionFilterProps) => {
    return useQuery({
        // Keep this under the shared 'transaction' prefix so every transaction mutation's
        // invalidateQueries({ queryKey: [..., 'transaction'] }) refreshes the list.
        queryKey: [getApiKey(apiUrls.cashOffice), 'transaction', 'list', props],
        queryFn: async () => await getCashOfficeTransactions(props),
    });
};

export async function reverseCashOfficeTransaction(data: {
    cashOfficeTransactionId: string;
    reason?: string;
    clientDocumentId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transactionReverse.url,
            method: apiUrls.cashOffice.transactionReverse.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReverseCashOfficeTransaction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reverseCashOfficeTransaction,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

// --------------------------------------- TRANSFERS (3205) ---------------------------------------

export interface CreateCashOfficeTransferInput {
    cashOfficeSessionId: string;
    destinationCashOfficeId: string;
    cashAmount: number;
    chequeAmount: number;
    amount: number;
    reason?: string;
    clientDocumentId: string;
}

export async function createCashOfficeTransfer(
    data: CreateCashOfficeTransferInput,
): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transferCreate.url,
            method: apiUrls.cashOffice.transferCreate.method,
            data,
        })
    ).data;
}

export const useCreateCashOfficeTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCashOfficeTransfer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function dispatchCashOfficeTransfer(data: {
    cashOfficeTransactionId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transferDispatch.url,
            method: apiUrls.cashOffice.transferDispatch.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useDispatchCashOfficeTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: dispatchCashOfficeTransfer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function receiveCashOfficeTransfer(data: {
    cashOfficeTransactionId: string;
    receivedAmount?: number;
    varianceReason?: string | null;
    clientDocumentId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transferReceive.url,
            method: apiUrls.cashOffice.transferReceive.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useReceiveCashOfficeTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: receiveCashOfficeTransfer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

// The transfer list is its own endpoint: it returns both directions
// (TRANSFER_OUT / TRANSFER_IN) and needs no transactionType filter.
export type CashOfficeTransferListInput = {
    cashOfficeId?: string;
    limit?: number;
    offset?: number;
};

export async function getCashOfficeTransferList(
    props: CashOfficeTransferListInput,
): Promise<GetCashOfficeListResponse<CashOfficeTransaction>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.transferList.url,
            method: apiUrls.cashOffice.transferList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeTransferList = (props: CashOfficeTransferListInput) => {
    return useQuery({
        // Keep the shared 'transaction' prefix so transfer mutations invalidate it too.
        queryKey: [getApiKey(apiUrls.cashOffice), 'transaction', 'transfer-list', props],
        queryFn: async () => await getCashOfficeTransferList(props),
    });
};

// --------------------------------------- BANK DEPOSITS / WITHDRAWALS (3206) ---------------------------------------

export interface CreateCashOfficeBankInput {
    cashOfficeSessionId: string;
    transactionType: 'BANK_DEPOSIT' | 'BANK_WITHDRAWAL';
    cashAmount: number;
    chequeAmount: number;
    amount: number;
    bankAccountId?: string;
    bankReference?: string;
    bankTransactionDate?: string;
    depositSlipUrl?: string;
    cashbookTransactionId?: string;
    clientDocumentId: string;
}

export async function createCashOfficeBank(
    data: CreateCashOfficeBankInput,
): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.bankCreate.url,
            method: apiUrls.cashOffice.bankCreate.method,
            data,
        })
    ).data;
}

export const useCreateCashOfficeBank = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCashOfficeBank,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function postCashOfficeBank(data: {
    cashOfficeTransactionId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.bankPost.url,
            method: apiUrls.cashOffice.bankPost.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const usePostCashOfficeBank = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postCashOfficeBank,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export async function confirmCashOfficeWithdrawal(data: {
    cashOfficeTransactionId: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeTransaction>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.bankConfirmWithdrawal.url,
            method: apiUrls.cashOffice.bankConfirmWithdrawal.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useConfirmCashOfficeWithdrawal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: confirmCashOfficeWithdrawal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'transaction'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

export type CashOfficeBankListInput = {
    cashOfficeSessionId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export async function getCashOfficeBankList(
    props: CashOfficeBankListInput,
): Promise<GetCashOfficeListResponse<CashOfficeTransaction>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.bankList.url,
            method: apiUrls.cashOffice.bankList.method,
            data: props,
        })
    ).data;
}

export const useGetCashOfficeBankList = (props: CashOfficeBankListInput) => {
    return useQuery({
        // Keep the shared 'transaction' prefix so bank mutations invalidate it too.
        queryKey: [getApiKey(apiUrls.cashOffice), 'transaction', 'bank-list', props],
        queryFn: async () => await getCashOfficeBankList(props),
    });
};

// --------------------------------------- RECONCILIATION (3207) ---------------------------------------

export async function getCashOfficeReconciliationPreview(data: {
    cashOfficeSessionId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeReconciliationPreview>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.reconciliationPreview.url,
            method: apiUrls.cashOffice.reconciliationPreview.method,
            data,
        })
    ).data;
}

export const useGetCashOfficeReconciliationPreview = (cashOfficeSessionId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation-preview', cashOfficeSessionId],
        queryFn: async () => await getCashOfficeReconciliationPreview({ cashOfficeSessionId }),
        enabled: !!cashOfficeSessionId,
    });
};

export async function submitCashOfficeReconciliation(data: {
    cashOfficeSessionId: string;
    countedCashAmount: number;
    countedChequeAmount: number;
    varianceReason?: string | null;
    denominations?: CashOfficeDenomination[];
    clientDocumentId: string;
}): Promise<MutateCashOfficeResponse<CashOfficeReconciliation>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.reconciliationSubmit.url,
            method: apiUrls.cashOffice.reconciliationSubmit.method,
            data,
        })
    ).data;
}

export const useSubmitCashOfficeReconciliation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: submitCashOfficeReconciliation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'session'] });
        },
    });
};

export async function approveCashOfficeReconciliation(data: {
    cashOfficeReconciliationId: string;
    reason?: string;
    approvalToken?: string;
}): Promise<MutateCashOfficeResponse<CashOfficeReconciliation>> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.reconciliationApprove.url,
            method: apiUrls.cashOffice.reconciliationApprove.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

export const useApproveCashOfficeReconciliation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveCashOfficeReconciliation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashOffice), 'reconciliation'] });
        },
    });
};

// --------------------------------------- DASHBOARD & SEARCH (3208) ---------------------------------------

export interface CashOfficeDashboardData {
    summary?: Record<string, unknown>;
    counts?: Record<string, number>;
    today?: {
        handovers?: number;
        pendingTransactions?: number;
        paidOut?: number;
        received?: number;
        banked?: number;
        variance?: number;
    };
    recentHandovers?: CashOfficeHandover[];
    [key: string]: unknown;
}

export async function getCashOfficeDashboard(data: {}): Promise<MutateCashOfficeResponse<CashOfficeDashboardData>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.dashboard.url,
            method: apiUrls.cashOffice.dashboard.method,
            data,
        })
    ).data;
}

export const useGetCashOfficeDashboard = (enabled: boolean = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'dashboard'],
        queryFn: async () => await getCashOfficeDashboard({}),
        enabled,
    });
};

export async function searchCashOffice(data: {
    cashOfficeId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
    [key: string]: unknown;
}): Promise<MutateCashOfficeResponse<Record<string, unknown>>> {
    return (
        await axiosInstance({
            url: apiUrls.cashOffice.search.url,
            method: apiUrls.cashOffice.search.method,
            data,
        })
    ).data;
}

export const useSearchCashOffice = (props: {
    cashOfficeId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'search', props],
        queryFn: async () => await searchCashOffice(props),
    });
};

// --------------------------------------- REPORTS (3208) ---------------------------------------

export type CashOfficeReportType =
    'DAILY_STATEMENT' | 'HANDOVERS' | 'PAYMENTS' | 'TRANSFERS' | 'BANKING' | 'VARIANCES' | 'AUDIT';

export const CASH_OFFICE_REPORT_TYPES: { value: CashOfficeReportType; label: string }[] = [
    { value: 'DAILY_STATEMENT', label: 'Daily Statement' },
    { value: 'HANDOVERS', label: 'Handovers' },
    { value: 'PAYMENTS', label: 'Payments' },
    { value: 'TRANSFERS', label: 'Transfers' },
    { value: 'BANKING', label: 'Banking' },
    { value: 'VARIANCES', label: 'Variances' },
    { value: 'AUDIT', label: 'Audit' },
];

const CASH_OFFICE_REPORT_URL: Record<CashOfficeReportType, { url: string; method: string }> = {
    DAILY_STATEMENT: apiUrls.cashOffice.reportDailyStatement,
    HANDOVERS: apiUrls.cashOffice.reportHandovers,
    PAYMENTS: apiUrls.cashOffice.reportPayments,
    TRANSFERS: apiUrls.cashOffice.reportTransfers,
    BANKING: apiUrls.cashOffice.reportBanking,
    VARIANCES: apiUrls.cashOffice.reportVariances,
    AUDIT: apiUrls.cashOffice.reportAudit,
};

export interface CashOfficeReportResponse {
    success: boolean;
    message: string;
    count?: number;
    data: unknown;
    pagination?: Record<string, unknown>;
    statement?: {
        session?: Record<string, unknown> | null;
        reconciliation?: Record<string, unknown> | null;
        [key: string]: unknown;
    };
    download?: {
        filename?: string;
        contentType?: string;
        url?: string;
        method?: string;
        body?: Record<string, unknown>;
    };
}

export interface CashOfficeReportSession {
    id: string;
    domainId?: string;
    companyId?: string;
    cashOfficeId?: string;
    businessDate?: string;
    sessionNumber?: string;
    openingCashAmount?: number | string | null;
    openingChequeAmount?: number | string | null;
    closingCashAmount?: number | string | null;
    closingChequeAmount?: number | string | null;
    openedById?: string | null;
    openedAt?: string | null;
    closedById?: string | null;
    closedAt?: string | null;
    closeReason?: string | null;
    reopenedById?: string | null;
    reopenedAt?: string | null;
    reopenReason?: string | null;
    status?: string;
    clientDocumentId?: string;
    createdAt?: string;
    updatedAt?: string;
    cashOffice?: { id: string; code?: string | null; name?: string | null } | null;
    cashOfficeName?: string | null;
    openedByUser?: CashOfficeHandoverUser | null;
    openedByName?: string | null;
    closedByUser?: CashOfficeHandoverUser | null;
    closedByName?: string | null;
    reopenedByUser?: CashOfficeHandoverUser | null;
    reopenedByName?: string | null;
}

export interface CashOfficeDailyStatementSummary {
    handoverCount?: number;
    transactionCount?: number;
    cashReceipts?: number;
    chequeReceipts?: number;
    cashPayouts?: number;
    chequePayouts?: number;
    transferInCash?: number;
    transferInCheque?: number;
    transferOutCash?: number;
    transferOutCheque?: number;
    bankWithdrawalCash?: number;
    bankWithdrawalCheque?: number;
    bankDepositCash?: number;
    bankDepositCheque?: number;
    cashReversals?: number;
    chequeReversals?: number;
}

export interface CashOfficeDailyStatementExpected {
    expectedCashAmount?: number | string;
    expectedChequeAmount?: number | string;
    expectedTotal?: number | string;
}

export interface CashOfficeDailyStatementBlockers {
    openHandovers?: number;
    pendingTransactions?: number;
}

export interface CashOfficeDailyStatementPreview {
    session?: CashOfficeReportSession | null;
    summary?: CashOfficeDailyStatementSummary | null;
    expected?: CashOfficeDailyStatementExpected | null;
    blockers?: CashOfficeDailyStatementBlockers | null;
    canClose?: boolean;
}

export interface CashOfficeDailyStatementData {
    session?: CashOfficeReportSession | null;
    preview?: CashOfficeDailyStatementPreview | null;
    reconciliation?: Record<string, unknown> | null;
    company?: { id?: string; companyName?: string | null } | null;
    domain?: { id?: string; domainName?: string | null } | null;
    cashOffice?: { id?: string; code?: string | null; name?: string | null; safeId?: string | null } | null;
    safe?: { id?: string; code?: string | null; name?: string | null } | null;
    store?: { id?: string; name?: string | null } | null;
    warehouse?: { id?: string; name?: string | null } | null;
}

export async function getCashOfficeReport(
    reportType: CashOfficeReportType,
    data: Record<string, unknown>,
): Promise<CashOfficeReportResponse> {
    const entry = CASH_OFFICE_REPORT_URL[reportType];
    return (
        await axiosInstance({
            url: entry.url,
            method: entry.method,
            data,
        })
    ).data;
}

export const useGetCashOfficeReport = (
    reportType: CashOfficeReportType,
    props: Record<string, unknown>,
    enabled: boolean = true,
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashOffice), 'report', reportType, props],
        queryFn: async () => await getCashOfficeReport(reportType, props),
        enabled,
    });
};

export async function exportCashOfficeReport(data: {
    reportType: CashOfficeReportType;
    cashOfficeId?: string;
    cashOfficeSessionId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    isCsv?: boolean;
}): Promise<unknown> {
    const entry = CASH_OFFICE_REPORT_URL[data.reportType];
    return (
        await axiosInstance({
            url: entry.url,
            method: entry.method,
            data: { ...data, isCsv: true },
            responseType: 'blob',
        })
    ).data;
}

export const useExportCashOfficeReport = () => {
    return useMutation({ mutationFn: exportCashOfficeReport });
};
