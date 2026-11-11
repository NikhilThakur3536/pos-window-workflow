import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Edit, Eye, Info, Trash2, Plus, RotateCcw, UserPlus, UserRoundMinus } from 'lucide-react';
import { useAuthUser } from '@/stores/auth-user.store';
import TillForm from './till-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetTills,
    FilterProps,
    TillDetails,
    useRemoveTill,
    useResetTillInstallation,
} from '@/api-queries/masters/tills';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { getTerminalErrorMessage } from '@/utils/terminal-errors';
import { AssignTillDialog, RemoveTillAssignmentDialog, TillAssignmentHistoryDialog } from './till-assignment-dialogs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const assignmentNames = (till: TillDetails) =>
    (till.assignments || []).map((assignment) => {
        const user = assignment.user;
        const name = user?.name || `${user?.firstName || ''} ${user?.surname || ''}`.trim() || 'Unknown cashier';
        return `${name}${user?.staffNumber ? ` · Staff ${user.staffNumber}` : ''}`;
    });

const shiftName = (till: TillDetails) => {
    const shiftUser = till.currentShift?.user || till.currentShift?.cashier || till.currentShift?.assignment?.user;
    if (shiftUser) {
        const name =
            shiftUser.name || `${shiftUser.firstName || ''} ${shiftUser.surname || ''}`.trim() || 'Unknown cashier';
        return `${name}${shiftUser.staffNumber ? ` · Staff ${shiftUser.staffNumber}` : ''}`;
    }
    if (till.currentShift) return 'Open shift';
    if (till.openShifts?.length) {
        return till.openShifts
            .map((shift) => {
                const user = shift.user || shift.cashier || shift.assignment?.user;
                return user
                    ? user.name || `${user.firstName || ''} ${user.surname || ''}`.trim() || 'Unknown cashier'
                    : 'Open shift';
            })
            .join(', ');
    }
    return 'No open shift';
};

const rosterNames = (rosters: TillDetails['currentRosters']) =>
    rosters?.length
        ? rosters
              .map((roster) => {
                  const user = roster.user || roster.cashier;
                  const name = user
                      ? user.name || `${user.firstName || ''} ${user.surname || ''}`.trim() || 'Scheduled cashier'
                      : 'Scheduled cashier';
                  const time = roster.startAt || roster.startTime || roster.date;
                  return `${name}${time ? ` · ${new Date(time).toLocaleString()}` : ''}`;
              })
              .join(', ')
        : 'Not scheduled';

