import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useAuthUser } from '@/stores/auth-user.store';

// --------------------------------------- SECURITY ---------------------------------------
//
// Supervisor Approval & Group Security.
// All endpoints live under /api/company/security and are POST.

// --------------------------------------- Action Catalogue ---------------------------------------

export type AuthMethod = 'PASSWORD' | 'FINGERPRINT';

export interface SecurityActionModule {
    id?: string;
    name?: string;
    code?: string;
}

export interface SecurityAction {
    id: string;
    domainId: string;
    companyId?: string | null;
    moduleId: string;
    code: string;
    name: string;
    description?: string;
    supportsOverride?: boolean;
    minimumApproverLevel?: number;
    allowedAuthMethods?: AuthMethod[];
    sameStoreOnly?: boolean;
    requireReason?: boolean;
    approvalTtlSeconds?: number;
    conditions?: Record<string, unknown>;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    module?: SecurityActionModule;
}

export interface GetSecurityActionsResponse {
    success: boolean;
    message: string;
    data: SecurityAction[];
}

export async function getSecurityActions(): Promise<GetSecurityActionsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.actions.url,
            method: apiUrls.security.actions.method,
            data: {},
        })
    ).data;
}

export const useGetSecurityActions = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'actions'],
        queryFn: async () => await getSecurityActions(),
    });
};

// Actions grouped by module (tree)

export interface SecurityModuleActions {
    moduleId: string;
    moduleName: string;
    moduleCode: string;
    actions: SecurityAction[];
}

export interface GetSecurityActionsTreeResponse {
    success: boolean;
    message: string;
    data: SecurityModuleActions[];
}

export async function getSecurityActionsTree(): Promise<GetSecurityActionsTreeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.actionsTree.url,
            method: apiUrls.security.actionsTree.method,
            data: {},
        })
    ).data;
}

export const useGetSecurityActionsTree = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'actions-tree'],
        queryFn: async () => await getSecurityActionsTree(),
    });
};

// --------------------------------------- Action Policy ---------------------------------------

export const securityActionPolicySchema = z.object({
    actionCode: z.string().min(1, 'Action code is required'),
    minimumApproverLevel: z.number().min(0).optional(),
    allowedAuthMethods: z.array(z.enum(['PASSWORD', 'FINGERPRINT'])).optional(),
    sameStoreOnly: z.boolean().optional(),
    requireReason: z.boolean().optional(),
    approvalTtlSeconds: z.number().optional(),
    conditions: z.record(z.string(), z.any()).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type SecurityActionPolicyInput = z.infer<typeof securityActionPolicySchema>;

export interface SecurityPolicyData extends SecurityActionPolicyInput {
    actionCode: string;
    minimumApproverLevel?: number;
    allowedAuthMethods?: AuthMethod[];
    sameStoreOnly?: boolean;
    requireReason?: boolean;
    approvalTtlSeconds?: number;
    conditions?: Record<string, unknown>;
    status?: 'ACTIVE' | 'INACTIVE';
    label?: string;
}

// action policy is GET-like but exposed as POST returning current policy for an action
export async function getSecurityActionPolicy(
    actionCode: string,
): Promise<{ success: boolean; message: string; data: SecurityPolicyData | null }> {
    return (
        await axiosInstance({
            url: apiUrls.security.actionPolicy.url,
            method: apiUrls.security.actionPolicy.method,
            data: { actionCode },
        })
    ).data;
}

export const useGetSecurityActionPolicy = (actionCode: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'action-policy', actionCode],
        enabled: !!actionCode,
        queryFn: async () => await getSecurityActionPolicy(actionCode as string),
    });
};

// Save / update policy
export async function updateSecurityActionPolicy(
    data: SecurityActionPolicyInput,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.security.actionPolicy.url,
            method: apiUrls.security.actionPolicy.method,
            data,
        })
    ).data;
}

export const useUpdateSecurityActionPolicy = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSecurityActionPolicy,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

// --------------------------------------- Group Action Permissions ---------------------------------------

export type GroupActionPermissionStatus = 'ACTIVE' | 'INACTIVE';

export interface GroupActionPermissionItem {
    actionCode: string;
    canRequest: boolean;
    canExecute: boolean;
    canApprove: boolean;
    status: GroupActionPermissionStatus;
}

