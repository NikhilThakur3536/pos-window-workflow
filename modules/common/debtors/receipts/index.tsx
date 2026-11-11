import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Mail, Phone, User, MapPin, CreditCard, Eye, FileSymlink } from 'lucide-react';
import DebtorReceiptForm from './debtor-receipt-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetDebtorReceipts,
    FilterProps,
    DebtorReceiptDetails,
    useRemoveDebtorReceipt,
} from '@/api-queries/debtor/receipts';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import { Separator } from '@/components/ui/separator';
import { useAuthUser } from '@/stores/auth-user.store';
import DebtorReceiptDialog from './invoice/invoice-dialog';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import DebtorAllocationForm from '../allocations/debtor-allocation-form';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const DebtorReceipts = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const [selectedItem, setSelectedItem] = useState<DebtorReceiptDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDebtorAllocationOpen, setIsDebtorAllocationOpen] = useState(false);

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

    const query = useGetDebtorReceipts({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });
    const { data: debtorReceipts, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const debtorList = useDebtorList({})?.data?.data?.rows;

    const columns: ColumnDef<DebtorReceiptDetails>[] = [
        {
            accessorKey: 'referenceNumber',
            header: (data) => <TableHeaderToggle {...data}>Receipt Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const receiptDate = row.original.receiptDate;
                return (
                    <>
                        <div>{row.getValue('referenceNumber') || 'N/A'}</div>
                        <div>{receiptDate ? moment(receiptDate).format('Do MMM, YY') : 'N/A'}</div>
                    </>
                );
            },
        },

        {
            accessorKey: 'orderNumber',
            header: (data) => <TableHeaderToggle {...data}>Order No.</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('orderNumber') || 'N/A'}</div>,
        },
        {
            accessorKey: 'SalesRepresentative',
            header: 'Representative',
            cell: ({ row }) => {
                const salesRepresentative = row?.original?.SalesRepresentative;

                return salesRepresentative ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {salesRepresentative?.name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {salesRepresentative?.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {salesRepresentative?.cellNumber || 'N/A'}
                        </div>
                    </div>
                ) : (
                    'N/A'
                );
            },
        },
        {
            accessorKey: 'name',
            header: (data) => <TableHeaderToggle {...data}>Customer Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const name = `${row.original.name}`;
                const address = `${row.original.address}`;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {name || 'N/A'}
                        </div>

                        <div className="flex items-center gap-2">
                            <MapPin className="!h-4 !w-4" /> {address || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'accountNumber',
            header: (data) => <TableHeaderToggle {...data}>Account Number</TableHeaderToggle>,
            cell: ({ row }) => {
                const accountNo = `${row.original.CompanyDebtor.accountNumber}`;
                return (
                    <div className="flex items-center gap-2">
                        <CreditCard className="!h-4 !w-4" />
                        {accountNo}
                    </div>
                );
            },
        },
        {
            accessorKey: 'unallocatedAmount',
            header: (data) => <TableHeaderToggle {...data}>Unallocated Amount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-bold text-red-700">
                    {currencySymbol} {row.original.unallocatedAmount?.toFixed(2) || '0.00'}
                </div>
            ),
        },
        {
            accessorKey: 'totals',
            header: 'Sale Amount',
            cell: ({ row }) => {
                const amount = +row.original.amount;
                const discount = +(row?.original?.discount || 0);
                const manualDiscount = row.original?.manualDiscount || 0;
                const actualCreditOnAccount = +row?.original.actualCreditOnAccount;

                const couponAmount = row.original?.couponAmount;
                const coupon = row?.original?.Coupon?.description;
                const voucherAmount = row.original?.voucherAmount;
                const voucher = row?.original?.Voucher?.description;

                const tenderValue = row?.original?.tenderValue;

                return (
                    <div className="space-y-1">
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Sub Total:</div>
                            <div>
                                {currencySymbol} {amount.toFixed(2)}
                            </div>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Discount:</div>
                            <div>
                                - {currencySymbol} {discount?.toFixed(2)}
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Actual Credit:</div>{' '}
                            <div>
                                {currencySymbol} {actualCreditOnAccount.toFixed(2)}
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Manual Discount:</div>
                            <div>
                                - {currencySymbol} {manualDiscount?.toFixed(2)}
                            </div>
                        </div>

                        {couponAmount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div>{coupon || 'Coupon Discount'}:</div>
                                <div>
                                    - {currencySymbol} {couponAmount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}

                        {voucherAmount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div>{voucher || 'Voucher Discount'}:</div>
                                <div>
                                    - {currencySymbol} {voucherAmount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}

                        <Separator />
                        <div className="flex w-full items-center justify-between text-[13px] font-bold">
                            <div>Total:</div>{' '}
                            <div>
                                {currencySymbol} {tenderValue.toFixed(2)}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onViewInvoice(row.original)}
                        className="h-8 w-8 p-0"
                        title="View Receipt"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>

                    {row.original.unallocatedAmount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                if (
                                    hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code, [
                                        SYSTEM_PERMISSIONS.CREATE,
                                    ])
                                ) {
                                    e.preventDefault();
                                    setSelectedItem(row.original);
                                    setIsDebtorAllocationOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                    return;
                                }
                            }}
                            title="Allocate Receipt"
                            className="h-8 w-8 p-0 text-green-700 hover:bg-green-50 hover:text-green-500"
                        >
                            <FileSymlink className="h-4 w-4" />
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.RECEIPTS.code, [
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
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
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

    const { mutate: removeDebtorReceipt } = useRemoveDebtorReceipt();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeDebtorReceipt(selectedItem?.id, {
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

    // View Receipt

    const [printData, setPrintData] = useState<DebtorReceiptDetails | null>(null);

    const onViewInvoice = (data: DebtorReceiptDetails) => {
        setPrintData(data);
    };

    const onCloseReceipt = () => {
        setPrintData(null);
    };

    return (
        <PageLoader isLoading={isLoading}>
            {open ? (
                <DebtorReceiptForm onClose={onClose} />
            ) : (
                <div className="space-y-2 p-4">
                    <DataTable
                        query={query}
                        data={debtorReceipts?.data?.rows || []}
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
                                        hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.RECEIPTS.code, [
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
                                Add Debtor Receipt
                            </Button>
                        </div>
                    </DataTable>{' '}
                </div>
            )}

            <DeleteConfirmation
                open={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={`Are you sure you want to delete receipt ${selectedItem?.referenceNumber}`}
                onConfirm={handleDelete}
            />

            {isDebtorAllocationOpen && selectedItem && (
                <DebtorAllocationForm
                    open={isDebtorAllocationOpen}
                    onClose={() => setIsDebtorAllocationOpen(false)}
                    preDefinedValues={{
                        type: 'DEBTOR_RECEIPT',
                        debtorReceipt: selectedItem,
                    }}
                    key={selectedItem?.id}
                />
            )}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{
                    description: `You don't have access to ${isDebtorAllocationOpen ? 'allocate debtor receipt' : 'add/update the debtor receipts'}.`,
                }}
            />

            {printData && <DebtorReceiptDialog printData={printData} onClose={onCloseReceipt} />}
        </PageLoader>
    );
};

export default DebtorReceipts;