const TillsList = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isAdministrator = useAuthUser((state) => state.user?.administrator === true);
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<TillDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [registeredInstallationId, setRegisteredInstallationId] = useState('');
    const [resetReason, setResetReason] = useState('');
    const [assignmentTill, setAssignmentTill] = useState<
        (Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) | null
    >(null);
    const [removeAssignmentTill, setRemoveAssignmentTill] = useState<TillDetails | null>(null);
    const [historyTill, setHistoryTill] = useState<TillDetails | null>(null);
    const resetInstallation = useResetTillInstallation();

    const initialFilters = {
        search: '',
        scope: 'ALL' as FilterProps['scope'],
        status: 'ALL' as FilterProps['status'],
        assignmentStatus: 'ALL' as FilterProps['assignmentStatus'],
        shiftStatus: 'ALL' as FilterProps['shiftStatus'],
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetTills({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        scope: appliedFilters?.scope || 'ALL',
        status: appliedFilters?.status || 'ALL',
        assignmentStatus: appliedFilters?.assignmentStatus || 'ALL',
        shiftStatus: appliedFilters?.shiftStatus || 'ALL',
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters.companyDebtorId } : {}),
        ...(appliedFilters?.assignedUserId ? { assignedUserId: appliedFilters.assignedUserId } : {}),
    });
    const { data: tills, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const access = tills?.data?.access;
    const moduleCode = SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code;
    const canReadAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.READ]);
    const canCreateAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.CREATE]);
    const canUpdateAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDeleteAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.DELETE]);
    const canManageAssignments = !!access?.canManage && (canCreateAssignments || canUpdateAssignments);
    const canViewAllTills = !!access?.canViewAll && canReadAssignments;

    const columns: ColumnDef<TillDetails>[] = [
        {
            accessorKey: 'tillNumber',
            size: 125,
            header: (data) => <TableHeaderToggle {...data}>Till Number</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="truncate" title={row.original.tillNumber}>
                    {row.getValue('tillNumber')}
                </div>
            ),
        },
        {
            accessorKey: 'name',
            size: 150,
            header: (data) => <TableHeaderToggle {...data}>Till Name</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = row.getValue('name') as string;
                return (
                    <div className="truncate" title={value}>
                        {value || 'N/A'}
                    </div>
                );
            },
        },
        {
            id: 'scope',
            size: 100,
            header: (data) => <TableHeaderToggle {...data}>Scope</TableHeaderToggle>,
            cell: ({ row }) => {
                const isStore = !!row.original.companyDebtorId;
                return isStore ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                        Store
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        Company
                    </Badge>
                );
            },
        },
        {
            id: 'companyDebtor',
            size: 170,
            header: (data) => <TableHeaderToggle {...data}>Store</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="truncate" title={row.original.companyDebtor?.name || undefined}>
                    {row.original.companyDebtor?.name || '—'}
                </div>
            ),
        },
        {
            accessorKey: 'terminalId',
            size: 180,
            header: (data) => <TableHeaderToggle {...data}>Terminal ID</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="flex min-w-0 items-center gap-1">
                    <span className="min-w-0 flex-1 truncate" title={row.original.terminalId}>
                        {row.original.terminalId || '—'}
                    </span>
                    {row.original.terminalId && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            aria-label="Copy Terminal ID"
                            title="Copy Terminal ID"
                            onClick={async (event) => {
                                event.stopPropagation();
                                try {
                                    await navigator.clipboard.writeText(row.original.terminalId);
                                    toast.success('Terminal ID copied');
                                } catch {
                                    toast.error('Unable to copy Terminal ID.');
                                }
                            }}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    )}
                </div>
            ),
        },
        {
            id: 'assignedCashier',
            size: 190,
            header: (data) => <TableHeaderToggle {...data}>Assigned Cashier</TableHeaderToggle>,
            cell: ({ row }) => {
                const names = assignmentNames(row.original);
                return names.length ? (
                    <div className="max-w-full break-words whitespace-normal">
                        {names.map((name, index) => (
                            <div key={`${row.original.id}-assignment-${index}`} className="text-sm">
                                {name}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                );
            },
        },
        {
            id: 'currentUsage',
            size: 205,
            header: (data) => <TableHeaderToggle {...data}>Current Usage</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="max-w-full break-words whitespace-normal">
                    <div>
                        {row.original.currentShift || row.original.openShifts?.length
                            ? shiftName(row.original)
                            : 'No open shift'}
                    </div>
                    {row.original.currentShift?.openedAt && (
                        <div className="text-muted-foreground text-xs">
                            Since {new Date(row.original.currentShift.openedAt).toLocaleString()}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'availability',
            size: 190,
            header: (data) => <TableHeaderToggle {...data}>Availability</TableHeaderToggle>,
            cell: ({ row }) => {
                const availability =
                    row.original.availability || (row.original.assignmentCount ? 'ASSIGNED' : 'UNASSIGNED');
                const variants: Record<string, string> = {
                    UNASSIGNED: 'bg-gray-50 text-gray-700',
                    ASSIGNED: 'bg-blue-50 text-blue-700',
                    IN_USE: 'bg-amber-50 text-amber-800',
                    CONFLICT: 'bg-red-50 text-red-700',
                };
                return (
                    <div className="space-y-1 whitespace-normal">
                        <span title={row.original.actions?.reason}>
                            <Badge variant="outline" className={variants[availability] || ''}>
                                {availability}
                            </Badge>
                        </span>
                        {availability === 'IN_USE' && (
                            <div className="max-w-full text-xs break-words text-amber-800">
                                Cash-up / handover required before reassignment.
                            </div>
                        )}
                        {availability === 'CONFLICT' && (
                            <div className="max-w-full text-xs break-words text-red-700">
                                Review and explicitly remove conflicting assignments.
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'roster',
            size: 250,
            header: (data) => (
                <div className="flex items-center gap-1">
                    <TableHeaderToggle {...data}>Staff Schedule</TableHeaderToggle>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="Staff Schedule information"
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <Info className="size-4" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p>Shows who is scheduled to use this till now and next.</p>
                                <p className="mt-1">Current → Now</p>
                                <p>Upcoming → Next</p>
                                <p>— → Not scheduled</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            ),
            cell: ({ row }) => (
                <div className="max-w-full text-xs break-words whitespace-normal">
                    <div>
                        <span className="font-medium">Now:</span> {rosterNames(row.original.currentRosters)}
                    </div>
                    <div>
                        <span className="font-medium">Next:</span> {rosterNames(row.original.upcomingRosters)}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'cashThreshold',
            size: 150,
            header: (data) => <TableHeaderToggle {...data}>Cash Threshold</TableHeaderToggle>,
            cell: ({ row }) => {
                const threshold = row.original.cashThreshold;
                return (
                    <div className="text-right">
                        {threshold === null || threshold === undefined || threshold === ''
                            ? '—'
                            : `${currencySymbol} ${Number(threshold).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                );
            },
        },
        {
            accessorKey: 'balanceStatus',
            size: 180,
            header: (data) => <TableHeaderToggle {...data}>Balance</TableHeaderToggle>,
            cell: ({ row }) => {
                const balance = row.original.balanceStatus;
                const currentBalance = row.original.currentBalance;
                const displayValue =
                    currentBalance !== null && currentBalance !== undefined
                        ? `${currencySymbol} ${Number(currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : null;
                if (!balance && !displayValue) return <div className="text-muted-foreground">—</div>;
                if (balance?.isAboveThreshold) {
                    return (
                        <Badge
                            variant="outline"
                            className="max-w-full bg-red-50 break-words whitespace-normal text-red-700"
                        >
                            {displayValue || '—'} · +{currencySymbol}
                            {Number(balance.excess || 0).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </Badge>
                    );
                }
                return (
                    <Badge
                        variant="outline"
                        className="max-w-full bg-green-50 break-words whitespace-normal text-green-700"
                    >
                        {displayValue || 'OK'}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            size: 300,
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex flex-wrap items-center justify-center gap-1">
                    {canReadAssignments &&
                        (row.original.actions?.canViewAssignments || row.original.actions?.canViewHistory) && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title={row.original.actions.reason || 'View assignments and history'}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setHistoryTill(row.original);
                                }}
                            >
                                <Eye className="mr-1 h-4 w-4" /> View
                            </Button>
                        )}
                    {canManageAssignments &&
                        row.original.availability === 'UNASSIGNED' &&
                        row.original.actions?.canAssign && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title={row.original.actions.reason || 'Assign a cashier'}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setAssignmentTill(row.original);
                                }}
                            >
                                <UserPlus className="mr-1 h-4 w-4" /> Assign
                            </Button>
                        )}
                    {canManageAssignments &&
                        row.original.availability === 'ASSIGNED' &&
                        row.original.actions?.canReassign && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title={row.original.actions.reason || 'Reassign cashier'}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setAssignmentTill(row.original);
                                }}
                            >
                                <UserPlus className="mr-1 h-4 w-4" /> Reassign
                            </Button>
                        )}
                    {canManageAssignments &&
                        canDeleteAssignments &&
                        row.original.actions?.canRemoveAssignments &&
                        (row.original.assignments?.length || 0) > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                title={row.original.actions.reason || 'Remove an assignment'}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setRemoveAssignmentTill(row.original);
                                }}
                            >
                                <UserRoundMinus className="mr-1 h-4 w-4" /> Remove Assignment
                            </Button>
                        )}
                    {isAdministrator && (
                        <Button
                            variant="ghost"
                            size="sm"
                            title="Reset EXE installation"
                            aria-label="Reset EXE installation"
                            onClick={(event) => {
                                event.stopPropagation();
                                setSelectedItem(row.original);
                                setRegisteredInstallationId('');
                                setResetReason('');
                                setIsResetOpen(true);
                            }}
                            className="h-8 w-8 p-0"
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.UPDATE])) {
                                e.stopPropagation();
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.DELETE])) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<TillDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: TillDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleAssignNow = (till: Pick<TillDetails, 'id' | 'name' | 'tillNumber'> & Partial<TillDetails>) => {
        setAssignmentTill(till);
        onClose();
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

    const { mutate: removeTill } = useRemoveTill();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeTill(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Till deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const handleResetInstallation = () => {
        const terminalId = selectedItem?.terminalId?.trim();
        const installationId = registeredInstallationId.trim();
        const reason = resetReason.trim();
        if (!terminalId || !installationId || !reason) {
            toast.error('Terminal ID, registered installation ID, and reset reason are required.');
            return;
        }
        if (reason.length > 200) {
            toast.error('Reset reason cannot exceed 200 characters.');
            return;
        }
        resetInstallation.mutate(
            { terminalId, installationId, reason },
            {
                onSuccess: (response) => {
                    if (!response.success) {
                        toast.error(getTerminalErrorMessage(response.message, 'Installation reset failed.'));
                        return;
                    }
                    toast.success(response.message || 'Installation registration reset.');
                    setIsResetOpen(false);
                    setSelectedItem(null);
                },
                onError: (error) => {
                    const apiError = error as typeof error & {
                        response?: { data?: { message?: string; error?: string } };
                    };
                    toast.error(
                        getTerminalErrorMessage(
                            apiError.response?.data?.message || apiError.response?.data?.error || apiError.message,
                            'Installation reset failed.',
                        ),
                    );
                },
            },
        );
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={tills?.data?.rows || []}
                    columns={columns}
                    tableClassName="table-fixed min-w-[2175px]"
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by till name, code or terminal id..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            {canViewAllTills && (
                                <Select
                                    value={filters.scope || 'ALL'}
                                    onValueChange={(value) =>
                                        setFilters({ ...filters, scope: value as FilterProps['scope'] })
                                    }
                                >
                                    <SelectTrigger className="h-9 w-[150px]">
                                        <SelectValue placeholder="All scopes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All scopes</SelectItem>
                                        <SelectItem value="COMPANY">Company</SelectItem>
                                        <SelectItem value="STORE">Store</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            <Select
                                value={filters.status || 'ALL'}
                                onValueChange={(value) =>
                                    setFilters({ ...filters, status: value as FilterProps['status'] })
                                }
                            >
                                <SelectTrigger className="h-9 w-[140px]">
                                    <SelectValue placeholder="Till Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Till Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.assignmentStatus || 'ALL'}
                                onValueChange={(value) =>
                                    setFilters({
                                        ...filters,
                                        assignmentStatus: value as FilterProps['assignmentStatus'],
                                    })
                                }
                            >
                                <SelectTrigger className="h-9 w-[140px]">
                                    <SelectValue placeholder="Assignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Assignments</SelectItem>
                                    <SelectItem value="ASSIGNED">Assigned</SelectItem>
                                    <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.shiftStatus || 'ALL'}
                                onValueChange={(value) =>
                                    setFilters({ ...filters, shiftStatus: value as FilterProps['shiftStatus'] })
                                }
                            >
                                <SelectTrigger className="h-9 w-[140px]">
                                    <SelectValue placeholder="Shift" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Shifts</SelectItem>
                                    <SelectItem value="OPEN">Open</SelectItem>
                                    <SelectItem value="NO_OPEN_SHIFT">No Open Shift</SelectItem>
                                </SelectContent>
                            </Select>
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code,
                                        [SYSTEM_PERMISSIONS.CREATE],
                                    )
                                ) {
                                    onAddData();
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                    return;
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Register Till
                        </Button>
                    </div>
                </DataTable>

                <TillForm
                    open={open}
                    onClose={onClose}
                    canAssignNow={canManageAssignments}
                    onAssignNow={handleAssignNow}
                    editData={editData}
                    key={editData?.id || null}
                />

                <AssignTillDialog
                    till={assignmentTill}
                    open={!!assignmentTill}
                    onClose={() => setAssignmentTill(null)}
                    onRefreshRequired={() => void query.refetch()}
                />
                <RemoveTillAssignmentDialog
                    till={removeAssignmentTill}
                    open={!!removeAssignmentTill}
                    onClose={() => setRemoveAssignmentTill(null)}
                    onRemoved={() => void query.refetch()}
                />
                <TillAssignmentHistoryDialog
                    till={historyTill}
                    open={!!historyTill}
                    onClose={() => setHistoryTill(null)}
                />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.name}`}
                    onConfirm={handleDelete}
                />

                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Reset EXE Installation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-sm">
                                Complete cashier handover and logout before resetting this terminal registration.
                            </p>
                            <div className="space-y-2">
                                <Label>Terminal ID</Label>
                                <Input readOnly value={selectedItem?.terminalId || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reset-installation-id">Current registered installation ID</Label>
                                <Input
                                    id="reset-installation-id"
                                    value={registeredInstallationId}
                                    onChange={(event) => setRegisteredInstallationId(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reset-installation-reason">
                                    Reason (required, maximum 200 characters)
                                </Label>
                                <Input
                                    id="reset-installation-reason"
                                    value={resetReason}
                                    maxLength={200}
                                    onChange={(event) => setResetReason(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={handleResetInstallation}
                                    disabled={resetInstallation.isPending}
                                >
                                    {resetInstallation.isPending ? 'Resetting…' : 'Reset Installation'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the tills." }}
            />
        </PageLoader>
    );
};

export default TillsList;
