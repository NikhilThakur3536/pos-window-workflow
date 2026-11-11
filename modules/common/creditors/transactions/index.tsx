import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetCreditorTransactions,
    FilterProps,
    CreditorTransactionDetails,
    getCreditorTransactions,
} from '@/api-queries/creditor/transactions';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import ExportSheets from '@/components/export-sheets';
import SelectPopover from '@/components/select-popover';
import { useCreditorList } from '@/api-queries/creditor';
import { useAuthUser } from '@/stores/auth-user.store';

const CreditorTransactions = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        companyCreditorId: '',
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

    const query = useGetCreditorTransactions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters?.companyCreditorId } : {}),
    });
    const { data: creditorTransactions, isLoading } = query;

    const totalRowCount = query?.data?.data?.count || 0;

    const creditors = useCreditorList({})?.data?.data?.rows;

    const columns: ColumnDef<CreditorTransactionDetails>[] = [
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
            accessorKey: 'creditor',
            header: 'Creditor Details',
            cell: ({ row }) => {
                const creditor = row?.original?.creditorDetails;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Name :</span> {creditor?.name || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Account No. :</span> {creditor?.accountNumber || 'N/A'}
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
        getCreditorTransactions({
            isCsv: true,
            csvLabel: 'Creditor_Transactions',
            ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters?.companyCreditorId } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="m-6 space-y-2">
                <DataTable
                    query={query}
                    data={creditorTransactions?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            {creditors && (
                                <SelectPopover
                                    options={creditors?.map((creditor) => ({
                                        value: creditor?.id,
                                        label: `${creditor?.name} (${creditor?.accountNumber})`,
                                    }))}
                                    selectedValue={filters.companyCreditorId}
                                    onSelect={(value) => setFilters({ ...filters, companyCreditorId: value })}
                                    title="Creditor"
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

export default CreditorTransactions;
