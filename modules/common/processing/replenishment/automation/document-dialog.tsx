import Link from 'next/link';
import moment from 'moment-timezone';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useGetCompanyDebtorOrderById } from '@/api-queries/company-debtor-orders';
import {
    getReplenishmentRunItems,
    getReplenishmentRunStatus,
    useGetReplenishmentRun,
} from '@/api-queries/replenishment';
import { useGetAutomationPurchaseOrder } from '@/api-queries/replenishment-automation';
import { AutomationExecutionStatusBadge, automationOutputLabel } from './components';

// Read-only preview of a document that a replenishment automation run created.
//
// The document itself is never edited here: the user continues in the existing
// authorised order workflow (store orders / purchase orders / saved runs).

export type AutomationDocumentTarget =
    | { kind: 'STORE_ORDER'; id: string; label?: string }
    | { kind: 'PURCHASE_ORDER'; id: string; label?: string }
    | { kind: 'RECOMMENDATION'; id: string; label?: string };

const num = (v?: number | string | null) => (v === null || v === undefined || v === '' ? '—' : v);

const fmtDateTime = (value?: string | null) => (value ? moment(value).format('DD MMM YY, HH:mm') : '—');

interface DocumentDialogProps {
    target: AutomationDocumentTarget;
    onClose: () => void;
}

