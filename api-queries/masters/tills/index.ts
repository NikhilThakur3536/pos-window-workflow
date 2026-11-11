import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- TILLS ---------------------------------------

// Tills Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    assignmentStatus?: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
    shiftStatus?: 'ALL' | 'OPEN' | 'NO_OPEN_SHIFT';
    scope?: 'ALL' | 'COMPANY' | 'STORE';
    companyDebtorId?: string;
    assignedUserId?: string;
};

export interface TillAssignmentUser {
    id: string;
    name?: string;
    firstName?: string;
    surname?: string;
    staffNumber?: string | number;
    status?: string;
}

export interface TillAssignment {
    id: string;
    tillId?: string;
    userId?: string;
    user?: TillAssignmentUser | null;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;
}

export interface TillShift {
    id?: string;
    tillId?: string;
    cashierUserId?: string;
    userSessionId?: string;
    currentShiftNumber?: number;
    user?: TillAssignmentUser | null;
    assignment?: TillAssignment | null;
    cashier?: TillAssignmentUser | null;
    status?: string;
    openedAt?: string;
    createdAt?: string;
}

export interface TillRoster {
    id?: string;
    user?: TillAssignmentUser | null;
    cashier?: TillAssignmentUser | null;
    status?: string;
    startAt?: string;
    startTime?: string;
    date?: string;
}

export interface TillActions {
    canAssign?: boolean;
    canReassign?: boolean;
    canRemoveAssignments?: boolean;
    canViewAssignments?: boolean;
    canViewHistory?: boolean;
    reason?: string;
}

export interface TillDetails {
    id: string;
    companyId: string;
    domainId: string;
    name: string;
    tillNumber: string;
    terminalId: string;
    timezone?: string;
    installationId?: string | null;
    installationRegisteredAt?: string | null;
    installationRegisteredById?: string | null;
    terminalRegistrationVersion?: number;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    cashThreshold?: number | string | null;
    cashCustodyRoute?: TillCashCustodyRoute | null;
    safeId?: string | null;
    safe?: { id?: string; name?: string; code?: string } | null;
    cashOfficeId?: string | null;
    cashOffice?: { id?: string; name?: string; code?: string } | null;
    debtorReceiptCashThreshold?: number | string | null;
    debtorReceiptHandoverMode?: TillDebtorReceiptHandoverMode | null;
    currentBalance?: number | null;
    companyDebtorId?: string | null;
    companyDebtor?: {
        id?: string;
        name?: string;
        accountNumber?: string;
    } | null;
    balanceStatus?: {
        isAboveThreshold: boolean;
        excess: number;
        message?: string;
    } | null;
    assignments?: TillAssignment[];
    assignmentCount?: number;
    currentShift?: TillShift | null;
    openShifts?: TillShift[];
    currentRosters?: TillRoster[];
    upcomingRosters?: TillRoster[];
    availability?: 'UNASSIGNED' | 'ASSIGNED' | 'IN_USE' | 'CONFLICT' | string;
    actions?: TillActions;
}

export interface GetTillResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: TillDetails[];
        access?: {
            canManage?: boolean;
            canViewAll?: boolean;
        };
    };
}

export async function getTills(props: FilterProps): Promise<GetTillResponse> {
    const { limit, offset, search, status, assignmentStatus, shiftStatus, scope, companyDebtorId, assignedUserId } =
        props;
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.list.url,
            method: apiUrls.masters.tills.list.method,
            data: {
                limit,
                offset,
                search: search || '',
                filters: {
                    ...(status && status !== 'ALL' ? { status } : {}),
                    ...(assignmentStatus && assignmentStatus !== 'ALL' ? { assignmentStatus } : {}),
                    ...(shiftStatus && shiftStatus !== 'ALL' ? { shiftStatus } : {}),
                    ...(scope && scope !== 'ALL' ? { scope } : {}),
                    ...(companyDebtorId ? { companyDebtorId } : {}),
                    ...(assignedUserId ? { assignedUserId } : {}),
                },
            },
        })
    ).data;
}

export const useGetTills = (props: FilterProps, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.tills), props],
        queryFn: async () => await getTills(props),
        enabled: options?.enabled ?? true,
    });
};

// Till Get By Id
export interface GetTillByIdResponse {
    success: boolean;
    data: TillDetails;
}

export async function getTillById(id: string): Promise<GetTillByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.get.url,
            method: apiUrls.masters.tills.get.method,
            data: { id },
        })
    ).data;
}

export const useGetTillById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.tills), id],
        queryFn: async () => await getTillById(id),
    });
};

// Till Create

// Where a till's cash must travel before it reaches a safe. The backend rejects
// the mismatched flows, so the UI only ever offers the destination the route allows.
export const TILL_CASH_CUSTODY_ROUTES = ['DIRECT_TO_SAFE', 'CASH_OFFICE_THEN_SAFE'] as const;
export type TillCashCustodyRoute = (typeof TILL_CASH_CUSTODY_ROUTES)[number];

