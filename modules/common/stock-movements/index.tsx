'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import { ArrowRightLeft, Loader2, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import moment from 'moment';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import {
    useGetCompanyDebtorOrderById,
    useGetCompanyDebtorOrderList,
    type CompanyDebtorOrder,
} from '@/api-queries/company-debtor-orders';
import { useGetOverSupplyApproval } from '@/api-queries/over-supply-approval';
import {
    STOCK_MOVEMENT_TYPES,
    useCreateStockMovement,
    useGetStockMovements,
    type CreateStockMovementInput,
    type StockMovementType,
} from '@/api-queries/stock-movements';
import { getOverSupplyApprovalId, isOverSupplyError } from '@/hooks/use-approval-required';
import { ProductSelection } from '@/modules/common/hoc/product-selection';
import BarcodeScanner from '@/modules/common/hoc/bar-code-scanner';
import { useNetworkStore } from '@/stores/network.store';

interface MovementLine {
    id?: string;
    companyStockDetailId: string;
    description?: string;
    itemCode?: string;
    quantity: number;
}

// Shape of one row returned by the stock movements list API. Quantities and costs
// arrive as decimal strings (e.g. "5.000"), so they are parsed before display.
interface MovementItemRow {
    id: string;
    sequenceNo?: number | null;
    companyStockDetailId?: string | null;
    companyStockInventoryId?: string | null;
    companyDebtorId?: string | null;
    warehouseId?: string | null;
    locationId?: string | null;
    salesOrderItemId?: string | null;

    batchNumber?: string | null;
    expiryDate?: string | null;
    expectedQuantity?: number | string | null;
    countedQuantity?: number | string | null;
    quantity?: number | string | null;
    variance?: number | string | null;
    unitCost?: number | string | null;

    isOverride?: boolean;
    overrideReason?: string | null;
    overrideApprovalRequestId?: string | null;
    remarks?: string | null;
    status?: string | null;

    stockDetail?: {
        id?: string;
        itemCode?: string | null;
        description?: string | null;
        alternativeDescription?: string | null;
        barcode?: string | null;
        generalCode?: string | null;
        packSize?: number | string | null;
        packDescription?: string | null;
    } | null;
}

interface MovementRow {
    id: string;
    documentNumber?: string | null;
    movementType?: string | null;
    movementDate?: string | null;
    batchNumber?: string | null;
    expiryDate?: string | null;
    referenceNumber?: string | null;
    remarks?: string | null;
    status?: string | null;
    addedByUser?: string | null;
    addedBy?: string | null;
    postedAt?: string | null;
    createdAt?: string | null;
    warehouse?: { warehouse?: string | null; description?: string | null } | null;
    companyDebtor?: { name?: string | null; tradingAs?: string | null } | null;
    items?: MovementItemRow[];
}

const qty = (value?: number | string | null) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
};

// Trims trailing zeros from decimal strings: "5.000" -> "5", "61.94" -> "61.94".
const fmtQty = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return String(Math.round(n * 1000) / 1000);
};

const fmtMoney = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : '—';
};

const fmtDate = (value?: string | null) => (value ? moment(value).format('DD MMM YYYY') : '—');
const fmtDateTime = (value?: string | null) => (value ? moment(value).format('DD MMM YY HH:mm') : '—');

const StatusBadge = ({ status }: { status?: string | null }) => {
    const className =
        status === 'POSTED'
            ? 'bg-emerald-100 text-emerald-800'
            : status === 'CANCELLED' || status === 'REJECTED'
              ? 'bg-red-100 text-red-800'
              : status === 'DRAFT' || status === 'PENDING'
                ? 'bg-amber-100 text-amber-800'
                : '';
    return (
        <Badge variant="outline" className={className}>
            {status || '—'}
        </Badge>
    );
};