interface GroupPermissionRecord {
    canRequest?: boolean;
    canExecute?: boolean;
    canApprove?: boolean;
    status?: GroupActionPermissionStatus;
}

interface GroupActionEntry {
    action?: { code?: string } | null;
    permission?: GroupPermissionRecord | null;
}

interface RawGetGroupActionsResponse {
    success?: boolean;
    message?: string;
    data?: GroupActionEntry[];
}

export interface GetGroupActionsResponse {
    success: boolean;
    message: string;
    data: GroupActionPermissionItem[];
}

export async function getGroupActions(groupId: string, search?: string): Promise<GetGroupActionsResponse> {
    const res: RawGetGroupActionsResponse = (
        await axiosInstance({
            url: apiUrls.security.groupActions.url,
            method: apiUrls.security.groupActions.method,
            data: search ? { groupId, search } : { groupId },
        })
    ).data;

    const data: GroupActionPermissionItem[] = (res?.data ?? [])
        .filter((entry) => Boolean(entry?.action?.code))
        .map((entry) => ({
            actionCode: entry.action?.code as string,
            canRequest: Boolean(entry.permission?.canRequest),
            canExecute: Boolean(entry.permission?.canExecute),
            canApprove: Boolean(entry.permission?.canApprove),
            status: entry.permission?.status ?? 'ACTIVE',
        }));

    return {
        success: res?.success ?? true,
        message: res?.message ?? '',
        data,
    };
}

export const useGetGroupActions = (groupId: string | null, search?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'group-actions', groupId, search],
        enabled: !!groupId,
        queryFn: async () => await getGroupActions(groupId as string, search),
    });
};

export async function updateGroupActions(
    groupId: string,
    permissions: GroupActionPermissionItem[],
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.security.groupActionsUpdate.url,
            method: apiUrls.security.groupActionsUpdate.method,
            data: { groupId, permissions },
        })
    ).data;
}

export const useUpdateGroupActions = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ groupId, permissions }: { groupId: string; permissions: GroupActionPermissionItem[] }) =>
            updateGroupActions(groupId, permissions),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.security), 'group-actions', variables.groupId],
            });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

// Effective permissions for a group

export interface EffectivePermission {
    actionCode: string;
    canRequest: boolean;
    canExecute: boolean;
    canApprove: boolean;
    approvalLevel: number;
    canSupervisorLogin: boolean;
}

export interface GetEffectivePermissionsResponse {
    success: boolean;
    message: string;
    data: EffectivePermission[];
}

export async function getEffectivePermissions(groupId: string): Promise<GetEffectivePermissionsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.groupEffectivePermissions.url,
            method: apiUrls.security.groupEffectivePermissions.method,
            data: { groupId },
        })
    ).data;
}

export const useGetEffectivePermissions = (groupId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'effective-permissions', groupId],
        enabled: !!groupId,
        queryFn: async () => await getEffectivePermissions(groupId as string),
    });
};

export const useHasCashUpViewAll = () => {
    const userGroupId = useAuthUser((state) => state.user?.companyUserGroups?.[0]?.groupId || null);
    const query = useGetEffectivePermissions(userGroupId);
    const canViewAll = (query.data?.data || []).some(
        (permission) => permission.actionCode === 'CASHUP_VIEW_ALL' && permission.canExecute,
    );
    const canApprove = (query.data?.data || []).some(
        (permission) => permission.actionCode === 'CASHUP_APPROVE' && permission.canApprove,
    );
    return { canViewAll, canApprove, isLoading: query.isLoading, error: query.error };
};

// --------------------------------------- Authorize / Approvals ---------------------------------------

export interface AuthorizeInput {
    actionCode: string;
    resourceType: string;
    resourceId?: string;
    requestReference: string;
    reason?: string;
    context: Record<string, unknown>;
    companyStoreId?: string;
    terminalId?: string;
}

export interface ApprovalsRequiredError {
    success: false;
    code: 'APPROVAL_REQUIRED';
    data: {
        decision?: string;
        actionCode?: string;
        approvalRequestId: string;
        /** Current backend field name for the allowed approver methods. */
        allowedAuthMethods?: AuthMethod[];
        /** Older field name kept for backward compatibility. */
        allowedMethods?: AuthMethod[];
        approverGroupName?: string;
        expiresAt: string;
    };
}