// What happens to a debtor receipt's cash once it is banked into the till.
export const TILL_DEBTOR_RECEIPT_HANDOVER_MODES = ['KEEP_IN_TILL', 'CASH_OFFICE_HANDOVER'] as const;
export type TillDebtorReceiptHandoverMode = (typeof TILL_DEBTOR_RECEIPT_HANDOVER_MODES)[number];

export const tillBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    tillNumber: z.string().min(1, 'Till Number is required'),
    terminalId: z.string().min(1, 'Terminal ID is required'),
    cashThreshold: z.number().min(0).optional(),
    companyDebtorId: z.string().nullable().optional(),
    cashCustodyRoute: z.enum(TILL_CASH_CUSTODY_ROUTES).optional(),
    safeId: z.string().nullable().optional(),
    cashOfficeId: z.string().nullable().optional(),
    debtorReceiptCashThreshold: z.number().min(0).optional(),
    debtorReceiptHandoverMode: z.enum(TILL_DEBTOR_RECEIPT_HANDOVER_MODES).optional(),
});

// A DC till cannot send cash straight to a safe and a direct-to-safe till cannot
// use a Cash Office, so the route decides which destination is mandatory.
interface CashCustodyShape {
    cashCustodyRoute?: TillCashCustodyRoute;
    safeId?: string | null;
    cashOfficeId?: string | null;
    debtorReceiptCashThreshold?: number;
    debtorReceiptHandoverMode?: TillDebtorReceiptHandoverMode;
}

const withCashCustodyRules = <T extends z.ZodTypeAny>(schema: T) =>
    schema.superRefine((raw, ctx) => {
        const data = raw as CashCustodyShape;
        const route = data.cashCustodyRoute;
        const handover = data.debtorReceiptHandoverMode;

        if (route === 'DIRECT_TO_SAFE' && !data.safeId) {
            ctx.addIssue({
                code: 'custom',
                path: ['safeId'],
                message: 'Select the Safe this till transfers to',
            });
        }
        if (route === 'CASH_OFFICE_THEN_SAFE' && !data.cashOfficeId) {
            ctx.addIssue({
                code: 'custom',
                path: ['cashOfficeId'],
                message: 'Select the Cash Office this till routes through',
            });
        }
        if (handover === 'CASH_OFFICE_HANDOVER' && (data.debtorReceiptCashThreshold ?? 0) <= 0) {
            ctx.addIssue({
                code: 'custom',
                path: ['debtorReceiptCashThreshold'],
                message: 'Set a Cash threshold above 0 to trigger Cash Office routing',
            });
        }
    });

export const tillCreateSchema = withCashCustodyRules(
    tillBaseSchema
        .omit({ terminalId: true })
        .extend({
            timezone: z.string(),
        })
        .refine((data) => validTimezones.includes(data.timezone), {
            path: ['timezone'],
            message: 'Invalid timezone',
        }),
);

export type TillCreateSchema = z.infer<typeof tillCreateSchema>;

export type MutateTillResponse = {
    success: boolean;
    message?: string;
    terminalId?: string;
    data?: Partial<TillDetails> & { id?: string; terminalId?: string };
};

export async function createTill(data: TillCreateSchema): Promise<MutateTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.create.url,
            method: apiUrls.masters.tills.create.method,
            data,
        })
    ).data;
}

export const useCreateTill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
        },
    });
};

// Till Update

export const tillUpdateSchema = withCashCustodyRules(tillBaseSchema.extend({ id: z.string() }));

export type TillUpdateSchema = z.infer<typeof tillUpdateSchema>;

export async function updateTill(data: TillUpdateSchema): Promise<MutateTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.update.url,
            method: apiUrls.masters.tills.update.method,
            data,
        })
    ).data;
}

export const useUpdateTill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
        },
    });
};

export interface ResetTillInstallationInput {
    terminalId: string;
    installationId: string;
    reason: string;
}

export async function resetTillInstallation(
    data: ResetTillInstallationInput,
): Promise<{ success: boolean; message?: string }> {
    return (await axiosInstance.post('/api/company/till/installation/reset', data)).data;
}

export const useResetTillInstallation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resetTillInstallation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
        },
    });
};

// Till Delete

export async function removeTill(id: string): Promise<MutateTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.delete.url,
            method: apiUrls.masters.tills.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveTill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.masters.tills)] });
        },
    });
};

// Till Cash Custody Status

