import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import { AlertTriangle, CheckCheck, ClipboardCheck, LockKeyhole, Unlock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import moment from 'moment';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    useGetCashOfficeReconciliationPreview,
    useSubmitCashOfficeReconciliation,
    useApproveCashOfficeReconciliation,
    useCloseCashOfficeSession,
    useReopenCashOfficeSession,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficeReconciliation,
    type CashOfficeReconciliationPreview,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashOfficeStatusBadge, formatMoney, varianceClassName } from './shared';

const ReconciliationModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';
    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const [cashOfficeId, setCashOfficeId] = useState('');

    const currentSession = useGetCashOfficeSessionCurrent(cashOfficeId);
    const session = currentSession?.data?.data || null;
    const sessionId = currentSession?.data?.data?.id || '';
    const isOpen = currentSession?.data?.data?.status === 'OPEN';

    const previewQuery = useGetCashOfficeReconciliationPreview(sessionId);
    const preview: CashOfficeReconciliationPreview | null = previewQuery?.data?.data || null;

    // Latest reconciliation for this session, captured from the submit response
    // (no reconciliation-list endpoint is exposed; the submit returns the record).
    const [latestRecon, setLatestRecon] = useState<CashOfficeReconciliation | null>(null);
    const [closedSessionId, setClosedSessionId] = useState('');
    const sessionClosed = !!sessionId && closedSessionId === sessionId;

    const submitMut = useSubmitCashOfficeReconciliation();
    const approveMut = useApproveCashOfficeReconciliation();
    const closeMut = useCloseCashOfficeSession();
    const reopenMut = useReopenCashOfficeSession();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingMetaRef = useRef<Record<string, unknown> | null>(null);

    const [countForm, setCountForm] = useState({ countedCashAmount: '', countedChequeAmount: '', varianceReason: '' });
    const [closeDialog, setCloseDialog] = useState(false);
    const [reopenDialog, setReopenDialog] = useState(false);
    const [reopenReason, setReopenReason] = useState('');

    const expected = preview?.expected;
    const blockers = preview?.blockers;
    const canClose = preview?.canClose !== false;

    const variance = Number(preview?.summary?.variance || 0);
    const hasBlockers = !!blockers && ((blockers.openHandovers || 0) > 0 || (blockers.pendingTransactions || 0) > 0);

    const reconVariance =
        Number(
            (latestRecon as unknown as { varianceAmount?: number | string } | null)?.varianceAmount ?? latestRecon?.variance ?? 0,
        ) || 0;
    const hasReconVariance = reconVariance !== 0;

    const applyApproveResult = (data: unknown) => {
        const d = (
            data as
                | {
                      data?: { reconciliation?: CashOfficeReconciliation; session?: { id?: string; status?: string } } & Partial<CashOfficeReconciliation>;
                  }
                | undefined
        )?.data;
        const rec = d?.reconciliation || (d?.id ? (d as CashOfficeReconciliation) : undefined);
        if (rec?.id) setLatestRecon(rec);
        setClosedSessionId(String(d?.session?.id || sessionId));
    };

    const applyCloseResult = (data: unknown) => {
        const d = (data as { data?: { reconciliation?: CashOfficeReconciliation; session?: { id?: string; status?: string } } } | undefined)?.data;
        if (d?.reconciliation?.id) setLatestRecon(d.reconciliation);
        setClosedSessionId(String(d?.session?.id || sessionId));
    };

    const runApprovalAware = (
        actionLabel: string,
        payload: Record<string, unknown>,
        mutate: (p: Record<string, unknown>) => Promise<{ success: boolean; message: string }>,
        onSuccess: (data?: unknown) => void,
    ) => {
        mutate(payload)
            .then((data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                onSuccess(data);
            })
            .catch((error: unknown) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = payload;
                    setApproval({ ...info, actionLabel });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const runRetry = (token?: string) => {
        const meta = pendingMetaRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        const action = meta.__action;
        const payload = token ? ({ ...meta, approvalToken: token } as Record<string, unknown>) : meta;
        delete payload.__action;
        delete payload.__label;
        const mutate = (p: Record<string, unknown>) => {
            if (action === 'approve')
                return approveMut.mutateAsync({
                    cashOfficeReconciliationId: String(p.cashOfficeReconciliationId),
                    approvalToken: p.approvalToken as string | undefined,
                });
            if (action === 'close')
                return closeMut.mutateAsync({
                    cashOfficeReconciliationId: String(p.cashOfficeReconciliationId),
                    reason: p.reason ? String(p.reason) : undefined,
                    approvalToken: p.approvalToken as string | undefined,
                });
            if (action === 'reopen')
                return reopenMut.mutateAsync({
                    cashOfficeSessionId: String(p.cashOfficeSessionId),
                    reason: p.reason ? String(p.reason) : undefined,
                    approvalToken: p.approvalToken as string | undefined,
                });
            return Promise.resolve({ success: false, message: 'Unknown action' });
        };
        mutate(payload)
            .then((data) => {
                closeApproval();
                pendingMetaRef.current = null;
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                if (action === 'approve') applyApproveResult(data);
                if (action === 'close') {
                    applyCloseResult(data);
                    setCloseDialog(false);
                }
                if (action === 'reopen') setClosedSessionId('');
                toast.success(String(meta.__label || 'Action completed'));
            })
            .catch((error: unknown) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    setApproval({ ...info, actionLabel: String(meta.__label || 'Action') });
                } else {
                    closeApproval();
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleApproved = (token: string) => runRetry(token);

    const handleSubmit = () => {
        if (!sessionId) return;
        const countedCashAmount = Number(countForm.countedCashAmount) || 0;
        const countedChequeAmount = Number(countForm.countedChequeAmount) || 0;
        submitMut.mutate(
            {
                cashOfficeSessionId: sessionId,
                countedCashAmount,
                countedChequeAmount,
                varianceReason: countForm.varianceReason.trim() || null,
                clientDocumentId: generateCashOfficeDocumentId('CO-RECON'),
            },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Submit failed');
                        return;
                    }
                    if (data?.data) setLatestRecon(data.data as CashOfficeReconciliation);
                    toast.success('Reconciliation submitted');
                    setCountForm({ countedCashAmount: '', countedChequeAmount: '', varianceReason: '' });
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleApprove = () => {
        if (!latestRecon?.id) return toast.error('No submitted reconciliation to approve');
        runApprovalAware('Approve & Close Session', { cashOfficeReconciliationId: latestRecon.id, __action: 'approve', __label: 'Reconciliation approved & session closed' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return approveMut.mutateAsync(rest as { cashOfficeReconciliationId: string });
        }, (data) => {
            applyApproveResult(data);
            toast.success('Reconciliation approved & session closed');
        });
    };

    const handleClose = () => {
        const reconId = latestRecon?.id;
        if (!reconId) return toast.error('Submit a reconciliation first');
        runApprovalAware('Close Session', { cashOfficeReconciliationId: reconId, reason: undefined, __action: 'close', __label: 'Session closed' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return closeMut.mutateAsync(rest as { cashOfficeReconciliationId: string });
        }, (data) => {
            applyCloseResult(data);
            toast.success('Session closed');
            setCloseDialog(false);
        });
    };

    const handleReopen = () => {
        if (!sessionId) return;
        runApprovalAware('Reopen Session', {
            cashOfficeSessionId: sessionId,
            reason: reopenReason.trim() || undefined,
            __action: 'reopen',
            __label: 'Session reopened',
        }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return reopenMut.mutateAsync(rest as { cashOfficeSessionId: string; reason?: string });
        }, () => {
            setClosedSessionId('');
            toast.success('Session reopened');
            setReopenDialog(false);
            setReopenReason('');
        });
    };

    const summaryItem = (label: string, value: string, money = false) => (
        <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold">{money ? value : value}</span>
        </div>
    );

    return (
        <PageLoader isLoading={configsQuery.isLoading || currentSession.isLoading || previewQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Cash Office</Label>
                        <SelectPopover
                            title="Cash Office"
                            onlyTitle="Select a cash office"
                            selectedValue={cashOfficeId}
                            options={[
                                { label: 'Select a cash office', value: '' },
                                ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                            ]}
                            onSelect={(val) => setCashOfficeId(String(val || ''))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {session ? <CashOfficeStatusBadge status={session.status || ''} /> : null}
                        {session?.status === 'CLOSED' || session?.status === 'REOPENED' ? (
                            <Button variant="outline" size="sm" onClick={() => setReopenDialog(true)}>
                                <Unlock className="mr-1 h-4 w-4" /> Reopen Session
                            </Button>
                        ) : null}
                    </div>
                </div>

                {!cashOfficeId ? (
                    <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                        Select a cash office to reconcile and close its session.
                    </div>
                ) : !session ? (
                    <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                        No session found for the selected cash office. Open a session first.
                    </div>
                ) : isOpen ? (
                    <>
                        {hasBlockers ? (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                                <AlertTriangle className="mt-0.5 h-5 w-5" />
                                <div>
                                    <div className="font-semibold">Session cannot close yet</div>
                                    <div>
                                        {blockers?.openHandovers ? `${blockers.openHandovers} open handover(s); ` : ''}
                                        {blockers?.pendingTransactions ? `${blockers.pendingTransactions} pending transaction(s).` : ''}
                                        Complete these before closing.
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2 rounded-xl border bg-white p-4 shadow-sm lg:col-span-1">
                                <div className="mb-1 flex items-center gap-2 font-semibold">
                                    <ClipboardCheck className="h-4 w-4" /> Expected (system)
                                </div>
                                {summaryItem('Expected Cash', formatMoney(expected?.expectedCashAmount || 0), true)}
                                {summaryItem('Expected Cheque', formatMoney(expected?.expectedChequeAmount || 0), true)}
                                {summaryItem('Expected Total', formatMoney(expected?.expectedTotal || 0), true)}
                                {summaryItem('Variance', formatMoney(variance), true)}
                            </div>

                            <div className="space-y-2 rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
                                <div className="mb-1 flex items-center gap-2 font-semibold">
                                    <CheckCheck className="h-4 w-4" /> Physical count & submit
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Counted Cash Amount</Label>
                                        <Input type="number" value={countForm.countedCashAmount} onChange={(e) => setCountForm({ ...countForm, countedCashAmount: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>Counted Cheque Amount</Label>
                                        <Input type="number" value={countForm.countedChequeAmount} onChange={(e) => setCountForm({ ...countForm, countedChequeAmount: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <Label>Variance Reason</Label>
                                    <Textarea value={countForm.varianceReason} onChange={(e) => setCountForm({ ...countForm, varianceReason: e.target.value })} />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={submitMut.isPending} onClick={handleSubmit}>
                                        {submitMut.isPending ? 'Submitting...' : 'Submit Reconciliation'}
                                    </Button>
                                    {latestRecon ? (
                                        <div className="text-sm text-muted-foreground">
                                            Latest: <CashOfficeStatusBadge status={latestRecon.status} />
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm">
                                {canClose ? (
                                    <CheckCheck className="h-4 w-4 text-emerald-600" />
                                ) : (
                                    <XCircle className="h-4 w-4 text-red-500" />
                                )}
                                <span className={canClose ? 'text-emerald-700' : 'text-red-600'}>
                                    {canClose ? 'Session is ready to close' : 'Session cannot close — resolve blockers first'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {!sessionClosed ? (
                                    latestRecon && hasReconVariance ? (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={!canClose || !latestRecon.id || approveMut.isPending} onClick={handleApprove}>
                                            <CheckCheck className="mr-1 h-4 w-4" /> {approveMut.isPending ? 'Approving...' : 'Approve & Close'}
                                        </Button>
                                    ) : (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={!canClose || !latestRecon?.id} onClick={() => setCloseDialog(true)}>
                                            <LockKeyhole className="mr-1 h-4 w-4" /> Close
                                        </Button>
                                    )
                                ) : null}
                            </div>
                        </div>

                        {latestRecon ? (
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <div className="mb-2 font-semibold">Last Reconciliation</div>
                                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                                    <div>
                                        <div className="text-muted-foreground">Reference</div>
                                        <div className="font-medium">{latestRecon.clientDocumentId || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Counted Cash</div>
                                        <div className="font-medium">{formatMoney(latestRecon.countedCashAmount || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Counted Cheque</div>
                                        <div className="font-medium">{formatMoney(latestRecon.countedChequeAmount || 0)}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Variance</div>
                                        <div className={`font-medium ${varianceClassName(Number(latestRecon.variance) || 0)}`}>
                                            {formatMoney(latestRecon.variance || 0)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Date</div>
                                        <div className="font-medium">{moment(latestRecon.createdAt).format('DD MMM YYYY, HH:mm')}</div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </>
                ) : (
                    <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
                        This session is <CashOfficeStatusBadge status={session.status} /> — reopen it to continue reconciliation and closing.
                    </div>
                )}
            </div>

            <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close Session</DialogTitle>
                        <DialogDescription>
                            Closes the session against {latestRecon?.clientDocumentId || 'the submitted reconciliation'}. Supervisor approval is required if the security policy applies.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancel</Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={closeMut.isPending} onClick={handleClose}>
                            {closeMut.isPending ? 'Closing...' : 'Confirm Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reopenDialog} onOpenChange={setReopenDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reopen Session</DialogTitle>
                        <DialogDescription>Reopens a closed session to handle corrections.</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Reason</Label>
                        <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReopenDialog(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={reopenMut.isPending} onClick={handleReopen}>
                            {reopenMut.isPending ? 'Reopening...' : 'Reopen Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleApproved}
            />
        </PageLoader>
    );
};

export default ReconciliationModule;