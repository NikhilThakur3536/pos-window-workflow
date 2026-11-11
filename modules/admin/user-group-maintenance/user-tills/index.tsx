import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, ArrowLeft } from 'lucide-react';
import UserTillForm from './user-till-form';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { toast } from 'sonner';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { useGetUserTills, FilterProps, UserTillDetails, useRemoveUserTill } from '@/api-queries/user/user-tills';
import { UserDetails } from '@/api-queries/user';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

interface UserTillsProp {
    user: UserDetails;
    onBack: () => void;
}

const UserTills = ({ user, onBack }: UserTillsProp) => {
    const userGroupPermissions = useUsersPermissions();
    const moduleCode = SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code;
    const canCreateAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.CREATE]);
    const canUpdateAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDeleteAssignments = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.DELETE]);
    const canManageAssignments = canCreateAssignments || canUpdateAssignments;
    const [assignmentToRemove, setAssignmentToRemove] = useState<UserTillDetails | null>(null);
    const initialFilters = {
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetUserTills({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        userId: user.id,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: userTills, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const tableData = useMemo(() => userTills?.data?.rows || [], [userTills?.data?.rows]);

    const columns: ColumnDef<UserTillDetails>[] = [
        {
            accessorKey: 'till',
            header: 'Till Number',
            cell: ({ row }) => <div>{row?.original?.till?.tillNumber}</div>,
        },
        {
            accessorKey: 'name',
            header: 'Till Name',
            cell: ({ row }) => <div>{row?.original?.till?.name}</div>,
        },
        {
            accessorKey: 'terminalId',
            header: 'Terminal ID',
            cell: ({ row }) => <div>{row?.original?.till?.terminalId}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    {canManageAssignments && row.original.till.actions?.canReassign && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => onEditData(row.original)}
                            className="h-8 w-8 p-0"
                            title={row.original.till.actions.reason || 'Reassign till'}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                    {canManageAssignments &&
                        canDeleteAssignments &&
                        row.original.till.actions?.canRemoveAssignments && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAssignmentToRemove(row.original)}
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                title={row.original.till.actions.reason || 'Remove assignment'}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<UserTillDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onEditData = (data: UserTillDetails) => {
        setEditData(data);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
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

    const { mutate: removeUserTills } = useRemoveUserTill();

    const handleDelete = () => {
        if (assignmentToRemove?.id)
            removeUserTills(assignmentToRemove.id, {
                onSuccess: () => {
                    toast.success('Assignment removed. Till and financial history were not changed.');
                    setAssignmentToRemove(null);
                },
                onError: (error) => {
                    const apiError = error as typeof error & {
                        response?: { data?: { message?: string } };
                    };
                    toast.error(apiError.response?.data?.message || 'Assignment removal failed.');
                },
            });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={tableData || []}
                    columns={columns}
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
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button className="d-flex items-center gap-2" variant="secondary" onClick={onBack}>
                                <ArrowLeft /> Back
                            </Button>

                            {canManageAssignments && canCreateAssignments && (
                                <Button onClick={onAddData} className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    Assign Till to {user?.firstName}
                                </Button>
                            )}
                        </div>
                    </div>
                </DataTable>

                {open && (
                    <UserTillForm
                        open={open}
                        onClose={onClose}
                        userId={user?.id}
                        userType={user?.userType}
                        companyDebtorId={user?.companyDebtorId}
                        canManageAssignments={canManageAssignments}
                        editData={editData}
                        key={editData?.id || null}
                    />
                )}
                <DeleteConfirmation
                    open={!!assignmentToRemove}
                    onClose={() => setAssignmentToRemove(null)}
                    title={`Remove ${assignmentToRemove?.user?.firstName || user.firstName}'s till assignment?`}
                    description="This removes the assignment only. The till, cash balance, and financial history remain unchanged."
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default UserTills;