export async function authorizeRequest(
    data: AuthorizeInput,
): Promise<{ success: boolean; required?: boolean; data?: ApprovalsRequiredError['data'] }> {
    return (
        await axiosInstance({
            url: apiUrls.security.authorize.url,
            method: apiUrls.security.authorize.method,
            data,
        })
    ).data;
}

export const useAuthorizeRequest = () => {
    return useMutation({ mutationFn: authorizeRequest });
};

// Approve (password or fingerprint)

export const approvalApproveSchema = z.object({
    approvalId: z.string().min(1, 'Approval id is required'),
    authenticationMethod: z.enum(['PASSWORD', 'FINGERPRINT']),
    staffNumber: z.string().optional(),
    password: z.string().optional(),
    templateReference: z.string().optional(),
    deviceId: z.string().optional(),
    reason: z.string().optional(),
});

export type ApprovalApproveInput = z.infer<typeof approvalApproveSchema>;

export interface ApprovalApproveResponse {
    success: boolean;
    message: string;
    data?: {
        approvalToken: string;
        approvalRequestId?: string;
        expiresAt?: string;
    };
}

export async function approveApproval(data: ApprovalApproveInput): Promise<ApprovalApproveResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsApprove.url,
            method: apiUrls.security.approvalsApprove.method,
            data,
        })
    ).data;
}

export const useApproveApproval = () => {
    return useMutation({ mutationFn: approveApproval });
};

// Approval get / reject / cancel

export interface ApprovalStatusDetails extends ApprovalRecord {
    effectiveStatus: ApprovalStatus;
    tokenAvailable?: boolean;
    approvalRequestId?: string;
}

export async function getApproval(
    approvalId: string,
): Promise<{ success: boolean; message: string; data: ApprovalStatusDetails }> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsGet.url,
            method: apiUrls.security.approvalsGet.method,
            data: { approvalId },
        })
    ).data;
}

export const useGetApproval = (approvalId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'approval', approvalId],
        enabled: !!approvalId,
        queryFn: async () => await getApproval(approvalId as string),
    });
};

export async function rejectApproval(
    approvalId: string,
    reason?: string,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsReject.url,
            method: apiUrls.security.approvalsReject.method,
            data: { approvalId, ...(reason ? { reason } : {}) },
        })
    ).data;
}

export const useRejectApproval = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ approvalId, reason }: { approvalId: string; reason?: string }) =>
            rejectApproval(approvalId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

export async function cancelApproval(
    approvalId: string,
    reason?: string,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsCancel.url,
            method: apiUrls.security.approvalsCancel.method,
            data: { approvalId, ...(reason ? { reason } : {}) },
        })
    ).data;
}

