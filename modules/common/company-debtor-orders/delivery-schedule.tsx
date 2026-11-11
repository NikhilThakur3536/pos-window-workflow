'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetCompanyDebtorOrderList, type CompanyDebtorOrder } from '@/api-queries/company-debtor-orders';
import { useDebtorList } from '@/api-queries/debtor';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Eye } from 'lucide-react';
import OrderItemsEditor from './components/order-items-editor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuthUser } from '@/stores/auth-user.store';

const DeliverySchedule = () => {
    const currentUser = useAuthUser((state) => state.user);
    const myDebtorId = currentUser?.companyDebtorId || '';
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';

    const [viewTarget, setViewTarget] = useState<CompanyDebtorOrder | null>(null);

    const initialFilters: { store: string } = { store: myDebtorId };
    const { filters, appliedFilters, handleFilters, pagination, setPagination } = useTableFilters(initialFilters);

    // Scheduled/allocated orders
    const query = useGetCompanyDebtorOrderList({
        ...(appliedFilters.store ? { companyDebtorId: appliedFilters.store } : {}),
        lifecycleStatus: 'SCHEDULED',
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyDebtorOrder[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = (debtorsRes?.data?.rows as any[]) || [];

    const columns: ColumnDef<CompanyDebtorOrder>[] = [
        {
            accessorKey: 'clientDocumentId',
            header: 'Reference',
            cell: ({ row }) => <div className="font-semibold">{row.original.clientDocumentId || '—'}</div>,
        },
        {
            accessorKey: 'companyDebtorName',
            header: 'Store',
            cell: ({ row }) => row.original.companyDebtorName || '—',
        },
        {
            accessorKey: 'lifecycleStatus',
            header: 'Status',
            cell: ({ row }) => <Badge variant="outline">{row.original.lifecycleStatus}</Badge>,
        },
        {
            accessorKey: 'scheduledDeliveryDate',
            header: 'Scheduled Delivery',
            cell: ({ row }) =>
                row.original.scheduledDeliveryDate ? new Date(row.original.scheduledDeliveryDate).toLocaleDateString() : '—',
        },
        {
            accessorKey: 'requestedDeliveryDate',
            header: 'Requested',
            cell: ({ row }) =>
                row.original.requestedDeliveryDate ? new Date(row.original.requestedDeliveryDate).toLocaleDateString() : '—',
        },
        {
            accessorKey: 'responsibleByName',
            header: 'Responsible User',
            cell: ({ row }) => row.original.responsibleByName || '—',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View schedule" onClick={() => setViewTarget(row.original)}>
                        <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable query={query} data={rows} columns={columns} pagination={pagination} setPagination={setPagination} totalRowCount={totalRowCount}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <CalendarClock className="h-4 w-4 text-indigo-600" />
                                Scheduled Orders
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Store</Label>
                                <div className="mt-1">
                                    {isStoreUser && myDebtorId ? (
                                        <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                                            {stores.find((s) => s.id === myDebtorId)?.name ||
                                                stores.find((s) => s.id === myDebtorId)?.tradingAs ||
                                                'My store'}
                                        </div>
                                    ) : (
                                        <SelectPopover
                                            title="Store"
                                            onlyTitle={myDebtorId ? 'My store' : 'All stores'}
                                            selectedValue={filters.store || ''}
                                            options={[{ label: 'All stores', value: '' }, ...stores.map((s) => ({ label: s.name || s.tradingAs || s.id, value: s.id }))]}
                                            onSelect={(value) => handleFilters({ ...filters, store: String(value || '') })}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">Showing {totalRowCount} scheduled orders</div>
                    </div>
                </DataTable>

                {viewTarget && (
                    <Dialog open onOpenChange={() => setViewTarget(null)}>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Delivery Schedule — {viewTarget.clientDocumentId || '—'}</DialogTitle>
                                <DialogDescription>
                                    <Badge variant="outline">{viewTarget.lifecycleStatus}</Badge>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                                    <div>
                                        <div className="text-muted-foreground">Store</div>
                                        <div className="font-medium">{viewTarget.companyDebtorName || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Scheduled</div>
                                        <div className="font-medium">
                                            {viewTarget.scheduledDeliveryDate ? new Date(viewTarget.scheduledDeliveryDate).toLocaleDateString() : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Requested</div>
                                        <div className="font-medium">
                                            {viewTarget.requestedDeliveryDate ? new Date(viewTarget.requestedDeliveryDate).toLocaleDateString() : '—'}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium">Items</div>
                                    <OrderItemsEditor items={viewTarget.items || []} onChange={() => {}} readonly />
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </PageLoader>
    );
};

export default DeliverySchedule;
