import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Eye, Edit, Plus, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TableHeaderToggle } from '@/components/table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import {
    useGetBankAccounts,
    useChangeBankAccountStatus,
    type BankAccountDetails,
    type BankAccountStatus,
} from '@/api-queries/bank-account/bank-accounts';
import BankAccountForm from './form';

const MODULE_CODE = SYSTEM_MODULES.UTILITIES.BANK_ACCOUNTS.code;

type Filters = { search: string; status: '' | BankAccountStatus };

const BankAccountsModule = () => {
    const permissions = useUsersPermissions();
    const [denied, setDenied] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [selected, setSelected] = useState<BankAccountDetails | null>(null);
    const [readOnly, setReadOnly] = useState(false);

    const initialFilters: Filters = { search: '', status: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<Filters>(initialFilters);

    // Status omitted => active and inactive accounts are both listed.
    const query = useGetBankAccounts({
        search: appliedFilters.search || '',
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const rows = query.data?.data?.rows || [];
    const totalRowCount = query.data?.data?.count || 0;

    const statusMut = useChangeBankAccountStatus();

    const can = (permission: string) => hasPermission(permissions, MODULE_CODE, [permission]);
    const guard = (permission: string, action: () => void) => (can(permission) ? action() : setDenied(true));

    const openForm = (row: BankAccountDetails | null, view = false) => {
        setSelected(row);
        setReadOnly(view);
        setFormOpen(true);
    };

    const toggleStatus = (row: BankAccountDetails) => {
        const status: BankAccountStatus = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        statusMut.mutate(
            { id: row.id, status },
            {
                onSuccess: (res) => {
                    if (res?.success === false) return toast.error(res.message || 'Status change failed');
                    toast.success(`Bank account ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`);
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const columns: ColumnDef<BankAccountDetails>[] = [
        {
            accessorKey: 'code',
            header: (d) => <TableHeaderToggle {...d}>Code</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.original.code}</div>,
        },
        {
            accessorKey: 'name',
            header: (d) => <TableHeaderToggle {...d}>Account Name</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.name}</div>,
        },
        {
            accessorKey: 'bankName',
            header: (d) => <TableHeaderToggle {...d}>Bank</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.bankName}</div>,
        },
        {
            accessorKey: 'accountNumber',
            header: (d) => <TableHeaderToggle {...d}>Account Number</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-mono">{String(row.original.accountNumber ?? '')}</div>,
        },
        {
            accessorKey: 'accountHolder',
            header: (d) => <TableHeaderToggle {...d}>Account Holder</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.accountHolder}</div>,
        },
        {
            accessorKey: 'currencyCode',
            header: (d) => <TableHeaderToggle {...d}>Currency</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.currencyCode || '—'}</div>,
        },
        {
            accessorKey: 'status',
            header: (d) => <TableHeaderToggle {...d}>Status</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className={row.original.status === 'ACTIVE' ? 'font-medium text-green-600' : 'font-medium text-red-600'}>
                    {row.original.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const active = row.original.status === 'ACTIVE';
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View" onClick={() => openForm(row.original, true)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Edit"
                            onClick={() => guard(SYSTEM_PERMISSIONS.UPDATE, () => openForm(row.original))}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-2 ${active ? 'text-red-600 hover:bg-red-50 hover:text-red-700' : 'text-green-600 hover:bg-green-50 hover:text-green-700'}`}
                            title={active ? 'Deactivate' : 'Activate'}
                            disabled={statusMut.isPending}
                            onClick={() => guard(SYSTEM_PERMISSIONS.UPDATE, () => toggleStatus(row.original))}
                        >
                            {active ? <PowerOff className="mr-1 h-4 w-4" /> : <Power className="mr-1 h-4 w-4" />}
                            {active ? 'Deactivate' : 'Activate'}
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by code, name, bank, account number or holder..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All statuses"
                                wrapperClass="max-w-[180px]"
                                selectedValue={filters.status}
                                options={[
                                    { label: 'Active', value: 'ACTIVE' },
                                    { label: 'Inactive', value: 'INACTIVE' },
                                ]}
                                onSelect={(val) => setFilters({ ...filters, status: (val || '') as Filters['status'] })}
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button className="flex items-center gap-2" onClick={() => guard(SYSTEM_PERMISSIONS.CREATE, () => openForm(null))}>
                            <Plus className="h-4 w-4" />
                            Add Bank Account
                        </Button>
                    </div>
                </DataTable>

                <BankAccountForm
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    editData={selected}
                    readOnly={readOnly}
                    key={`${selected?.id || 'new'}-${readOnly}`}
                />
            </div>

            <ViewAccessDeniedDialog
                open={denied}
                onClose={() => setDenied(false)}
                options={{ description: 'You do not have access to perform this action on bank accounts.' }}
            />
        </PageLoader>
    );
};

export default BankAccountsModule;
