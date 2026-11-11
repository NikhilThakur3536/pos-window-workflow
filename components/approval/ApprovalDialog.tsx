'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { z } from 'zod';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import {
    cancelApproval,
    claimToken,
    getApproval,
    useApproveApproval,
    type ApprovalStatus,
    type ApprovalStatusDetails,
    type AuthMethod,
} from '@/api-queries/security';
import type { ApprovalAction } from '@/hooks/use-approval-required';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Fingerprint, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { ApprovalCountdown, ApprovalStatusBadge } from './approval-status';

const approvalFormSchema = z
    .object({
        authenticationMethod: z.enum(['PASSWORD', 'FINGERPRINT']),
        staffNumber: z.string().optional(),
        password: z.string().optional(),
        templateReference: z.string().optional(),
        deviceId: z.string().optional(),
        reason: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.authenticationMethod === 'PASSWORD') {
            if (!data.staffNumber || !data.staffNumber.trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['staffNumber'], message: 'Staff number is required' });
            }
            if (!data.password || !data.password.trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password is required' });
            }
        } else {
            if (!data.templateReference || !data.templateReference.trim()) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['templateReference'],
                    message: 'Biometric scan is required',
                });
            }
            if (!data.deviceId || !data.deviceId.trim()) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['deviceId'], message: 'Device id is required' });
            }
        }
    });

type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

const DEFAULT_ALLOWED_METHODS: AuthMethod[] = ['PASSWORD', 'FINGERPRINT'];

const errorMessage = (error: unknown, fallback: string): string => {
    // @ts-ignore
    return error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;
};

export interface ApprovalDialogProps {
    open: boolean;
    onClose: () => void;
    approvalRequestId?: string;
    approvals?: ApprovalAction[];
    allowedMethods?: AuthMethod[];
    actionLabel?: string;
    approverGroupName?: string;
    scopeLabel?: string;
    /** Expiry returned by the backend with the 428; used when status has not loaded yet. */
    expiresAt?: string;
    /**
     * `requester` waits for the Supervisor Desk to decide and then claims the one-time
     * token. `supervisor` approves immediately from this terminal (used by review
     * queues that are not responding to a 428).
     */
    mode?: 'requester' | 'supervisor';
    onApproved?: (approvalToken: string, tokens?: Record<string, string>, approvalExpiresAt?: string) => void;
}

