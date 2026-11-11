'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { useGetPurchaseRequestList, type PurchaseRequestDetails } from '@/api-queries/purchase-requests';
import type { ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { Scale } from 'lucide-react';
import { CompareQuotesDialog } from './supplier-quotations-tab';

const QuoteComparisonTab = () => {
    const { pagination, setPagination } = useTableFilters({});

    const query = useGetPurchaseRequestList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const [compareTarget, setCompareTarget] = useState<PurchaseRequestDetails | null>(null);

    const rows = query?.data?.data || [];
    const totalRowCount = query?.data?.total || 0;

    const columns: ColumnDef<PurchaseRequestDetails>[] = [
        {
            accessorKey: 'ref',
            header: 'Reference',
            cell: ({ row }) => (
                <>
                    <div>
                        {row.original.prNumber ||
                            row.original.clientDocumentId ||
                            row.original.documentNumber ||
                            row.original.id?.slice(0, 8) ||
                            'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.createdAt ? moment(row.original.createdAt).format('Do MMM, YY') : 'N/A'}
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => row.original.status || 'N/A',
        },
        {
            accessorKey: 'requiredByDate',
            header: 'Required By',
            cell: ({ row }) =>
                row.original.requiredByDate ? moment(row.original.requiredByDate).format('DD MMM, YY') : 'N/A',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCompareTarget(row.original)}>
                        <Scale className="mr-1 h-3.5 w-3.5" />
                        Compare
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-3">
            <DataTable
                query={query}
                data={rows}
                columns={columns}
                pagination={pagination}
                setPagination={setPagination}
                totalRowCount={totalRowCount}
            >
                <div className="text-xs text-muted-foreground">
                    Select a purchase request to compare received supplier quotations.
                </div>
            </DataTable>

            {compareTarget ? (
                <CompareQuotesDialog
                    open={!!compareTarget}
                    purchaseRequestId={compareTarget.id || ''}
                    onClose={() => setCompareTarget(null)}
                />
            ) : null}
        </div>
    );
};

export default QuoteComparisonTab;