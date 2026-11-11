import { useState } from 'react';
import type { AuthMethod } from '@/api-queries/security';

// --------------------------------------- APPROVAL REQUIRED (428) ---------------------------------------
//
// When a protected action is submitted and the security policy requires a supervisor
// approval, the API responds with HTTP 428 and an APPROVAL_REQUIRED payload carrying
// an approval request id and the auth methods the approver may use. After completing
// the supervisor/fingerprint approval the action is resent with the approval token.

export interface ApprovalAction {
    actionCode: string;
    approvalRequestId: string;
}

export interface ApprovalRequiredInfo {
    approvalRequestId: string;
    allowedMethods: AuthMethod[];
    actionLabel?: string;
    // Action code the approval was raised for, e.g. INVOICE_CHECK_APPROVE. Needed to
    // resend the granted token as approvalTokens[<actionCode>].
    actionCode?: string;
    approvals: ApprovalAction[];
    approverGroupName?: string;
    scopeLabel?: string;
    scopeType?: string;
    expiresAt?: string;
}

export interface ApprovalRequiredPayload {
    approvalRequestId?: string;
    /** Current backend field name for the methods the approver may use. */
    allowedAuthMethods?: AuthMethod[];
    /** Older field name kept for backward compatibility. */
    allowedMethods?: AuthMethod[];
    approvals?: ApprovalAction[];
    approvalRequestIds?: Record<string, string>;
    actionCode?: string;
    approverGroupName?: string;
    scopeLabel?: string;
    scopeType?: string;
    expiresAt?: string;
    decision?: string;
    [key: string]: unknown;
}

export const isApprovalRequiredError = (error: unknown): ApprovalRequiredInfo | null => {
    // @ts-ignore
    const response = error?.response as
        { status?: number; data?: { code?: string; data?: ApprovalRequiredPayload } } | undefined;

    if (response?.status !== 428) return null;

    // Both the generic security approval and the over-supply approval answer 428.
    // OVER_SUPPLY_APPROVAL_REQUIRED carries a flat payload (approvalRequestId is a
    // sibling of `code`, not nested under `data`), so both shapes are read. Some
    // endpoints answer 428 with only data.approvalRequestId (no code); that is still
    // an approval-required response, so it is accepted too.
    const code = response?.data?.code;
    const flat = response?.data as unknown as ApprovalRequiredPayload & { code?: string };
    const payload = response?.data?.data ?? flat;
    const hasApprovalRequestId = !!payload?.approvalRequestId;

    if (code !== 'APPROVAL_REQUIRED' && code !== 'OVER_SUPPLY_APPROVAL_REQUIRED' && !hasApprovalRequestId) return null;

    let approvals: ApprovalAction[] = [];
    if (Array.isArray(payload?.approvals) && payload.approvals.length) {
        approvals = payload.approvals
            .filter((item) => !!item?.approvalRequestId)
            .map((item) => ({ actionCode: item.actionCode || '', approvalRequestId: item.approvalRequestId }));
    }

    if (!approvals.length && payload?.approvalRequestIds && typeof payload.approvalRequestIds === 'object') {
        approvals = Object.entries(payload.approvalRequestIds)
            .filter(([, id]) => !!id)
            .map(([actionCode, id]) => ({ actionCode, approvalRequestId: String(id) }));
    }

    if (!approvals.length && payload?.approvalRequestId) {
        approvals = [{ actionCode: '', approvalRequestId: payload.approvalRequestId }];
    }

    if (!approvals.length) return null;

    // A single-action 428 may carry the action code only as a sibling of the request id
    // rather than inside each entry. Backfill it so the dialog keys the granted token by
    // the real action (POS_NEGATIVE_STOCK_OVERRIDE) instead of a generic APPROVAL_1.
    // Multi-action 428s are left alone: the server names each action individually.
    if (payload?.actionCode && approvals.every((item) => !item.actionCode)) {
        approvals = approvals.map((item) => ({ ...item, actionCode: payload.actionCode as string }));
    }

    return {
        approvalRequestId: approvals[0].approvalRequestId,
        // A single-approval 428 carries the action code as a sibling of the request id.
        actionCode: approvals[0].actionCode || payload?.actionCode || undefined,
        // The backend names this `allowedAuthMethods`; older responses used
        // `allowedMethods`. Read both so fingerprint is only offered when allowed.
        allowedMethods:
            payload?.allowedAuthMethods && payload.allowedAuthMethods.length
                ? payload.allowedAuthMethods
                : payload?.allowedMethods && payload.allowedMethods.length
                  ? payload.allowedMethods
                  : (['PASSWORD', 'FINGERPRINT'] as AuthMethod[]),
        approvals,
        approverGroupName: payload?.approverGroupName as string | undefined,
        scopeLabel: payload?.scopeLabel as string | undefined,
        scopeType: payload?.scopeType as string | undefined,
        expiresAt: payload?.expiresAt as string | undefined,
    };
};

// The over-supply 428 is answered with a flat payload:
//   { success, message, code: 'OVER_SUPPLY_APPROVAL_REQUIRED', approvalRequestId }
// It is not resolved by a supervisor token like APPROVAL_REQUIRED is — the caller
// either resends with a valid overrideReason, or a supervisor decides the request
// through overSupplyApproval/decide first. Kept separate so screens can choose.
export const isOverSupplyError = (error: unknown): boolean => {
    // @ts-ignore
    const response = error?.response as { status?: number; data?: { code?: string } } | undefined;
    return response?.status === 428 && response?.data?.code === 'OVER_SUPPLY_APPROVAL_REQUIRED';
};

// Reads the pending request id out of the flat over-supply 428 so the caller can save it
// for status polling. The request must NOT be re-submitted while it is pending.
export const getOverSupplyApprovalId = (error: unknown): string | null => {
    // @ts-ignore
    const response = error?.response as
        { status?: number; data?: { code?: string; approvalRequestId?: string } } | undefined;
    if (response?.status !== 428 || response?.data?.code !== 'OVER_SUPPLY_APPROVAL_REQUIRED') return null;
    return response.data.approvalRequestId ?? null;
};

export const useApprovalRequired = () => {
    const [approval, setApproval] = useState<ApprovalRequiredInfo | null>(null);

    const openApproval = approval !== null;

    const closeApproval = () => setApproval(null);

    return {
        approval,
        openApproval,
        closeApproval,
        setApproval,
    };
};
