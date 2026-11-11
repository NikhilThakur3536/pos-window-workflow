import { useEffect, useState } from 'react';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetDebtorStatementTransactions } from '@/api-queries/debtor/statements';
import { statementTransactionColumns } from './transactions-columns';
import { buildStatementPayload, StatementFilters } from './shared';

interface TransactionsTabProps {
    filters: StatementFilters;
}

const TransactionsTab = ({ filters }: TransactionsTabProps) => {
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

    useEffect(() => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, [filters.companyDebtorId, filters.fromDate, filters.toDate, filters.includeCashSales]);

    const query = useGetDebtorStatementTransactions({
        ...buildStatementPayload(filters),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const totalRowCount = query?.data?.data?.count || 0;

    return (
        <PageLoader isLoading={query.isLoading || query.isFetching}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={query?.data?.data?.rows || []}
                    columns={statementTransactionColumns()}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-muted-foreground text-sm">Ledger / Transaction list</h3>
                        <span className="text-muted-foreground text-xs">Showing {totalRowCount} records</span>
                    </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default TransactionsTab;