const StockMovementDialog = ({
    open,
    onClose,
    onCreated,
}: {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}) => {
    const createMutation = useCreateStockMovement();
    const isOnline = useNetworkStore((state) => state?.online);
    const [warehouseId, setWarehouseId] = useState('');
    const [saleOrderId, setSaleOrderId] = useState('');
    const [isProductSelectionOpen, setIsProductSelectionOpen] = useState(false);
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [overrideReason, setOverrideReason] = useState('');
    const [lines, setLines] = useState<MovementLine[]>([]);
    const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
    const pendingPayloadRef = useRef<CreateStockMovementInput | null>(null);

    const { data: warehousesRes } = useGetWarehouses({ limit: 10, offset: 0 });
    const rawWarehouses = (warehousesRes?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    const { data: ordersRes } = useGetCompanyDebtorOrderList({ limit: 200, offset: 0 });
    const orders: CompanyDebtorOrder[] = ordersRes?.data?.rows || [];

    const { data: detailRes, isFetching: isLoadingOrder } = useGetCompanyDebtorOrderById(
        saleOrderId || null,
    );
    const order = detailRes?.data;

    const handleScannedTransferProduct = (productId: string, scannedBaseQuantity = 1) => {
        const orderItems = order?.items || order?.salesOrderItems || [];
        const orderItem = orderItems.find((item) => item.companyStockDetailId === productId);
        if (!orderItem) {
            toast.error('Scanned product is not on the selected sales order.');
            setScannedBarcode('');
            return;
        }

        const quantity = Math.max(1, Number(scannedBaseQuantity) || 1);
        setLines((current) => {
            const lineIndex = current.findIndex(
                (line) =>
                    line.companyStockDetailId === productId && (!orderItem.id || line.id === orderItem.id),
            );
            return current.map((line, index) =>
                index === lineIndex ? { ...line, quantity: line.quantity + quantity } : line,
            );
        });
        setScannedBarcode('');
    };

    const overSupplyQuery = useGetOverSupplyApproval(pendingApprovalId);

    useEffect(() => {
        if (!open) return;
        setWarehouseId('');
        setSaleOrderId('');
        setIsProductSelectionOpen(false);
        setScannedBarcode('');
        setOverrideReason('');
        setLines([]);
        setPendingApprovalId(null);
        pendingPayloadRef.current = null;
    }, [open]);

    useEffect(() => {
        if (!order) return;
        setWarehouseId((current) => current || order.warehouseId || '');
        const items = order.items || order.salesOrderItems || [];
        setLines(
            items.map((item) => {
                const outstanding = Math.max(
                    0,
                    qty(item.pickedQuantity) - qty(item.dispatchedQuantity),
                );
                return {
                    id: item.id,
                    companyStockDetailId: item.companyStockDetailId,
                    description: item.description,
                    itemCode: item.itemCode,
                    quantity: outstanding || qty(item.quantity),
                };
            }),
        );
    }, [order?.id]);

    useEffect(() => {
        if (!pendingApprovalId) return;
        const status = overSupplyQuery.data?.data?.status;
        if (status === 'REJECTED') {
            toast.error('Stock transfer was rejected by the supervisor.');
            setPendingApprovalId(null);
            pendingPayloadRef.current = null;
            return;
        }
        if (status !== 'APPROVED') return;

        const payload = pendingPayloadRef.current;
        setPendingApprovalId(null);
        pendingPayloadRef.current = null;
        if (!payload) return;
        toast.success('Stock transfer approved. Posting the movement…');
        submit(payload, true);
    }, [overSupplyQuery.data, pendingApprovalId]);

    const orderOptions = useMemo(
        () =>
            orders.map((item) => ({
                label: `${item.clientDocumentId || item.salesOrderNumber || item.id} · ${
                    item.companyDebtorName || 'Store'
                }`,
                value: item.saleOrderId || item.id,
            })),
        [orders],
    );

    const updateLine = (index: number, quantity: number) => {
        setLines((current) =>
            current.map((line, lineIndex) =>
                lineIndex === index ? { ...line, quantity } : line,
            ),
        );
    };

    function submit(payload: CreateStockMovementInput, isRetry = false) {
        createMutation.mutate(payload, {
            onSuccess: (response) => {
                if (!response.success) {
                    toast.error(response.message || 'Stock movement could not be created');
                    return;
                }
                toast.success('Stock transfer posted');
                onCreated();
                onClose();
            },
            onError: (error) => {
                if (isOverSupplyError(error)) {
                    const approvalId = getOverSupplyApprovalId(error);
                    if (isRetry) {
                        pendingPayloadRef.current = null;
                        toast.error(
                            'The approval was recorded but the transfer is still blocked. Ask the supervisor to review it again.',
                        );
                    } else if (approvalId) {
                        pendingPayloadRef.current = payload;
                        setPendingApprovalId(approvalId);
                        toast.info('Over-supply approval requested. Waiting for a supervisor.');
                    } else {
                        toast.error('Over-supply approval is required for this transfer.');
                    }
                    return;
                }
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    const handleSubmit = () => {
        if (!warehouseId) return toast.error('Select the source warehouse');
        if (!saleOrderId) return toast.error('Select a sales order');
        const items = lines.filter((line) => line.quantity > 0);
        if (!items.length) return toast.error('Enter a transfer quantity for at least one item');
        const payload: CreateStockMovementInput = {
            movementType: 'TRANSFER_OUT',
            warehouseId,
            salesOrderId: saleOrderId,
            ...(overrideReason.trim() ? { overrideReason: overrideReason.trim() } : {}),
            items: items.map((line) => ({
                companyStockDetailId: line.companyStockDetailId,
                ...(line.id ? { salesOrderItemId: line.id } : {}),
                quantity: line.quantity,
            })),
        };
        submit(payload);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next && !createMutation.isPending && !pendingApprovalId) onClose();
            }}
        >
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Create Stock Transfer Out</DialogTitle>
                    <DialogDescription>
                        Move stock out of a warehouse against a sales order. Over-supply requires supervisor
                        approval.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <Label className="text-sm">Source Warehouse</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Warehouse"
                                    onlyTitle="Select warehouse"
                                    selectedValue={warehouseId}
                                    options={warehouses.map((warehouse) => ({
                                        label: warehouse.warehouse || warehouse.name || warehouse.id,
                                        value: warehouse.id,
                                    }))}
                                    onSelect={(value) => setWarehouseId(String(value || ''))}
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-sm">Sales Order</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Sales Order"
                                    onlyTitle="Select sales order"
                                    selectedValue={saleOrderId}
                                    options={orderOptions}
                                    onSelect={(value) => setSaleOrderId(String(value || ''))}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm">Override Reason</Label>
                        <Input
                            className="mt-1"
                            value={overrideReason}
                            onChange={(event) => setOverrideReason(event.target.value)}
                            placeholder="Required when transferring more than available stock"
                        />
                    </div>

                    <div className="rounded-md border">
                        <div className="grid grid-cols-[1fr_120px] border-b px-3 py-2 text-xs font-medium">
                            <span>Item</span>
                            <span className="text-right">Transfer Qty</span>
                        </div>
                        {isLoadingOrder ? (
                            <div className="flex items-center justify-center p-6">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        ) : lines.length ? (
                            lines.map((line, index) => (
                                <div
                                    key={`${line.id || line.companyStockDetailId}-${index}`}
                                    className="grid grid-cols-[1fr_120px] items-center gap-2 border-b px-3 py-2 last:border-b-0"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm">{line.description || '—'}</div>
                                        <div className="text-muted-foreground text-xs">{line.itemCode || ''}</div>
                                    </div>
                                    <Input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="h-8 text-right"
                                        value={line.quantity || ''}
                                        onChange={(event) =>
                                            updateLine(index, Number(event.target.value) || 0)
                                        }
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground p-4 text-center text-sm">
                                Select a sales order with items.
                            </p>
                        )}
                    </div>
                </div>

                {isProductSelectionOpen && (
                    <ProductSelection
                        isOpen={isProductSelectionOpen}
                        onClose={() => {
                            setIsProductSelectionOpen(false);
                            setScannedBarcode('');
                        }}
                        onSelectProduct={(product, _price, scannedBaseQuantity) => {
                            if (product) handleScannedTransferProduct(product.id, scannedBaseQuantity);
                        }}
                        warehouseId={warehouseId || undefined}
                        isOnline={isOnline}
                        scannedBarcode={scannedBarcode}
                        setScannedBarcode={setScannedBarcode}
                        isGRV
                    />
                )}
                <BarcodeScanner
                    onScan={(barcode) => {
                        setScannedBarcode(String(barcode).trim());
                        setIsProductSelectionOpen(true);
                    }}
                    active={open && !!saleOrderId && !!warehouseId}
                />

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={createMutation.isPending || !!pendingApprovalId}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || !!pendingApprovalId}
                    >
                        {createMutation.isPending
                            ? 'Posting…'
                            : pendingApprovalId
                              ? 'Awaiting Approval'
                              : 'Post Transfer Out'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const StockMovements = () => {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [movementType, setMovementType] = useState<StockMovementType | ''>('TRANSFER_OUT');
    const [createOpen, setCreateOpen] = useState(false);

    const query = useGetStockMovements({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(movementType ? { movementType } : {}),
    });
    const rows = (query.data?.data?.rows || []) as unknown as MovementRow[];
    const totalRowCount = query.data?.data?.count || 0;

    const columns: ColumnDef<MovementRow>[] = [
        {
            id: 'document',
            header: 'Document',
            cell: ({ row }) => (
                <div>
                    <div className="font-mono text-sm font-semibold">{row.original.documentNumber || '—'}</div>
                    {row.original.referenceNumber ? (
                        <div className="text-muted-foreground text-xs">Ref: {row.original.referenceNumber}</div>
                    ) : null}
                </div>
            ),
        },
        {
            id: 'movementDate',
            header: 'Movement Date',
            cell: ({ row }) => fmtDateTime(row.original.movementDate || row.original.createdAt),
        },
        {
            accessorKey: 'movementType',
            header: 'Type',
            cell: ({ row }) => (
                <Badge variant="outline">{(row.original.movementType || '—').replace(/_/g, ' ')}</Badge>
            ),
        },
        {
            id: 'warehouse',
            header: 'Warehouse',
            cell: ({ row }) => {
                const name = row.original.warehouse?.warehouse?.trim();
                const description = row.original.warehouse?.description?.trim();
                return (
                    <div>
                        <div>{name || '—'}</div>
                        {description && description !== name ? (
                            <div className="text-muted-foreground text-xs">{description}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'debtor',
            header: 'Store',
            cell: ({ row }) =>
                row.original.companyDebtor?.name || row.original.companyDebtor?.tradingAs || '—',
        },
        {
            id: 'items',
            header: 'Items',
            cell: ({ row }) => {
                const items = row.original.items || [];
                console.log("items",row)
                if (!items.length) return <span className="text-muted-foreground">—</span>;
                return (
                    <table className="w-full text-xs">
                        <thead className="text-muted-foreground border-b">
                            <tr className="text-left">
                                <th className="pr-2 font-medium">Item Code</th>
                                <th className="pr-2 font-medium">Description</th>
                                <th className="pr-2 font-medium">Barcode</th>
                                <th className="pr-2 font-medium">General Code</th>
                                <th className="pr-2 font-medium">Pack</th>
                                <th className="pr-2 font-medium">Batch</th>
                                <th className="pr-2 font-medium">Expiry</th>
                                <th className="pr-2 text-right font-medium">Expected</th>
                                <th className="pr-2 text-right font-medium">Qty</th>
                                <th className="pr-2 text-right font-medium">Variance</th>
                                <th className="text-right font-medium">Unit Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => {
                                const variance = qty(item.variance);
                                const product = item.stockDetail;
                                return (
                                    <tr key={item.id || index} className="border-b align-top last:border-b-0">
                                        <td className="pr-2 font-mono font-medium whitespace-nowrap">
                                            {product?.itemCode || '—'}
                                        </td>
                                        <td className="max-w-[220px] pr-2">
                                            <div className="break-words">{product?.description || '—'}</div>
                                            {product?.alternativeDescription ? (
                                                <div className="text-muted-foreground break-words">
                                                    {product.alternativeDescription}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="pr-2 font-mono whitespace-nowrap">{product?.barcode || '—'}</td>
                                        <td className="pr-2 font-mono whitespace-nowrap">
                                            {product?.generalCode || '—'}
                                        </td>
                                        <td className="pr-2 whitespace-nowrap">
                                            {product?.packSize != null && product.packSize !== ''
                                                ? `${fmtQty(product.packSize)}${
                                                      product.packDescription ? ` · ${product.packDescription}` : ''
                                                  }`
                                                : product?.packDescription || '—'}
                                        </td>
                                        <td className="pr-2 font-mono">{item.batchNumber || '—'}</td>
                                        <td className="pr-2">{fmtDate(item.expiryDate)}</td>
                                        <td className="pr-2 text-right tabular-nums">
                                            {fmtQty(item.expectedQuantity)}
                                        </td>
                                        <td className="pr-2 text-right font-medium tabular-nums">
                                            {fmtQty(item.quantity)}
                                        </td>
                                        <td
                                            className={`pr-2 text-right tabular-nums ${
                                                variance < 0 ? 'text-red-600' : variance > 0 ? 'text-amber-600' : ''
                                            }`}
                                        >
                                            {fmtQty(item.variance)}
                                        </td>
                                        <td className="text-right tabular-nums">{fmtMoney(item.unitCost)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                );
            },
        },
        {
            id: 'totalQuantity',
            header: 'Total Qty',
            cell: ({ row }) => {
                const items = row.original.items || [];
                const total = items.reduce((sum, item) => sum + qty(item.quantity), 0);
                return <div className="font-mono tabular-nums">{items.length ? fmtQty(total) : '—'}</div>;
            },
        },
        {
            id: 'addedBy',
            header: 'Added By',
            cell: ({ row }) => row.original.addedByUser || row.original.addedBy || '—',
        },
        {
            id: 'postedAt',
            header: 'Posted At',
            cell: ({ row }) => fmtDateTime(row.original.postedAt),
        },
        {
            id: 'remarks',
            header: 'Remarks',
            cell: ({ row }) => (
                <div className="line-clamp-2 max-w-[160px] break-words">{row.original.remarks || '—'}</div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="flex items-center gap-2 text-base font-semibold">
                            <ArrowRightLeft className="h-4 w-4" /> Stock Movements
                        </h1>
                        <p className="text-muted-foreground text-xs">
                            Transfer stock out of a warehouse against a sales order. Over-supply is routed to a
                            supervisor.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="min-w-[180px]">
                            <SelectPopover
                                title="Movement Type"
                                onlyTitle="All Types"
                                selectedValue={movementType}
                                options={[
                                    { label: 'All Types', value: '' },
                                    ...STOCK_MOVEMENT_TYPES.map((type) => ({
                                        label: type.replace(/_/g, ' '),
                                        value: type,
                                    })),
                                ]}
                                onSelect={(value) =>
                                    setMovementType(String(value || '') as StockMovementType | '')
                                }
                            />
                        </div>
                        <Button
                            variant="outline"
                            className="gap-2"
                            disabled={query.isFetching}
                            onClick={() => query.refetch()}
                        >
                            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" /> Transfer Out
                        </Button>
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />

                <StockMovementDialog
                    open={createOpen}
                    onClose={() => setCreateOpen(false)}
                    onCreated={() => query.refetch()}
                />
            </div>
        </PageLoader>
    ); 
};

export default StockMovements;