export const useCancelApproval = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ approvalId, reason }: { approvalId: string; reason?: string }) =>
            cancelApproval(approvalId, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

// --------------------------------------- Approvals List & Summary ---------------------------------------

export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'CONSUMED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface ApprovalListFilterProps {
    status?: ApprovalStatus[];
    actionCode?: string;
    requestedByUserId?: string;
    approvedByUserId?: string;
    companyStoreId?: string;
    terminalId?: string;
    resourceType?: string;
    resourceId?: string;
    approvalGroupId?: string;
    authenticationMethod?: AuthMethod;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: boolean;
    minimumAuthFailedCount?: number;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface ApprovalActionSummary {
    id?: string;
    code?: string;
    name?: string;
    minimumApproverLevel?: number;
    allowedAuthMethods?: AuthMethod[];
}

export interface ApprovalUserSummary {
    id?: string;
    staffNumber?: number;
    firstName?: string;
    surname?: string;
    email?: string;
}

export interface ApprovalAuditEntry {
    event?: string;
    reason?: string;
    timestamp?: string;
    terminalId?: string;
    actorUserId?: string;
}

export interface ApprovalTimelineEntry {
    event?: string;
    reason?: string;
    timestamp?: string;
    terminalId?: string;
    actorUserId?: string;
    actorName?: string;
    actorUser?: ApprovalUserSummary | null;
}

export interface ApprovalGroupSummary {
    id?: string;
    name?: string;
    approvalLevel?: number;
}

export interface ApprovalRecord {
    id: string;
    domainId?: string;
    companyId?: string;
    companyStoreId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    terminalId?: string;
    actionId?: string;
    actionCode?: string;
    actionName?: string;
    requestedByUserId?: string;
    approvedByUserId?: string;
    approvalGroupId?: string;
    resourceType?: string;
    resourceId?: string;
    routingScopeType?: string;
    requestReference?: string;
    reason?: string;
    context?: Record<string, unknown>;
    contextHash?: string;
    status: ApprovalStatus;
    /** Computed server status that also accounts for expiry/consumption. */
    effectiveStatus?: ApprovalStatus;
    decision?: 'APPROVED' | 'REJECTED' | string;
    decisionReason?: string;
    decidedAt?: string;
    timeline?: ApprovalTimelineEntry[];
    canDecide?: boolean;
    stage?: string;
    secondsRemaining?: number;
    allowedAuthMethods?: AuthMethod[];
    authenticationMethod?: AuthMethod;
    credentialId?: string;
    approvalTokenHash?: string;
    expiresAt?: string;
    approvedAt?: string;
    consumedAt?: string;
    authFailedCount?: number;
    auditHistory?: ApprovalAuditEntry[];
    createdAt?: string;
    updatedAt?: string;
    action?: ApprovalActionSummary;
    requestedByUser?: ApprovalUserSummary;
    /** Some supervisor-desk payloads name this `requester`. */
    requester?: ApprovalUserSummary;
    approvedByUser?: ApprovalUserSummary | null;
    approvalGroup?: ApprovalGroupSummary | string | null;
}

export interface GetApprovalsListResponse {
    success: boolean;
    message: string;
    data: ApprovalRecord[];
}

export async function getApprovalsList(props: ApprovalListFilterProps): Promise<GetApprovalsListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsList.url,
            method: apiUrls.security.approvalsList.method,
            data: props,
        })
    ).data;
}

export const useGetApprovalsList = (props: ApprovalListFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'approvals-list', props],
        queryFn: async () => await getApprovalsList(props),
    });
};

export interface ApprovalSummaryFilters {
    status?: ApprovalStatus[];
    actionCode?: string;
    requestedByUserId?: string;
    approvedByUserId?: string;
    companyStoreId?: string;
    terminalId?: string;
    resourceType?: string;
    resourceId?: string;
    approvalGroupId?: string;
    authenticationMethod?: AuthMethod;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: boolean;
    minimumAuthFailedCount?: number;
    search?: string;
}

export interface ApprovalByActionRow {
    actionId?: string;
    actionCode?: string;
    actionName?: string;
    total?: number;
    pending?: number;
    approved?: number;
    rejected?: number;
    cancelled?: number;
    expired?: number;
    consumed?: number;
    authenticationFailures?: number;
}

export interface ApprovalUserBreakdown {
    userId?: string;
    staffNumber?: number;
    name?: string;
    email?: string;
    total?: number;
}

export interface ApprovalSummaryData {
    totalRequests?: number;
    authenticationFailureCount?: number;
    failedRequestCount?: number;
    statusCounts?: Record<string, number>;
    byAction?: ApprovalByActionRow[];
    byRequestedBy?: ApprovalUserBreakdown[];
    byApprovedBy?: ApprovalUserBreakdown[];
    byAuthenticationMethod?: Record<string, number>;
    appliedFilters?: Record<string, unknown>;
}

export interface GetApprovalsSummaryResponse {
    success: boolean;
    message: string;
    data: ApprovalSummaryData;
}

export async function getApprovalsSummary(
    props: ApprovalSummaryFilters,
): Promise<GetApprovalsSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalsSummary.url,
            method: apiUrls.security.approvalsSummary.method,
            data: props,
        })
    ).data;
}

export const useGetApprovalsSummary = (props: ApprovalSummaryFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'approvals-summary', props],
        queryFn: async () => await getApprovalsSummary(props),
    });
};

// --------------------------------------- Discount Override Notifications ---------------------------------------

export const DISCOUNT_OVERRIDE_NOTIFICATION_STATES = ['PENDING', 'READ', 'ACKNOWLEDGED', 'RESOLVED'] as const;
export type DiscountOverrideNotificationState = (typeof DISCOUNT_OVERRIDE_NOTIFICATION_STATES)[number];

