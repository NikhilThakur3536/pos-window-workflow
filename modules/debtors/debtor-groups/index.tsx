import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus } from 'lucide-react';
import DebtorGroupForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    CompanyDebtorGroupDetails,
    DebtorGroupFilterProps,
    useGetDebtorGroups,
    useRemoveDebtorGroup,
} from '@/api-queries/debtor/company-debtor-group';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hasDebtorGroupPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorGroupsList = () => {
    const userGroupPermissions = useUsersPermissions();
    const canCreate = hasDebtorGroupPermission(userGroupPermissions, [SYSTEM_PERMISSIONS.CREATE]);
    const canUpdate = hasDebtorGroupPermission(userGroupPermissions, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDelete = hasDebtorGroupPermission(userGroupPermissions, [SYSTEM_PERMISSIONS.DELETE]);

    const [selectedItem, setSelectedItem] = useState<CompanyDebtorGroupDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters: DebtorGroupFilterProps = {
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
    } = useTableFilters<DebtorGroupFilterProps>(initialFilters);

    const query = useGetDebtorGroups({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
    });
    const { data: debtorGroups, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<CompanyDebtorGroupDetails>[] = [
        {
            accessorKey: 'groupId',
            header: (data) => <TableHeaderToggle {...data}>Group ID</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.getValue('groupId') || '—'}</div>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.description || '—'}</div>,
        },
        {
            accessorKey: 'timezone',
            header: (data) => <TableHeaderToggle {...data}>Timezone</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('timezone') || '—'}</div>,
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className={
                        row.original.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-700'
                    }
                >
                    {row.original.status || '—'}
                </Badge>
            ),
        },
        {
            accessorKey: 'updatedAt',
            header: (data) => <TableHeaderToggle {...data}>Last Updated</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('updatedAt') || '—'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    {canUpdate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditData(row.original)}
                            title="Edit Debtor Group"
                            className="h-8 w-8 p-0"
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                    {canDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            }}
                            title="Delete Debtor Group"
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<CompanyDebtorGroupDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: CompanyDebtorGroupDetails) => {
        setEditData(data);
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

    const handleApplyFilters = (overrides?: DebtorGroupFilterProps) => {
        handleFilters(overrides ? { ...filters, ...overrides } : filters);
    };

    const { mutate: removeDebtorGroup } = useRemoveDebtorGroup();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeDebtorGroup(selectedItem.id, {
                onSuccess: (data) => {
                    setSelectedItem(null);
                    if (data.success) {
                        toast.success('Debtor group deleted successfully');
                    } else {
                        toast.error(data.message || 'Debtor group could not be deleted');
                    }
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
                <div className="text-lg font-bold">Debtor Groups</div>
                <DataTable
                    query={query}
                    data={debtorGroups?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by group ID or description..."
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
                            <Select
                                value={appliedFilters?.status || 'ALL'}
                                onValueChange={(value) =>
                                    handleApplyFilters({
                                        ...filters,
                                        status:
                                            value === 'ALL' ? undefined : (value as DebtorGroupFilterProps['status']),
                                    })
                                }
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {canCreate && (
                            <Button onClick={onAddData} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Debtor Group
                            </Button>
                        )}
                    </div>
                </DataTable>

                <DebtorGroupForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.groupId}? Debtors assigned to this group will be unassigned.`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default DebtorGroupsList;
