import { useMemo, useRef, useState, type ReactElement } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import {
    Eye,
    LogIn,
    Ban,
    Undo2,
    CheckCheck,
    Plus,
    UserCircle2,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    getCashOfficeSessionCurrent,
    useGetCashOfficeHandovers,
    useRequestCashOfficeHandover,
    useClaimCashOfficeHandover,
    useCountCashOfficeHandover,
    useReceiveCashOfficeHandover,
    useApproveCashOfficeHandoverVariance,
    useAcknowledgeCashOfficeHandover,
    useRejectCashOfficeHandover,
    useReverseCashOfficeHandover,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficeHandover,
    type RequestHandoverInput,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { getTillById, useGetTills, type TillDetails } from '@/api-queries/masters/tills';
import { apiUrls } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import {
    CashOfficeStatusBadge,
    formatMoney,
    formatDateTime,
    varianceClassName,
} from './shared';
import { CashOfficeHandoverReceiptDialog } from './handover-receipt-dialog';

const TillHandoverModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';

    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const initialFilters = { cashOfficeId: '', status: '', dateFrom: '', dateTo: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);
    const updateAppliedFilter = (key: 'cashOfficeId' | 'status', value: string) => {
        const updatedFilters = { ...filters, [key]: value };
        setFilters(updatedFilters);
        handleFilters(updatedFilters);
    };

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const tillsRes = useGetTills({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        limit: 1000,
        offset: 0,
    });
    const tills: TillDetails[] = tillsRes?.data?.data?.rows || [];
    const activeTills = tills.filter((t) => t.status === 'ACTIVE');
    const tillLabelById = useMemo(() => {
        const map: Record<string, string> = {};
        tills.forEach((t) => {
            const label =
                t.name && t.tillNumber
                    ? `${t.name} (${t.tillNumber})`
                    : t.name || t.tillNumber;
            if (t.id && label) map[t.id] = label;
        });
        return map;
    }, [tills]);
    const tillLabelByCashOfficeId = useMemo(() => {
        const labelCounts: Record<string, { label: string; count: number }> = {};
        tills.forEach((till) => {
            if (!till.cashOfficeId) return;
            const label = tillLabelById[till.id];
            if (!label) return;
            const current = labelCounts[till.cashOfficeId];
            labelCounts[till.cashOfficeId] = current
                ? { ...current, count: current.count + 1 }
                : { label, count: 1 };
        });
        return Object.fromEntries(
            Object.entries(labelCounts)
                .filter(([, value]) => value.count === 1)
                .map(([cashOfficeId, value]) => [cashOfficeId, value.label]),
        );
    }, [tillLabelById, tills]);
    const cashOfficeLabelById = useMemo(() => {
        const map: Record<string, string> = {};
        configs.forEach((config) => {
            const label = config.name || config.code;
            if (config.id && label) map[config.id] = label;
        });
        return map;
    }, [configs]);

    const listQuery = useGetCashOfficeHandovers({
        ...(appliedFilters.cashOfficeId ? { cashOfficeId: appliedFilters.cashOfficeId } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
        ...(appliedFilters.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const refreshHandoverList = async () => {
        const result = await listQuery.refetch();
        if (result.isError) {
            toast.error('The operation completed, but the till handover list could not be refreshed.');
        }
    };
    const rows: CashOfficeHandover[] = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;
    const unresolvedTillIds = useMemo(
        () =>
            Array.from(
                new Set(
                    rows
                        .map((handover) => handover.tillId)
                        .filter((tillId): tillId is string => !!tillId && !tillLabelById[tillId]),
                ),
            ),
        [rows, tillLabelById],
    );
    const missingTillQueries = useQueries({
        queries: unresolvedTillIds.map((tillId) => ({
            queryKey: [getApiKey(apiUrls.masters.tills), tillId],
            queryFn: () => getTillById(tillId),
        })),
    });
    const fetchedTillLabelById = useMemo(() => {
        const map: Record<string, string> = {};
        unresolvedTillIds.forEach((tillId, index) => {
            const till = missingTillQueries[index]?.data?.data;
            if (till?.name) {
                map[tillId] = till.tillNumber ? `${till.name} (${till.tillNumber})` : till.name;
            } else if (till?.tillNumber) {
                map[tillId] = till.tillNumber;
            }
        });
        return map;
    }, [missingTillQueries, unresolvedTillIds]);

    const currentSession = useGetCashOfficeSessionCurrent(appliedFilters.cashOfficeId);
    const openSessionId = currentSession?.data?.data?.status === 'OPEN' ? currentSession.data.data.id : null;

    const requestMut = useRequestCashOfficeHandover();
    const claimMut = useClaimCashOfficeHandover();
    const countMut = useCountCashOfficeHandover();
    const receiveMut = useReceiveCashOfficeHandover();
    const approveMut = useApproveCashOfficeHandoverVariance();
    const receiveCountMut = useAcknowledgeCashOfficeHandover();
    const rejectMut = useRejectCashOfficeHandover();
    const reverseMut = useReverseCashOfficeHandover();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const userGroupPermissions = useUsersPermissions();
    const canReverseHandovers = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.TILL_HANDOVERS.code,
        [SYSTEM_PERMISSIONS.DELETE],
    );

    const [requestOpen, setRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState({
        tillId: '',
        requestType: 'MANUAL',
        declaredCashAmount: '',
        declaredChequeAmount: '',
    });
    const [countOpen, setCountOpen] = useState(false);
    const [countTarget, setCountTarget] = useState<CashOfficeHandover | null>(null);
    const [countForm, setCountForm] = useState({
        countedCashAmount: '',
        countedChequeAmount: '',
        varianceReason: '',
    });
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<CashOfficeHandover | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [reverseOpen, setReverseOpen] = useState(false);
    const [reverseTarget, setReverseTarget] = useState<CashOfficeHandover | null>(null);
    const [reverseReason, setReverseReason] = useState('');
    const [receiptId, setReceiptId] = useState('');

    const pendingMetaRef = useRef<Record<string, unknown> | null>(null);
    const handoverCashOfficeIds = useMemo(
        () =>
            Array.from(
                new Set(rows.map((handover) => handover.cashOfficeId).filter((id): id is string => !!id)),
            ),
        [rows],
    );
    const handoverSessionQueries = useQueries({
        queries: handoverCashOfficeIds.map((cashOfficeId) => ({
            queryKey: [getApiKey(apiUrls.cashOffice), 'session-current', cashOfficeId],
            queryFn: () => getCashOfficeSessionCurrent({ cashOfficeId }),
        })),
    });
    const handoverSessionByCashOfficeId = useMemo(
        () =>
            Object.fromEntries(
                handoverCashOfficeIds.map((cashOfficeId, index) => [
                    cashOfficeId,
                    handoverSessionQueries[index]?.data?.data,
                ]),
            ),
        [handoverCashOfficeIds, handoverSessionQueries],
    );
    const isHandoverSessionActive = (handover: CashOfficeHandover) => {
        const session = handover.cashOfficeSession || handoverSessionByCashOfficeId[handover.cashOfficeId || ''];
        return (
            !!session &&
            (session.status === 'OPEN' || session.status === 'REOPENED') &&
            session.id === handover.cashOfficeSessionId
        );
    };

    const doMutate = (
        actionLabel: string,
        payload: Record<string, unknown>,
        mutate: (p: Record<string, unknown>) => Promise<{ success: boolean; message: string }>,
        onSuccess: (data: { success: boolean; message: string }) => void,
    ) => {
        mutate(payload)
            .then(async (data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                onSuccess(data);
                await refreshHandoverList();
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

    const handleApproved = (token: string) => {
        const meta = pendingMetaRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        mutateWithPending(meta, token);
    };

    const mutateWithPending = (meta: Record<string, unknown>, token?: string) => {
        const run =
            meta.__action === 'receive'
                ? (p: Record<string, unknown>) => receiveMut.mutateAsync(p as Parameters<typeof receiveMut.mutateAsync>[0])
                : meta.__action === 'approve'
                  ? (p: Record<string, unknown>) => approveMut.mutateAsync(p as Parameters<typeof approveMut.mutateAsync>[0])
                  : (p: Record<string, unknown>) => reverseMut.mutateAsync(p as Parameters<typeof reverseMut.mutateAsync>[0]);
        const payload = { ...meta, approvalToken: token } as Record<string, unknown>;
        delete payload.__action;
        run(payload)
            .then(async (data: { success: boolean; message: string }) => {
                closeApproval();
                pendingMetaRef.current = null;
                if (data?.success === false) {
                    toast.error(data?.message || 'Action failed');
                    return;
                }
                toast.success(String(meta.__label || 'Action completed'));
                await refreshHandoverList();
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

    const claimHandover = (row: CashOfficeHandover) => {
        doMutate(
            'Claim Till Handover',
            { cashOfficeHandoverId: row.id, __action: 'claim', __label: 'Handover claimed' },
            (p) => {
                const { __action, __label, ...rest } = p;
                void __action;
                void __label;
                return claimMut.mutateAsync(rest as { cashOfficeHandoverId: string });
            },
            () => toast.success('Handover claimed'),
        );
    };

    const requestHandover = () => {
        if (!openSessionId) {
            toast.error('No open cash office session — open a session first');
            return;
        }
        const payload = {
            cashOfficeSessionId: openSessionId,
            requestType: requestForm.requestType === 'AUTO' ? ('AUTO' as const) : ('MANUAL' as const),
            tillId: requestForm.tillId.trim() || undefined,
            declaredCashAmount: requestForm.declaredCashAmount === '' ? undefined : Number(requestForm.declaredCashAmount),
            declaredChequeAmount: requestForm.declaredChequeAmount === '' ? undefined : Number(requestForm.declaredChequeAmount),
            clientDocumentId: generateCashOfficeDocumentId('CO-HO'),
        } as RequestHandoverInput;
        requestMut.mutate(payload, {
            onSuccess: async (data) => {
                if (data?.success === false) {
                    toast.error(data?.message || 'Request failed');
                    return;
                }
                toast.success('Handover requested');
                setRequestOpen(false);
                setRequestForm({ tillId: '', requestType: 'MANUAL', declaredCashAmount: '', declaredChequeAmount: '' });
                await refreshHandoverList();
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const submitCount = () => {
        if (!countTarget) return;
        const countedCashAmount = countForm.countedCashAmount.trim() ? Number(countForm.countedCashAmount) : 0;
        const countedChequeAmount = countForm.countedChequeAmount.trim() ? Number(countForm.countedChequeAmount) : 0;
        if (
            !Number.isFinite(countedCashAmount) ||
            !Number.isFinite(countedChequeAmount) ||
            countedCashAmount < 0 ||
            countedChequeAmount < 0
        ) {
            toast.error('Counted cash and cheque amounts must be valid non-negative values.');
            return;
        }
        if (countedCashAmount + countedChequeAmount <= 0) {
            toast.error('Combined counted cash and cheque amount must be greater than zero.');
            return;
        }
        doMutate(
            'Count Till Handover',
            {
                cashOfficeHandoverId: countTarget.id,
                __action: 'count',
                __label: 'Handover counted',
                countedCashAmount,
                countedChequeAmount,
                varianceReason: countForm.varianceReason.trim() || null,
            },
            (p) => {
                const { __action, __label, countedCashAmount, countedChequeAmount, varianceReason, ...rest } = p;
                void __action;
                void __label;
                return countMut.mutateAsync({
                    ...rest,
                    countedCashAmount,
                    countedChequeAmount,
                    varianceReason,
                } as Parameters<typeof countMut.mutateAsync>[0]);
            },
            () => {
                toast.success('Handover counted');
                setCountOpen(false);
                setCountTarget(null);
                setCountForm({ countedCashAmount: '', countedChequeAmount: '', varianceReason: '' });
            },
        );
    };

    const receiveHandover = (row: CashOfficeHandover) => {
        const countedCashAmount = Number(row.countedCashAmount || 0);
        const countedChequeAmount = Number(row.countedChequeAmount || 0);
        if (countedCashAmount + countedChequeAmount <= 0) {
            toast.error('Correct and resubmit the Count with a combined cash and cheque amount greater than zero before receiving.');
            return;
        }
        doMutate(
            'Receive Till Handover',
            { cashOfficeHandoverId: row.id, __action: 'receive', __label: 'Handover received' },
            (p) => {
                const { __action, __label, approvalToken, ...rest } = p;
                void __action;
                void __label;
                void approvalToken;
                return receiveMut.mutateAsync(rest as { cashOfficeHandoverId: string });
            },
            () => toast.success('Handover received'),
        );
    };

    const approveVariance = (row: CashOfficeHandover) => {
        doMutate(
            'Approve Handover Variance',
            { cashOfficeHandoverId: row.id, __action: 'approve', __label: 'Variance approved' },
            (p) => {
                const { __action, __label, approvalToken, ...rest } = p;
                void __action;
                void __label;
                void approvalToken;
                return approveMut.mutateAsync(rest as { cashOfficeHandoverId: string });
            },
            () => toast.success('Variance approved'),
        );
    };

    const acknowledgeHandover = (row: CashOfficeHandover) => {
        doMutate(
            'Acknowledge Till Handover',
            { cashOfficeHandoverId: row.id, __action: 'ack', __label: 'Handover acknowledged' },
            (p) => {
                const { __action, __label, ...rest } = p;
                void __action;
                void __label;
                return receiveCountMut.mutateAsync(rest as { cashOfficeHandoverId: string });
            },
            () => toast.success('Handover acknowledged'),
        );
    };

    const submitReject = () => {
        if (!rejectTarget) return;
        rejectMut.mutate(
            { cashOfficeHandoverId: rejectTarget.id, reason: rejectReason.trim() || undefined },
            {
                onSuccess: async (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Reject failed');
                        return;
                    }
                    toast.success('Handover rejected');
                    setRejectOpen(false);
                    setRejectTarget(null);
                    setRejectReason('');
                    await refreshHandoverList();
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const submitReverse = () => {
        if (!reverseTarget) return;
        if (!canReverseHandovers) {
            toast.error('You do not have permission to reverse till handovers.');
            return;
        }
        if (!['RECEIVED', 'ACKNOWLEDGED'].includes(reverseTarget.status || '')) {
            toast.error('Only received or acknowledged handovers can be reversed.');
            return;
        }
        if (!isHandoverSessionActive(reverseTarget)) {
            toast.error('Reopen the Cash Office session before reversing this handover.');
            return;
        }
        const reason = reverseReason.trim();
        if (!reason) {
            toast.error('Enter a reason to reverse this handover.');
            return;
        }
        doMutate(
            'Reverse Till Handover',
            {
                cashOfficeHandoverId: reverseTarget.id,
                reason,
                __action: 'reverse',
                __label: 'Handover reversed',
            },
            (p) => {
                const { __action, __label, approvalToken, ...rest } = p;
                void __action;
                void __label;
                void approvalToken;
                return reverseMut.mutateAsync(rest as { cashOfficeHandoverId: string; reason?: string });
            },
            () => {
                toast.success('Handover reversed');
                setReverseOpen(false);
                setReverseTarget(null);
                setReverseReason('');
            },
        );
    };

    const actionButtons = (row: CashOfficeHandover) => {
        const status = row.status;
        const buttons: ReactElement[] = [];
        if (status === 'REQUESTED')
            buttons.push(
                <Button key="claim" variant="secondary" size="sm" className="h-8" title="Claim" onClick={() => claimHandover(row)}>
                    <UserCircle2 className="mr-1 h-3.5 w-3.5" /> Claim
                </Button>,
            );
        if (status === 'CLAIMED' || status === 'COUNTED')
            buttons.push(
                <Button
                    key="count"
                    size="sm"
                    className="h-8 bg-amber-600 hover:bg-amber-700"
                    onClick={() => {
                        setCountTarget(row);
                        setCountForm({
                            countedCashAmount: status === 'COUNTED' ? String(row.countedCashAmount ?? '') : '',
                            countedChequeAmount: status === 'COUNTED' ? String(row.countedChequeAmount ?? '') : '',
                            varianceReason: row.varianceReason || '',
                        });
                        setCountOpen(true);
                    }}
                >
                    {status === 'COUNTED' ? 'Correct Count' : 'Count'}
                </Button>,
            );
        if (status === 'COUNTED')
            buttons.push(
                <Button key="receive" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => receiveHandover(row)}>
                    <LogIn className="mr-1 h-3.5 w-3.5" /> Receive
                </Button>,
            );
        if (status === 'PENDING_APPROVAL') {
            buttons.push(
                <Button key="approve" size="sm" className="h-8 bg-blue-600 hover:bg-blue-700" onClick={() => approveVariance(row)}>
                    <CheckCheck className="mr-1 h-3.5 w-3.5" /> Approve Variance
                </Button>,
                <Button key="reject" variant="destructive" size="sm" className="h-8" onClick={() => { setRejectTarget(row); setRejectReason(''); setRejectOpen(true); }}>
                    <Ban className="mr-1 h-3.5 w-3.5" /> Reject
                </Button>,
            );
        }
        if (status === 'RECEIVED')
            buttons.push(
                <Button key="ack" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700" onClick={() => acknowledgeHandover(row)}>
                    <CheckCheck className="mr-1 h-3.5 w-3.5" /> Acknowledge
                </Button>,
            );
        if (
            canReverseHandovers &&
            ['RECEIVED', 'ACKNOWLEDGED'].includes(status || '') &&
            isHandoverSessionActive(row)
        )
            buttons.push(
                <Button key="reverse" variant="outline" size="sm" className="h-8" title="Reverse" onClick={() => { setReverseTarget(row); setReverseReason(''); setReverseOpen(true); }}>
                    <Undo2 className="h-3.5 w-3.5" />
                </Button>,
            );
        buttons.push(
            <Button key="view" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Receipt" onClick={() => setReceiptId(row.id)}>
                <Eye className="h-3.5 w-3.5" />
            </Button>,
        );
        return <div className="flex flex-wrap justify-end gap-1">{buttons}</div>;
    };

    const columns: ColumnDef<CashOfficeHandover>[] = [
        {
            id: 'receipt',
            header: 'Receipt',
            cell: ({ row }) => (
                <div className="font-semibold">{row.original.receiptNumber || row.original.clientDocumentId || '—'}</div>
            ),
        },
        {
            id: 'cashOffice',
            header: 'Cash Office',
            cell: ({ row }) => (
                <div>
                    {row.original.cashOffice?.name ||
                        row.original.cashOffice?.code ||
                        cashOfficeLabelById[row.original.cashOfficeId || ''] ||
                        '—'}
                </div>
            ),
        },
        {
            id: 'till',
            header: 'Till',
            cell: ({ row }) => {
                const handover = row.original;
                const tillLabel =
                    handover.till?.name ||
                    handover.till?.tillNumber ||
                    handover.tillName ||
                    tillLabelById[handover.tillId || ''] ||
                    fetchedTillLabelById[handover.tillId || ''] ||
                    tillLabelByCashOfficeId[handover.cashOfficeId || ''] ||
                    '—';
                return <div>{tillLabel}</div>;
            },
        },
        {
            id: 'requestType',
            header: 'Request Type',
            cell: ({ row }) => <div>{row.original.requestType || '—'}</div>,
        },
        {
            id: 'requestedBy',
            header: 'Requested By',
            cell: ({ row }) => (
                <div>{row.original.requestedByName || row.original.requestedByUser?.name || '—'}</div>
            ),
        },
        {
            id: 'declaredAmount',
            header: 'Declared (Cash / Chq)',
            cell: ({ row }) => (
                <div>
                    {formatMoney(row.original.declaredCashAmount || 0)}{' '}
                    <span className="text-muted-foreground">
                        / {formatMoney(row.original.declaredChequeAmount || 0)}
                    </span>
                </div>
            ),
        },
        {
            id: 'countedAmount',
            header: 'Counted (Cash / Chq)',
            cell: ({ row }) => (
                <div>
                    {row.original.countedCashAmount != null ? formatMoney(row.original.countedCashAmount) : '—'}{' '}
                    <span className="text-muted-foreground">
                        / {row.original.countedChequeAmount != null ? formatMoney(row.original.countedChequeAmount) : '—'}
                    </span>
                </div>
            ),
        },
        {
            id: 'variance',
            header: 'Variance',
            cell: ({ row }) => {
                const v = row.original.varianceAmount ?? row.original.variance;
                return (
                    <div>
                        <div className={`font-semibold ${varianceClassName(Number(v) || 0)}`}>
                            {v != null ? formatMoney(v) : '—'}
                        </div>
                        {row.original.varianceReason ? (
                            <div className="text-xs text-muted-foreground">{row.original.varianceReason}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <CashOfficeStatusBadge status={row.original.status} />,
        },
        {
            id: 'requestedAt',
            header: 'Requested',
            cell: ({ row }) => <div>{formatDateTime(row.original.requestedAt || row.original.createdAt)}</div>,
        },
        {
            id: 'receivedAt',
            header: 'Received',
            cell: ({ row }) => (
                <div>{formatDateTime(row.original.receivedAt || row.original.acknowledgedAt)}</div>
            ),
        },
        {
            id: 'claimedBy',
            header: 'Claimed By',
            cell: ({ row }) => <div>{row.original.claimedByName || row.original.claimedByUser?.name || '—'}</div>,
        },
        {
            id: 'receivedBy',
            header: 'Received By',
            cell: ({ row }) => (
                <div>{row.original.receivedByName || row.original.receivedByUser?.name || '—'}</div>
            ),
        },
        { id: 'actions', header: () => <div className="text-right">Actions</div>, cell: ({ row }) => actionButtons(row.original) },
    ];

    const statusOptions = [
        { label: 'All statuses', value: '' },
        { label: 'Requested', value: 'REQUESTED' },
        { label: 'Claimed', value: 'CLAIMED' },
        { label: 'Counted', value: 'COUNTED' },
        { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
        { label: 'Received', value: 'RECEIVED' },
        { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Reversed', value: 'REVERSED' },
    ];

    const hasVariance = countTarget && Number(countTarget.varianceAmount ?? countTarget.variance ?? 0) !== 0;

    return (
        <PageLoader isLoading={listQuery.isLoading || configsQuery.isLoading || tillsRes.isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <SelectPopover
                                title="Cash Office"
                                onlyTitle="All cash offices"
                                selectedValue={filters.cashOfficeId}
                                options={[
                                    { label: 'All cash offices', value: '' },
                                    ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) => updateAppliedFilter('cashOfficeId', String(val || ''))}
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All statuses"
                                selectedValue={filters.status}
                                options={statusOptions}
                                onSelect={(val) => updateAppliedFilter('status', String(val || ''))}
                            />
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                className="!w-40"
                            />
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                className="!w-40"
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={() => clearFilters()}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setRequestOpen(true)}>
                            <Plus className="mr-1 h-4 w-4" /> Request Handover
                        </Button>
                    </div>
                    <div className="text-lg font-bold">Till Handovers</div>
                </DataTable>
            </div>

            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Request Till Handover</DialogTitle>
                        <DialogDescription>
                            Requires an open cash office session{openSessionId ? ` · Session ref ${currentSession.data?.data?.clientDocumentId || ''}` : ' (none open — open one first)'}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Till</Label>
                                <SelectPopover
                                    title="Till"
                                    onlyTitle="Select till"
                                    selectedValue={requestForm.tillId}
                                    options={[
                                        { label: 'Select till', value: '' },
                                        ...(activeTills.length
                                            ? activeTills.map((t) => ({
                                                  label: t.tillNumber ? `${t.name} (${t.tillNumber})` : t.name,
                                                  value: t.id,
                                              }))
                                            : tills.map((t) => ({
                                                  label: t.tillNumber ? `${t.name} (${t.tillNumber})` : t.name,
                                                  value: t.id,
                                              }))),
                                    ]}
                                    onSelect={(val) => setRequestForm({ ...requestForm, tillId: String(val || '') })}
                                />
                                {!tillsRes.isLoading && tills.length === 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">No tills found. Create tills under Masters &gt; Tills.</p>
                                )}
                            </div>
                            <div>
                                <Label>Request Type</Label>
                                <SelectPopover
                                    title="Type"
                                    onlyTitle="Select type"
                                    selectedValue={requestForm.requestType}
                                    options={[
                                        { label: 'Manual', value: 'MANUAL' },
                                        { label: 'Auto', value: 'AUTO' },
                                    ]}
                                    onSelect={(val) => setRequestForm({ ...requestForm, requestType: String(val || 'MANUAL') })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Declared Cash Amount</Label>
                                <Input type="number" value={requestForm.declaredCashAmount} onChange={(e) => setRequestForm({ ...requestForm, declaredCashAmount: e.target.value })} />
                            </div>
                            <div>
                                <Label>Declared Cheque Amount</Label>
                                <Input type="number" value={requestForm.declaredChequeAmount} onChange={(e) => setRequestForm({ ...requestForm, declaredChequeAmount: e.target.value })} />
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Clerk details are taken from the authenticated user. The cash office session is derived automatically.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRequestOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={requestMut.isPending} onClick={requestHandover}>
                            {requestMut.isPending ? 'Requesting...' : 'Request Handover'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={countOpen} onOpenChange={setCountOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Count Till Handover</DialogTitle>
                        <DialogDescription>
                            {countTarget?.receiptNumber || countTarget?.clientDocumentId || ''}
                            {hasVariance
                                ? ` · Variance: ${formatMoney(countTarget?.varianceAmount ?? countTarget?.variance)}`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Declared Cash</Label>
                                <div className="text-lg font-semibold">{formatMoney(countTarget?.declaredCashAmount || 0)}</div>
                            </div>
                            <div>
                                <Label htmlFor="handover-counted-cash">Counted Cash Amount</Label>
                                <Input
                                    id="handover-counted-cash"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={countForm.countedCashAmount}
                                    onChange={(e) =>
                                        setCountForm({ ...countForm, countedCashAmount: e.target.value })
                                    }
                                />
                            </div>
                            <div>
                                <Label>Counted Cheque Amount</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={countForm.countedChequeAmount}
                                    onChange={(e) =>
                                        setCountForm({ ...countForm, countedChequeAmount: e.target.value })
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Variance Reason</Label>
                            <Textarea value={countForm.varianceReason} onChange={(e) => setCountForm({ ...countForm, varianceReason: e.target.value })} placeholder="Optional" />
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Cash may be zero when cheque is positive. Combined counted cash and cheque must be greater than zero.
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setCountOpen(false); setCountTarget(null); }}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700"
                            disabled={countMut.isPending}
                            onClick={submitCount}
                        >
                            {countMut.isPending ? 'Counting...' : 'Submit Count'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reject Handover</DialogTitle>
                        <DialogDescription>{rejectTarget?.receiptNumber || 'Reject a pending handover variance.'}</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Rejection Reason</Label>
                        <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectTarget(null); }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={rejectMut.isPending} onClick={submitReject}>
                            {rejectMut.isPending ? 'Rejecting...' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={reverseOpen} onOpenChange={setReverseOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Handover Reversal</DialogTitle>
                        <DialogDescription>{reverseTarget?.receiptNumber || 'Reverse a till handover.'}</DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label htmlFor="handover-reverse-reason">Reverse Reason *</Label>
                        <Textarea
                            id="handover-reverse-reason"
                            value={reverseReason}
                            onChange={(e) => setReverseReason(e.target.value)}
                            placeholder="Reason for reversal"
                            required
                        />
                    </div>
                    <div className="text-xs text-muted-foreground">
                        This will return the counted cash to the till balance and reduce safe custody. The original
                        handover will remain in history as reversed. Supervisor approval may be required.
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setReverseOpen(false); setReverseTarget(null); }}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={reverseMut.isPending || !reverseReason.trim()}
                            onClick={submitReverse}
                        >
                            {reverseMut.isPending ? 'Reversing...' : 'Confirm Reverse'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CashOfficeHandoverReceiptDialog open={!!receiptId} handoverId={receiptId} onClose={() => setReceiptId('')} />

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

export default TillHandoverModule;