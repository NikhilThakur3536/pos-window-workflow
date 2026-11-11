'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Truck, PackageCheck, Eye } from 'lucide-react';
import OrderItemsEditor from './components/order-items-editor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuthUser } from '@/stores/auth-user.store';
import { LifecycleActionDialog } from './orders';

type ViewKind = 'dispatch' | 'receipt';

const DispatchReceipt = () => {
    const currentUser = useAuthUser((state) => state.user);
    const myDebtorId = currentUser?.companyDebtorId || '';
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';

    const [viewKind, setViewKind] = useState<ViewKind>('dispatch');
    const [viewTarget, setViewTarget] = useState<CompanyDebtorOrder | null>(null);
    const [actionTarget, setActionTarget] = useState<CompanyDebtorOrder | null>(null);
    const [actionKind, setActionKind] = useState<string>('');

    useEffect(() => {
        if (isStoreUser) setViewKind('receipt');
    }, [isStoreUser]);

    const initialFilters: { store: string } = { store: myDebtorId };
    const { filters, appliedFilters, handleFilters, pagination, setPagination } = useTableFilters(initialFilters);

    const status = viewKind === 'dispatch' ? 'PICKED' : 'DISPATCHED';

    const query = useGetCompanyDebtorOrderList({
        ...(appliedFilters.store ? { companyDebtorId: appliedFilters.store } : {}),
        lifecycleStatus: status,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyDebtorOrder[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = (debtorsRes?.data?.rows as any[]) || [];

    const debtorNameById = useMemo(() => {
        const map: Record<string, string> = {};
        stores.forEach((s: any) => {
            if (s?.id) map[s.id] = s.name || s.tradingAs || s.id;
        });
        return map;
    }, [stores]);

    const storeName = (debtorId?: string) => {
        if (!debtorId) return '—';
        return debtorNameById[debtorId] || '—';
    };

    const columns: ColumnDef<CompanyDebtorOrder>[] = [
        {
            accessorKey: 'clientDocumentId',
            header: 'Reference',
            cell: ({ row }) => (
                <div className="line-clamp-2 max-w-[110px] break-words font-semibold">
                    {row.original.clientDocumentId || '—'}
                </div>
            ),
        },
        {
            accessorKey: 'companyDebtorName',
            header: 'Store',
            cell: ({ row }) => row.original.companyDebtorName || storeName(row.original.companyDebtorId),
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
            accessorKey: 'totalAmount',
            header: 'Total',
            cell: ({ row }) => (
                <div className="font-mono tabular-nums">
                    {row.original.totalAmount != null ? Number(row.original.totalAmount).toFixed(2) : '—'}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const canDispatch = viewKind === 'dispatch' && !isStoreUser;
                const canReceive = viewKind === 'receipt' && isStoreUser;
                return (
                    <div className="flex items-center justify-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View" onClick={() => setViewTarget(row.original)}>
                            <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                        {canDispatch && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setActionTarget(row.original);
                                    setActionKind('dispatch');
                                }}
                            >
                                <Truck className="mr-1 h-4 w-4" /> Dispatch
                            </Button>
                        )}
                        {canReceive && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setActionTarget(row.original);
                                    setActionKind('delivery');
                                }}
                            >
                                <PackageCheck className="mr-1 h-4 w-4" /> Receive
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable query={query} data={rows} columns={columns} pagination={pagination} setPagination={setPagination} totalRowCount={totalRowCount}>
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                {!isStoreUser && (
                                    <Button
                                        size="sm"
                                        variant={viewKind === 'dispatch' ? 'default' : 'outline'}
                                        onClick={() => {
                                            setViewKind('dispatch');
                                            setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                        }}
                                    >
                                        <Truck className="mr-1 h-4 w-4" /> Dispatch
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    variant={viewKind === 'receipt' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setViewKind('receipt');
                                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                    }}
                                >
                                    <PackageCheck className="mr-1 h-4 w-4" /> Receipt
                                </Button>
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
                        <div className="text-xs text-muted-foreground">
                            {viewKind === 'dispatch' ? 'Picked orders ready to dispatch' : 'Dispatched orders ready to receive'} — {totalRowCount} records
                        </div>
                    </div>
                </DataTable>

                {viewTarget && (
                    <Dialog open onOpenChange={() => setViewTarget(null)}>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {viewKind === 'dispatch' ? 'Dispatch' : 'Receipt'} — {viewTarget.clientDocumentId || '—'}
                                </DialogTitle>
                                <DialogDescription>
                                    <Badge variant="outline">{viewTarget.lifecycleStatus}</Badge>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                                    <div>
                                        <div className="text-muted-foreground">Store</div>
                                        <div className="font-medium">
                                            {viewTarget.companyDebtorName || storeName(viewTarget.companyDebtorId)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Scheduled</div>
                                        <div className="font-medium">
                                            {viewTarget.scheduledDeliveryDate ? new Date(viewTarget.scheduledDeliveryDate).toLocaleDateString() : '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground">Invoice #</div>
                                        <div className="line-clamp-2 max-w-[110px] break-words font-medium">
                                            {viewTarget.invoiceNumber || viewTarget.salesOrderNumber || '—'}
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

                {actionTarget && (
                    <LifecycleActionDialog
                        record={actionTarget}
                        kind={actionKind}
                        onClose={() => {
                            setActionTarget(null);
                            setActionKind('');
                        }}
                    />
                )}
            </div>
        </PageLoader>
    );
};

export default DispatchReceipt;