const ApprovalDialog = ({
    open,
    onClose,
    approvalRequestId,
    approvals,
    allowedMethods = DEFAULT_ALLOWED_METHODS,
    actionLabel,
    approverGroupName,
    scopeLabel,
    expiresAt,
    mode = 'requester',
    onApproved,
}: ApprovalDialogProps) => {
    const [view, setView] = useState<'waiting' | 'local'>(mode === 'supervisor' ? 'local' : 'waiting');
    const [method, setMethod] = useState<AuthMethod>('PASSWORD');
    const [fingerprintStatus, setFingerprintStatus] = useState<'idle' | 'scanning' | 'scanned' | 'error'>('idle');
    const [fingerprintError, setFingerprintError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimError, setClaimError] = useState<string | null>(null);
    const [claimedTokens, setClaimedTokens] = useState<Record<string, string>>({});
    const [claimedExpiries, setClaimedExpiries] = useState<Record<string, string>>({});
    const [cancelError, setCancelError] = useState<string | null>(null);
    const [confirmCancel, setConfirmCancel] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const claimingRef = useRef(false);

    const approveMutation = useApproveApproval();

    const form = useForm<ApprovalFormValues>({
        resolver: zodResolver(approvalFormSchema),
        defaultValues: {
            authenticationMethod: 'PASSWORD',
            staffNumber: '',
            password: '',
            templateReference: '',
            deviceId: '',
            reason: '',
        },
    });

    const targets = useMemo<ApprovalAction[]>(
        () =>
            approvals && approvals.length
                ? approvals
                : approvalRequestId
                  ? [{ actionCode: '', approvalRequestId }]
                  : [],
        [approvals, approvalRequestId],
    );
    const targetsKey = targets.map((target) => `${target.actionCode}:${target.approvalRequestId}`).join('|');
    const allowedMethodsKey = allowedMethods.join(',');

    useEffect(() => {
        if (!open) return;
        const available = allowedMethods && allowedMethods.length ? allowedMethods : DEFAULT_ALLOWED_METHODS;
        setView(mode === 'supervisor' ? 'local' : 'waiting');
        setClaimError(null);
        setClaimedTokens({});
        setClaimedExpiries({});
        setCancelError(null);
        setConfirmCancel(false);
        setMethod(available[0] === 'FINGERPRINT' ? 'FINGERPRINT' : 'PASSWORD');
        form.reset({ authenticationMethod: available[0] === 'FINGERPRINT' ? 'FINGERPRINT' : 'PASSWORD' });
        setFingerprintStatus('idle');
        setFingerprintError(null);
    }, [open, targetsKey, allowedMethodsKey, mode]);

    const statusQueries = useQueries({
        queries: targets.map((target) => ({
            queryKey: ['approval-status', target.approvalRequestId],
            queryFn: () => getApproval(target.approvalRequestId),
            enabled: mode === 'requester' && open && view === 'waiting' && !claiming && !!target.approvalRequestId,
            refetchInterval: (query: any) => {
                const raw = query.state.data?.data as ApprovalStatusDetails | undefined;
                const status = raw?.effectiveStatus || raw?.status;
                if (!status || status === 'PENDING') return 2500;
                // Keep watching an approved request so the UI notices the two-minute
                // action window closing if claiming the token fails.
                if (status === 'APPROVED') return 5000;
                return false;
            },
            refetchIntervalInBackground: true,
            retry: 1,
        })),
    });

    const statuses = targets.map((_, index) => {
        const raw = statusQueries[index]?.data?.data as ApprovalStatusDetails | undefined;
        const effectiveStatus = (raw?.effectiveStatus || raw?.status || 'PENDING') as ApprovalStatus;
        return {
            ...(raw || {}),
            effectiveStatus,
            tokenAvailable: raw?.tokenAvailable ?? effectiveStatus === 'APPROVED',
        } as ApprovalStatusDetails & { effectiveStatus: ApprovalStatus; tokenAvailable: boolean };
    });

    const anyRejected = statuses.some((status) => status.effectiveStatus === 'REJECTED');
    const anyExpired = statuses.some((status) => status.effectiveStatus === 'EXPIRED');
    const anyCancelled = statuses.some((status) => status.effectiveStatus === 'CANCELLED');
    const anyConsumed = statuses.some((status) => status.effectiveStatus === 'CONSUMED');
    const allApproved = statuses.length > 0 && statuses.every((status) => status.effectiveStatus === 'APPROVED');
    const pendingStatus = statuses.find((status) => status.effectiveStatus === 'PENDING') || statuses[0];
    const statusesLoading = statusQueries.some((query) => query.isLoading);
    const statusQueryError = statusQueries.find((query) => query.isError);
    const statusError = statusQueryError
        ? errorMessage(statusQueryError.error, 'Could not check the approval status.')
        : null;

    const handleClaim = async () => {
        if (!targets.length || claimingRef.current) return;
        claimingRef.current = true;
        setClaiming(true);
        setClaimError(null);
        const tokens: Record<string, string> = { ...claimedTokens };
        const expiries: Record<string, string> = { ...claimedExpiries };
        try {
            for (let index = 0; index < targets.length; index += 1) {
                const target = targets[index];
                const key = target.actionCode || `APPROVAL_${index + 1}`;
                if (tokens[key]) continue;
                const response = await claimToken(target.approvalRequestId, statuses[index]?.companyDebtorId);
                if (!response.success || !response.data?.approvalToken) {
                    throw new Error(response.message || 'The approval did not return a token.');
                }
                tokens[key] = response.data.approvalToken;
                if (response.data.expiresAt) expiries[key] = response.data.expiresAt;
            }
            const firstToken = Object.values(tokens)[0];
            if (!firstToken) throw new Error('The approval did not return a token.');
            setClaimedTokens(tokens);
            setClaimedExpiries(expiries);
            toast.success('Approval received');
            onApproved?.(firstToken, tokens, Object.values(expiries)[0]);
            form.reset();
            onClose();
        } catch (error) {
            setClaimedTokens(tokens);
            setClaimedExpiries(expiries);
            setClaimError(
                errorMessage(
                    error,
                    'Could not collect the approval token. The approval window may have expired.',
                ),
            );
        } finally {
            setClaiming(false);
            claimingRef.current = false;
        }
    };

    useEffect(() => {
        if (mode !== 'requester' || !open || view !== 'waiting' || !allApproved) return;
        void handleClaim();
    }, [mode, open, view, allApproved, targetsKey]);

    const handleMethodChange = (value: AuthMethod) => {
        setMethod(value);
        form.setValue('authenticationMethod', value);
        setFingerprintStatus('idle');
        setFingerprintError(null);
        form.setValue('templateReference', '');
        form.setValue('deviceId', '');
    };

    const submitApproval = async (authPayload: {
        authenticationMethod: AuthMethod;
        staffNumber?: string;
        password?: string;
        templateReference?: string;
        deviceId?: string;
        reason?: string;
    }) => {
        if (!targets.length) return;

        try {
            const tokens: Record<string, string> = {};
            const expiries: Record<string, string> = {};
            for (const target of targets) {
                const data = await approveMutation.mutateAsync({
                    approvalId: target.approvalRequestId,
                    ...authPayload,
                });
                if (data.success && data.data?.approvalToken) {
                    tokens[target.actionCode || `APPROVAL_${Object.keys(tokens).length + 1}`] =
                        data.data.approvalToken;
                    if (data.data.expiresAt) {
                        expiries[target.actionCode || `APPROVAL_${Object.keys(tokens).length}`] =
                            data.data.expiresAt;
                    }
                } else {
                    toast.error(data.message || 'Approval failed');
                    return;
                }
            }

            toast.success('Approval granted');
            const firstToken = Object.values(tokens)[0] || '';
            const firstExpiry = Object.values(expiries)[0] || undefined;
            if (onApproved) onApproved(firstToken, tokens, firstExpiry);
            form.reset();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        }
    };

    const handleFingerprintScan = async () => {
        if (approveMutation.isPending) return;

        const electronAPI = (window as any).electronAPI;

        if (!electronAPI?.fingerprintCapture) {
            toast.error('Fingerprint scanner is only available in the desktop app.');
            return;
        }

        setFingerprintStatus('scanning');
        setFingerprintError(null);

        try {
            const deviceId = electronAPI.getDeviceId ? await electronAPI.getDeviceId() : undefined;
            if (!deviceId) {
                throw new Error('Scanner device id is unavailable. Restart the desktop app and try again.');
            }

            const result = await electronAPI.fingerprintCapture({ deviceId });
            const templateRef = result?.data?.templateReference || '';

            if (!result?.success || !templateRef) {
                setFingerprintStatus('error');
                setFingerprintError(result?.error || 'Fingerprint not recognized');
                toast.error(result?.error || 'Fingerprint not recognized');
                return;
            }

            form.setValue('templateReference', templateRef);
            form.setValue('deviceId', result?.data?.deviceId || deviceId);
            setFingerprintStatus('scanned');
            toast.success('Fingerprint captured. Approving...');

            await submitApproval({
                authenticationMethod: 'FINGERPRINT',
                templateReference: templateRef,
                deviceId: result?.data?.deviceId || deviceId,
                reason: form.getValues('reason')?.trim() || undefined,
            });
        } catch (err: any) {
            setFingerprintStatus('error');
            setFingerprintError(err?.message || 'Fingerprint scan failed');
            toast.error(err?.message || 'Fingerprint scan failed');
        }
    };

    const onSubmit = async (values: ApprovalFormValues) => {
        await submitApproval(
            values.authenticationMethod === 'PASSWORD'
                ? {
                    authenticationMethod: values.authenticationMethod,
                    staffNumber: values.staffNumber,
                    password: values.password,
                    reason: values.reason?.trim() || undefined,
                }
                : {
                    authenticationMethod: values.authenticationMethod,
                    templateReference: values.templateReference,
                    deviceId: values.deviceId,
                    reason: values.reason?.trim() || undefined,
                },
        );
    };

    const handleCancelRequest = async () => {
        const pendingTargets = targets.filter(
            (_, index) => (statuses[index]?.effectiveStatus || 'PENDING') === 'PENDING',
        );
        if (!pendingTargets.length) {
            setConfirmCancel(false);
            return;
        }
        setCancelling(true);
        setCancelError(null);
        try {
            for (const target of pendingTargets) {
                await cancelApproval(target.approvalRequestId, 'Cancelled by requester');
            }
            toast.success('Approval request cancelled');
            setConfirmCancel(false);
            onClose();
        } catch (error) {
            setCancelError(errorMessage(error, 'Could not cancel the approval request.'));
        } finally {
            setCancelling(false);
        }
    };

    const passwordAllowed = allowedMethods.includes('PASSWORD');
    const fingerprintAllowed = allowedMethods.includes('FINGERPRINT');
    const hasPending = statuses.some((status) => status.effectiveStatus === 'PENDING');

    const renderWaitingBody = () => {
        if (claiming) {
            return (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                    <div className="text-sm font-medium">Approved — preparing your action…</div>
                    <div className="text-xs text-muted-foreground">Collecting the one-time approval token.</div>
                </div>
            );
        }

        if (allApproved) {
            return (
                <div className="space-y-3">
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        <div className="flex items-center gap-2 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            Approved
                        </div>
                        <div className="mt-1 text-xs">
                            The action must be completed before the one-time approval token expires.
                        </div>
                        {Object.values(claimedExpiries)[0] ? (
                            <div className="mt-1 flex items-center gap-1 text-xs">
                                <span>Time left</span>
                                <ApprovalCountdown expiresAt={Object.values(claimedExpiries)[0]} />
                            </div>
                        ) : null}
                    </div>
                    {claimError ? (
                        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            <div>{claimError}</div>
                            <Button type="button" size="sm" variant="outline" onClick={() => void handleClaim()}>
                                Retry
                            </Button>
                        </div>
                    ) : null}
                </div>
            );
        }

        if (anyRejected) {
            const rejected = statuses.find((status) => status.effectiveStatus === 'REJECTED');
            return (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <div className="flex items-center gap-2 font-medium">
                        <XCircle className="h-4 w-4" />
                        Rejected
                    </div>
                    {rejected?.decisionReason ? (
                        <div className="mt-1 text-xs">Reason: {rejected.decisionReason}</div>
                    ) : null}
                    <div className="mt-2 text-xs">Close this and start the action again to raise a new request.</div>
                </div>
            );
        }

        if (anyExpired) {
            return (
                <div className="rounded-md border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700">
                    <div className="font-medium">This approval request expired.</div>
                    <div className="mt-1 text-xs">Close this and start the action again to raise a new request.</div>
                </div>
            );
        }

        if (anyCancelled) {
            return (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    This approval request was cancelled.
                </div>
            );
        }

        if (anyConsumed) {
            return (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                    This approval was already used. Reload the document instead of submitting again.
                </div>
            );
        }

        if (statusError) {
            return (
                <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div>{statusError}</div>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => statusQueries.forEach((query) => void query.refetch())}
                    >
                        <RefreshCw className="mr-1 h-3.5 w-3.5" />
                        Try again
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                            <Clock className="h-4 w-4" />
                            Waiting for a supervisor
                        </div>
                        {statusesLoading ? <Loader2 className="h-4 w-4 animate-spin text-amber-700" /> : null}
                    </div>
                    <div className="mt-1 text-xs text-amber-800">
                        The request is in the Supervisor Desk pending list. You can leave this open while it is reviewed.
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-amber-900">
                        <span>Time left</span>
                        <ApprovalCountdown
                            expiresAt={pendingStatus?.expiresAt || expiresAt}
                            fallbackSeconds={pendingStatus?.secondsRemaining}
                        />
                    </div>
                </div>

                {targets.length > 1 ? (
                    <div className="space-y-1">
                        {targets.map((target, index) => (
                            <div
                                key={`${target.actionCode}-${target.approvalRequestId}`}
                                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                            >
                                <span className="font-mono">{target.actionCode || `Approval ${index + 1}`}</span>
                                <ApprovalStatusBadge status={statuses[index]?.effectiveStatus || 'PENDING'} />
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => statusQueries.forEach((query) => void query.refetch())}
                        disabled={statusQueries.some((query) => query.isFetching)}
                    >
                        <RefreshCw
                            className={`mr-1 h-3.5 w-3.5 ${
                                statusQueries.some((query) => query.isFetching) ? 'animate-spin' : ''
                            }`}
                        />
                        Check now
                    </Button>
                    {hasPending ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setConfirmCancel(true)}
                        >
                            Cancel request
                        </Button>
                    ) : null}
                </div>

            </div>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                        {view === 'waiting' ? 'Waiting for Supervisor Approval' : 'Supervisor Approval Required'}
                    </DialogTitle>
                    <DialogDescription>
                        {actionLabel ? `${actionLabel} requires supervisor approval.` : 'This action requires supervisor approval.'}
                        {(approverGroupName || scopeLabel) ? (
                            <span className="mt-1 block text-xs text-muted-foreground">
                                {approverGroupName ? (
                                    <span className="block">Approver Group: {approverGroupName}</span>
                                ) : null}
                                {scopeLabel ? <span className="block">Scope: {scopeLabel}</span> : null}
                            </span>
                        ) : null}
                    </DialogDescription>
                </DialogHeader>

                {mode === 'requester' && view === 'waiting' ? (
                    <>
                        {renderWaitingBody()}
                        <DialogFooter className="gap-2 sm:justify-between">
                            {hasPending && !allApproved ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-muted-foreground"
                                    onClick={() => setView('local')}
                                >
                                    Supervisor at this terminal? Approve here
                                </Button>
                            ) : (
                                <span />
                            )}
                            <Button type="button" variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                            {passwordAllowed && fingerprintAllowed ? (
                                <div className="flex items-start gap-4">
                                    <Label className="min-w-[160px] text-sm font-medium">Authentication Method</Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={form.control}
                                            name="authenticationMethod"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select value={field.value} onValueChange={handleMethodChange}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select method" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PASSWORD">Password</SelectItem>
                                                                <SelectItem value="FINGERPRINT">Fingerprint</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            ) : null}

                            {method === 'PASSWORD' ? (
                                <>
                                    <div className="flex items-start gap-4">
                                        <Label className="min-w-[160px] text-sm font-medium">
                                            Staff Number <MandatoryField />
                                        </Label>
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name="staffNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input placeholder="eg : SUP001" {...field} />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-4">
                                        <Label className="min-w-[160px] text-sm font-medium">
                                            Password <MandatoryField />
                                        </Label>
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name="password"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="password"
                                                                placeholder="Supervisor password"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <Label className="min-w-[160px] text-sm font-medium">
                                            Fingerprint <MandatoryField />
                                        </Label>
                                        <div className="flex-1 space-y-2">
                                            <Button
                                                type="button"
                                                variant={fingerprintStatus === 'scanned' ? 'default' : 'outline'}
                                                className={`w-full ${
                                                    fingerprintStatus === 'scanned'
                                                        ? 'bg-green-600 hover:bg-green-700'
                                                        : ''
                                                }`}
                                                onClick={handleFingerprintScan}
                                                disabled={
                                                    fingerprintStatus === 'scanning' || approveMutation.isPending
                                                }
                                            >
                                                {fingerprintStatus === 'scanning' ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Place finger on reader...
                                                    </>
                                                ) : fingerprintStatus === 'scanned' ? (
                                                    <>
                                                        <Fingerprint className="mr-2 h-4 w-4" />
                                                        Fingerprint captured
                                                    </>
                                                ) : (
                                                    <>
                                                        <Fingerprint className="mr-2 h-4 w-4" />
                                                        Scan Fingerprint
                                                    </>
                                                )}
                                            </Button>
                                            {fingerprintError && (
                                                <p className="text-xs text-red-500">{fingerprintError}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <Label className="min-w-[160px] text-sm font-medium">Reason</Label>
                                <div className="flex-1">
                                    <FormField
                                        control={form.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Optional approval reason" {...field} />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:justify-between">
                                {mode === 'requester' ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs text-muted-foreground"
                                        onClick={() => setView('waiting')}
                                    >
                                        Back to waiting
                                    </Button>
                                ) : (
                                    <span />
                                )}
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={onClose}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        disabled={
                                            approveMutation.isPending ||
                                            (method === 'FINGERPRINT' && fingerprintStatus !== 'scanned')
                                        }
                                    >
                                        {approveMutation.isPending ? 'Approving...' : 'Approve'}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </Form>
                )}

                <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle>Cancel approval request?</DialogTitle>
                            <DialogDescription>
                                The supervisor will no longer see this request. You can start the action again to raise a
                                new request.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            {cancelError ? <p className="mr-auto text-xs text-red-600">{cancelError}</p> : null}
                            <Button type="button" variant="outline" onClick={() => setConfirmCancel(false)}>
                                Keep waiting
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={cancelling}
                                onClick={() => void handleCancelRequest()}
                            >
                                {cancelling ? 'Cancelling…' : 'Cancel request'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
};

export default ApprovalDialog;