export const DISCOUNT_OVERRIDE_ACTION_CODES = [
    'POS_DISCOUNT_OVERRIDE',
    'ACCOUNT_SALE_DISCOUNT_OVERRIDE',
] as const;
export type DiscountOverrideActionCode = (typeof DISCOUNT_OVERRIDE_ACTION_CODES)[number];

export const DISCOUNT_OVERRIDE_SOURCE_TYPES = ['POS_CASH_SALE', 'ACCOUNT_SALE', 'SALE_ORDER'] as const;
export type DiscountOverrideSourceType = (typeof DISCOUNT_OVERRIDE_SOURCE_TYPES)[number];

export interface DiscountOverrideNotificationRecord {
    id: string;
    notificationId?: string;
    approvalRequestId?: string;
    actionCode?: DiscountOverrideActionCode | string;
    sourceType?: DiscountOverrideSourceType | string;
    notificationState?: DiscountOverrideNotificationState | string;
    companyDebtorId?: string;
    companyDebtorName?: string;
    orderId?: string;
    orderNumber?: string;
    invoiceNumber?: string;
    discountAmount?: number;
    discountPercentage?: number;
    totalAmount?: number;
    currency?: string;
    requestedByUserId?: string;
    requestedByName?: string;
    approvedByUserId?: string;
    approvedByName?: string;
    note?: string;
    read?: boolean;
    acknowledged?: boolean;
    acknowledgedAt?: string;
    readAt?: string;
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface DiscountOverrideNotificationsFilterProps {
    notificationState?: DiscountOverrideNotificationState | string;
    actionCode?: DiscountOverrideActionCode | string;
    sourceType?: DiscountOverrideSourceType | string;
    companyDebtorId?: string;
    dateFrom?: string;
    dateTo?: string;
    read?: boolean;
    acknowledged?: boolean;
    limit?: number;
    offset?: number;
}

export interface GetDiscountOverrideNotificationsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DiscountOverrideNotificationRecord[];
    };
}

export async function getDiscountOverrideNotifications(
    props: DiscountOverrideNotificationsFilterProps,
): Promise<GetDiscountOverrideNotificationsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.discountOverrides.notifications.url,
            method: apiUrls.discountOverrides.notifications.method,
            data: props,
        })
    ).data;
}

export const useGetDiscountOverrideNotifications = (props: DiscountOverrideNotificationsFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'discount-overrides-notifications', props],
        queryFn: async () => await getDiscountOverrideNotifications(props),
    });
};

export interface DiscountOverrideNotificationsSummaryData {
    total?: number;
    pending?: number;
    read?: number;
    acknowledged?: number;
    unacknowledged?: number;
    totalDiscountAmount?: number;
    byActionCode?: Record<string, number>;
    bySourceType?: Record<string, number>;
}

export interface GetDiscountOverrideNotificationsSummaryResponse {
    success: boolean;
    message: string;
    data?: DiscountOverrideNotificationsSummaryData;
}

export async function getDiscountOverrideNotificationsSummary(): Promise<GetDiscountOverrideNotificationsSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.discountOverrides.notificationsSummary.url,
            method: apiUrls.discountOverrides.notificationsSummary.method,
        })
    ).data;
}

export const useGetDiscountOverrideNotificationsSummary = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'discount-overrides-notifications-summary'],
        queryFn: async () => await getDiscountOverrideNotificationsSummary(),
    });
};

export async function markDiscountOverrideNotificationRead(
    id: string,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.discountOverrides.notificationsRead.url,
            method: apiUrls.discountOverrides.notificationsRead.method,
            data: { id },
        })
    ).data;
}

export const useMarkDiscountOverrideNotificationRead = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => markDiscountOverrideNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

export async function acknowledgeDiscountOverrideNotification(
    id: string,
    note?: string,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.discountOverrides.notificationsAcknowledge.url,
            method: apiUrls.discountOverrides.notificationsAcknowledge.method,
            data: { id, ...(note ? { note } : {}) },
        })
    ).data;
}

export const useAcknowledgeDiscountOverrideNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, note }: { id: string; note?: string }) =>
            acknowledgeDiscountOverrideNotification(id, note),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};
