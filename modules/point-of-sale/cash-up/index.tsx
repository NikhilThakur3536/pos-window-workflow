import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Eye, Trash2, Plus, ShieldCheck, Edit, Send } from 'lucide-react';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import CashUpForm from './form';
import CashUpViewDialog from './view-dialog';
import CashUpDecisionDialog from './decision-dialog';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    CashUpFilterProps,
    CashUpDetails,
    CashUpUser,
    getCashUpById,
    useGetCashUps,
    useRemoveCashUp,
    useSubmitCashUp,
} from '@/api-queries/till-management/cash-up';
import { useGetCurrentUserSession } from '@/api-queries/till-session';
import { shiftHandover, useGetCurrentShift, useRecoverShiftHandover } from '@/api-queries/till-management/shifts';
import { useTillSessionState } from '@/stores/till-session.store';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { useHasCashUpViewAll } from '@/api-queries/security';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { generateUUIDForData } from '@/utils/helpers';
import { AUTH_TOKEN_KEY } from '@/lib/constant';
import { clearDB } from '@/offline/db';

const CashUpList = () => {
    const queryClient = useQueryClient();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const currentUser = useAuthUser((state) => state.user);
    const logout = useAuthUser((state) => state.logout);
    const currentShiftQuery = useGetCurrentShift();
    const currentSessionQuery = useGetCurrentUserSession(!!currentUser?.token);
    const currentShiftPayload = currentShiftQuery.data?.data;
    const currentShift = currentShiftPayload
        ? 'id' in currentShiftPayload
            ? currentShiftPayload
            : currentShiftPayload.shift || currentShiftPayload.currentShift || null
        : null;
    const currentSessionId = currentSessionQuery.data?.data?.sessionId || currentSessionQuery.data?.data?.id;
    const currentSessionVerified = currentSessionQuery.isSuccess && !currentSessionQuery.isFetching;
    const currentShiftVerified = currentShiftQuery.isSuccess && !currentShiftQuery.isFetching;

    const [selectedItem, setSelectedItem] = useState<CashUpDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [viewData, setViewData] = useState<CashUpDetails | null>(null);
    const [decisionData, setDecisionData] = useState<CashUpDetails | null>(null);
    const [closingCashUpId, setClosingCashUpId] = useState<string | null>(null);
    const [submitId, setSubmitId] = useState<string | null>(null);
    const [recoveryData, setRecoveryData] = useState<CashUpDetails | null>(null);
    const [recoveryReason, setRecoveryReason] = useState('');
    const { mutateAsync: recoverHandover, isPending: isRecovering } = useRecoverShiftHandover();
    const { canViewAll: canViewAllConfigured, canApprove } = useHasCashUpViewAll();

    // The cash-up lifecycle is split across three permissions so a user group can hold
    // only part of it (e.g. a cashier may manage + submit but never approve).
    //
    // Each child code is checked first, then falls back to the parent CASH_UP code. The
    // child codes are not issued yet, so a group that only carries 80600 would otherwise
    // see an empty action column and no way to raise a cash-up at all.
    const userGroupPermissions = useUsersPermissions();
    const CASH_UP_CODE = SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code;

    const canManage =
        hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_MANAGE.code, [
            SYSTEM_PERMISSIONS.READ,
            SYSTEM_PERMISSIONS.CREATE,
            SYSTEM_PERMISSIONS.UPDATE,
        ]) || hasPermission(userGroupPermissions, CASH_UP_CODE, [SYSTEM_PERMISSIONS.CREATE]);
    const canSubmit =
        hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_SUBMIT.code, [
            SYSTEM_PERMISSIONS.READ,
            SYSTEM_PERMISSIONS.UPDATE,
        ]) || hasPermission(userGroupPermissions, CASH_UP_CODE, [SYSTEM_PERMISSIONS.UPDATE]);
    const canRecover = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.UTILITIES.USER_MONITORING.USER_SESSIONS.code,
        [SYSTEM_PERMISSIONS.UPDATE],
    );
    const canDelete =
        hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.CASHUP_MANAGE.code, [
            SYSTEM_PERMISSIONS.DELETE,
        ]) || hasPermission(userGroupPermissions, CASH_UP_CODE, [SYSTEM_PERMISSIONS.DELETE]);

    const { mutate: submitCashUp } = useSubmitCashUp();
    const handleSubmitCashUp = (row: CashUpDetails) => {
        setSubmitId(row.id);
        submitCashUp(
            { id: row.id, status: 'SUBMITTED' },
            {
                onSuccess: async (res) => {
                    if (res?.success) {
                        try {
                            await getCashUpById(row.id);
                            toast.success('Cash-up submitted. Awaiting supervisor review.');
                        } catch (error) {
                            const apiError = error as {
                                response?: { data?: { message?: string } };
                                message?: string;
                            };
                            toast.error(
                                `Cash-up submitted, but refresh failed: ${apiError.response?.data?.message || apiError.message || 'Please refresh the list.'}`,
                            );
                        }
                    } else {
                        toast.error(res?.message || 'Failed to submit cash up.');
                    }
                    setSubmitId(null);
                },
                onError: (error) => {
                    setSubmitId(null);
                    const apiError = error as { response?: { data?: { message?: string } }; message?: string };
                    toast.error(apiError.response?.data?.message || apiError.message || 'Failed to submit cash-up.');
                },
            },
        );
    };

    const handleCloseSession = async (row: CashUpDetails) => {
        const shift = row.shift;
        const isCurrentSessionShift =
            currentSessionVerified &&
            currentShiftVerified &&
            row.status === 'APPROVED' &&
            !['RECOUNT', 'INVESTIGATE'].includes(row.resolution || '') &&
            shift?.status === 'OPEN' &&
            !!currentShift?.id &&
            currentShift.status === 'OPEN' &&
            currentShift.id === shift.id &&
            !!currentUser?.id &&
            shift.cashierUserId === currentUser.id &&
            !!currentSessionId &&
            shift.userSessionId === currentSessionId &&
            row.shiftId === shift.id;
        if (!isCurrentSessionShift) {
            toast.error('This approved cash-up is not linked to your current open shift and login session.');
            return;
        }
        if (!window.confirm('Close your shift and sign out? The next cashier will need to log in.')) return;
        setClosingCashUpId(row.id);
        const requestKey = `pending-shift-handover:${shift.id}:${row.id}`;
        const handoverRequestId = window.localStorage.getItem(requestKey) || generateUUIDForData();
        window.localStorage.setItem(requestKey, handoverRequestId);
        try {
            const handover = await shiftHandover({ cashUpId: row.id, handoverRequestId });
            if (!handover?.success) {
                throw new Error(handover?.message || 'Shift handover failed.');
            }
            window.localStorage.removeItem(requestKey);
            try {
                await clearDB();
            } catch (error) {
                console.error('Failed to clear offline user data after shift closure:', error);
                toast.error('Shift closed. Some offline user data could not be cleared.');
            }
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.localStorage.removeItem('companyContext');
            useTillSessionState.getState().clearTillSession();
            logout();
            queryClient.clear();
            window.location.replace('/auth/login');
        } catch (error) {
            const apiError = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(apiError.response?.data?.message || apiError.message || 'Shift handover failed.');
        } finally {
            setClosingCashUpId(null);
        }
    };

    const handleRecoverShift = async () => {
        const row = recoveryData;
        if (!row?.shift?.id || !row.id || !recoveryReason.trim() || !currentSessionVerified) {
            toast.error('The current login session could not be verified. Refresh before recovering a shift.');
            return;
        }
        const requestKey = `pending-manager-handover:${row.shift.id}:${row.id}`;
        const storedRequest = window.localStorage.getItem(requestKey);
        const storedReason = window.localStorage.getItem(`${requestKey}:reason`);
        const handoverRequestId =
            storedRequest && storedReason === recoveryReason.trim() ? storedRequest : generateUUIDForData();
        window.localStorage.setItem(requestKey, handoverRequestId);
        window.localStorage.setItem(`${requestKey}:reason`, recoveryReason.trim());
        try {
            const response = await recoverHandover({
                shiftId: row.shift.id,
                cashUpId: row.id,
                handoverRequestId,
                reason: recoveryReason.trim(),
            });
            if (!response?.success) {
                toast.error(response?.message || 'Manager handover failed.');
                return;
            }
            window.localStorage.removeItem(requestKey);
            window.localStorage.removeItem(`${requestKey}:reason`);
            toast.success('Manager handover completed.');
            setRecoveryData(null);
            setRecoveryReason('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['shift'] }),
                queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'sessions'] }),
                queryClient.invalidateQueries(),
            ]);
            if (row.shift.userSessionId && row.shift.userSessionId === currentSessionId) {
                try {
                    await clearDB();
                } catch (error) {
                    console.error('Failed to clear offline user data after manager handover:', error);
                    toast.error('Handover completed. Some offline user data could not be cleared.');
                }
                window.localStorage.removeItem(AUTH_TOKEN_KEY);
                window.localStorage.removeItem('companyContext');
                useTillSessionState.getState().clearTillSession();
                logout();
                queryClient.clear();
                window.location.replace('/auth/login');
            }
        } catch (error) {
            const apiError = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(apiError.response?.data?.message || apiError.message || 'Manager handover failed.');
        }
    };

    const initialFilters: CashUpFilterProps = {
        search: '',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<CashUpFilterProps>(initialFilters);

    const query = useGetCashUps({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: cashUps, isLoading } = query;
    const access = cashUps?.data?.access;
    const canSeeOtherCashUps = !!access?.canViewAll && canViewAllConfigured;
    const totalRowCount = query?.data?.data?.count || 0;
    const visibleCashUps = useMemo(() => {
        const rows = cashUps?.data?.rows || [];
        if (access?.canViewAll !== true || canSeeOtherCashUps) return rows;
        const ownerUserId = access.ownerUserId || currentUser?.id;
        return ownerUserId
            ? rows.filter(
                  (item) =>
                      item.shift?.cashierUserId === ownerUserId ||
                      item.submittedById === ownerUserId ||
                      item.createdById === ownerUserId,
              )
            : [];
    }, [access?.canViewAll, access?.ownerUserId, canSeeOtherCashUps, cashUps?.data?.rows, currentUser?.id]);

    const formatMoney = (value?: string | number | null) => {
        const num = Number(value || 0) || 0;
        return `${currencySymbol} ${num.toFixed(2)}`;
    };

    const declaredTotal = (row: CashUpDetails) => row.declaredTotal ?? row.declaredTotals ?? null;

    const expectedTotal = (row: CashUpDetails) => row.expectedTotal ?? row.expectedTotals ?? null;

    const resolution = (row: CashUpDetails) =>
        row.resolution ||
        [...new Set((row.varianceActions || []).map((action) => action.resolution).filter(Boolean))].join(', ') ||
        '—';

    const fullName = (user?: CashUpUser | null) => {
        if (!user) return null;
        return [user.firstName, user.lastName || user.surname].filter(Boolean).join(' ') || null;
    };

    const isCurrentLoginShift = (row: CashUpDetails) =>
        currentSessionVerified &&
        currentShiftVerified &&
        row.shift?.status === 'OPEN' &&
        !!currentShift?.id &&
        currentShift.status === 'OPEN' &&
        row.shift.id === currentShift.id &&
        row.shiftId === row.shift.id &&
        !!currentUser?.id &&
        row.shift.cashierUserId === currentUser.id &&
        !!currentSessionId &&
        row.shift.userSessionId === currentSessionId;

    const canStartCashUp =
        canManage &&
        currentSessionVerified &&
        currentShiftVerified &&
        currentShift?.status === 'OPEN' &&
        !!currentUser?.id &&
        currentShift.cashierUserId === currentUser.id &&
        !!currentSessionId &&
        currentShift.userSessionId === currentSessionId;

    const platformDisplay = (row: CashUpDetails) => row.till?.name || row.till?.tillNumber || 'N/A';

    const cashTotal = (row: CashUpDetails) =>
        (row.denominations?.length ? row.denominations : row.CashUpDenominations || []).reduce((sum, denomination) => {
            if (denomination.value !== null && denomination.value !== undefined) {
                const value = Number(denomination.value);
                if (Number.isFinite(value)) return sum + value;
            }
            const conversionValue = Number(
                denomination.denomination?.conversionValue || denomination.Denomination?.conversionValue || 0,
            );
            return sum + conversionValue * denomination.count;
        }, 0);

    const columns: ColumnDef<CashUpDetails>[] = [
        {
            accessorKey: 'till',
            header: (data) => <TableHeaderToggle {...data}>Till</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {platformDisplay(row.original)}
                    {row.original.till?.tillNumber && row.original.till.tillNumber !== row.original.till?.name && (
                        <div className="text-muted-foreground text-xs">{row.original.till.tillNumber}</div>
                    )}
                </div>
            ),
        },
        {
            id: 'cashier',
            header: (data) => <TableHeaderToggle {...data}>Cashier</TableHeaderToggle>,
            cell: ({ row }) => {
                const cashier = row.original.shift?.cashier || row.original.createdByUser;
                const name = fullName(cashier) || row.original.createdByName;
                return (
                    <div>
                        {name || 'N/A'}
                        {cashier?.staffNumber != null && (
                            <div className="text-muted-foreground text-xs">Staff {cashier.staffNumber}</div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'cashUpDate',
            header: (data) => <TableHeaderToggle {...data}>Cash Up Date</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.getValue('cashUpDate') ? moment(row.getValue('cashUpDate')).format('DD/MM/YYYY') : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'store',
            header: (data) => <TableHeaderToggle {...data}>Store</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.store?.name || 'N/A'}</div>,
        },
        {
            accessorKey: 'shift',
            header: (data) => <TableHeaderToggle {...data}>Shift</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.shift?.currentShiftNumber ? `Shift ${row.original.shift.currentShiftNumber}` : 'N/A'}
                    {row.original.shift?.status && (
                        <div className="text-xs text-blue-600">{row.original.shift.status}</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'cashFloat',
            header: (data) => <TableHeaderToggle {...data}>Cash Float</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.cashFloat)}</div>,
        },
        {
            accessorKey: 'discountAmount',
            header: (data) => <TableHeaderToggle {...data}>Discount</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.discountAmount)}</div>,
        },
        {
            accessorKey: 'couponAmount',
            header: (data) => <TableHeaderToggle {...data}>Coupon</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.couponAmount)}</div>,
        },
        {
            accessorKey: 'cheques',
            header: (data) => <TableHeaderToggle {...data}>Cheques</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.cheques)}</div>,
        },
        {
            accessorKey: 'epos',
            header: (data) => <TableHeaderToggle {...data}>EPOS</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.epos)}</div>,
        },
        {
            accessorKey: 'vouchersCashedIn',
            header: (data) => <TableHeaderToggle {...data}>Vouchers</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.vouchersCashedIn)}</div>,
        },
        {
            accessorKey: 'bankTransfers',
            header: (data) => <TableHeaderToggle {...data}>Bank Transfers</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.bankTransfers)}</div>,
        },
        {
            accessorKey: 'safeDrop',
            header: (data) => <TableHeaderToggle {...data}>Safe Drop</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.safeDrop)}</div>,
        },
        {
            accessorKey: 'other',
            header: (data) => <TableHeaderToggle {...data}>Other</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(row.original.other)}</div>,
        },
        {
            id: 'expectedTotal',
            header: (data) => <TableHeaderToggle {...data}>Expected</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="text-right">
                    {expectedTotal(row.original) !== null ? formatMoney(expectedTotal(row.original)) : '—'}
                </div>
            ),
        },
        {
            id: 'declaredTotal',
            header: (data) => <TableHeaderToggle {...data}>Declared</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="text-right">
                    {declaredTotal(row.original) !== null ? formatMoney(declaredTotal(row.original)) : '—'}
                </div>
            ),
        },
        {
            accessorKey: 'variance',
            header: (data) => <TableHeaderToggle {...data}>Variance</TableHeaderToggle>,
            cell: ({ row }) => <div className="text-right">{formatMoney(row.original.variance)}</div>,
        },
        {
            id: 'totalAmount',
            header: (data) => <TableHeaderToggle {...data}>Total Counted</TableHeaderToggle>,
            cell: ({ row }) => <div>{formatMoney(String(cashTotal(row.original)))}</div>,
        },
        {
            id: 'resolution',
            header: (data) => <TableHeaderToggle {...data}>Resolution</TableHeaderToggle>,
            cell: ({ row }) => <div>{resolution(row.original)}</div>,
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original.status || '';
                const className =
                    status === 'APPROVED'
                        ? 'bg-green-50 text-green-700'
                        : status === 'REJECTED'
                          ? 'bg-red-50 text-red-700'
                          : status === 'SUBMITTED' || status === 'PENDING_APPROVAL'
                            ? 'bg-cyan-50 text-cyan-700'
                            : status === 'DRAFT'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700';
                return (
                    <Badge variant="outline" className={className}>
                        {status || '—'}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'approvedBy',
            header: (data) => <TableHeaderToggle {...data}>Approved By</TableHeaderToggle>,
            cell: ({ row }) => <div>{fullName(row.original.approvedBy) || '—'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const status = row.original.status || '';
                const isDraft = status === 'DRAFT';
                const shift = row.original.shift;
                const isOwnCurrentShift =
                    status === 'APPROVED' &&
                    !['RECOUNT', 'INVESTIGATE'].includes(row.original.resolution || '') &&
                    isCurrentLoginShift(row.original);
                const isOtherOpenShift =
                    currentSessionVerified &&
                    status === 'APPROVED' &&
                    !['RECOUNT', 'INVESTIGATE'].includes(row.original.resolution || '') &&
                    shift?.status === 'OPEN' &&
                    !!shift.id &&
                    !!shift.cashierUserId &&
                    !!shift.userSessionId &&
                    row.original.shiftId === shift.id &&
                    (shift.cashierUserId !== currentUser?.id || shift.userSessionId !== currentSessionId);
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewData(row.original)}
                            className="h-8 w-8 p-0"
                            title="View cash-up"
                            aria-label="View cash-up"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                        {status === 'SUBMITTED' && canApprove && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDecisionData(row.original)}
                                title="Review submitted cash-up"
                                className="h-8 w-8 p-0 text-cyan-700 hover:bg-cyan-50"
                            >
                                <ShieldCheck className="h-4 w-4" />
                            </Button>
                        )}
                        {isDraft && canManage && isCurrentLoginShift(row.original) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedItem(null);
                                    setEditData(row.original);
                                    setOpen(true);
                                }}
                                title="Edit Cash Up"
                                className="h-8 w-8 p-0"
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                        {isDraft && canSubmit && isCurrentLoginShift(row.original) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSubmitCashUp(row.original)}
                                disabled={submitId === row.original.id}
                                title="Submit Cash Up"
                                className="h-8 w-8 p-0 text-blue-700 hover:bg-blue-50"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                        {isOwnCurrentShift && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCloseSession(row.original)}
                                disabled={closingCashUpId === row.original.id}
                                title="Close your own approved shift and sign out"
                                className="h-8"
                            >
                                Close My Shift
                            </Button>
                        )}
                        {isOtherOpenShift && canRecover && canSeeOtherCashUps && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRecoveryData(row.original);
                                    setRecoveryReason('');
                                }}
                                title="Recover another cashier's approved open shift"
                                className="h-8"
                            >
                                Manager Handover
                            </Button>
                        )}
                        {isDraft && canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedItem(row.original);
                                    setIsDeleteOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<CashUpDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const { mutate: removeCashUp } = useRemoveCashUp();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeCashUp(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Cash up deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <div className="text-lg font-bold">Cash-Up</div>
                <DataTable
                    query={query}
                    data={visibleCashUps}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search cash ups..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                        {canStartCashUp && (
                            <Button onClick={onAddData} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Cash Up
                            </Button>
                        )}
                    </div>
                </DataTable>

                <CashUpForm
                    open={open}
                    onClose={onClose}
                    editData={editData}
                    currentShift={currentShift}
                    key={editData?.id || null}
                />

                <CashUpViewDialog data={viewData} onClose={() => setViewData(null)} />

                <CashUpDecisionDialog open={!!decisionData} data={decisionData} onClose={() => setDecisionData(null)} />

                <Dialog
                    open={!!recoveryData}
                    onOpenChange={(open) => {
                        if (!open && !isRecovering) {
                            setRecoveryData(null);
                            setRecoveryReason('');
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Manager Handover</DialogTitle>
                            <DialogDescription>
                                Recover the target cashier&apos;s open financial shift. This does not open the next
                                cashier&apos;s shift or check out attendance.
                            </DialogDescription>
                        </DialogHeader>
                        {recoveryData && (
                            <div className="space-y-2 text-sm">
                                <p>
                                    Cashier:{' '}
                                    {fullName(recoveryData.shift?.cashier) ||
                                        fullName(recoveryData.createdByUser) ||
                                        recoveryData.createdByName ||
                                        'Unknown'}
                                </p>
                                <p>Till: {platformDisplay(recoveryData)}</p>
                                <p>Shift: {recoveryData.shift?.currentShiftNumber ?? 'Missing'}</p>
                                <p>
                                    Approved cash-up: {formatMoney(declaredTotal(recoveryData))} · {recoveryData.status}
                                </p>
                                <Input
                                    value={recoveryReason}
                                    onChange={(event) => setRecoveryReason(event.target.value)}
                                    placeholder="Required reason for manager handover"
                                    aria-label="Manager handover reason"
                                    maxLength={500}
                                />
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setRecoveryData(null)} disabled={isRecovering}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void handleRecoverShift()}
                                disabled={isRecovering || !recoveryReason.trim()}
                            >
                                {isRecovering ? 'Recovering…' : 'Confirm Manager Handover'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete this cash up?`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default CashUpList;
