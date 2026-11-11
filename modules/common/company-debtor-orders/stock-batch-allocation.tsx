'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetCompanyDebtorOrderList, type CompanyDebtorOrder, type OrderLifecycleStatus } from '@/api-queries/company-debtor-orders';
import { useDebtorList } from '@/api-queries/debtor';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Badge } from '@/components/ui/badge';
import { PackageCheck, Eye } from 'lucide-react';
import { LifecycleActionDialog, OrderViewDialog } from './orders';
import { useAuthUser } from '@/stores/auth-user.store';

const ELIGIBLE_STATUSES: OrderLifecycleStatus[] = ['SCHEDULED', 'PART_ALLOCATED'];

const StockBatchAllocation = () => {
    const currentUser = useAuthUser((state) => state.user);
    const myDebtorId = currentUser?.companyDebtorId || '';
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';

    const [actionTarget, setActionTarget] = useState<CompanyDebtorOrder | null>(null);
    const [viewTarget, setViewTarget] = useState<CompanyDebtorOrder | null>(null);

    const initialFilters = { store: myDebtorId, status: '' };
    const { filters, appliedFilters, handleFilters, pagination, setPagination } = useTableFilters(initialFilters);

    const query = useGetCompanyDebtorOrderList({
        ...(appliedFilters.store ? { companyDebtorId: appliedFilters.store } : {}),
        ...(appliedFilters.status ? { lifecycleStatus: appliedFilters.status as OrderLifecycleStatus } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyDebtorOrder[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = (debtorsRes?.data?.rows as any[]) || [];

    const storeName = useMemo(() => {
        const map: Record<string, string> = {};
        stores.forEach((s: any) => {
            if (s?.id) map[s.id] = s.name || s.tradingAs || s.id;
        });
        return (id?: string) => (id ? map[id] || '—' : '—');
    }, [stores]);

    const columns: ColumnDef<CompanyDebtorOrder>[] = [
        {
            accessorKey: 'clientDocumentId',
            header: 'Reference',
            cell: ({ row }) => (
                <div>
                    <div className="line-clamp-2 max-w-[110px] break-words font-semibold">
                        {row.original.clientDocumentId || '—'}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">v{row.original.lifecycleVersion ?? 0}</div>
                </div>
            ),
        },
        {
            accessorKey: 'companyDebtorName',
            header: 'Debtor / Store',
            cell: ({ row }) => row.original.companyDebtorName || storeName(row.original.companyDebtorId),
        },
        {
            accessorKey: 'orderSource',
            header: 'Source',
            cell: ({ row }) => row.original.orderSource || '—',
        },
        {
            accessorKey: 'lifecycleStatus',
            header: 'Status',
            cell: ({ row }) => <Badge variant="outline">{row.original.lifecycleStatus}</Badge>,
        },
        {
            accessorKey: 'scheduledDeliveryDate',
            header: 'Scheduled',
            cell: ({ row }) =>
                row.original.scheduledDeliveryDate ? new Date(row.original.scheduledDeliveryDate).toLocaleDateString() : '—',
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Total Qty',
            cell: ({ row }) => row.original.totalQuantity ?? '—',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-0.5">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View" onClick={() => setViewTarget(row.original)}>
                        <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                    {!isStoreUser && ELIGIBLE_STATUSES.includes(row.original.lifecycleStatus) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Allocate stock batches"
                            onClick={() => setActionTarget(row.original)}
                        >
                            <PackageCheck className="h-4 w-4 text-violet-600" />
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="min-w-[180px]">
                                    <Label className="text-xs">Status</Label>
                                    <div className="mt-1">
                                        <SelectPopover
                                            title="Status"
                                            onlyTitle="All Statuses"
                                            selectedValue={filters.status || ''}
                                            options={[
                                                { label: 'All Statuses', value: '' },
                                                ...ELIGIBLE_STATUSES.map((s) => ({ label: s, value: s })),
                                            ]}
                                            onSelect={(value) => handleFilters({ ...filters, status: String(value || '') })}
                                        />
                                    </div>
                                </div>
                                <div className="min-w-[200px]">
                                    <Label className="text-xs">Debtor / Store</Label>
                                    <div className="mt-1">
                                        {isStoreUser && myDebtorId ? (
                                            <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                                                {storeName(myDebtorId)}
                                            </div>
                                        ) : (
                                            <SelectPopover
                                                title="Debtor / Store"
                                                onlyTitle={myDebtorId ? 'My store' : 'All stores'}
                                                selectedValue={filters.store || ''}
                                                options={[
                                                    { label: 'All stores', value: '' },
                                                    ...stores.map((s) => ({ label: s.name || s.tradingAs || s.id, value: s.id })),
                                                ]}
                                                onSelect={(value) => handleFilters({ ...filters, store: String(value || '') })}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">Showing {totalRowCount} orders</div>
                        </div>
                    </div>
                </DataTable>

                {actionTarget ? (
                    <LifecycleActionDialog record={actionTarget} kind="allocate" onClose={() => setActionTarget(null)} />
                ) : null}

                {viewTarget ? (
                    <OrderViewDialog record={viewTarget} storeName={storeName} onClose={() => setViewTarget(null)} />
                ) : null}
            </div>
        </PageLoader>
    );
};

export default StockBatchAllocation;
