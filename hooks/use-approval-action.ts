import { useRef } from 'react';
import { toast } from 'sonner';
import { isApprovalRequiredError, useApprovalRequired } from './use-approval-required';

type ApprovalAction = (approvalToken?: string) => Promise<void>;

export const useApprovalAction = () => {
    const approvalState = useApprovalRequired();
    const pendingRef = useRef<{ action: ApprovalAction; label: string } | null>(null);

    const run = async (action: ApprovalAction, label: string, approvalToken?: string) => {
        try {
            await action(approvalToken);
        } catch (error) {
            const info = isApprovalRequiredError(error);
            if (info) {
                pendingRef.current = { action, label };
                approvalState.setApproval({ ...info, actionLabel: label });
                return;
            }
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Action failed');
        }
    };

    const handleApproved = (approvalToken: string) => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        approvalState.closeApproval();
        if (pending) void run(pending.action, pending.label, approvalToken);
    };

    return {
        ...approvalState,
        run,
        handleApproved,
    };
};
