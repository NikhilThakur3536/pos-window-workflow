import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import { ArrowLeftRight, Pencil, Plus, Send, Undo2, Wallet, CheckCheck, LogIn, AlertCircle } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    CASH_OFFICE_PAYMENT_TYPES,
    CASH_OFFICE_SOURCE_REQUIRED_TYPES,
    validateCashOfficeSource,
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    useGetCashOfficeTransactions,
    useGetCashOfficeTransferList,
    useCreateCashOfficeTransaction,
    useUpdateCashOfficeTransactionDraft,
    useSubmitCashOfficeTransaction,
    usePostCashOfficeTransaction,
    useReverseCashOfficeTransaction,
    useCreateCashOfficeTransfer,
    useDispatchCashOfficeTransfer,
    useReceiveCashOfficeTransfer,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficeTransaction,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashOfficeStatusBadge, cashOfficeTransactionStatus, formatMoney, formatDateTime, isCashOfficeSessionOpen, isTransactionRowSessionOpen } from './shared';
import PaymentCollection from './payment-collection';
import SourceDocumentPicker, { CASH_OFFICE_SOURCE_TYPES, sourceTypeLabel } from './source-document-picker';

type Tab = 'PAYMENTS' | 'TRANSFERS' | 'COLLECTION';

const PaymentsTransfersModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';
    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const [tab, setTab] = useState<Tab>('PAYMENTS');

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];
    const configNameById = (id?: string) => configs.find((c) => c.id === id)?.name || '—';

    // Payments tab filters
    const payInitial = { cashOfficeId: '', transactionType: '' };
    const payFiltersHook = useTableFilters<typeof payInitial>(payInitial);

    // Transfers tab filters
    const trfInitial = { cashOfficeId: '' };
    const trfFiltersHook = useTableFilters<typeof trfInitial>(trfInitial);

    const paymentsQuery = useGetCashOfficeTransactions({
        ...(payFiltersHook.appliedFilters.cashOfficeId
            ? { cashOfficeId: payFiltersHook.appliedFilters.cashOfficeId }
            : {}),
        // The Payments screen lists payment types as a group. A specific type
        // selected in the filter still takes precedence.
        transactionType: payFiltersHook.appliedFilters.transactionType || 'PAYMENTS',
        limit: payFiltersHook.pagination.pageSize,
        offset: payFiltersHook.pagination.pageIndex * payFiltersHook.pagination.pageSize,
    });
    const payments: CashOfficeTransaction[] = paymentsQuery?.data?.data?.rows || [];
    const paymentsTotal = paymentsQuery?.data?.data?.count || 0;

    const transfersQuery = useGetCashOfficeTransferList({
        ...(trfFiltersHook.appliedFilters.cashOfficeId
            ? { cashOfficeId: trfFiltersHook.appliedFilters.cashOfficeId }
            : {}),
        limit: trfFiltersHook.pagination.pageSize,
        offset: trfFiltersHook.pagination.pageIndex * trfFiltersHook.pagination.pageSize,
    });
    const transfers: CashOfficeTransaction[] = transfersQuery?.data?.data?.rows || [];
    const transfersTotal = transfersQuery?.data?.data?.count || 0;

    // Each tab tracks the session of the office selected in that tab. The
    // current-session hook drops cached data when the office changes, so the
    // previous office's session can never be reused.
    const paySession = useGetCashOfficeSessionCurrent(payFiltersHook.appliedFilters.cashOfficeId);
    const trfSession = useGetCashOfficeSessionCurrent(trfFiltersHook.appliedFilters.cashOfficeId);

    const paySessionOpen = isCashOfficeSessionOpen(paySession?.data?.data?.status);
    const trfSessionOpen = isCashOfficeSessionOpen(trfSession?.data?.data?.status);
    const openSessionId = paySessionOpen ? paySession?.data?.data?.id || null : null;
    const transferSessionId = trfSessionOpen ? trfSession?.data?.data?.id || null : null;

    const createMut = useCreateCashOfficeTransaction();
    const updateDraftMut = useUpdateCashOfficeTransactionDraft();
    const submitMut = useSubmitCashOfficeTransaction();
    const postMut = usePostCashOfficeTransaction();
    const reverseMut = useReverseCashOfficeTransaction();
    const createTransferMut = useCreateCashOfficeTransfer();
    const dispatchMut = useDispatchCashOfficeTransfer();
    const receiveTransferMut = useReceiveCashOfficeTransfer();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingMetaRef = useRef<Record<string, unknown> | null>(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        transactionType: 'PAYOUT',
        cashAmount: '',
        chequeAmount: '',
        recipientType: '',
        recipientName: '',
        reason: '',
        sourceDocumentType: '',
        sourceDocumentId: '',
    });

    const [editDraft, setEditDraft] = useState<CashOfficeTransaction | null>(null);
    const [editForm, setEditForm] = useState({ cashAmount: '', chequeAmount: '', reason: '', sourceDocumentType: '', sourceDocumentId: '' });

    // Hide Edit/Submit as soon as a draft is accepted, before the refetched row arrives.
    const [submittedPaymentIds, setSubmittedPaymentIds] = useState<string[]>([]);

    const [transferOpen, setTransferOpen] = useState(false);
    const [transferForm, setTransferForm] = useState({
        destinationCashOfficeId: '',
        cashAmount: '',
        chequeAmount: '',
        reason: '',
    });

    const [receiveTarget, setReceiveTarget] = useState<CashOfficeTransaction | null>(null);
    const [receiveForm, setReceiveForm] = useState({ receivedAmount: '', varianceReason: '' });

    // Receipt is performed by the destination office. The row's linked session
    // may belong to the source, so resolve the destination explicitly.
    const receiveDestinationOfficeId =
        receiveTarget?.destinationCashOfficeId || trfFiltersHook.appliedFilters.cashOfficeId || '';
    const receiveDestinationSession = useGetCashOfficeSessionCurrent(receiveDestinationOfficeId);
    const receiveDestinationSessionLoading = receiveDestinationSession.isLoading;
    const receiveDestinationSessionOpen = isCashOfficeSessionOpen(
        receiveDestinationSession?.data?.data?.status,
    );

    const runApprovalAware = (
        actionLabel: string,
        payload: Record<string, unknown>,
        mutate: (p: Record<string, unknown>) => Promise<{ success: boolean; message: string }> ,
        onSuccess: () => void,
    ) => {
        mutate(payload)
            .then((data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                onSuccess();
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
            if (action === 'create') return createMut.mutateAsync({ ...(p.body as Parameters<typeof createMut.mutateAsync>[0]), approvalToken: p.approvalToken as string | undefined });
            if (action === 'update') return updateDraftMut.mutateAsync({ ...(p.body as Parameters<typeof updateDraftMut.mutateAsync>[0]), approvalToken: p.approvalToken as string | undefined });
            if (action === 'submit') return submitMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'post') return postMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'reverse') return reverseMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), reason: (p.reason as string) || undefined, clientDocumentId: String(p.clientDocumentId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'dispatch') return dispatchMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId), approvalToken: p.approvalToken as string | undefined });
            if (action === 'receive-transfer')
                return receiveTransferMut.mutateAsync({
                    cashOfficeTransactionId: String(p.cashOfficeTransactionId),
                    receivedAmount: p.receivedAmount === '' ? undefined : Number(p.receivedAmount),
                    varianceReason: p.varianceReason ? String(p.varianceReason) : null,
                    // Reuse the reference captured when the action first ran; changing it
                    // on retry would be a different request than the one approved.
                    clientDocumentId: String(p.clientDocumentId),
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

    const sourceRequired = (type: string) => CASH_OFFICE_SOURCE_REQUIRED_TYPES.includes(type);

    const handleCreatePayment = () => {
        if (!openSessionId) return toast.error('Open a Cash Office session first.');
        const cashAmount = Number(createForm.cashAmount) || 0;
        const chequeAmount = Number(createForm.chequeAmount) || 0;
        const amount = cashAmount + chequeAmount;
        if (amount <= 0) return toast.error('Enter a cash and/or cheque amount');
        const sourceError = validateCashOfficeSource(
            createForm.sourceDocumentType,
            createForm.sourceDocumentId,
            sourceRequired(createForm.transactionType),
        );
        if (sourceError) return toast.error(sourceError);
        const body = {
            cashOfficeSessionId: openSessionId,
            transactionType: createForm.transactionType,
            cashAmount,
            chequeAmount,
            amount,
            sourceDocumentType: createForm.sourceDocumentType.trim() || undefined,
            sourceDocumentId: createForm.sourceDocumentId.trim() || undefined,
            recipientType: createForm.recipientType.trim() || undefined,
            recipientId: undefined,
            recipientName: createForm.recipientName.trim() || undefined,
            reason: createForm.reason.trim() || undefined,
            // Kept in the retry body so an approved retry is the same request.
            clientDocumentId: generateCashOfficeDocumentId('CO-PAY'),
        };
        runApprovalAware(
            'Create Payment',
            { body, __action: 'create', __label: 'Payment created' },
            (p) => createMut.mutateAsync(p.body as typeof body),
            () => {
                toast.success('Payment created');
                setCreateOpen(false);
                setCreateForm({ transactionType: 'PAYOUT', cashAmount: '', chequeAmount: '', recipientType: '', recipientName: '', reason: '', sourceDocumentType: '', sourceDocumentId: '' });
            },
        );
    };

    const handleEditDraft = () => {
        if (!editDraft) return;
        const sourceError = validateCashOfficeSource(
            editForm.sourceDocumentType,
            editForm.sourceDocumentId,
            sourceRequired(String(editDraft.transactionType)),
        );
        if (sourceError) return toast.error(sourceError);
        const body = {
            cashOfficeTransactionId: editDraft.id,
            cashAmount: editForm.cashAmount === '' ? undefined : Number(editForm.cashAmount),
            chequeAmount: editForm.chequeAmount === '' ? undefined : Number(editForm.chequeAmount),
            reason: editForm.reason.trim() || undefined,
            sourceDocumentType: editForm.sourceDocumentType.trim() || undefined,
            sourceDocumentId: editForm.sourceDocumentId.trim() || undefined,
        };
        runApprovalAware(
            'Update Draft Payment',
            { body, __action: 'update', __label: 'Draft updated' },
            (p) => updateDraftMut.mutateAsync(p.body as typeof body),
            () => {
                toast.success('Draft updated');
                setEditDraft(null);
            },
        );
    };

    const handleCreateTransfer = () => {
        if (!transferSessionId) return toast.error('Open a Cash Office session first.');
        if (!transferForm.destinationCashOfficeId) return toast.error('Select a destination cash office');
        if (transferForm.destinationCashOfficeId === trfFiltersHook.appliedFilters.cashOfficeId)
            return toast.error('Destination cannot be the same cash office');
        const cashAmount = Number(transferForm.cashAmount) || 0;
        const chequeAmount = Number(transferForm.chequeAmount) || 0;
        const amount = cashAmount + chequeAmount;
        if (amount <= 0) return toast.error('Enter a transfer amount');
        createTransferMut.mutate(
            {
                cashOfficeSessionId: transferSessionId,
                destinationCashOfficeId: transferForm.destinationCashOfficeId,
                cashAmount,
                chequeAmount,
                amount,
                reason: transferForm.reason.trim() || undefined,
                clientDocumentId: generateCashOfficeDocumentId('CO-TFR'),
            },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Transfer failed');
                        return;
                    }
                    toast.success('Transfer created');
                    setTransferOpen(false);
                    setTransferForm({ destinationCashOfficeId: '', cashAmount: '', chequeAmount: '', reason: '' });
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const openEdit = (row: CashOfficeTransaction) => {
        setEditDraft(row);
        setEditForm({
            cashAmount: String(row.cashAmount ?? ''),
            chequeAmount: String(row.chequeAmount ?? ''),
            reason: row.reason || '',
            sourceDocumentType: row.sourceDocumentType || '',
            sourceDocumentId: row.sourceDocumentId || '',
        });
    };

    const submitPayment = (row: CashOfficeTransaction) => {
        // Validate before submitting: the saved draft must already carry its source document.
        if (sourceRequired(String(row.transactionType)) && (!row.sourceDocumentType || !row.sourceDocumentId)) {
            toast.error('Add the Source Document Type and Source Reference first (Edit the draft), then submit.');
            return;
        }
        runApprovalAware(
            'Submit Payment',
            { cashOfficeTransactionId: row.id, __action: 'submit', __label: 'Payment submitted' },
            (p) => submitMut.mutateAsync({ cashOfficeTransactionId: String(p.cashOfficeTransactionId) }),
            () => {
                toast.success('Payment submitted');
                setSubmittedPaymentIds((prev) => (prev.includes(row.id) ? prev : [...prev, row.id]));
                // Refresh so the row shows SUBMITTED and Edit/Submit are replaced by Post/Reverse.
                void paymentsQuery.refetch();
            },
        );
    };

    const postPayment = (row: CashOfficeTransaction) => {
        runApprovalAware('Post Payment', { cashOfficeTransactionId: row.id, __action: 'post', __label: 'Payment posted' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return postMut.mutateAsync(rest as { cashOfficeTransactionId: string });
        }, () => toast.success('Payment posted'));
    };

    const reversePayment = (row: CashOfficeTransaction) => {
        runApprovalAware('Reverse Payment', { cashOfficeTransactionId: row.id, reason: undefined, clientDocumentId: generateCashOfficeDocumentId('CO-REV'), __action: 'reverse', __label: 'Payment reversed' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return reverseMut.mutateAsync(rest as Parameters<typeof reverseMut.mutateAsync>[0]);
        }, () => toast.success('Payment reversed'));
    };

    const dispatchTransfer = (row: CashOfficeTransaction) => {
        runApprovalAware('Dispatch Transfer', { cashOfficeTransactionId: row.id, __action: 'dispatch', __label: 'Transfer dispatched' }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return dispatchMut.mutateAsync(rest as { cashOfficeTransactionId: string });
        }, () => toast.success('Transfer dispatched'));
    };

    const openReceive = (row: CashOfficeTransaction) => {
        setReceiveTarget(row);
        setReceiveForm({ receivedAmount: String(row.amount ?? ''), varianceReason: '' });
    };

    const submitReceive = () => {
        if (!receiveTarget) return;
        if (!receiveDestinationOfficeId) {
            return toast.error('Select the destination cash office first.');
        }
        if (!receiveDestinationSessionOpen) {
            return toast.error('Open a Cash Office session first for the destination office.');
        }
        runApprovalAware('Receive Transfer', {
            cashOfficeTransactionId: receiveTarget.id,
            receivedAmount: receiveForm.receivedAmount === '' ? undefined : Number(receiveForm.receivedAmount),
            varianceReason: receiveForm.varianceReason.trim() || null,
            clientDocumentId: generateCashOfficeDocumentId('CO-TFRX'),
            __action: 'receive-transfer',
            __label: 'Transfer received',
        }, (p) => {
            const { __action, __label, approvalToken, ...rest } = p;
            void __action;
            void __label;
            void approvalToken;
            return receiveTransferMut.mutateAsync(rest as Parameters<typeof receiveTransferMut.mutateAsync>[0]);
        }, () => {
            toast.success('Transfer received');
            setReceiveTarget(null);
            setReceiveForm({ receivedAmount: '', varianceReason: '' });
        });
    };

    const paymentColumns: ColumnDef<CashOfficeTransaction>[] = [
        { accessorKey: 'clientDocumentId', header: 'Reference', cell: ({ row }) => <div className="font-semibold">{row.original.clientDocumentId || '—'}</div> },
        { accessorKey: 'transactionType', header: 'Type', cell: ({ row }) => <div>{String(row.original.transactionType || '—').replace('_', ' ')}</div> },
        { accessorKey: 'cashAmount', header: 'Cash', cell: ({ row }) => <div>{formatMoney(row.original.cashAmount || 0)}</div> },
        { accessorKey: 'chequeAmount', header: 'Cheque', cell: ({ row }) => <div>{formatMoney(row.original.chequeAmount || 0)}</div> },
        { accessorKey: 'amount', header: 'Total', cell: ({ row }) => <div className="font-semibold">{formatMoney(row.original.amount ?? (row.original.cashAmount || 0))}</div> },
        {
            id: 'source',
            header: 'Source Document',
            cell: ({ row }) => (
                <div className="max-w-[170px] truncate">
                    {row.original.sourceDocumentType ? sourceTypeLabel(row.original.sourceDocumentType) : '—'}
                </div>
            ),
        },
        { accessorKey: 'recipientName', header: 'Recipient', cell: ({ row }) => <div>{(row.original.recipientName || row.original.recipientId || '—')}</div> },
        { accessorKey: 'reason', header: 'Reason', cell: ({ row }) => <div className="max-w-[160px] truncate">{row.original.reason || '—'}</div> },
        { id: 'status', header: 'Status', cell: ({ row }) => <CashOfficeStatusBadge status={cashOfficeTransactionStatus(row.original)} /> },
        { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <div>{formatDateTime(row.original.createdAt)}</div> },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const s = cashOfficeTransactionStatus(row.original);
                const rowSessionOpen = isTransactionRowSessionOpen(row.original, paySessionOpen);
                const isDraft = s === 'DRAFT' && !submittedPaymentIds.includes(row.original.id);
                const canPost = s === 'SUBMITTED' || s === 'PENDING_APPROVAL' || s === 'APPROVED';
                return (
                    <div className="flex flex-wrap justify-end gap-1">
                        {isDraft && rowSessionOpen ? (
                            <>
                                <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(row.original)}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button size="sm" className="h-8 bg-sky-600 hover:bg-sky-700" onClick={() => submitPayment(row.original)}>
                                    <Send className="mr-1 h-3.5 w-3.5" /> Submit
                                </Button>
                            </>
                        ) : null}
                        {canPost && rowSessionOpen ? (
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => postPayment(row.original)}>
                                <CheckCheck className="mr-1 h-3.5 w-3.5" /> Post
                            </Button>
                        ) : null}
                        {(s === 'SUBMITTED' || s === 'POSTED') && rowSessionOpen ? (
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => reversePayment(row.original)}>
                                <Undo2 className="mr-1 h-3.5 w-3.5" /> Reverse
                            </Button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    const transferColumns: ColumnDef<CashOfficeTransaction>[] = [
        { accessorKey: 'clientDocumentId', header: 'Reference', cell: ({ row }) => <div className="font-semibold">{row.original.clientDocumentId || '—'}</div> },
        {
            id: 'transactionType',
            header: 'Type',
            cell: ({ row }) => (
                <div>
                    {row.original.transactionType === 'TRANSFER_IN'
                        ? 'Transfer In'
                        : row.original.transactionType === 'TRANSFER_OUT'
                          ? 'Transfer Out'
                          : String(row.original.transactionType || '—').replace('_', ' ')}
                </div>
            ),
        },
        {
            accessorKey: 'destinationCashOfficeId',
            header: 'Destination',
            cell: ({ row }) => <div>{row.original.destinationCashOfficeName || configNameById(row.original.destinationCashOfficeId || undefined)}</div>,
        },
        { accessorKey: 'cashAmount', header: 'Cash', cell: ({ row }) => <div>{formatMoney(row.original.cashAmount || 0)}</div> },
        { accessorKey: 'chequeAmount', header: 'Cheque', cell: ({ row }) => <div>{formatMoney(row.original.chequeAmount || 0)}</div> },
        { accessorKey: 'amount', header: 'Total', cell: ({ row }) => <div className="font-semibold">{formatMoney(row.original.amount ?? (row.original.cashAmount || 0))}</div> },
        { accessorKey: 'receivedAmount', header: 'Received', cell: ({ row }) => <div>{row.original.receivedAmount != null ? formatMoney(row.original.receivedAmount) : '—'}</div> },
        { id: 'status', header: 'Status', cell: ({ row }) => <CashOfficeStatusBadge status={cashOfficeTransactionStatus(row.original)} /> },
        { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <div>{formatDateTime(row.original.createdAt)}</div> },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const s = cashOfficeTransactionStatus(row.original);
                const rowSessionOpen = isTransactionRowSessionOpen(row.original, trfSessionOpen);
                const isIncoming = row.original.transactionType === 'TRANSFER_IN';
                const canDispatch =
                    !isIncoming &&
                    (s === 'SUBMITTED' || s === 'DRAFT' || s === 'PENDING_APPROVAL' || s === 'APPROVED');
                return (
                    <div className="flex flex-wrap justify-end gap-1">
                        {canDispatch && rowSessionOpen ? (
                            <Button size="sm" className="h-8 bg-sky-600 hover:bg-sky-700" onClick={() => dispatchTransfer(row.original)}>
                                <Send className="mr-1 h-3.5 w-3.5" /> Dispatch
                            </Button>
                        ) : null}
                        {s === 'IN_TRANSIT' ? (
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => openReceive(row.original)}>
                                <LogIn className="mr-1 h-3.5 w-3.5" /> Receive
                            </Button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={paymentsQuery.isLoading || transfersQuery.isLoading || configsQuery.isLoading}>
            <div className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                        <Button variant={tab === 'PAYMENTS' ? 'default' : 'outline'} className={tab === 'PAYMENTS' ? 'bg-blue-600 hover:bg-blue-700' : ''} onClick={() => setTab('PAYMENTS')}>
                            <Wallet className="mr-1 h-4 w-4" /> Payments
                        </Button>
                        <Button variant={tab === 'TRANSFERS' ? 'default' : 'outline'} className={tab === 'TRANSFERS' ? 'bg-blue-600 hover:bg-blue-700' : ''} onClick={() => setTab('TRANSFERS')}>
                            <ArrowLeftRight className="mr-1 h-4 w-4" /> Transfers
                        </Button>
                        <Button variant={tab === 'COLLECTION' ? 'default' : 'outline'} className={tab === 'COLLECTION' ? 'bg-blue-600 hover:bg-blue-700' : ''} onClick={() => setTab('COLLECTION')}>
                            <Wallet className="mr-1 h-4 w-4" /> Payment Collection
                        </Button>
                    </div>
                    {tab === 'PAYMENTS' ? (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!paySessionOpen}
                            title={paySessionOpen ? undefined : 'Open a Cash Office session first.'}
                            onClick={() => setCreateOpen(true)}
                        >
                            <Plus className="mr-1 h-4 w-4" /> New Payment
                        </Button>
                    ) : tab === 'TRANSFERS' ? (
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!trfSessionOpen}
                            title={trfSessionOpen ? undefined : 'Open a Cash Office session first.'}
                            onClick={() => setTransferOpen(true)}
                        >
                            <Plus className="mr-1 h-4 w-4" /> New Transfer
                        </Button>
                    ) : (
                        <div />
                    )}
                </div>

                {tab === 'PAYMENTS' &&
                payFiltersHook.appliedFilters.cashOfficeId &&
                !paySession.isLoading &&
                !paySessionOpen ? (
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        Open a Cash Office session first.
                    </div>
                ) : null}

                {tab === 'TRANSFERS' &&
                trfFiltersHook.appliedFilters.cashOfficeId &&
                !trfSession.isLoading &&
                !trfSessionOpen ? (
                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        Open a Cash Office session first.
                    </div>
                ) : null}

                {tab === 'PAYMENTS' ? (
                    <DataTable
                        query={paymentsQuery}
                        data={payments}
                        columns={paymentColumns}
                        totalRowCount={paymentsTotal}
                        pagination={payFiltersHook.pagination}
                        setPagination={payFiltersHook.setPagination}
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectPopover
                                title="Cash Office"
                                onlyTitle="All cash offices"
                                selectedValue={payFiltersHook.appliedFilters.cashOfficeId}
                                options={[
                                    { label: 'All cash offices', value: '' },
                                    ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) =>
                                    payFiltersHook.handleFilters({
                                        ...payFiltersHook.appliedFilters,
                                        cashOfficeId: String(val || ''),
                                    })
                                }
                            />
                            <SelectPopover
                                title="Payment Type"
                                onlyTitle="All payment types"
                                selectedValue={payFiltersHook.appliedFilters.transactionType}
                                options={[
                                    { label: 'All payment types', value: '' },
                                    ...CASH_OFFICE_PAYMENT_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t })),
                                ]}
                                onSelect={(val) =>
                                    payFiltersHook.handleFilters({
                                        ...payFiltersHook.appliedFilters,
                                        transactionType: String(val || ''),
                                    })
                                }
                            />
                            <FilterActionButtons
                                onApplyFilters={() => payFiltersHook.handleFilters(payFiltersHook.filters)}
                                onClearClick={() => payFiltersHook.clearFilters()}
                                showClearButton={payFiltersHook.showClearButton}
                            />
                        </div>
                        <div className="text-lg font-bold">Cash Office Payments</div>
                    </DataTable>
                ) : tab === 'TRANSFERS' ? (
                    <DataTable
                        query={transfersQuery}
                        data={transfers}
                        columns={transferColumns}
                        totalRowCount={transfersTotal}
                        pagination={trfFiltersHook.pagination}
                        setPagination={trfFiltersHook.setPagination}
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectPopover
                                title="Cash Office"
                                onlyTitle="All cash offices"
                                selectedValue={trfFiltersHook.appliedFilters.cashOfficeId}
                                options={[
                                    { label: 'All cash offices', value: '' },
                                    ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) =>
                                    trfFiltersHook.handleFilters({
                                        ...trfFiltersHook.appliedFilters,
                                        cashOfficeId: String(val || ''),
                                    })
                                }
                            />
                            <FilterActionButtons
                                onApplyFilters={() => trfFiltersHook.handleFilters(trfFiltersHook.filters)}
                                onClearClick={() => trfFiltersHook.clearFilters()}
                                showClearButton={trfFiltersHook.showClearButton}
                            />
                        </div>
                        <div className="text-lg font-bold">Cash Office Transfers</div>
                    </DataTable>
                ) : (
                    <PaymentCollection />
                )}
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Cash Office Payment</DialogTitle>
                        <DialogDescription>
                            {openSessionId ? 'Creates a draft in the open session.' : 'Open a Cash Office session first.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Payment Type</Label>
                                <SelectPopover
                                    title="Type"
                                    onlyTitle="Select type"
                                    selectedValue={createForm.transactionType}
                                    options={CASH_OFFICE_PAYMENT_TYPES.map((t) => ({ label: t.replace('_', ' '), value: t }))}
                                    onSelect={(val) => setCreateForm({ ...createForm, transactionType: String(val || 'PAYOUT') })}
                                />
                            </div>
                            <div>
                                <Label>Recipient Name</Label>
                                <Input value={createForm.recipientName} onChange={(e) => setCreateForm({ ...createForm, recipientName: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cash Amount</Label>
                                <Input type="number" value={createForm.cashAmount} onChange={(e) => setCreateForm({ ...createForm, cashAmount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Cheque Amount</Label>
                                <Input type="number" value={createForm.chequeAmount} onChange={(e) => setCreateForm({ ...createForm, chequeAmount: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Source Document Type{sourceRequired(createForm.transactionType) ? ' *' : ''}</Label>
                                <SelectPopover
                                    title="Source Document Type"
                                    onlyTitle="Select source type"
                                    selectedValue={createForm.sourceDocumentType}
                                    options={[
                                        ...(createForm.sourceDocumentType && !CASH_OFFICE_SOURCE_TYPES.some((t) => t.value === createForm.sourceDocumentType)
                                            ? [{ value: createForm.sourceDocumentType, label: sourceTypeLabel(createForm.sourceDocumentType) }]
                                            : []),
                                        ...CASH_OFFICE_SOURCE_TYPES,
                                    ]}
                                    // A different type means a different list, so clear the picked reference.
                                    onSelect={(val) => setCreateForm({ ...createForm, sourceDocumentType: String(val || ''), sourceDocumentId: '' })}
                                />
                            </div>
                            <div>
                                <Label>Source Reference{sourceRequired(createForm.transactionType) ? ' *' : ''}</Label>
                                <SourceDocumentPicker
                                    sourceDocumentType={createForm.sourceDocumentType}
                                    value={createForm.sourceDocumentId}
                                    onSelect={(id) => setCreateForm({ ...createForm, sourceDocumentId: id })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Reason</Label>
                            <Textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Total = cash + cheque. The backend posts this to the safe ledger after approval/submission rules pass.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending || !openSessionId} onClick={handleCreatePayment}>
                            {createMut.isPending ? 'Creating...' : 'Create Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!editDraft} onOpenChange={(next) => !next && setEditDraft(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Draft Payment</DialogTitle>
                        <DialogDescription>{editDraft?.clientDocumentId || ''}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cash Amount</Label>
                                <Input type="number" value={editForm.cashAmount} onChange={(e) => setEditForm({ ...editForm, cashAmount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Cheque Amount</Label>
                                <Input type="number" value={editForm.chequeAmount} onChange={(e) => setEditForm({ ...editForm, chequeAmount: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Source Document Type{sourceRequired(String(editDraft?.transactionType)) ? ' *' : ''}</Label>
                                <SelectPopover
                                    title="Source Document Type"
                                    onlyTitle="Select source type"
                                    selectedValue={editForm.sourceDocumentType}
                                    options={[
                                        ...(editForm.sourceDocumentType && !CASH_OFFICE_SOURCE_TYPES.some((t) => t.value === editForm.sourceDocumentType)
                                            ? [{ value: editForm.sourceDocumentType, label: sourceTypeLabel(editForm.sourceDocumentType) }]
                                            : []),
                                        ...CASH_OFFICE_SOURCE_TYPES,
                                    ]}
                                    // A different type means a different list, so clear the picked reference.
                                    onSelect={(val) => setEditForm({ ...editForm, sourceDocumentType: String(val || ''), sourceDocumentId: '' })}
                                />
                            </div>
                            <div>
                                <Label>Source Reference{sourceRequired(String(editDraft?.transactionType)) ? ' *' : ''}</Label>
                                <SourceDocumentPicker
                                    sourceDocumentType={editForm.sourceDocumentType}
                                    value={editForm.sourceDocumentId}
                                    onSelect={(id) => setEditForm({ ...editForm, sourceDocumentId: id })}
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Reason</Label>
                            <Textarea value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDraft(null)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={updateDraftMut.isPending} onClick={handleEditDraft}>
                            {updateDraftMut.isPending ? 'Saving...' : 'Save Draft'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>New Cash Transfer</DialogTitle>
                        <DialogDescription>
                            {transferSessionId ? 'Sends physical cash/cheque from this office to another.' : 'Open a Cash Office session first.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Destination Cash Office</Label>
                            <SelectPopover
                                title="Destination"
                                onlyTitle="Select destination"
                                selectedValue={transferForm.destinationCashOfficeId}
                                options={[
                                    { label: 'Select destination cash office', value: '' },
                                    ...configs
                                        .filter((c) => c.id !== trfFiltersHook.appliedFilters.cashOfficeId)
                                        .map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) => setTransferForm({ ...transferForm, destinationCashOfficeId: String(val || '') })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cash Amount</Label>
                                <Input type="number" value={transferForm.cashAmount} onChange={(e) => setTransferForm({ ...transferForm, cashAmount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Cheque Amount</Label>
                                <Input type="number" value={transferForm.chequeAmount} onChange={(e) => setTransferForm({ ...transferForm, chequeAmount: e.target.value })} />
                            </div>
                        </div>
                        <div>
                            <Label>Reason</Label>
                            <Textarea value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} />
                        </div>
                        <div className="text-xs text-muted-foreground">The sender cannot receive their own transfer.</div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={createTransferMut.isPending || !transferSessionId} onClick={handleCreateTransfer}>
                            {createTransferMut.isPending ? 'Creating...' : 'Create Transfer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!receiveTarget} onOpenChange={(next) => !next && setReceiveTarget(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Receive Transfer</DialogTitle>
                        <DialogDescription>{receiveTarget?.clientDocumentId || ''}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Received Amount</Label>
                            <Input type="number" value={receiveForm.receivedAmount} onChange={(e) => setReceiveForm({ ...receiveForm, receivedAmount: e.target.value })} />
                        </div>
                        <div>
                            <Label>Variance Reason</Label>
                            <Textarea value={receiveForm.varianceReason} onChange={(e) => setReceiveForm({ ...receiveForm, varianceReason: e.target.value })} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Supervisor approval is required if the received amount differs from the dispatched amount beyond the allowed limit.
                        </div>
                        {receiveDestinationOfficeId ? (
                            receiveDestinationSessionLoading ? (
                                <div className="text-xs text-muted-foreground">Checking the destination session...</div>
                            ) : receiveDestinationSessionOpen ? (
                                <div className="text-xs text-emerald-700">
                                    Destination cash office session is open.
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-xs text-amber-700">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Open a Cash Office session first for the destination office.
                                </div>
                            )
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReceiveTarget(null)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            disabled={receiveTransferMut.isPending || !receiveDestinationSessionOpen}
                            onClick={submitReceive}
                        >
                            {receiveTransferMut.isPending ? 'Receiving...' : 'Receive Transfer'}
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
                approverGroupName={approval?.approverGroupName}
                scopeLabel={approval?.scopeLabel}
                expiresAt={approval?.expiresAt}
                onApproved={handleApproved}
            />
        </PageLoader>
    );
};

export default PaymentsTransfersModule;