export interface ApprovalRouting {
    id?: string;
    actionId?: string;
    actionCode?: string;
    actionName?: string;
    scopeType?: 'COMPANY' | 'STORE' | 'WAREHOUSE';
    companyId?: string;
    companyDebtorId?: string | null;
    storeDebtorId?: string | null;
    warehouseId?: string | null;
    groupId?: string;
    groupName?: string;
    approverGroupName?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateApprovalRoutingInput {
    actionId: string;
    scopeType: 'COMPANY' | 'STORE' | 'WAREHOUSE';
    companyDebtorId?: string | null;
    warehouseId?: string | null;
    groupId: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface CreateApprovalRoutingResponse {
    success: boolean;
    message: string;
    data?: ApprovalRouting | any;
}

export async function createApprovalRouting(
    data: CreateApprovalRoutingInput,
): Promise<CreateApprovalRoutingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalRoutingCreate.url,
            method: apiUrls.security.approvalRoutingCreate.method,
            data,
        })
    ).data;
}

export const useCreateApprovalRouting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createApprovalRouting,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security), 'approval-routing-list'] });
        },
    });
};

// The update endpoint only accepts the approval group and the routing status.
// Action and scope are immutable on an existing mapping.
export interface UpdateApprovalRoutingInput {
    id: string;
    groupId: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateApprovalRoutingResponse {
    success: boolean;
    message: string;
    data?: ApprovalRouting;
}

export async function updateApprovalRouting(
    data: UpdateApprovalRoutingInput,
): Promise<UpdateApprovalRoutingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalRoutingUpdate.url,
            method: apiUrls.security.approvalRoutingUpdate.method,
            data,
        })
    ).data;
}

export const useUpdateApprovalRouting = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateApprovalRouting,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security), 'approval-routing-list'] });
        },
    });
};

export interface ApprovalRoutingListInput {
    actionId?: string;
    scopeType?: 'COMPANY' | 'STORE' | 'WAREHOUSE';
    companyDebtorId?: string;
    warehouseId?: string;
    groupId?: string;
    status?: 'ACTIVE' | 'INACTIVE' | string;
    limit?: number;
    offset?: number;
    search?: string;
    [key: string]: unknown;
}

export interface ApprovalRoutingListResponse {
    success: boolean;
    message: string;
    data?: {
        count: number;
        rows: ApprovalRouting[];
    };
}

export async function getApprovalRoutingList(
    data: ApprovalRoutingListInput,
): Promise<ApprovalRoutingListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.approvalRoutingList.url,
            method: apiUrls.security.approvalRoutingList.method,
            data,
        })
    ).data;
}

export const useGetApprovalRoutingList = (props: ApprovalRoutingListInput) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'approval-routing-list', props],
        queryFn: async () => await getApprovalRoutingList(props),
    });
};

// --------------------------------------- Inbox Summary ---------------------------------------

export interface InboxSummaryResponse {
    success: boolean;
    message: string;
    data: {
        pendingCount: number;
        oldestPending: string | null;
        byAction: Array<{
            actionCode: string;
            actionName: string;
            pendingCount: number;
            oldestPending: string;
        }>;
    };
}

export async function getInboxSummary(
    props: { companyDebtorId?: string; scopeType?: string; actionCode?: string },
): Promise<InboxSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.inboxSummary.url,
            method: apiUrls.security.inboxSummary.method,
            data: props,
        })
    ).data;
}

export const useGetInboxSummary = (props: { companyDebtorId?: string; scopeType?: string; actionCode?: string }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'inbox-summary', props],
        queryFn: async () => await getInboxSummary(props),
    });
}

// --------------------------------------- Inbox List ---------------------------------------

export interface InboxListResponse {
    success: boolean;
    message: string;
    data: {
        rows: ApprovalRecord[];
        count: number; // filtered total
        pendingCount: number; // all pending in scope
    };
}

export interface InboxListFilters {
    actionCode?: string;
    requestedByUserId?: string;
    companyStoreId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    resourceType?: string;
    resourceId?: string;
    approvalGroupId?: string;
    authenticationMethod?: AuthMethod;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: boolean;
    minimumAuthFailedCount?: number;
    search?: string;
    limit?: number;
    offset?: number;
}

