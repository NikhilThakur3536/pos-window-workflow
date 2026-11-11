import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetSafeTransactions,
    FilterProps,
    SafeTransactionDetails,
    getSafeTransactions,
} from '@/api-queries/safes/transactions';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import ExportSheets from '@/components/export-sheets';
import { useAuthUser } from '@/stores/auth-user.store';

const SafeTransactions = () => {
    const currencySymbol = useAuthUser((state) => state?.user?.currency?.symbol) || 'R';

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

    const query = useGetSafeTransactions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: safeTransactions, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<SafeTransactionDetails>[] = [
        {
            accessorKey: 'referenceNumber',
            header: 'Reference Number',
            cell: ({ row }) => {
                const value = row.getValue('referenceNumber') as string;
                return <div>{value || 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => {
                const amount = row.original.amount;
                return (
                    <div>
                        {currencySymbol} {amount ? amount.toFixed(2) : 'N/A'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'cashFlow',
            header: 'Type',
            cell: ({ row }) => {
                const type = row.original.cashFlow;
                return (
                    <div className={`font-bold ${type === 'CASH-IN' ? 'text-green-700' : 'text-red-700'}`}>
                        {type?.replaceAll('-', ' ')}
                    </div>
                );
            },
        },
        {
            accessorKey: 'safeDetails',
            header: 'Safe Details',
            cell: ({ row }) => {
                const safeDetails = row.original.Safe;
                return (
                    <div className="mx-auto w-max text-center">
                        {safeDetails?.name} ({safeDetails?.code})
                    </div>
                );
            },
        },
        {
            accessorKey: 'transactionDetails',
            header: 'Till/Vendor Details',
            cell: ({ row }) => {
                const type = row.original.cashFlow;
                const tillDetails = row.original.Till;
                const vendorDetails = row.original.CashoutVendor;
                return (
                    <div className="mx-auto w-max text-center">
                        {type === 'CASH-IN'
                            ? `${tillDetails?.name} (${tillDetails?.tillNumber})`
                            : `${vendorDetails?.name} (${vendorDetails?.companyName})`}
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
        getSafeTransactions({
            isCsv: true,
            csvLabel: 'Safe_Transactions',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={safeTransactions?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by safe/till/vendor name..."
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

export default SafeTransactions;