const AutomationDocumentDialog = ({ target, onClose }: DocumentDialogProps) => {
    const storeOrderQuery = useGetCompanyDebtorOrderById(target.kind === 'STORE_ORDER' ? target.id : null);
    const purchaseOrderQuery = useGetAutomationPurchaseOrder(target.kind === 'PURCHASE_ORDER' ? target.id : null);
    const recommendationQuery = useGetReplenishmentRun(target.kind === 'RECOMMENDATION' ? target.id : null);

    const storeOrder = storeOrderQuery.data?.data;
    const purchaseOrder = purchaseOrderQuery.data?.data;
    const recommendation = recommendationQuery.data?.data;
    const recommendationItems = getReplenishmentRunItems(recommendation);

    const isLoading =
        (target.kind === 'STORE_ORDER' && storeOrderQuery.isLoading) ||
        (target.kind === 'PURCHASE_ORDER' && purchaseOrderQuery.isLoading) ||
        (target.kind === 'RECOMMENDATION' && recommendationQuery.isLoading);

    const error =
        (target.kind === 'STORE_ORDER' && storeOrderQuery.isError && storeOrderQuery.error) ||
        (target.kind === 'PURCHASE_ORDER' && purchaseOrderQuery.isError && purchaseOrderQuery.error) ||
        (target.kind === 'RECOMMENDATION' && recommendationQuery.isError && recommendationQuery.error);

    const title =
        target.kind === 'RECOMMENDATION'
            ? 'Replenishment recommendation'
            : `${automationOutputLabel(target.kind)} · ${target.label || target.id.slice(0, 8)}`;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[720px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <div className="max-h-[60vh] space-y-3 overflow-auto">
                    {isLoading && (
                        <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading the document…
                        </div>
                    )}

                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                                (error as Error)?.message ||
                                'The document could not be loaded.'}
                        </div>
                    )}

                    {target.kind === 'STORE_ORDER' && storeOrder && (
                        <>
                            <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-3">
                                <div>
                                    <div className="text-muted-foreground">Status</div>
                                    <Badge variant="outline" className="mt-0.5">
                                        {storeOrder.lifecycleStatus || 'REQUESTED'}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Store</div>
                                    <div className="mt-0.5 font-medium">
                                        {storeOrder.companyDebtorName || storeOrder.companyDebtorId || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Warehouse</div>
                                    <div className="mt-0.5 font-medium">
                                        {storeOrder.warehouseName || storeOrder.warehouseId || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Requested delivery</div>
                                    <div className="mt-0.5 font-medium">
                                        {fmtDateTime(storeOrder.requestedDeliveryDate)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Created</div>
                                    <div className="mt-0.5 font-medium">{fmtDateTime(storeOrder.createdAt)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Total quantity</div>
                                    <div className="mt-0.5 font-medium tabular-nums">
                                        {num(storeOrder.totalQuantity)}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <div className="border-b bg-muted/30 px-3 py-1.5 text-xs font-semibold">Order lines</div>
                                <table className="w-full text-xs">
                                    <thead className="text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-2 py-1.5 font-medium">Product</th>
                                            <th className="px-2 py-1.5 font-medium">Quantity</th>
                                            <th className="px-2 py-1.5 font-medium">Unit price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(storeOrder.items || []).map((item, index) => (
                                            <tr key={item.id || index} className="border-t">
                                                <td className="px-2 py-1.5">
                                                    <div>{item.description || '—'}</div>
                                                    <div className="text-muted-foreground">{item.itemCode || ''}</div>
                                                </td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">
                                                    {num(item.quantity)}
                                                </td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">
                                                    {num(item.unitPrice)}
                                                </td>
                                            </tr>
                                        ))}
                                        {(storeOrder.items || []).length === 0 && (
                                            <tr>
                                                <td className="px-2 py-2 text-muted-foreground" colSpan={3}>
                                                    No lines were returned for this order.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {target.kind === 'PURCHASE_ORDER' && purchaseOrder && (
                        <>
                            <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-3">
                                <div>
                                    <div className="text-muted-foreground">Status</div>
                                    <Badge variant="outline" className="mt-0.5">
                                        {String(purchaseOrder.status || 'DRAFT')}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Supplier</div>
                                    <div className="mt-0.5 font-medium">
                                        {purchaseOrder.CompanyCreditor?.name || purchaseOrder.companyCreditorId || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Order number</div>
                                    <div className="mt-0.5 font-medium">
                                        {purchaseOrder.poNumber || purchaseOrder.orderNumber || '—'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Order date</div>
                                    <div className="mt-0.5 font-medium">{fmtDateTime(purchaseOrder.orderDate)}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Expected delivery</div>
                                    <div className="mt-0.5 font-medium">
                                        {fmtDateTime(purchaseOrder.expectedDeliveryDate)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Total quantity</div>
                                    <div className="mt-0.5 font-medium tabular-nums">
                                        {num(purchaseOrder.totalQuantity)}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {target.kind === 'RECOMMENDATION' && recommendation && (
                        <>
                            <div className="grid gap-2 rounded-md border bg-muted/20 p-3 text-xs sm:grid-cols-3">
                                <div>
                                    <div className="text-muted-foreground">Status</div>
                                    <div className="mt-0.5">
                                        <AutomationExecutionStatusBadge status={getReplenishmentRunStatus(recommendation)} />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Calculation date</div>
                                    <div className="mt-0.5 font-medium">{recommendation.asOfDate || '—'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Saved</div>
                                    <div className="mt-0.5 font-medium">{fmtDateTime(recommendation.createdAt)}</div>
                                </div>
                            </div>

                            <div className="rounded-md border">
                                <div className="border-b bg-muted/30 px-3 py-1.5 text-xs font-semibold">
                                    Recommended lines ({recommendationItems.length})
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-2 py-1.5 font-medium">Product</th>
                                            <th className="px-2 py-1.5 font-medium">Available</th>
                                            <th className="px-2 py-1.5 font-medium">Target</th>
                                            <th className="px-2 py-1.5 font-medium">Recommended</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recommendationItems.map((item, index) => (
                                            <tr key={item.id || index} className="border-t">
                                                <td className="px-2 py-1.5">
                                                    <div>{item.description || '—'}</div>
                                                    <div className="text-muted-foreground">{item.skuCode || ''}</div>
                                                </td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">
                                                    {num(item.availableStock)}
                                                </td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">
                                                    {num(item.seasonalTargetQuantity ?? item.targetQuantity)}
                                                </td>
                                                <td className="px-2 py-1.5 font-mono font-semibold tabular-nums">
                                                    {num(item.recommendedQuantity)}
                                                </td>
                                            </tr>
                                        ))}
                                        {recommendationItems.length === 0 && (
                                            <tr>
                                                <td className="px-2 py-2 text-muted-foreground" colSpan={4}>
                                                    No lines were returned for this recommendation.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Close
                    </Button>
                    {target.kind === 'STORE_ORDER' && (
                        <Button size="sm" asChild>
                            <Link href="/processing/company-debtor-orders">Open Store Orders</Link>
                        </Button>
                    )}
                    {target.kind === 'PURCHASE_ORDER' && (
                        <Button size="sm" asChild>
                            <Link href="/processing/purchase-orders">Open Purchase Orders</Link>
                        </Button>
                    )}
                    {target.kind === 'RECOMMENDATION' && (
                        <Button size="sm" asChild>
                            <Link href="/processing/replenishment/history">Open Saved Runs</Link>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AutomationDocumentDialog;
