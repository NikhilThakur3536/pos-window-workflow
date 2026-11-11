'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetCompanyDebtorOrderList,
    useGetCompanyDebtorOrderById,
    useCreateCompanyDebtorOrder,
    useScheduleDelivery,
    useAllocateInventory,
    useConfirmPicked,
    useDispatchOrder,
    useConfirmDelivery,
    useCancelCompanyDebtorOrder,
    useGetCheckingTemplate,
    useGetAllocationPreview,
    useGetInventoryPostingStatus,
    type CheckingTemplateData,
    ORDER_LIFECYCLE_STATUSES,
    COMPANY_DEBTOR_ORDER_SOURCES,
    BATCH_ALLOCATION_STRATEGIES,
    type AllocationPreviewItem,
    type BatchAllocationStrategy,
    type CompanyDebtorOrder,
    type CompanyDebtorOrderItem,
    type CompanyDebtorOrderSource,
    type OrderLifecycleStatus,
} from '@/api-queries/company-debtor-orders';
import {
    openInvoiceCheck,
    getInvoiceCheckById,
    usePostInvoiceCheck,
    type InvoiceCheckDirection,
    type InvoiceCheckingSession,
} from '@/api-queries/invoice-checking';
import RecordCheckDialog from '../invoice-checking/record-check-dialog';
import ResolveCheckDialog from '../invoice-checking/resolve-check-dialog';
import ViewCheckDialog from '../invoice-checking/view-check-dialog';
import type { CompanyCreditor } from '@/types';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetUsers } from '@/api-queries/user';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { toast } from 'sonner';
import {
    Plus,
    CalendarClock,
    PackageCheck,
    Truck,
    ClipboardList,
    HandCoins,
    XCircle,
    Eye,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    History,
    FileText,
    Route,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import OrderItemsEditor from './components/order-items-editor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import {
    useApprovalRequired,
    isApprovalRequiredError,
    isOverSupplyError,
    getOverSupplyApprovalId,
} from '@/hooks/use-approval-required';
import { useGetOverSupplyApproval } from '@/api-queries/over-supply-approval';
import { useQueryClient } from '@tanstack/react-query';
import { apiUrls } from '@/api-queries';
import { useAuthUser } from '@/stores/auth-user.store';
import { generateUniqueInvoiceId, getApiKey } from '@/utils/helpers';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    REQUESTED: { label: 'Requested', className: 'bg-sky-100 text-sky-800' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-indigo-100 text-indigo-800' },
    PART_ALLOCATED: { label: 'Part Allocated', className: 'bg-violet-50 text-violet-700' },
    ALLOCATED: { label: 'Allocated', className: 'bg-violet-100 text-violet-800' },
    PART_PICKED: { label: 'Part Picked', className: 'bg-amber-50 text-amber-700' },
    PICKED: { label: 'Picked', className: 'bg-amber-100 text-amber-800' },
    PART_DISPATCHED: { label: 'Part Dispatched', className: 'bg-blue-50 text-blue-700' },
    DISPATCHED: { label: 'Dispatched', className: 'bg-blue-100 text-blue-800' },
    PART_DELIVERED: { label: 'Part Delivered', className: 'bg-emerald-50 text-emerald-700' },
    DELIVERED: { label: 'Delivered', className: 'bg-emerald-100 text-emerald-800' },
    DELIVERED_WITH_EXCEPTION: { label: 'Delivered w/ Exception', className: 'bg-orange-100 text-orange-800' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
};

// Quantities are cumulative across the whole order lifecycle (picked > dispatched >
// delivered + rejected). Actions are derived strictly from these backend numbers, never
// from local state.
const qtyNumber = (value?: number | string | null): number => {
    const n = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};

const ACTION_OK_MESSAGES: Record<string, string> = {
    schedule: 'Delivery scheduled',
    allocate: 'Inventory allocated',
    pick: 'Picked quantities confirmed',
    dispatch: 'Order dispatched',
    delivery: 'Delivery confirmed',
    cancel: 'Company debtor order cancelled',
};

const ACTION_TITLES: Record<string, string> = {
    schedule: 'Schedule Delivery',
    allocate: 'Allocate Inventory',
    pick: 'Confirm Picked Quantities',
    dispatch: 'Dispatch Order',
    delivery: 'Confirm Delivery',
    cancel: 'Cancel Order',
};

// ---------------------------------------------------------------------------
// Invoice-check approval tokens cached against the checking session id so a
// re-entry (user left mid-flow and came back) can resubmit the post with the
// still-valid token instead of hitting the 428 approval gate again. Stored as
// an array; expired entries are pruned on every read/write.
// ---------------------------------------------------------------------------
interface StoredCheckApproval {
    id: string;
    token?: string;
    actionCode?: string;
    expiresAt?: string;
}

const CHECK_APPROVAL_STORAGE_KEY = 'cdo-invoice-check-approval-tokens';

const isExpiredStoredCheckApproval = (entry: StoredCheckApproval) =>
    !!entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now();

const loadStoredCheckApprovals = (): StoredCheckApproval[] => {
    try {
        const raw = JSON.parse(localStorage.getItem(CHECK_APPROVAL_STORAGE_KEY) || '[]');
        const list = (Array.isArray(raw) ? raw : []) as StoredCheckApproval[];
        const active = list.filter((entry) => !isExpiredStoredCheckApproval(entry));
        if (active.length !== list.length) {
            localStorage.setItem(CHECK_APPROVAL_STORAGE_KEY, JSON.stringify(active));
        }
        return active;
    } catch {
        return [];
    }
};

const persistStoredCheckApprovals = (list: StoredCheckApproval[]) => {
    try {
        localStorage.setItem(CHECK_APPROVAL_STORAGE_KEY, JSON.stringify(list));
    } catch {
        // Storage unavailable — the approval cache is best-effort only.
    }
};

const rememberOpenedCheckSession = (id: string) => {
    const list = loadStoredCheckApprovals();
    if (!list.some((entry) => entry.id === id)) {
        persistStoredCheckApprovals([...list, { id }]);
    }
};

const rememberCheckApprovalToken = (id: string, token: string, actionCode: string | undefined, expiresAt?: string) => {
    const list = loadStoredCheckApprovals().filter((entry) => entry.id !== id);
    persistStoredCheckApprovals([...list, { id, token, actionCode, expiresAt }]);
};

const forgetCheckApprovalToken = (id: string) => {
    persistStoredCheckApprovals(loadStoredCheckApprovals().filter((entry) => entry.id !== id));
};

const findStoredCheckApprovalToken = (id: string): StoredCheckApproval | null =>
    loadStoredCheckApprovals().find((entry) => entry.id === id) || null;

const Orders = () => {
    const router = useRouter();
    const currentUser = useAuthUser((state) => state.user);
    const myDebtorId = currentUser?.companyDebtorId || '';
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';

    const [createOpen, setCreateOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState<CompanyDebtorOrder | null>(null);
    const [actionTarget, setActionTarget] = useState<CompanyDebtorOrder | null>(null);
    const [actionKind, setActionKind] = useState<string>('');
    // Read-only view of a posted checking session opened from the row action (e.g. the
    // admin "View Outgoing Check" link).
    const [readCheckTarget, setReadCheckTarget] = useState<InvoiceCheckingSession | null>(null);

    const initialFilters: {
        lifecycleStatus: string;
        store: string;
    } = { lifecycleStatus: '', store: myDebtorId };

    const { filters, appliedFilters, handleFilters, pagination, setPagination } = useTableFilters(initialFilters);

    const query = useGetCompanyDebtorOrderList({
        ...(appliedFilters.lifecycleStatus
            ? { lifecycleStatus: appliedFilters.lifecycleStatus as OrderLifecycleStatus }
            : {}),
        ...(appliedFilters.store ? { companyDebtorId: appliedFilters.store } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyDebtorOrder[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores: CompanyCreditor[] = debtorsRes?.data?.rows || [];

    const debtorNameById = useMemo(() => {
        const map: Record<string, string> = {};
        stores.forEach((s) => {
            if (s.id) map[s.id] = s.name || s.tradingAs || s.id;
        });
        return map;
    }, [stores]);

    const storeName = (debtorId?: string) => {
        if (!debtorId) return '—';
        return debtorNameById[debtorId] || '—';
    };

    const openLifecycle = (record: CompanyDebtorOrder, kind: string) => {
        setActionTarget(record);
        setActionKind(kind);
    };

    const columns: ColumnDef<CompanyDebtorOrder>[] = [
        {
            accessorKey: 'clientDocumentId',
            header: 'Reference',
            cell: ({ row }) => (
                <div>
                    <div className="line-clamp-2 max-w-[110px] font-semibold break-words">
                        {row.original.clientDocumentId || '—'}
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">v{row.original.lifecycleVersion ?? 0}</div>
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
            cell: ({ row }) => {
                const s = STATUS_BADGE[row.original.lifecycleStatus] || {
                    label: row.original.lifecycleStatus,
                    className: '',
                };
                // A fully dispatched order is waiting on the receiving store: admin/warehouse
                // show "Awaiting Store Delivery" (the store sees it as DISPATCHED and acts).
                const label =
                    !isStoreUser && row.original.lifecycleStatus === 'DISPATCHED' ? 'Awaiting Store Delivery' : s.label;
                return (
                    <Badge variant="outline" className={s.className}>
                        {label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'requestedDeliveryDate',
            header: 'Requested Delivery',
            cell: ({ row }) =>
                row.original.requestedDeliveryDate
                    ? new Date(row.original.requestedDeliveryDate).toLocaleDateString()
                    : '—',
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
                const r = row.original;
                const status = r.lifecycleStatus;
                const items = r.items || r.salesOrderItems || [];

                // Every action is derived from the backend order (status + cumulative
                // quantities). Nothing here lives in local component state.
                const hasItemQuantities = items.some(
                    (i) =>
                        i.pickedQuantity != null ||
                        i.dispatchedQuantity != null ||
                        i.deliveredQuantity != null ||
                        i.rejectedQuantity != null,
                );
                const pendingDispatch = items.filter(
                    (i) => qtyNumber(i.pickedQuantity) > qtyNumber(i.dispatchedQuantity),
                );
                const dispatchRemaining = pendingDispatch.reduce(
                    (sum, i) => sum + Math.max(0, qtyNumber(i.pickedQuantity) - qtyNumber(i.dispatchedQuantity)),
                    0,
                );
                const anyDispatched = items.some((i) => qtyNumber(i.dispatchedQuantity) > 0);

                const pendingDelivery = items.filter(
                    (i) =>
                        qtyNumber(i.dispatchedQuantity) >
                        qtyNumber(i.deliveredQuantity) + qtyNumber(i.rejectedQuantity),
                );
                const deliveryOutstanding = pendingDelivery.reduce(
                    (sum, i) =>
                        sum +
                        Math.max(
                            0,
                            qtyNumber(i.dispatchedQuantity) -
                                qtyNumber(i.deliveredQuantity) -
                                qtyNumber(i.rejectedQuantity),
                        ),
                    0,
                );

                // Dispatch is possible only while some picked quantity has not yet been
                // dispatched, and never once the order is fully dispatched or delivered.
                const canDispatch = hasItemQuantities
                    ? !isStoreUser &&
                      ['PART_PICKED', 'PICKED', 'PART_DISPATCHED', 'PART_DELIVERED'].includes(status) &&
                      pendingDispatch.length > 0
                    : !isStoreUser && ['PART_PICKED', 'PICKED', 'PART_DISPATCHED'].includes(status);
                const dispatchLabel = hasItemQuantities
                    ? anyDispatched
                        ? `Dispatch Remaining (${dispatchRemaining})`
                        : `Dispatch (${dispatchRemaining})`
                    : 'Dispatch';

                // Confirm Delivery belongs to the receiving store user only, and only while
                // there is dispatched quantity awaiting receipt.
                const canConfirmDelivery = hasItemQuantities
                    ? isStoreUser && pendingDelivery.length > 0
                    : isStoreUser && ['PART_DISPATCHED', 'DISPATCHED'].includes(status);
                const deliveryLabel = hasItemQuantities
                    ? `Confirm Delivery (${deliveryOutstanding})`
                    : 'Confirm Delivery';

                // Final / terminal states never offer Allocate/Pick/Dispatch/Cancel.
                const canCancel = ![
                    'DISPATCHED',
                    'DELIVERED',
                    'PART_DELIVERED',
                    'DELIVERED_WITH_EXCEPTION',
                    'CANCELLED',
                ].includes(status);
                // Picklist is offered only once stock is (part) allocated; before that there is no source inventory to walk.
                const canShowPicklist = !['REQUESTED', 'SCHEDULED', 'CANCELLED', 'DELETED'].includes(status);

                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View order"
                            onClick={() => setViewTarget(r)}
                        >
                            <Eye className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Order history and audit trail"
                            onClick={() => setViewTarget(r)}
                        >
                            <History className="h-4 w-4 text-gray-500" />
                        </Button>
                        {status === 'REQUESTED' && !isStoreUser && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Schedule delivery"
                                onClick={() => openLifecycle(r, 'schedule')}
                            >
                                <CalendarClock className="h-4 w-4 text-indigo-600" />
                            </Button>
                        )}
                        {['SCHEDULED', 'PART_ALLOCATED'].includes(status) && !isStoreUser && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Allocate inventory"
                                onClick={() => openLifecycle(r, 'allocate')}
                            >
                                <PackageCheck className="h-4 w-4 text-violet-600" />
                            </Button>
                        )}
                        {['ALLOCATED', 'PART_PICKED'].includes(status) && !isStoreUser && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Confirm picked"
                                onClick={() => openLifecycle(r, 'pick')}
                            >
                                <ClipboardList className="h-4 w-4 text-amber-600" />
                            </Button>
                        )}
                        {canShowPicklist && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Generate picklist"
                                onClick={() =>
                                    router.push(
                                        `/processing/company-debtor-orders/aisle-picklist?orderId=${r.id}`,
                                    )
                                }
                            >
                                <Route className="h-4 w-4 text-teal-600" />
                            </Button>
                        )}
                        {canDispatch && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50"
                                title={
                                    hasItemQuantities
                                        ? `Dispatch the remaining picked quantity (${dispatchRemaining})`
                                        : 'Dispatch the picked quantity'
                                }
                                onClick={() => openLifecycle(r, 'dispatch')}
                            >
                                <Truck className="h-3.5 w-3.5" />
                                {dispatchLabel}
                            </Button>
                        )}
                        {!isStoreUser && !!r.dispatchCheckingSessionId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View posted outgoing invoice check (read-only)"
                                onClick={() =>
                                    setReadCheckTarget({
                                        id: r.dispatchCheckingSessionId as string,
                                    } as InvoiceCheckingSession)
                                }
                            >
                                <FileText className="h-4 w-4 text-sky-600" />
                            </Button>
                        )}
                        {canConfirmDelivery && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                                title={
                                    hasItemQuantities
                                        ? `Confirm delivery of this leg's dispatched quantity (${deliveryOutstanding})`
                                        : 'Confirm delivery of this leg'
                                }
                                onClick={() => openLifecycle(r, 'delivery')}
                            >
                                <HandCoins className="h-3.5 w-3.5" />
                                {deliveryLabel}
                            </Button>
                        )}
                        {canCancel && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Cancel"
                                onClick={() => openLifecycle(r, 'cancel')}
                            >
                                <XCircle className="h-4 w-4 text-red-600" />
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
                                            selectedValue={filters.lifecycleStatus || ''}
                                            options={[
                                                { label: 'All Statuses', value: '' },
                                                ...ORDER_LIFECYCLE_STATUSES.map((s) => ({ label: s, value: s })),
                                            ]}
                                            onSelect={(value) =>
                                                handleFilters({ ...filters, lifecycleStatus: String(value || '') })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="min-w-[200px]">
                                    <Label className="text-xs">Debtor / Store</Label>
                                    <div className="mt-1">
                                        {isStoreUser && myDebtorId ? (
                                            <div className="bg-muted text-muted-foreground flex h-10 items-center rounded-md border px-3 text-sm">
                                                {storeName(myDebtorId)}
                                            </div>
                                        ) : (
                                            <SelectPopover
                                                title="Debtor / Store"
                                                onlyTitle={myDebtorId ? 'My store' : 'All stores'}
                                                selectedValue={filters.store || ''}
                                                options={[
                                                    { label: 'All stores', value: '' },
                                                    ...stores.map((s) => ({
                                                        label: s.name || s.tradingAs || s.id,
                                                        value: s.id,
                                                    })),
                                                ]}
                                                onSelect={(value) =>
                                                    handleFilters({ ...filters, store: String(value || '') })
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
                                <Plus className="mr-1 h-4 w-4" /> New Order
                            </Button>
                        </div>
                        <div className="text-muted-foreground text-xs">Showing {totalRowCount} orders</div>
                    </div>
                </DataTable>

                <CreateOrderDialog
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    stores={stores}
                    defaultStoreId={myDebtorId}
                    isStoreUser={isStoreUser}
                />

                {viewTarget && (
                    <OrderViewDialog record={viewTarget} onClose={() => setViewTarget(null)} storeName={storeName} />
                )}

                {actionTarget && (
                    <LifecycleActionDialog
                        record={actionTarget}
                        kind={actionKind}
                        onClose={() => setActionTarget(null)}
                    />
                )}

                <ViewCheckDialog
                    session={readCheckTarget}
                    open={!!readCheckTarget}
                    onClose={() => setReadCheckTarget(null)}
                />
            </div>
        </PageLoader>
    );
};

// --------------------------------------- Create ---------------------------------------

interface CreateOrderDialogProps {
    open: boolean;
    onClose: () => void;
    stores: CompanyCreditor[];
    defaultStoreId?: string;
    isStoreUser?: boolean;
}

const CreateOrderDialog = ({ open, onClose, stores, defaultStoreId, isStoreUser = false }: CreateOrderDialogProps) => {
    const createMutation = useCreateCompanyDebtorOrder();
    const [storeId, setStoreId] = useState(defaultStoreId || '');
    const [source, setSource] = useState<string>('MANUAL');
    const [date, setDate] = useState('');
    const [memo, setMemo] = useState('');
    const [items, setItems] = useState<CompanyDebtorOrderItem[]>([]);
    const [warehouseId, setWarehouseId] = useState('');

    const { data: warehousesRes } = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawWarehouses = (warehousesRes?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    // A warehouse row may expose its key as `id`; older payloads used `warehouseId`.
    // Keep the option value non-empty so selecting a warehouse always reaches the payload.
    const warehouseOptions = useMemo(
        () =>
            warehouses.flatMap((w) => {
                const id = String(w.id || (w as WarehouseDetails & { warehouseId?: string }).warehouseId || '').trim();
                if (!id) return [];
                return [{ label: w.warehouse || w.name || id, value: id }];
            }),
        [warehouses],
    );

    const clientDocumentId = useMemo(() => `CDO-${generateUniqueInvoiceId()}`, [open]);

    // Changing the warehouse changes which products are available, so the product list
    // is refetched with the new warehouseId (see OrderItemsEditor) and any items picked
    // under the previous warehouse are cleared, since they may not exist in the new one.
    const handleWarehouseChange = (value: unknown) => {
        const next = String(value ?? '').trim();
        if (next === warehouseId) return;
        setWarehouseId(next);
        if (items.length) {
            setItems([]);
            toast.info('Warehouse changed — please re-add items from the selected warehouse');
        }
    };

    const handleCreate = () => {
        if (!storeId) return toast.error('Select a store');
        if (!date) return toast.error('Select a requested delivery date');
        if (!items.length) return toast.error('Add at least one item');
        const selectedWarehouseId = warehouseId.trim();
        createMutation.mutate(
            {
                clientDocumentId,
                companyDebtorId: storeId,
                ...(selectedWarehouseId ? { warehouseId: selectedWarehouseId } : {}),
                orderSource: source as CompanyDebtorOrderSource,
                requestedDeliveryDate: date,
                salesMemo: memo || undefined,
                items: items.map((i) => ({
                    companyStockDetailId: i.companyStockDetailId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                })),
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success(
                            `Company debtor order created (${data.data?.clientDocumentId || data.data?.salesOrderNumber || ''})`,
                        );
                        setStoreId(defaultStoreId || '');
                        setSource('MANUAL');
                        setWarehouseId('');
                        setDate('');
                        setMemo('');
                        setItems([]);
                        onClose();
                    } else {
                        toast.error(data.message || 'Create failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-6xl sm:max-w-6xl">
                <DialogHeader className="space-y-1">
                    <DialogTitle>Create Company Debtor Order</DialogTitle>
                    <DialogDescription>
                        Reference: <span className="font-mono">{clientDocumentId}</span>. Creating does not reserve
                        inventory.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Debtor / Store</Label>
                            {isStoreUser && defaultStoreId ? (
                                <div className="bg-muted flex h-9 items-center rounded-md border px-3 text-sm">
                                    {stores.find((s) => s.id === defaultStoreId)?.name ||
                                        stores.find((s) => s.id === defaultStoreId)?.tradingAs ||
                                        'My store'}
                                </div>
                            ) : (
                                <SelectPopover
                                    title="Debtor / Store"
                                    onlyTitle="Select store"
                                    selectedValue={storeId || ''}
                                    options={stores.map((s) => ({ label: s.name || s.tradingAs || s.id, value: s.id }))}
                                    onSelect={(value) => setStoreId(String(value || ''))}
                                />
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Order Source</Label>
                            <SelectPopover
                                title="Source"
                                onlyTitle="Select source"
                                selectedValue={source || ''}
                                options={COMPANY_DEBTOR_ORDER_SOURCES.map((s) => ({ label: s, value: s }))}
                                onSelect={(value) => setSource(String(value || 'MANUAL'))}
                            />
                        </div>
                        {!isStoreUser && (
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Destination Warehouse</Label>
                                <SelectPopover
                                    title="Warehouse"
                                    onlyTitle="Use store default"
                                    selectedValue={warehouseId}
                                    options={[{ label: 'Use store default', value: '' }, ...warehouseOptions]}
                                    onSelect={handleWarehouseChange}
                                />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">Requested Delivery Date</Label>
                            <Input
                                type="date"
                                className="h-9"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Sales Memo</Label>
                        <Input
                            className="h-9"
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>
                    <OrderItemsEditor
                        key={warehouseId || 'default'}
                        items={items}
                        onChange={setItems}
                        companyDebtorId={storeId}
                        warehouseId={warehouseId}
                        skipDebtorProductFilter
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button disabled={createMutation.isPending} onClick={handleCreate}>
                        Create Order
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- View ---------------------------------------

export const OrderViewDialog = ({
    record,
    onClose,
    storeName,
}: {
    record: CompanyDebtorOrder;
    onClose: () => void;
    storeName?: (id?: string) => string;
}) => {
    const saleOrderId = record.saleOrderId || record.id;
    const { data: res, isLoading } = useGetCompanyDebtorOrderById(saleOrderId, record.companyDebtorId);
    const order = res?.data || record;
    const { data: postingStatusRes } = useGetInventoryPostingStatus(saleOrderId, order.companyDebtorId);
    const postingStatus = postingStatusRes?.data;
    const debtorName = order.companyDebtorName || (storeName ? storeName(order.companyDebtorId) : '—');
    const { data: warehousesRes } = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawWarehouses = (warehousesRes?.data || []) as
        WarehouseDetails[] | { count?: number; rows?: WarehouseDetails[] };
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];
    const warehouseName =
        order.warehouseName ||
        (order.warehouseId ? warehouses.find((w) => w.id === order.warehouseId)?.warehouse : undefined) ||
        '—';
    const events = order.fulfilmentEvents || [];

    const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');
    const fmtDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');
    const fmtMoney = (value?: number | string) => (value == null || value === '' ? '—' : Number(value).toFixed(2));

    const postingTrigger =
        postingStatus?.inventoryPostingTriggerSnapshot === 'ACCOUNT_SALE'
            ? 'Account Sale'
            : postingStatus?.inventoryPostingTriggerSnapshot === 'DELIVERY_CONFIRMATION'
              ? 'Delivery Confirmation'
              : '—';
    const postingSourceLabel =
        postingStatus?.inventoryPostingSource === 'ACCOUNT_SALE'
            ? 'Account Sale'
            : postingStatus?.inventoryPostingSource === 'DELIVERY_CONFIRMATION'
              ? 'Delivery Confirmation'
              : '—';

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Company Debtor Order — {order.clientDocumentId || '—'}</DialogTitle>
                    <DialogDescription>
                        <Badge variant="outline" className="mt-1">
                            {order.lifecycleStatus}
                        </Badge>
                        {order.invoiceNumber ? (
                            <span className="ml-2 font-mono text-xs">{order.invoiceNumber}</span>
                        ) : null}
                    </DialogDescription>
                </DialogHeader>
                <PageLoader isLoading={isLoading}>
                    <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                            <div>
                                <div className="text-muted-foreground">Debtor / Store</div>
                                <div className="font-medium">{debtorName}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Account #</div>
                                <div className="font-medium">{order.companyDebtorAccountNumber || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Source</div>
                                <div className="font-medium">{order.orderSource || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Version</div>
                                <div className="font-medium">v{order.lifecycleVersion ?? 0}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Order Date</div>
                                <div className="font-medium">{fmtDate(order.salesOrderDate)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Sales Order #</div>
                                <div className="line-clamp-2 max-w-[110px] font-medium break-words">
                                    {order.salesOrderNumber || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Invoice #</div>
                                <div className="line-clamp-2 max-w-[110px] font-medium break-words">
                                    {order.invoiceNumber || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Order Type</div>
                                <div className="font-medium">{order.orderType || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Requested Delivery</div>
                                <div className="font-medium">{fmtDate(order.requestedDeliveryDate)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Scheduled</div>
                                <div className="font-medium">{fmtDate(order.scheduledDeliveryDate)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Warehouse</div>
                                <div className="font-medium">{warehouseName}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Source Document</div>
                                <div className="font-medium">{order.sourceDocument || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Delivery Method</div>
                                <div className="font-medium">{order.deliveryMethod || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Delivery Note #</div>
                                <div className="font-medium">{order.deliveryNoteNumber || '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Deliver To</div>
                                <div className="font-medium">
                                    {order.deliverToName || order.deliverToAddress || '—'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Goods Total</div>
                                <div className="font-medium">{fmtMoney(order.goodsTotal)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Discount %</div>
                                <div className="font-medium">{fmtMoney(order.salesOrderDiscountPercentage)}%</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Discount Amount</div>
                                <div className="font-medium">{fmtMoney(order.discountAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Tax Amount</div>
                                <div className="font-medium">{fmtMoney(order.taxAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Doc GP %</div>
                                <div className="font-medium">{fmtMoney(order.documentGpPercentage)}%</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Cash Deposit</div>
                                <div className="font-medium">{fmtMoney(order.cashDeposit)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Total Qty</div>
                                <div className="font-medium">{order.totalQuantity ?? '—'}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Inclusive</div>
                                <div className="font-medium">
                                    {order.salesOrderInclusive == null ? '—' : order.salesOrderInclusive ? 'Yes' : 'No'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Memo</div>
                                <div className="font-medium">{order.salesMemo || '—'}</div>
                            </div>
                        </div>

                        <div
                            className={`space-y-2 rounded-md border p-3 text-sm ${
                                postingStatus?.inventoryPosted
                                    ? 'border-green-300 bg-green-50/60'
                                    : 'border-amber-300 bg-amber-50/60'
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2 font-medium">
                                    {postingStatus?.inventoryPosted ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                    )}
                                    Inventory Posting
                                </div>
                                <Badge variant={postingStatus?.inventoryPosted ? 'default' : 'secondary'}>
                                    {postingStatus?.inventoryPosted ? 'Posted' : 'Not Posted'}
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                                <div>
                                    <div className="text-muted-foreground">Trigger</div>
                                    <div className="font-medium">{postingTrigger}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Posted At</div>
                                    <div className="font-medium">{fmtDateTime(postingStatus?.inventoryPostedAt)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Source</div>
                                    <div className="font-medium">{postingSourceLabel}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Posted Lines</div>
                                    <div className="font-medium">{postingStatus?.postedItemCount ?? '—'}</div>
                                </div>
                            </div>
                            {postingStatus?.message && !postingStatus.inventoryPosted && (
                                <div className="text-xs text-amber-800">{postingStatus.message}</div>
                            )}
                        </div>

                        <div>
                            <div className="mb-1 text-sm font-medium">Items</div>
                            <OrderItemsEditor items={order.items || []} onChange={() => {}} readonly />
                        </div>

                        {(() => {
                            const itemsWithBatches = (order.items || []).filter(
                                (i) => (i.stockDispatchAllocations?.length ?? 0) > 0,
                            );
                            if (!itemsWithBatches.length) return null;
                            return (
                                <div>
                                    <div className="mb-1 text-sm font-medium">Batch Allocations</div>
                                    <div className="max-h-64 overflow-y-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="text-muted-foreground border-b text-xs">
                                                <tr className="text-left">
                                                    <th className="p-2">Product</th>
                                                    <th className="p-2">Batch</th>
                                                    <th className="p-2">Expiry</th>
                                                    <th className="p-2">Warehouse</th>
                                                    <th className="p-2 text-right">Allocated</th>
                                                    <th className="p-2 text-right">Picked</th>
                                                    <th className="p-2 text-right">Dispatched</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {itemsWithBatches.flatMap((item, idx) =>
                                                    (item.stockDispatchAllocations || []).map((a, j) => (
                                                        <tr key={`${item.id || idx}-${a.id || j}`} className="border-b">
                                                            <td className="p-2">
                                                                {item.description || item.itemCode || '—'}
                                                            </td>
                                                            <td className="p-2 font-mono text-xs">
                                                                {a.batchNumber || '—'}
                                                            </td>
                                                            <td className="p-2">{fmtDate(a.expiryDate)}</td>
                                                            <td className="p-2">{a.warehouseName || '—'}</td>
                                                            <td className="p-2 text-right tabular-nums">
                                                                {a.allocatedQuantity ?? '—'}
                                                            </td>
                                                            <td className="p-2 text-right tabular-nums">
                                                                {a.pickedQuantity ?? '—'}
                                                            </td>
                                                            <td className="p-2 text-right tabular-nums">
                                                                {a.dispatchedQuantity ?? '—'}
                                                            </td>
                                                        </tr>
                                                    )),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {events.length > 0 && (
                            <div>
                                <div className="mb-1 text-sm font-medium">Fulfilment History</div>
                                <div className="max-h-64 overflow-y-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="text-muted-foreground border-b text-xs">
                                            <tr className="text-left">
                                                <th className="p-2">Event</th>
                                                <th className="p-2">From → To</th>
                                                <th className="p-2">Date</th>
                                                <th className="p-2">Scheduled</th>
                                                <th className="p-2 text-right">Lines</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {events.map((event) => (
                                                <tr key={event.id} className="border-b">
                                                    <td className="p-2 font-medium">{event.eventType || '—'}</td>
                                                    <td className="p-2">
                                                        {event.fromStatus || '—'} → {event.toStatus || '—'}
                                                    </td>
                                                    <td className="p-2">
                                                        {event.eventAt ? new Date(event.eventAt).toLocaleString() : '—'}
                                                    </td>
                                                    <td className="p-2">{fmtDate(event.scheduledDeliveryDate)}</td>
                                                    <td className="p-2 text-right">
                                                        {event.itemQuantities?.length ?? 0}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
};

// --------------------------------------- Lifecycle actions ---------------------------------------

interface LifecycleActionDialogProps {
    record: CompanyDebtorOrder;
    kind: string;
    onClose: () => void;
}

interface ActionLine {
    id?: string;
    companyStockDetailId: string;
    description?: string;
    itemCode?: string;
    quantity: number;
    rejectedQuantity?: number;
}

// The posted check is the authority for how much may leave the store: a dispatch line
// must match the accepted quantity for the same product. Returns an error message, or
// null when every line lines up.
const findAcceptedQuantityMismatch = (lines: ActionLine[], session: InvoiceCheckingSession | null): string | null => {
    if (!session) return null;

    const acceptedByStock = new Map<string, number>();
    (session.discrepancies || []).forEach((d) => {
        if (!d.companyStockDetailId) return;
        const qty = Number(d.acceptedQuantity ?? 0) || 0;
        acceptedByStock.set(d.companyStockDetailId, (acceptedByStock.get(d.companyStockDetailId) || 0) + qty);
    });

    for (const line of lines) {
        const expected = acceptedByStock.get(line.companyStockDetailId);
        // Nothing recorded for this product on the posted check, so there is nothing to
        // dispatch against it.
        if (expected === undefined) continue;
        if (line.quantity !== expected) {
            const label = line.description || line.itemCode || 'an item';
            return `Dispatch quantity for ${label} must equal the accepted quantity of ${expected} (currently ${line.quantity})`;
        }
    }
    return null;
};

interface AllocationInventoryRow {
    itemId?: string;
    companyStockDetailId: string;
    companyStockInventoryId: string;
    description?: string;
    itemCode?: string;
    batchNumber?: string;
    expiryDate?: string;
    receivedAt?: string;
    priority?: number;
    warehouseName?: string;
    quantity: number;
}

export const LifecycleActionDialog = ({ record, kind, onClose }: LifecycleActionDialogProps) => {
    const scheduleMut = useScheduleDelivery();
    const allocateMut = useAllocateInventory();
    const pickMut = useConfirmPicked();
    const dispatchMut = useDispatchOrder();
    const deliveryMut = useConfirmDelivery();
    const cancelMut = useCancelCompanyDebtorOrder();
    const checkingTemplate = useGetCheckingTemplate();
    const allocationPreview = useGetAllocationPreview();
    const postCheckMut = usePostInvoiceCheck();

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const postApprovalCtl = useApprovalRequired();
    const queryClient = useQueryClient();
    const [overSupplyRequestId, setOverSupplyRequestId] = useState<string | null>(null);
    const replayedOverSupplyRef = useRef<string | null>(null);
    const overSupplyStatusQuery = useGetOverSupplyApproval(overSupplyRequestId);

    const [responsibleUserDebtorId, setResponsibleUserDebtorId] = useState('');
    const { data: usersRes } = useGetUsers({
        status: 'ACTIVE',
        limit: 1000,
        offset: 0,
        ...(responsibleUserDebtorId ? { companyDebtorId: responsibleUserDebtorId } : {}),
    });
    const users = usersRes?.data || [];

    const { data: dialogStoresRes } = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 1000, offset: 0 });
    const dialogStores = dialogStoresRes?.data?.rows || [];

    const { data: dialogWarehousesRes } = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawDialogWarehouses = (dialogWarehousesRes?.data || []) as
        WarehouseDetails[] | { count?: number; rows?: WarehouseDetails[] };
    const dialogWarehouses = Array.isArray(rawDialogWarehouses) ? rawDialogWarehouses : rawDialogWarehouses?.rows || [];
    const warehouseNameById = useMemo(() => {
        const map: Record<string, string> = {};
        dialogWarehouses.forEach((w) => {
            if (w.id) map[w.id] = w.warehouse || w.name || w.id;
        });
        return map;
    }, [dialogWarehouses]);

    const saleOrderId = record.saleOrderId || record.id;
    const companyDebtorId = record.companyDebtorId;

    // Refresh the latest order so workflow actions always submit the current
    // lifecycleVersion (every action requires the latest version).
    const {
        data: freshRes,
        isFetching: isRefreshing,
        refetch: refetchOrder,
    } = useGetCompanyDebtorOrderById(saleOrderId, companyDebtorId);
    const fresh = freshRes?.data || record;
    const version = fresh?.lifecycleVersion ?? record.lifecycleVersion ?? 0;
    const nextVersion = version + 1;
    // The clientEventId is generated once per dialog so that retrying the same
    // action (e.g. after a network error) reuses the same event id. The backend
    // de-duplicates workflow events by clientEventId while the lifecycleVersion is
    // unchanged, which keeps retries idempotent.
    const [clientEventId] = useState(
        () => `${record.clientDocumentId || record.id}-${kind.toUpperCase()}-${Date.now()}`,
    );
    // The pick endpoint is additionally guarded by its own event id. It is minted on the
    // first "Confirm Pick" rather than on mount, so a pick the user walks away from
    // never consumes an id. Retries of that same pick (network error, or re-sending
    // after an approval) reuse it, and a new pick action mounts a fresh dialog and
    // therefore gets a new id.
    const pickClientEventIdRef = useRef<string | null>(null);
    const okMessage = ACTION_OK_MESSAGES[kind] || 'Action successful';
    const actionLabel = ACTION_TITLES[kind] || 'Order action';

    const [scheduleDate, setScheduleDate] = useState('');
    const [responsibleUserId, setResponsibleUserId] = useState('');
    const allocLines = (fresh.items || record.items || []).map((i) => ({
        id: i.id,
        companyStockDetailId: i.companyStockDetailId,
        description: i.description,
        itemCode: i.itemCode,
        quantity: i.quantity,
    }));
    const [pickLines, setPickLines] = useState<ActionLine[]>(
        (fresh.items || record.items || []).map((i) => ({
            id: i.id,
            companyStockDetailId: i.companyStockDetailId,
            description: i.description,
            itemCode: i.itemCode,
            quantity: i.quantity,
        })),
    );
    const [dispatchLines, setDispatchLines] = useState<ActionLine[]>(
        (fresh.items || record.items || []).map((i) => ({
            id: i.id,
            companyStockDetailId: i.companyStockDetailId,
            description: i.description,
            itemCode: i.itemCode,
            quantity: i.quantity,
        })),
    );
    const [deliveryLines, setDeliveryLines] = useState<ActionLine[]>(
        (fresh.items || record.items || []).map((i) => ({
            id: i.id,
            companyStockDetailId: i.companyStockDetailId,
            description: i.description,
            itemCode: i.itemCode,
            quantity: i.quantity,
            rejectedQuantity: 0,
        })),
    );
    const [allocRows, setAllocRows] = useState<AllocationInventoryRow[]>([]);
    const [allocItems, setAllocItems] = useState<AllocationPreviewItem[]>([]);
    const [allocStrategy, setAllocStrategy] = useState<BatchAllocationStrategy>('AUTO');
    const [appliedStrategy, setAppliedStrategy] = useState<BatchAllocationStrategy | null>(null);
    const [allocMode, setAllocMode] = useState<'auto' | 'manual'>('auto');
    const [allocQty, setAllocQty] = useState<Record<string, number>>(() => {
        const map: Record<string, number> = {};
        (record.items || []).forEach((i) => {
            if (i.id) map[i.id] = i.quantity;
        });
        return map;
    });
    const [overrideReason, setOverrideReason] = useState('');
    const [isPreviewingAllocation, setIsPreviewingAllocation] = useState(false);
    // The posted/attached session id, set once the check has been POSTED.
    const [checkingSessionId, setCheckingSessionId] = useState('');
    // The id of the invoice-checking session currently OPEN (not yet posted). Kept so a
    // second click loads it via /invoiceChecking/get instead of opening a duplicate.
    const [openCheckSessionId, setOpenCheckSessionId] = useState('');
    const [checkingSession, setCheckingSession] = useState<InvoiceCheckingSession | null>(null);
    // Retained after the session dialog closes so the accepted quantities stay available
    // to validate the dispatch lines against.
    const [postedSession, setPostedSession] = useState<InvoiceCheckingSession | null>(null);
    const [pendingPostId, setPendingPostId] = useState('');
    // Any discrepancy the check leaves OPEN has to be decided before the check can
    // be posted, so the recorded session parks here until the resolve call is done.
    const [resolveTarget, setResolveTarget] = useState<InvoiceCheckingSession | null>(null);
    const [isPostingCheck, setIsPostingCheck] = useState(false);
    const [notes, setNotes] = useState('');
    const [cancelNotes, setCancelNotes] = useState('');
    const [isPending, setIsPending] = useState(false);
    // Read-only viewing of the posted check inside the dispatch/delivery dialogs.
    const [viewSessionId, setViewSessionId] = useState('');
    // Set true the instant the post-approval token is granted. The ApprovalDialog calls
    // onApproved then onClose, so handlePostCancel must not purge a freshly granted token.
    const postApprovalJustGrantedRef = useRef(false);

    const allocKey = (line: ActionLine) => line.id || line.companyStockDetailId;
    const autoQty = (line: ActionLine) => allocQty[allocKey(line)] ?? line.quantity;
    // Any line whose allocation quantity exceeds the quantity the store ordered needs a
    // supervisor override. The reason field is shown up front so the 428 is not a surprise.
    const hasOverSupply = allocLines.some((line) => autoQty(line) > qtyNumber(line.quantity));

    // Once the fresh order arrives, default the dispatch/delivery lines to the quantity
    // still outstanding for THIS leg — never the full order quantity and never what a
    // previous leg already handled:
    //   dispatch: pickedQuantity - dispatchedQuantity
    //   delivery: dispatchedQuantity - deliveredQuantity - rejectedQuantity
    useEffect(() => {
        if (kind !== 'dispatch' && kind !== 'delivery') return;
        const items = (fresh.items || fresh.salesOrderItems || []) as CompanyDebtorOrderItem[];
        if (!items.length) return;
        if (kind === 'dispatch') {
            setDispatchLines(
                items.map((i) => ({
                    id: i.id,
                    companyStockDetailId: i.companyStockDetailId,
                    description: i.description,
                    itemCode: i.itemCode,
                    quantity: Math.max(0, qtyNumber(i.pickedQuantity) - qtyNumber(i.dispatchedQuantity)),
                })),
            );
        } else {
            setDeliveryLines(
                items.map((i) => ({
                    id: i.id,
                    companyStockDetailId: i.companyStockDetailId,
                    description: i.description,
                    itemCode: i.itemCode,
                    quantity: Math.max(
                        0,
                        qtyNumber(i.dispatchedQuantity) -
                            qtyNumber(i.deliveredQuantity) -
                            qtyNumber(i.rejectedQuantity),
                    ),
                    rejectedQuantity: 0,
                })),
            );
        }
    }, [kind, fresh?.items]);

    // Load the allocation preview (the inventory batches the backend would reserve
    // for the selected strategy) whenever the allocate dialog opens or the strategy
    // / allocation mode changes.
    useEffect(() => {
        if (kind !== 'allocate') return;

        setIsPreviewingAllocation(true);
        allocationPreview
            .mutateAsync({
                id: saleOrderId,
                saleOrderId,
                ...(companyDebtorId ? { companyDebtorId } : {}),
                strategy: allocStrategy,
                items: allocLines.map((line) => ({ id: line.id, quantity: autoQty(line) })),
            })
            .then((resData) => {
                const data = resData?.data;
                const previewRows: AllocationPreviewItem[] = data?.rows || data?.items || [];

                setAppliedStrategy(
                    (data?.strategyConfigured || resData?.strategyConfigured || null) as BatchAllocationStrategy | null,
                );
                setAllocItems(previewRows);

                const next: AllocationInventoryRow[] = [];
                allocLines.forEach((line) => {
                    const item = previewRows.find((r) => r.companyStockDetailId === line.companyStockDetailId);
                    (item?.rows || []).forEach((b) => {
                        next.push({
                            itemId: line.id,
                            companyStockDetailId: line.companyStockDetailId,
                            companyStockInventoryId: b.companyStockInventoryId || '',
                            description: line.description,
                            itemCode: line.itemCode,
                            batchNumber: b.batchNumber,
                            expiryDate: b.expiryDate,
                            receivedAt: b.receivedAt,
                            priority: b.priority,
                            warehouseName: b.warehouseId
                                ? warehouseNameById[b.warehouseId] || b.warehouseId
                                : undefined,
                            quantity: b.quantity ?? 0,
                        });
                    });
                });
                setAllocRows(next);
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Could not load allocation preview');
            })
            .finally(() => setIsPreviewingAllocation(false));
    }, [kind, saleOrderId, allocStrategy, allocMode]);

    // Opening the Dispatch / Confirm Delivery dialogs starts the Checking Template flow
    // for that leg (OUTGOING before Dispatch, INCOMING before Delivery). It runs once per
    // dialog; re-opening reloads the order + the existing check via /invoiceChecking/get,
    // and never opens a second session for the same life-cycle leg.
    const autoTemplateStartedRef = useRef(false);
    useEffect(() => {
        if (kind !== 'dispatch' && kind !== 'delivery') return;
        if (checkingSessionId || openCheckSessionId) return;
        if (autoTemplateStartedRef.current) return;
        autoTemplateStartedRef.current = true;
        handleCheckingTemplate(kind === 'dispatch' ? 'OUTGOING' : 'INCOMING');
    }, [kind, checkingSessionId, openCheckSessionId, saleOrderId]);

    const execute = (approvalToken?: string, allocateOverrideReason?: string) => {
        const base = { saleOrderId, companyDebtorId, lifecycleVersion: version, clientEventId };
        if (kind === 'schedule') {
            return scheduleMut.mutateAsync({
                ...base,
                scheduledDeliveryDate: scheduleDate,
                responsibleUserId: responsibleUserId || undefined,
            });
        }
        if (kind === 'allocate') {
            if (allocMode === 'manual') {
                const items = allocLines
                    .filter((line) => autoQty(line) > 0)
                    .map((line) => ({
                        id: line.id,
                        quantity: autoQty(line),
                        strategy: allocStrategy,
                        batchAllocations: allocRows
                            .filter(
                                (r) =>
                                    r.companyStockDetailId === line.companyStockDetailId &&
                                    r.quantity > 0 &&
                                    r.companyStockInventoryId,
                            )
                            .map((r) => ({
                                companyStockInventoryId: r.companyStockInventoryId,
                                quantity: r.quantity,
                            })),
                    }));
                return allocateMut.mutateAsync({
                    ...base,
                    overrideBatchAllocation: true,
                    overrideReason: allocateOverrideReason || overrideReason || undefined,
                    items,
                    approvalToken,
                });
            }
            const items = allocLines
                .filter((line) => autoQty(line) > 0)
                .map((line) => ({ id: line.id, quantity: autoQty(line), strategy: allocStrategy }));
            return allocateMut.mutateAsync({
                ...base,
                items,
                approvalToken,
                ...(allocateOverrideReason || overrideReason
                    ? { overrideReason: allocateOverrideReason || overrideReason }
                    : {}),
            });
        }
        if (kind === 'pick') {
            const items = pickLines.filter((l) => l.quantity > 0).map((l) => ({ id: l.id, quantity: l.quantity }));
            if (!pickClientEventIdRef.current) pickClientEventIdRef.current = crypto.randomUUID();
            return pickMut.mutateAsync({
                saleOrderId,
                ...(companyDebtorId ? { companyDebtorId } : {}),
                lifecycleVersion: version,
                clientEventId: pickClientEventIdRef.current,
                items,
            });
        }
        if (kind === 'dispatch') {
            return dispatchMut.mutateAsync({
                ...base,
                invoiceCheckingSessionId: checkingSessionId,
                items: dispatchLines
                    .filter((l) => l.quantity > 0)
                    .map((l) => ({
                        id: l.id,
                        quantity: l.quantity,
                    })),
                approvalToken,
            });
        }
        if (kind === 'delivery') {
            return deliveryMut.mutateAsync({
                ...base,
                invoiceCheckingSessionId: checkingSessionId,
                notes: notes || undefined,
                items: deliveryLines
                    .filter((l) => l.quantity > 0 || (l.rejectedQuantity ?? 0) > 0)
                    .map((l) => ({
                        id: l.id,
                        quantity: l.quantity,
                        rejectedQuantity: l.rejectedQuantity ?? 0,
                    })),
                approvalToken,
            });
        }
        if (kind === 'cancel') {
            return cancelMut.mutateAsync({ ...base, notes: cancelNotes || undefined, approvalToken });
        }
        throw new Error('Unknown action');
    };

    interface LifecycleActionResponse {
        success: boolean;
        message: string;
        data?: CompanyDebtorOrder;
    }

    const handleSuccess = (data?: LifecycleActionResponse) => {
        if (data?.success) {
            toast.success(okMessage);
            onClose();
        } else {
            toast.error(data?.message || 'Action failed');
        }
    };

    const run = (allocateOverrideReason?: string) => {
        setIsPending(true);
        execute(undefined, allocateOverrideReason)
            .then((data) => {
                setIsPending(false);
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);

                // Over-supply is decided by a supervisor, not resolved by re-sending the
                // same call. Save the request id for status polling and stop — the allocate
                // button stays disabled so no second request can be raised.
                if (isOverSupplyError(error)) {
                    const requestId = getOverSupplyApprovalId(error);
                    if (requestId && requestId === replayedOverSupplyRef.current) {
                        replayedOverSupplyRef.current = null;
                        toast.error(
                            'The approval was recorded but the allocation is still blocked. Ask the supervisor to review it again.',
                        );
                    } else if (requestId) {
                        setOverSupplyRequestId(requestId);
                        toast.info('Over-supply approval requested. Waiting for a supervisor to approve it.');
                    } else {
                        toast.error(
                            'Over-supply needs a supervisor approval to continue. The action was not performed.',
                        );
                    }
                    return;
                }

                const info = isApprovalRequiredError(error);
                if (info) {
                    setApproval({ ...info, actionLabel });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleApproved = (token: string) => {
        setIsPending(true);
        execute(token)
            .then((data) => {
                setIsPending(false);
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    useEffect(() => {
        if (!overSupplyRequestId) return;
        const decisionStatus = overSupplyStatusQuery.data?.data?.status;
        if (decisionStatus === 'REJECTED') {
            toast.error('Over-supply request was rejected. Adjust the quantity or reason and submit again.');
            setOverSupplyRequestId(null);
            return;
        }
        if (decisionStatus !== 'APPROVED') return;

        const approvedRequestId = overSupplyRequestId;
        setOverSupplyRequestId(null);
        replayedOverSupplyRef.current = approvedRequestId;
        toast.success('Over-supply request approved. Continuing allocation…');
        refetchOrder()
            .then(({ data }) => {
                const latest = data?.data;
                const allocationFinished =
                    !!latest &&
                    [
                        'ALLOCATED',
                        'PART_PICKED',
                        'PICKED',
                        'PART_DISPATCHED',
                        'DISPATCHED',
                        'PART_DELIVERED',
                        'DELIVERED',
                        'DELIVERED_WITH_EXCEPTION',
                        'CANCELLED',
                    ].includes(latest.lifecycleStatus);
                if (allocationFinished) {
                    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorOrder)] });
                    onClose();
                    return;
                }
                run(overrideReason);
            })
            .catch(() => run(overrideReason));
    }, [overSupplyStatusQuery.data, overSupplyRequestId]);

    const handleActions = () => {
        if (kind === 'schedule' && !scheduleDate) return toast.error('Select a scheduled delivery date');
        if (kind === 'pick' && !pickLines.some((l) => l.quantity > 0))
            return toast.error('Enter a picked quantity for at least one item');
        if (kind === 'allocate' && allocMode === 'auto' && !allocLines.some((line) => autoQty(line) > 0))
            return toast.error('Enter an allocation quantity for at least one item');
        if (kind === 'allocate') {
            // A request is already with a supervisor — do not raise a second one.
            if (overSupplyRequestId) return toast.info('An over-supply approval is already pending for this order.');
            // Manual batches are always justified; over-supply is justified when the
            // allocation exceeds what the store ordered.
            if ((allocMode === 'manual' || hasOverSupply) && !overrideReason.trim()) {
                return toast.error(
                    hasOverSupply
                        ? 'An override reason is required when allocating more than ordered'
                        : 'A reason is required for a manual batch override',
                );
            }
        }
        if (kind === 'dispatch' && !checkingSessionId) return toast.error('Generate and post the outgoing check first');
        if (kind === 'dispatch') {
            // The backend requires each dispatch line to equal the accepted quantity on the
            // posted check, so catch a mismatch here rather than letting the call fail.
            const mismatch = findAcceptedQuantityMismatch(dispatchLines, postedSession);
            if (mismatch) return toast.error(mismatch);
        }
        if (kind === 'delivery' && !checkingSessionId) return toast.error('Generate and post the incoming check first');
        if (kind === 'delivery' && deliveryLines.some((l) => (l.rejectedQuantity ?? 0) > 0) && !notes.trim())
            return toast.error('Notes are required when any quantity is rejected');
        run();
    };

    const handleCheckingTemplate = (direction: 'OUTGOING' | 'INCOMING') => {
        if (checkingSessionId) {
            toast.info(`Check session ${checkingSessionId} is already attached`);
            return;
        }
        setIsPending(true);
        checkingTemplate
            .mutateAsync({ saleOrderId, direction, ...(companyDebtorId ? { companyDebtorId } : {}) })
            .then(async (resData) => {
                if (!resData?.success) {
                    throw new Error(resData?.message || 'Could not generate template');
                }
                const payload = resData?.data as CheckingTemplateData | undefined;

                // The backend reports an already-open check for this order/direction.
                // Its id is authoritative: never open a second session, just load it.
                let existingSessionId = '';
                if (payload?.hasExistingInvoiceCheck) {
                    existingSessionId = payload.existingInvoiceCheck?.id || '';
                    if (!existingSessionId) {
                        throw new Error('Backend reported an existing invoice check, but returned no session id');
                    }
                } else if (openCheckSessionId) {
                    // Fallback for a check opened earlier in this dialog when the
                    // template response carries no existing-check information.
                    existingSessionId = openCheckSessionId;
                }

                if (existingSessionId) {
                    const existing = await getInvoiceCheckById(existingSessionId);
                    if (!existing?.success || !existing?.data) {
                        throw new Error(existing?.message || 'Could not load the checking session');
                    }
                    setOpenCheckSessionId(existingSessionId);
                    rememberOpenedCheckSession(existingSessionId);

                    // Re-entry: the session was already approved/posted earlier, so there is
                    // nothing left to submit. Re-posting would be rejected, so just attach it
                    // read-only and let the flow continue. Only POSTED is final.
                    if (existing.data.status === 'APPROVED' || existing.data.status === 'POSTED') {
                        setPostedSession(existing.data);
                        setCheckingSessionId(existingSessionId);
                        toast.success(
                            existing.data.status === 'POSTED'
                                ? 'Check already posted — session attached'
                                : 'Check already approved — session attached',
                        );
                        return;
                    }

                    // Re-entry: every product was already resolved and posted, so skip the
                    // record/resolve screen and hit the post API directly, then continue.
                    // tryPostCheck reuses the approval token cached against this session id
                    // (see tryPostCheck) so the post is not re-gated by 428.
                    const checkedLines = existing.data.discrepancies || [];
                    const allResolved =
                        checkedLines.length > 0 && checkedLines.every((line) => line.status === 'RESOLVED');
                    if (allResolved) {
                        // Keep the accepted quantities for dispatch validation, and remember the
                        // session so an approval-required (428) retry can re-post.
                        setPendingPostId(existingSessionId);
                        setPostedSession(existing.data);
                        toast.success('All products already resolved — posting the check automatically');
                        tryPostCheck(existingSessionId);
                        return;
                    }

                    setCheckingSession(existing.data);
                    toast.success(
                        payload?.hasExistingInvoiceCheck
                            ? 'Continuing the existing checking session'
                            : 'Loaded the existing checking session',
                    );
                    return;
                }

                if (!payload || !Array.isArray(payload.items) || !payload.items.length) {
                    throw new Error('Template generated, but it contains no items to check');
                }
                if (!payload.clientDocumentId) {
                    throw new Error('Checking template did not return a clientDocumentId');
                }
                // The open call requires a stock detail per line; drop any template row
                // that arrived without one rather than sending an invalid payload.
                const openItems = payload.items
                    .filter((it) => !!it.companyStockDetailId)
                    .map((it) => ({
                        companyStockDetailId: it.companyStockDetailId as string,
                        expectedQuantity: Number(it.expectedQuantity) || 0,
                        ...(it.expectedUnitPrice != null ? { expectedUnitPrice: Number(it.expectedUnitPrice) } : {}),
                    }));
                if (!openItems.length) {
                    throw new Error('Template contains no lines with a stock detail id');
                }

                const opened = await openInvoiceCheck({
                    clientDocumentId: payload.clientDocumentId,
                    sourceDocumentType: payload.sourceDocumentType || 'SALE_ORDER',
                    ...(payload.sourceDocumentId ? { sourceDocumentId: payload.sourceDocumentId } : {}),
                    ...(payload.sourceDocumentNumber ? { sourceDocumentNumber: payload.sourceDocumentNumber } : {}),
                    direction: (payload.direction || direction) as InvoiceCheckDirection,
                    ...(payload.companyDebtorId ? { companyDebtorId: payload.companyDebtorId } : {}),
                    ...(payload.warehouseId ? { warehouseId: payload.warehouseId } : {}),
                    items: openItems,
                });
                if (!opened?.success || !opened?.data) {
                    throw new Error(opened?.message || 'Could not open the checking session');
                }
                if (!opened.data.id) {
                    throw new Error('Checking session opened, but no session id was returned');
                }
                // Saved so later clicks load this same session instead of a new one.
                setOpenCheckSessionId(opened.data.id);
                rememberOpenedCheckSession(opened.data.id);
                setCheckingSession(opened.data);
                toast.success('Checking session started — record the actual quantities');
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
            })
            .finally(() => setIsPending(false));
    };

    const tryPostCheck = (sessionId: string, approvalToken?: string, approvalActionCode?: string) => {
        // Every post path (fresh flow, resolve flow, re-entry auto-post) falls back to the
        // approval token cached against this session id — the one granted by the approval
        // API, which may still be valid — so it is reused instead of triggering another 428.
        const cachedApproval = approvalToken ? null : findStoredCheckApprovalToken(sessionId);
        const effectiveToken = approvalToken || cachedApproval?.token;
        const effectiveActionCode = approvalActionCode || cachedApproval?.actionCode;
        setIsPostingCheck(true);
        postCheckMut
            .mutateAsync({
                id: sessionId,
                ...(effectiveToken ? { approvalToken: effectiveToken } : {}),
                ...(effectiveActionCode ? { approvalActionCode: effectiveActionCode } : {}),
            })
            .then(async (res) => {
                if (!res?.success) {
                    toast.error(res?.message || 'Could not post the check');
                    return;
                }
                // Only POSTED is final: reload the check from the backend and use its state.
                let finalSession: InvoiceCheckingSession | null = res.data || null;
                try {
                    const reloaded = await getInvoiceCheckById(sessionId);
                    if (reloaded?.success && reloaded.data) finalSession = reloaded.data;
                } catch {
                    // Reload failed — keep the post response.
                }
                if (finalSession?.status === 'POSTED') {
                    setCheckingSessionId(sessionId);
                    setPostedSession(finalSession);
                    toast.success('Check posted and session attached');
                } else {
                    setCheckingSessionId(sessionId);
                    setPostedSession(finalSession || res.data || null);
                    toast.success('Checking posted and session attached automatically');
                }
            })
            .catch((error) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    postApprovalCtl.setApproval({ ...info, actionLabel: 'Post Invoice Check' });
                    return;
                }
                // A timed-out post may still have committed server-side. Confirm via the
                // detail endpoint before surfacing an error; only POSTED is final.
                getInvoiceCheckById(sessionId)
                    .then((reloaded) => {
                        if (reloaded?.success && reloaded.data?.status === 'POSTED') {
                            setCheckingSessionId(sessionId);
                            setPostedSession(reloaded.data);
                            toast.success('The check was posted before the request timed out.');
                        } else {
                            // @ts-ignore
                            toast.error(error?.response?.data?.message || 'Could not post the check');
                        }
                    })
                    .catch(() => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Could not post the check');
                    });
            })
            .finally(() => setIsPostingCheck(false));
    };

    // The ApprovalDialog fires onApproved first, then onClose. After a grant the token is
    // already resubmitted by handlePostApproved, so handlePostCancel only purges + reloads
    // when the supervisor rejected/cancelled or the approval dialog was dismissed.
    const handlePostCancel = () => {
        const justGranted = postApprovalJustGrantedRef.current;
        postApprovalJustGrantedRef.current = false;
        postApprovalCtl.closeApproval();
        if (justGranted) return;
        if (pendingPostId) {
            // A rejected/cancelled/expired token must never be reused — a fresh Post click
            // raises a new approval request. Reload the check so the UI reflects backend
            // state (only POSTED is final) instead of the stale local copy.
            forgetCheckApprovalToken(pendingPostId);
            getInvoiceCheckById(pendingPostId)
                .then((reloaded) => {
                    if (reloaded?.success && reloaded.data) {
                        setPostedSession(reloaded.data);
                    }
                })
                .catch(() => undefined);
        }
    };

    const handleCheckingRecorded = (session: InvoiceCheckingSession) => {
        setCheckingSession(null);
        const sessionId = session?.id;
        if (!sessionId) {
            toast.error('Checked, but no session id was returned');
            return;
        }
        // Keep the checked line so the dispatch quantities can be defaulted to, and
        // validated against, the accepted quantity.
        setPostedSession(session);
        setPendingPostId(sessionId);

        // A check can only be posted once every discrepancy has a decision. Anything
        // still OPEN (short, damaged, over) opens the resolve dialog first, and the
        // post is picked up again from onResolved.
        const openDiscrepancies = (session.discrepancies || []).filter((d) => d.status === 'OPEN');
        if (openDiscrepancies.length) {
            setResolveTarget(session);
            return;
        }
        tryPostCheck(sessionId);
    };

    const handleCheckResolved = (resolved: InvoiceCheckingSession) => {
        setResolveTarget(null);
        const sessionId = resolved?.id || pendingPostId;
        if (!sessionId) {
            toast.error('Resolved, but no session id was returned');
            return;
        }
        setPendingPostId(sessionId);
        setPostedSession(resolved);
        tryPostCheck(sessionId);
    };

    const handlePostApproved = (token: string, _tokens?: Record<string, string>, approvalExpiresAt?: string) => {
        // The 428 tells us which action the token was granted for; it keys approvalTokens.
        const actionCode = postApprovalCtl.approval?.actionCode;
        // Mark the grant BEFORE closing so the ApprovalDialog's follow-on onClose does not
        // purge this freshly granted token via handlePostCancel.
        postApprovalJustGrantedRef.current = true;
        postApprovalCtl.closeApproval();
        if (pendingPostId) {
            // Cache the granted token against the checking session id so a later re-entry can
            // reuse it (until it expires) instead of hitting the 428 approval gate again.
            rememberCheckApprovalToken(pendingPostId, token, actionCode, approvalExpiresAt);
            // Call Post once with the granted token; only POSTED is final.
            tryPostCheck(pendingPostId, token, actionCode);
        }
    };

    const setLineQty = (list: ActionLine[], setter: (l: ActionLine[]) => void, index: number, qty: number) => {
        setter(list.map((l, i) => (i === index ? { ...l, quantity: qty } : l)));
    };

    const setLineRejected = (index: number, qty: number) => {
        setDeliveryLines((list) => list.map((l, i) => (i === index ? { ...l, rejectedQuantity: qty } : l)));
    };

    const setAllocRowQty = (index: number, qty: number) => {
        setAllocRows((list) => list.map((r, i) => (i === index ? { ...r, quantity: qty } : r)));
    };

    const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : '—');

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{ACTION_TITLES[kind]}</DialogTitle>
                    <DialogDescription>
                        {record.clientDocumentId || '—'} • {isRefreshing ? 'syncing…' : ''} v{version} → v{nextVersion}.
                        {kind === 'dispatch' || kind === 'delivery'
                            ? ' Quantities default to the outstanding amount for this leg only.'
                            : ' Quantities are cumulative totals.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
                    {kind === 'schedule' && (
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm font-medium">Scheduled Delivery Date</Label>
                                <Input
                                    type="date"
                                    className="mt-1"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                />
                                <p className="text-muted-foreground mt-1 text-xs">
                                    The backend adjusts the date to the store&apos;s configured weekly delivery day.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-muted-foreground mb-1 text-sm font-medium">Debtors</div>
                                    <SelectPopover
                                        title="Store"
                                        onlyTitle="All stores"
                                        selectedValue={responsibleUserDebtorId || ''}
                                        options={[
                                            { label: 'All stores', value: '' },
                                            ...dialogStores.map((s) => ({
                                                label: s.name || s.tradingAs || s.id,
                                                value: s.id,
                                            })),
                                        ]}
                                        onSelect={(value) => setResponsibleUserDebtorId(String(value || ''))}
                                    />
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1 text-sm font-medium">
                                        Responsible User
                                    </div>
                                    <SelectPopover
                                        title="User"
                                        onlyTitle="Select user"
                                        selectedValue={responsibleUserId || ''}
                                        options={users.map((u) => ({
                                            label: `${u.firstName} ${u.surname}`.trim(),
                                            value: u.id,
                                        }))}
                                        onSelect={(value) => setResponsibleUserId(String(value || ''))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {kind === 'allocate' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-muted-foreground mb-1 text-sm font-medium">
                                        Batch Allocation Strategy
                                    </div>
                                    <SelectPopover
                                        title="Strategy"
                                        onlyTitle="Select strategy"
                                        selectedValue={allocStrategy}
                                        options={BATCH_ALLOCATION_STRATEGIES.map((s) => ({ label: s, value: s }))}
                                        onSelect={(value) =>
                                            setAllocStrategy((value as BatchAllocationStrategy) || 'AUTO')
                                        }
                                    />
                                    {appliedStrategy ? (
                                        <p className="text-muted-foreground mt-1 text-xs">
                                            Applied by backend: {appliedStrategy}
                                        </p>
                                    ) : null}
                                </div>
                                <div>
                                    <div className="text-muted-foreground mb-1 text-sm font-medium">
                                        Allocation Mode
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={allocMode === 'auto' ? 'default' : 'outline'}
                                            onClick={() => setAllocMode('auto')}
                                        >
                                            Automatic
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={allocMode === 'manual' ? 'default' : 'outline'}
                                            onClick={() => setAllocMode('manual')}
                                        >
                                            Manual override
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <p className="text-muted-foreground text-xs">
                                {allocMode === 'auto'
                                    ? 'Enter the cumulative quantity per item. The backend selects the batches using the strategy above (AUTO = FEFO when expiry dates exist, otherwise FIFO).'
                                    : 'Adjust the quantity per batch. Batch totals must equal the item target. Manual changes require a reason and supervisor approval.'}
                            </p>

                            {isPreviewingAllocation ? (
                                <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Loading allocation preview…
                                </div>
                            ) : (
                                <>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-muted-foreground border-b text-left text-xs">
                                                <th className="py-1">Product</th>
                                                {allocMode === 'manual' && <th className="py-1">Batch</th>}
                                                {allocMode === 'manual' && <th className="py-1">Expiry</th>}
                                                {allocMode === 'manual' && <th className="py-1">Received</th>}
                                                {allocMode === 'manual' && <th className="py-1">Priority</th>}
                                                {allocMode === 'manual' && <th className="py-1">Warehouse</th>}
                                                {allocMode === 'auto' && <th className="py-1 text-right">Requested</th>}
                                                {allocMode === 'auto' && <th className="py-1 text-right">Allocated</th>}
                                                {allocMode === 'auto' && <th className="py-1 text-right">Shortage</th>}
                                                <th className="py-1 text-right">
                                                    {allocMode === 'manual' ? 'Batch Qty' : 'Allocate Qty'}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allocMode === 'auto'
                                                ? allocLines.map((line) => {
                                                      const item = allocItems.find(
                                                          (r) => r.companyStockDetailId === line.companyStockDetailId,
                                                      );
                                                      return (
                                                          <tr key={allocKey(line)} className="border-b">
                                                              <td className="py-1">
                                                                  {line.description || line.itemCode || '—'}
                                                              </td>
                                                              <td className="py-1 text-right tabular-nums">
                                                                  {item?.requestedQuantity ?? '—'}
                                                              </td>
                                                              <td className="py-1 text-right tabular-nums">
                                                                  {item?.allocatedQuantity ?? '—'}
                                                              </td>
                                                              <td className="py-1 text-right tabular-nums">
                                                                  {item?.shortageQuantity ?? 0}
                                                              </td>
                                                              <td className="py-1 text-right">
                                                                  <Input
                                                                      type="number"
                                                                      min={0}
                                                                      className="ml-auto h-7 w-20"
                                                                      value={autoQty(line)}
                                                                      onChange={(e) =>
                                                                          setAllocQty((prev) => ({
                                                                              ...prev,
                                                                              [allocKey(line)]:
                                                                                  Number(e.target.value) || 0,
                                                                          }))
                                                                      }
                                                                  />
                                                              </td>
                                                          </tr>
                                                      );
                                                  })
                                                : allocRows.map((r, i) => (
                                                      <tr
                                                          key={`${r.companyStockInventoryId || r.companyStockDetailId}-${i}`}
                                                          className="border-b align-top"
                                                      >
                                                          <td className="py-1">{r.description || r.itemCode || '—'}</td>
                                                          <td className="py-1 font-mono text-xs">
                                                              {r.batchNumber || '—'}
                                                          </td>
                                                          <td className="py-1">{fmtDate(r.expiryDate)}</td>
                                                          <td className="py-1">{fmtDate(r.receivedAt)}</td>
                                                          <td className="py-1">{r.priority ?? '—'}</td>
                                                          <td className="py-1">{r.warehouseName || '—'}</td>
                                                          <td className="py-1 text-right">
                                                              <Input
                                                                  type="number"
                                                                  min={0}
                                                                  className="ml-auto h-7 w-20"
                                                                  value={r.quantity}
                                                                  onChange={(e) =>
                                                                      setAllocRowQty(i, Number(e.target.value) || 0)
                                                                  }
                                                              />
                                                          </td>
                                                      </tr>
                                                  ))}
                                        </tbody>
                                    </table>

                                    {allocMode === 'manual' && !allocRows.length ? (
                                        <p className="text-muted-foreground py-4 text-sm">
                                            No inventory is available to allocate for this order. Confirm stock levels
                                            and try again.
                                        </p>
                                    ) : allocMode === 'auto' && !allocItems.length ? (
                                        <p className="text-muted-foreground py-4 text-sm">
                                            No inventory is available to allocate for this order. Confirm stock levels
                                            and try again.
                                        </p>
                                    ) : null}

                                    {overSupplyRequestId ? (
                                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>
                                                    Over-supply approval pending. The allocation was not submitted. A
                                                    supervisor with the override permission must approve this request
                                                    before the order can be allocated.
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={overSupplyStatusQuery.isFetching}
                                                    onClick={() => overSupplyStatusQuery.refetch()}
                                                >
                                                    {overSupplyStatusQuery.isFetching ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        'Refresh status'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}

                                    {allocMode === 'manual' || hasOverSupply ? (
                                        <div className="space-y-1">
                                            <Label className="flex items-center gap-1 text-sm font-medium">
                                                Override Reason <MandatoryField />
                                            </Label>
                                            <Input
                                                value={overrideReason}
                                                onChange={(e) => setOverrideReason(e.target.value)}
                                                disabled={!!overSupplyRequestId}
                                                placeholder={
                                                    hasOverSupply
                                                        ? 'Reason for allocating more than ordered'
                                                        : 'Reason for the manual batch override'
                                                }
                                            />
                                            <p className="text-muted-foreground text-xs">
                                                {hasOverSupply
                                                    ? 'The requested quantity exceeds the ordered quantity. A reason is required and a supervisor must approve the over-supply before it is allocated.'
                                                    : 'Manual batch allocation must be justified. The reason is sent with the allocation and may require supervisor approval.'}
                                            </p>
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </div>
                    )}

                    {kind === 'pick' && (
                        <div className="space-y-3">
                            <p className="text-muted-foreground text-xs">
                                Confirm the picked (cumulative) quantity per item.
                            </p>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-b text-left text-xs">
                                        <th className="py-1">Product</th>
                                        <th className="py-1 text-right">Picked Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pickLines.map((l, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-1">{l.description || l.itemCode || '—'}</td>
                                            <td className="py-1 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="ml-auto h-7 w-20"
                                                    value={l.quantity}
                                                    onChange={(e) =>
                                                        setLineQty(
                                                            pickLines,
                                                            setPickLines,
                                                            i,
                                                            Number(e.target.value) || 0,
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {kind === 'dispatch' && (
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-xs">
                                The outgoing check for this dispatch leg must be POSTED first. It is served read-only
                                once posted — Confirm Dispatch is the only action left.
                            </p>
                            <div className="flex items-end justify-between gap-3">
                                <div className="min-w-[220px] flex-1">
                                    <Label className="text-sm font-medium">Posted Outgoing Check</Label>
                                    {checkingSessionId ? (
                                        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                            <div>
                                                <div className="font-mono text-xs font-medium text-emerald-700">
                                                    Session attached: {checkingSessionId}
                                                </div>
                                                <div className="text-muted-foreground text-xs">
                                                    Status: POSTED • read-only
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1 text-xs text-sky-600"
                                                onClick={() => setViewSessionId(checkingSessionId)}
                                            >
                                                <FileText className="h-3.5 w-3.5" /> View Outgoing Check
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/40 text-muted-foreground mt-1 rounded-md border px-3 py-2 text-xs">
                                            No posted check for this leg yet. Generate the template and complete the
                                            checking flow.
                                        </div>
                                    )}
                                </div>
                                {!checkingSessionId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleCheckingTemplate('OUTGOING')}
                                        disabled={isPending || isPostingCheck}
                                    >
                                        {isPostingCheck
                                            ? 'Posting check…'
                                            : openCheckSessionId
                                              ? 'Continue Checking Flow'
                                              : 'Generate Outgoing Template'}
                                    </Button>
                                )}
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-b text-left text-xs">
                                        <th className="py-1">Product</th>
                                        <th className="py-1 text-right">Remaining Dispatched Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dispatchLines.map((l, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-1">{l.description || l.itemCode || '—'}</td>
                                            <td className="py-1 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="ml-auto h-7 w-20"
                                                    value={l.quantity}
                                                    onChange={(e) =>
                                                        setLineQty(
                                                            dispatchLines,
                                                            setDispatchLines,
                                                            i,
                                                            Number(e.target.value) || 0,
                                                        )
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {kind === 'delivery' && (
                        <div className="space-y-4">
                            <p className="text-muted-foreground text-xs">
                                The incoming check for this delivery leg must be POSTED first. Accepted ({' '}
                                {deliveryLines.reduce((sum, l) => sum + (l.quantity || 0), 0)}) plus rejected ({' '}
                                {deliveryLines.reduce((sum, l) => sum + (l.rejectedQuantity ?? 0), 0)}) cannot exceed
                                the dispatched quantity for this leg.
                            </p>
                            <div className="flex items-end justify-between gap-3">
                                <div className="min-w-[220px] flex-1">
                                    <Label className="text-sm font-medium">Posted Incoming Check</Label>
                                    {checkingSessionId ? (
                                        <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                            <div>
                                                <div className="font-mono text-xs font-medium text-emerald-700">
                                                    Session attached: {checkingSessionId}
                                                </div>
                                                <div className="text-muted-foreground text-xs">
                                                    Status: POSTED • read-only
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1 text-xs text-sky-600"
                                                onClick={() => setViewSessionId(checkingSessionId)}
                                            >
                                                <FileText className="h-3.5 w-3.5" /> View Incoming Check
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/40 text-muted-foreground mt-1 rounded-md border px-3 py-2 text-xs">
                                            No posted check for this leg yet. Generate the template and complete the
                                            checking flow.
                                        </div>
                                    )}
                                </div>
                                {!checkingSessionId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleCheckingTemplate('INCOMING')}
                                        disabled={isPending || isPostingCheck}
                                    >
                                        {isPostingCheck
                                            ? 'Posting check…'
                                            : openCheckSessionId
                                              ? 'Continue Checking Flow'
                                              : 'Generate Incoming Template'}
                                    </Button>
                                )}
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Notes</Label>
                                <Input
                                    className="mt-1"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Received by store"
                                />
                            </div>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-muted-foreground border-b text-left text-xs">
                                        <th className="py-1">Product</th>
                                        <th className="py-1 text-right">Accepted Qty</th>
                                        <th className="py-1 text-right">Rejected Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryLines.map((l, i) => (
                                        <tr key={i} className="border-b">
                                            <td className="py-1">{l.description || l.itemCode || '—'}</td>
                                            <td className="py-1 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="ml-auto h-7 w-20"
                                                    value={l.quantity}
                                                    onChange={(e) =>
                                                        setLineQty(
                                                            deliveryLines,
                                                            setDeliveryLines,
                                                            i,
                                                            Number(e.target.value) || 0,
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="py-1 text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="ml-auto h-7 w-20"
                                                    value={l.rejectedQuantity ?? 0}
                                                    onChange={(e) => setLineRejected(i, Number(e.target.value) || 0)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {kind === 'cancel' && (
                        <div>
                            <Label className="text-sm font-medium">Notes</Label>
                            <Input
                                className="mt-1"
                                value={cancelNotes}
                                onChange={(e) => setCancelNotes(e.target.value)}
                                placeholder="Order cancelled by store"
                            />
                            <p className="text-muted-foreground mt-1 text-xs">
                                Cancellation releases reserved inventory and keeps the audit history.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleActions} disabled={isPending || isPostingCheck || !!overSupplyRequestId}>
                        {overSupplyRequestId
                            ? 'Awaiting Approval…'
                            : isPending || isPostingCheck
                              ? 'Submitting…'
                              : kind === 'cancel'
                                ? 'Cancel Order'
                                : kind === 'dispatch'
                                  ? 'Confirm Dispatch'
                                  : kind === 'delivery'
                                    ? 'Confirm Delivery'
                                    : `Confirm ${ACTION_TITLES[kind]}`}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleApproved}
            />

            <RecordCheckDialog
                session={checkingSession}
                open={!!checkingSession}
                onClose={() => setCheckingSession(null)}
                onRecorded={handleCheckingRecorded}
            />
            <ResolveCheckDialog
                session={resolveTarget}
                open={!!resolveTarget}
                onClose={() => setResolveTarget(null)}
                onResolved={handleCheckResolved}
            />
            <ApprovalDialog
                open={postApprovalCtl.openApproval}
                onClose={handlePostCancel}
                approvalRequestId={postApprovalCtl.approval?.approvalRequestId || undefined}
                allowedMethods={postApprovalCtl.approval?.allowedMethods}
                actionLabel={postApprovalCtl.approval?.actionLabel}
                onApproved={handlePostApproved}
            />

            <ViewCheckDialog
                session={viewSessionId ? ({ id: viewSessionId } as InvoiceCheckingSession) : null}
                open={!!viewSessionId}
                onClose={() => setViewSessionId('')}
            />
        </Dialog>
    );
};

export default Orders;