export async function getInboxList(props: InboxListFilters): Promise<InboxListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.inboxList.url,
            method: apiUrls.security.inboxList.method,
            data: props,
        })
    ).data;
}

export const useGetInboxList = (props: InboxListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'inbox-list', props],
        queryFn: async () => await getInboxList(props),
    });
}

// --------------------------------------- Inbox Get ---------------------------------------

export interface InboxGetResponse {
    success: boolean;
    message: string;
    data: ApprovalRecord & {
        allowedAuthMethods: AuthMethod[];
        timeline: Array<{
            event: string;
            reason?: string;
            timestamp: string;
            terminalId?: string;
            actorUserId?: string;
        }>;
        canDecide: boolean;
    };
}

export async function getInbox(approvalId: string, companyDebtorId?: string): Promise<InboxGetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.inboxGet.url,
            method: apiUrls.security.inboxGet.method,
            data: { approvalId, ...(companyDebtorId ? { companyDebtorId } : {}) },
        })
    ).data;
}

export const useGetInbox = (approvalId: string, companyDebtorId?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'inbox', approvalId, companyDebtorId],
        enabled: !!approvalId,
        queryFn: async () => await getInbox(approvalId, companyDebtorId),
    });
};

// --------------------------------------- Inbox Approve / Reject (3242) ---------------------------------------

export interface InboxApproveInput {
    approvalId: string;
    authenticationMethod: AuthMethod;
    password?: string;
    templateReference?: string;
    deviceId?: string;
    reason?: string;
}

export interface InboxApproveResponse {
    success: boolean;
    message: string;
    data?: {
        approvalRequestId: string;
        status: ApprovalStatus;
        decision?: string;
        channel?: string;
        decidedAt?: string;
        expiresAt?: string;
    };
}

export async function approveInboxRequest(data: InboxApproveInput): Promise<InboxApproveResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.inboxApprove.url,
            method: apiUrls.security.inboxApprove.method,
            data,
        })
    ).data;
}

export const useInboxApprove = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveInboxRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

export interface InboxRejectInput {
    approvalId: string;
    reason: string;
}

export async function rejectInboxRequest(data: InboxRejectInput): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.security.inboxReject.url,
            method: apiUrls.security.inboxReject.method,
            data,
        })
    ).data;
}

export const useInboxReject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: rejectInboxRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.security)] });
        },
    });
};

// --------------------------------------- History List ---------------------------------------

export interface HistoryListResponse {
    success: boolean;
    message: string;
    data: {
        rows: ApprovalRecord[];
        count: number;
    };
}

export interface HistoryListFilters {
    decision?: 'APPROVED' | 'REJECTED';
    decidedFrom?: string;
    decidedTo?: string;
    includeExpired?: boolean;
    // plus inbox filters
    actionCode?: string;
    requestedByUserId?: string;
    companyStoreId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    resourceType?: string;
    resourceId?: string;
    approvalGroupId?: string;
    authenticationMethod?: AuthMethod;
    dateFrom?: string;
    dateTo?: string;
    failedOnly?: boolean;
    minimumAuthFailedCount?: number;
    search?: string;
    limit?: number;
    offset?: number;
}

export async function getHistoryList(props: HistoryListFilters): Promise<HistoryListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.historyList.url,
            method: apiUrls.security.historyList.method,
            data: props,
        })
    ).data;
}

export const useGetHistoryList = (props: HistoryListFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.security), 'history-list', props],
        queryFn: async () => await getHistoryList(props),
    });
}

// --------------------------------------- Claim Token ---------------------------------------

export interface ClaimTokenResponse {
    success: boolean;
    message: string;
    data: {
        approvalRequestId: string;
        approvalToken: string;
        expiresAt: string;
    };
}

export async function claimToken(approvalId: string, companyDebtorId?: string): Promise<ClaimTokenResponse> {
    return (
        await axiosInstance({
            url: apiUrls.security.claimToken.url,
            method: apiUrls.security.claimToken.method,
            data: { approvalId, ...(companyDebtorId ? { companyDebtorId } : {}) },
        })
    ).data;
}

export const useClaimToken = () => {
    return useMutation({
        mutationFn: ({ approvalId, companyDebtorId }: { approvalId: string; companyDebtorId?: string }) =>
            claimToken(approvalId, companyDebtorId),
    });
};

// Add URL definitions
