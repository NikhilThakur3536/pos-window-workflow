'use client';

import { useMemo, useState } from 'react';
import { Loader2, Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useDebtorList } from '@/api-queries/debtor';
import {
    useGetCompanyDebtorOrderList,
    type CompanyDebtorOrder,
} from '@/api-queries/company-debtor-orders';
import CreateAccountSaleDialog from './create-account-sale-dialog';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    PICKED: { label: 'Picked', className: 'border-amber-300 bg-amber-50 text-amber-700' },
    PART_PICKED: { label: 'Part Picked', className: 'border-amber-200 bg-amber-50/60 text-amber-700' },
};

// Picked Orders is the queue of Store Orders whose goods have been picked and are now
// waiting to be billed to the store via Account Sale.
const PickedOrders = () => {
    const [saleTarget, setSaleTarget] = useState<CompanyDebtorOrder | null>(null);
    const [storeFilter, setStoreFilter] = useState('');

    const { pagination, setPagination } = useTableFilters({});

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = debtorsRes?.data?.rows || [];

    const storeNameById = useMemo(() => {
        const map: Record<string, string> = {};
        stores.forEach((s) => {
            if (s.id) map[s.id] = s.name || s.tradingAs || s.id;
        });
        return map;
    }, [stores]);

    const storeName = (debtorId?: string) => (debtorId ? storeNameById[debtorId] || '—' : '—');

    const query = useGetCompanyDebtorOrderList({
        lifecycleStatus: 'PICKED',
        ...(storeFilter ? { companyDebtorId: storeFilter } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyDebtorOrder[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<CompanyDebtorOrder>[] = [
        {
            accessorKey: 'clientDocumentId',
            header: 'Reference',
            cell: ({ row }) => (
                <div>
                    <div className="line-clamp-2 max-w-[130px] break-words font-semibold">
                        {row.original.clientDocumentId || '—'}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                        v{row.original.lifecycleVersion ?? 0}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'companyDebtorName',
            header: 'Debtor / Store',
            cell: ({ row }) => row.original.companyDebtorName || storeName(row.original.companyDebtorId),
        },
        {
            accessorKey: 'lifecycleStatus',
            header: 'Status',
            cell: ({ row }) => {
                const s = STATUS_BADGE[row.original.lifecycleStatus] || {
                    label: row.original.lifecycleStatus,
                    className: '',
                };
                return (
                    <Badge variant="outline" className={s.className}>
                        {s.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'scheduledDeliveryDate',
            header: 'Scheduled',
            cell: ({ row }) =>
                row.original.scheduledDeliveryDate
                    ? new Date(row.original.scheduledDeliveryDate).toLocaleDateString()
                    : '—',
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Qty',
            cell: ({ row }) => (
                <div className="text-right font-mono tabular-nums">{row.original.totalQuantity ?? '—'}</div>
            ),
        },
        {
            accessorKey: 'totalAmount',
            header: 'Total',
            cell: ({ row }) => (
                <div className="text-right font-mono tabular-nums">
                    {row.original.totalAmount != null ? Number(row.original.totalAmount).toFixed(2) : '—'}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Create Account Sale"
                        onClick={() => setSaleTarget(row.original)}
                    >
                        <Receipt className="h-4 w-4 text-blue-600" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <Card>
            <CardContent className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">Picked Orders</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            className="h-9 rounded-md border bg-background px-2 text-sm"
                            value={storeFilter}
                            onChange={(e) => {
                                setStoreFilter(e.target.value);
                                setPagination({ pageIndex: 0, pageSize: pagination.pageSize });
                            }}
                        >
                            <option value="">All stores</option>
                            {stores.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name || s.tradingAs || s.id}
                                </option>
                            ))}
                        </select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => query.refetch()}
                            disabled={query.isFetching}
                        >
                            {query.isFetching ? (
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-1 h-4 w-4" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>

                <PageLoader isLoading={query.isLoading}>
                    <DataTable
                        query={query}
                        data={rows}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div />
                    </DataTable>
                </PageLoader>

                <div className="mt-2 text-xs text-muted-foreground">
                    Showing {rows.length} of {totalRowCount} picked orders
                </div>
            </CardContent>

            {saleTarget && (
                <CreateAccountSaleDialog
                    open
                    onClose={() => setSaleTarget(null)}
                    record={saleTarget}
                    storeName={storeName}
                />
            )}
        </Card>
    );
};

export default PickedOrders;
