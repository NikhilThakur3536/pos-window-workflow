import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Mail, User, ArrowLeftRight } from 'lucide-react';
import DebtorAllocationForm from './debtor-allocation-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetDebtorAllocations,
    DebtorAllocationDetails,
    useRemoveDebtorAllocation,
    FilterProps,
} from '@/api-queries/debtor/allocations';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const DebtorReceiptAllocations = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const [selectedItem, setSelectedItem] = useState<DebtorAllocationDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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

    const query = useGetDebtorAllocations({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });
    const { data: debtorAllocations, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const debtorList = useDebtorList({})?.data?.data?.rows;

    const columns: ColumnDef<DebtorAllocationDetails>[] = [
        {
            accessorKey: 'DebtorInvoicingOrder.invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const invoice = row.original.DebtorInvoicingOrder;
                const creditNote = row.original.CreditNote;
                const invoiceDate = invoice?.invoiceDate || creditNote?.creditNoteDate;
                const invoiceNumber = invoice?.invoiceNumber || creditNote?.creditNoteNumber;
                return (
                    <>
                        <div>{invoiceNumber || 'N/A'}</div>
                        <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>
                    </>
                );
            },
        },
        {
            accessorKey: 'referenceNumber',
            header: 'Receipt Details',
            cell: ({ row }) => {
                const creditNote = row.original.CreditNote;
                const debtorReceipt = row.original.DebtorReceipt;
                const isDebtorReceipt = !!debtorReceipt;
                const date = isDebtorReceipt ? debtorReceipt?.receiptDate : creditNote?.creditNoteDate;
                const number = isDebtorReceipt ? debtorReceipt?.referenceNumber : creditNote?.creditNoteNumber;
                return (
                    <>
                        <div>{number || 'N/A'}</div>
                        <div>{date ? moment(date).format('Do MMM, YY') : 'N/A'}</div>
                    </>
                );
            },
        },
        {
            accessorKey: 'amounts',
            header: 'Amounts',
            cell: ({ row }) => {
                const allocatedAmount = row.original.allocatedAmount;
                const invoice = row.original.DebtorInvoicingOrder;
                const creditNote = row.original.CreditNote;
                const documentAmount = invoice?.goodsTotal ?? creditNote?.goodsTotal ?? 0;

                return (
                    <div className="max-w-48">
                        <div className="flex w-full justify-between">
                            Allocated Amount :{' '}
                            <div className="font-semibold">
                                {currencySymbol} {Number(allocatedAmount || 0).toFixed(2)}
                            </div>
                        </div>
                        <div className="flex w-full justify-between">
                            {invoice ? 'Invoice' : 'Credit Note'} Amount :{' '}
                            <div className="font-semibold">
                                {currencySymbol} {Number(documentAmount || 0).toFixed(2)}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'AllocatedByUser.name',
            header: (data) => <TableHeaderToggle {...data}>Allocated By</TableHeaderToggle>,
            cell: ({ row }) => {
                const user = row.original.AllocatedByUser;
                const name = user ? `${user.firstName ?? ''} ${user.surname ?? ''}`.trim() : 'N/A';
                const email = user?.email || 'N/A';
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {name || 'N/A'}
                        </div>

                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {email}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const isReversal = row.original.allocationType === 'REVERSAL';
                const isActive = String(row.original.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                const label = isReversal
                    ? 'REVERSAL'
                    : isActive
                      ? 'ACTIVE'
                      : String(row.original.status || '').toUpperCase();
                return (
                    <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            isReversal || !isActive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}
                    >
                        {label || 'N/A'}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const isReversal = row.original.allocationType === 'REVERSAL';
                const isActive = String(row.original.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                // Reversal rows are audit history only - they carry no reverse action.
                if (isReversal || !isActive)
                    return <div className="text-center text-muted-foreground text-xs">-</div>;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                if (
                                    hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code, [
                                        SYSTEM_PERMISSIONS.DELETE,
                                    ])
                                ) {
                                    e.preventDefault();
                                    setSelectedItem(row.original);
                                    setIsDeleteOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                    return;
                                }
                            }}
                            title="Reverse Payment"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <ArrowLeftRight className="h-4 w-4" /> Reverse Payment
                        </Button>
                    </div>
                );
            },
        },
    ];

    const [open, setOpen] = useState(false);

    const onAddData = () => {
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
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

    const { mutate: removeDebtorAllocation } = useRemoveDebtorAllocation();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeDebtorAllocation(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Debtor Receipt deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={debtorAllocations?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by debtor receipt number..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            {debtorList && (
                                <SelectPopover
                                    title="Debtor"
                                    options={debtorList?.map((debtor) => ({
                                        value: debtor?.id,
                                        label: `${debtor?.name} ( ${debtor?.accountNumber} )`,
                                    }))}
                                    selectedValue={filters.companyDebtorId}
                                    onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                                />
                            )}
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            onClick={() => {
                                if (
                                    hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code, [
                                        SYSTEM_PERMISSIONS.CREATE,
                                    ])
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
                            Allocate Receipt | C/Note
                        </Button>
                    </div>
                </DataTable>{' '}
            </div>

            <DeleteConfirmation
                open={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={`Are you sure you want to reverse the debtor allocation`}
                onConfirm={handleDelete}
            />

            {open && <DebtorAllocationForm open={open} onClose={onClose} />}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the debtor allocations." }}
            />
        </PageLoader>
    );
};

export default DebtorReceiptAllocations;
