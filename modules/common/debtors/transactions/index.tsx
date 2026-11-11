import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetDebtorTransactions,
    FilterProps,
    DebtorTransactionDetails,
    getDebtorTransactions,
} from '@/api-queries/debtor/transactions';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import ExportSheets from '@/components/export-sheets';
import SelectPopover from '@/components/select-popover';
import { useDebtorList } from '@/api-queries/debtor';
import { useAuthUser } from '@/stores/auth-user.store';

const DebtorTransactions = () => {
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetDebtorTransactions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });
    const { data: debtorTransactions, isLoading } = query;

    const totalRowCount = query?.data?.data?.count || 0;

    const debtors = useDebtorList({})?.data?.data?.rows;

    const columns: ColumnDef<DebtorTransactionDetails>[] = [
        {
            accessorKey: 'documentNumber',
            header: 'Document Details',
            cell: ({ row }) => {
                const document = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-bold">No. :</span> {document.documentNumber || 'N/A'}
                        </div>
                        <div className="capitalize">
                            <span className="font-bold">Type :</span>{' '}
                            {document.type?.replaceAll('_', ' ')?.toLowerCase()}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'debtor',
            header: 'Debtor Details',
            cell: ({ row }) => {
                const debtor = row?.original?.debtorDetails;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Name :</span> {debtor?.name || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Account No. :</span> {debtor?.accountNumber || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'productDetails',
            header: 'Order Details',
            cell: ({ row }) => {
                const rowData = row.original;
                const orderDate = rowData.date;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Amount :</span> {currencySymbol} {rowData.amount}
                        </div>
                        <div>
                            <span className="font-bold">Quantity :</span> {rowData.quantity}
                        </div>
                        <div>
                            <span className="font-bold">Date :</span>{' '}
                            {orderDate ? moment(orderDate).format('DD MMM, YY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
    ];

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Export

    async function downloadCSV() {
        getDebtorTransactions({
            isCsv: true,
            csvLabel: 'Debtor_Transactions',
            ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="m-6 space-y-2">
                <DataTable
                    query={query}
                    data={debtorTransactions?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            {debtors && (
                                <SelectPopover
                                    options={debtors?.map((debtor) => ({
                                        value: debtor?.id,
                                        label: `${debtor?.name} (${debtor?.accountNumber})`,
                                    }))}
                                    selectedValue={filters.companyDebtorId}
                                    onSelect={(value) => setFilters({ ...filters, companyDebtorId: value })}
                                    title="Debtor"
                                />
                            )}

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

export default DebtorTransactions;
