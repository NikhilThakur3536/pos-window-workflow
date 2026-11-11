import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckIcon, Eye, X,User, Mail, Phone } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import CashSaleInvoiceDialog from '../invoice/invoice-dialog';
import {
    useGetSuspendedSales,
    FilterProps,
    SuspendedSaleInvoiceType,
    SuspendedSalesDetails,
    getSuspendedSales,
} from '@/api-queries/point-of-sale/suspended-sales';
import ExportSheets from '@/components/export-sheets';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import { useAuthUser } from '@/stores/auth-user.store';

const ViewSuspendedSales = () => {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    const initialFilters = {
        search: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    const query = useGetSuspendedSales({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });

    const { data: cashSales, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<SuspendedSalesDetails>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice No.</TableHeaderToggle>,
            cell: ({ row }) => {
                const id = row.original.id;
                return <div>#VOID_{id?.slice(0, 8)?.toUpperCase() || 'N/A'}</div>;
            },
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
            accessorKey: 'isPlaced',
            header: 'Is Placed?',
            cell: ({ row }) => {
                const isPlaced = row.original.isPlaced;
                return (
                    <div>{isPlaced ? <CheckIcon className="text-green-700" /> : <X className="text-red-700" />}</div>
                );
            },
        },
        {
            accessorKey: 'invoiceDate',
            header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
            cell: ({ row }) => {
                const invoiceDate = row.original.createdAt;
                return <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Total Products',
            cell: ({ row }) => {
                const totalQuantity =
                    row.original.companySuspendedSaleItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
                return <div>{totalQuantity}</div>;
            },
        },
        {
            id: 'view',
            header: () => <div className="text-center">View</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onViewInvoice(row.original)}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [printData, setPrintData] = useState<SuspendedSaleInvoiceType | null>(null);

    const onViewInvoice = (data: SuspendedSalesDetails) => {
        setPrintData({
            suspendedSales: data,
            cartItems: data.companySuspendedSaleItems,
            debtor: data?.PosDebtor,
            invoiceDate: data?.createdAt,
        });
    };

    const onClose = () => {
        setPrintData(null);
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

    // Export

    async function downloadCSV() {
        getSuspendedSales({
            isCsv: true,
            csvLabel: 'Suspended_Sales',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    // Store Filters

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="item-center mb-2 flex w-full justify-between space-y-2">
                    <div className="text-lg font-bold">
                        Suspended Sales{' '}
                        {selectedDebtor ? `for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})` : ''}
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by order or invoice number"
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-[320px]"
                        />

                        {isCompanyDebtor ? null : (
                            <SelectPopover
                                title="debtor (store)"
                                selectedValue={filters.companyDebtorId}
                                options={
                                    debtors
                                        ? debtors?.map((debtor) => ({
                                              value: debtor?.id,
                                              label: `${debtor?.name} (${debtor?.accountNumber})`,
                                          }))
                                        : []
                                }
                                onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                            />
                        )}

                        <FilterActionButtons
                            onApplyFilters={handleApplyFilters}
                            onClearClick={handleClearSearch}
                            showClearButton={showClearButton}
                        />

                        <ExportSheets downloadCSV={downloadCSV} />
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={cashSales?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />

                {printData && <CashSaleInvoiceDialog printData={printData} onClose={onClose} type="SUSPENDED" />}
            </div>
        </PageLoader>
    );
};

export default ViewSuspendedSales;
