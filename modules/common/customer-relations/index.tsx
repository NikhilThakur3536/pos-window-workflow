import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetCustomerRelations,
    FilterProps,
    CustomerRelationDetails,
    getCustomerRelations,
    CustomerRelationsType,
} from '@/api-queries/debtor/customer-relations';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import ExportSheets from '@/components/export-sheets';
import SelectPopover from '@/components/select-popover';
import { useDebtorList } from '@/api-queries/debtor';
import { useAuthUser } from '@/stores/auth-user.store';
import { useCreditorList } from '@/api-queries/creditor';
import { Input } from '@/components/ui/input';

const CustomerRelations = ({ type = 'debtor' }: { type?: CustomerRelationsType }) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        companyDebtorId: '',
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
    } = useTableFilters<FilterProps>({ type, ...initialFilters });

    const query = useGetCustomerRelations({
        type,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: customerRelations, isLoading } = query;

    const totalRowCount = query?.data?.data?.count || 0;

    const users = type === 'creditor' ? useCreditorList({})?.data?.data?.rows : useDebtorList({})?.data?.data?.rows;

    const columns: ColumnDef<CustomerRelationDetails>[] = [
        {
            accessorKey: type,
            header: `${type?.[0]?.toUpperCase()}${type?.slice(1)} Details`,
            cell: ({ row }) => {
                const customer = row.original?.[type === 'debtor' ? 'debtorDetails' : 'creditorDetails'];
                return (
                    <div>
                        <div>
                            <span className="font-bold">Name :</span> {customer?.name || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Account No. :</span> {customer?.accountNumber || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Total Price Quotations :</span>{' '}
                            {row.original.totalNumberOfTimesPriceQuoted}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'firstTransactionDate',
            header: 'First Transaction',
            cell: ({ row }) => {
                const firstTransactionDate = row.original.firstTransactionDate;
                const yearsSinceFirstTransaction = row.original.yearsSinceFirstTransaction;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Date :</span>{' '}
                            {firstTransactionDate ? moment(firstTransactionDate).format('DD MMM, YY') : 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Years since :</span>{' '}
                            {yearsSinceFirstTransaction ? `${yearsSinceFirstTransaction}` : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'pendingAmount',
            header: 'Amounts & Balances',
            cell: ({ row }) => {
                const total = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Pending Amount :</span> {currencySymbol} {total.pendingAmount}
                        </div>
                        <div>
                            <span className="font-bold">Balance Left :</span> {currencySymbol} {total.totalBalance}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'orderDetails',
            header: 'Order Details',
            cell: ({ row }) => {
                const total = row.original.totalSalesOrders;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Amount :</span> {currencySymbol} {total.amount}
                        </div>
                        <div>
                            <span className="font-bold">Products :</span> {total.totalProducts}
                        </div>
                        <div>
                            <span className="font-bold">Total Orders :</span> {total.number}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'invoiceDetails',
            header: 'Invoice Details',
            cell: ({ row }) => {
                const total = row.original.totalInvoices;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Amount :</span> {currencySymbol} {total.amount}
                        </div>
                        <div>
                            <span className="font-bold">Products :</span> {total.totalProducts}
                        </div>
                        <div>
                            <span className="font-bold">Total Invoices :</span> {total.number}
                        </div>
                    </div>
                );
            },
        },
    ];

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
        getCustomerRelations({
            isCsv: true,
            csvLabel: 'Customer_Relations',
            type,
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="m-6 space-y-2">
                <DataTable
                    query={query}
                    data={customerRelations?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by name or account number..."
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

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />
                        </div>
                    </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default CustomerRelations;