// The POS must ask which cash action is permitted before rendering a Till-to-Safe
// or Cash Office Handover button, rather than inferring it from the route alone.
export interface TillCashCustodyStatus {
    tillId: string;
    cashCustodyRoute: TillCashCustodyRoute;
    permittedActions: Array<'TILL_TO_SAFE' | 'CASH_OFFICE_HANDOVER'>;
    tillToSafeAllowed: boolean;
    cashOfficeHandoverAllowed: boolean;
    safeId?: string | null;
    safeName?: string | null;
    cashOfficeId?: string | null;
    cashOfficeName?: string | null;
    debtorReceiptCashThreshold?: number | null;
    debtorReceiptHandoverMode?: TillDebtorReceiptHandoverMode | null;
    message?: string;
}

export interface GetTillCashCustodyStatusResponse {
    success: boolean;
    message: string;
    data?: TillCashCustodyStatus;
}

export async function getTillCashCustodyStatus(id: string): Promise<GetTillCashCustodyStatusResponse> {
    return (
        await axiosInstance({
            url: apiUrls.masters.tills.cashCustodyStatus.url,
            method: apiUrls.masters.tills.cashCustodyStatus.method,
            data: { id },
        })
    ).data;
}

export const useGetTillCashCustodyStatus = (id?: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.masters.tills), 'cash-custody-status', id],
        queryFn: async () => await getTillCashCustodyStatus(id as string),
        enabled: !!id,
        staleTime: 60 * 1000,
    });
};

export interface EligibleTillUser extends TillAssignmentUser {
    assignments?: Array<
        TillAssignment & {
            till?: Pick<TillDetails, 'id' | 'name' | 'tillNumber'> | null;
        }
    >;
    openShifts?: TillShift[];
    requiresReassignment?: boolean;
    expectedUserAssignmentId?: string | null;
    canAssign: boolean;
    reason?: string;
}

export interface EligibleTillUsersResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: EligibleTillUser[];
    };
}

export interface EligibleTillForUser extends Pick<TillDetails, 'id' | 'name' | 'tillNumber'> {
    assignments?: TillAssignment[];
    openShifts?: TillShift[];
    requiresReassignment?: boolean;
    expectedAssignmentId?: string | null;
    expectedUserAssignmentId?: string | null;
    canAssign?: boolean;
    reason?: string;
}

export interface EligibleTillsForUserResponse {
    success: boolean;
    message?: string;
    data: {
        rows: EligibleTillForUser[];
        reason?: string;
    };
}

export async function getEligibleTillsForUser(userId: string): Promise<EligibleTillsForUserResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.eligibleTills.url,
            method: apiUrls.userTills.eligibleTills.method,
            data: { userId, includeReassignments: true },
        })
    ).data;
}

export const useGetEligibleTillsForUser = (userId?: string, enabled = true) =>
    useQuery({
        queryKey: ['eligible-tills-for-user', userId],
        queryFn: () => {
            if (!userId) throw new Error('User is required to load eligible tills.');
            return getEligibleTillsForUser(userId);
        },
        enabled: enabled && !!userId,
    });

export async function getEligibleTillUsers(params: {
    tillId: string;
    search?: string;
    limit?: number;
    offset?: number;
}): Promise<EligibleTillUsersResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.eligibleUsers.url,
            method: apiUrls.userTills.eligibleUsers.method,
            data: {
                tillId: params.tillId,
                search: params.search || '',
                limit: params.limit ?? 25,
                offset: params.offset ?? 0,
            },
        })
    ).data;
}

export const useGetEligibleTillUsers = (params: {
    tillId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}) =>
    useQuery({
        queryKey: ['eligible-till-users', params],
        queryFn: () => {
            if (!params.tillId) throw new Error('Till is required to load eligible cashiers.');
            return getEligibleTillUsers({ ...params, tillId: params.tillId });
        },
        enabled: !!params.tillId,
    });

export interface CreateTillAssignmentInput {
    tillId: string;
    userId: string;
    expectedAssignmentId: string | null;
    expectedUserAssignmentId: string | null;
    reason?: string;
}

export async function createTillAssignment(
    payload: CreateTillAssignmentInput,
): Promise<{ success: boolean; message?: string; data?: TillAssignment }> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.create.url,
            method: apiUrls.userTills.create.method,
            data: payload,
        })
    ).data;
}

export async function removeTillAssignment(id: string): Promise<{ success: boolean; message?: string }> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.delete.url,
            method: apiUrls.userTills.delete.method,
            data: { id },
        })
    ).data;
}

export interface TillAssignmentHistoryResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: TillAssignment[];
    };
}

export async function getTillAssignmentHistory(params: {
    tillId: string;
    status: 'ACTIVE' | 'DELETED';
    limit: number;
    offset: number;
}): Promise<TillAssignmentHistoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.list.url,
            method: apiUrls.userTills.list.method,
            data: {
                tillId: params.tillId,
                limit: params.limit,
                offset: params.offset,
                filter: { status: params.status },
            },
        })
    ).data;
}
