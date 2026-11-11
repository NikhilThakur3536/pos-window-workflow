'use client';

import { useEffect, useState } from 'react';
import moment from 'moment';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Separator } from '@/components/ui/separator';
import { Printer } from 'lucide-react';
import POItemsEditor from './components/po-items-editor';
import PurchaseOrderStatusDialog from './purchase-order-status-dialog';
import {
    PURCHASE_ORDER_STATUSES,
    PurchaseOrderDetails,
    TraceGoodsReceivedVoucher,
    TraceCommercialEntry,
    useGetPurchaseOrderById,
    useGetPurchaseOrderTrace,
    useGeneratePurchaseOrderPdf,
    useUpdatePurchaseOrder,
    useApprovePurchaseOrder,
    useSendPurchaseOrder,
    useSupplierConfirmPurchaseOrder,
    useCancelPurchaseOrder,
} from '@/api-queries/purchase-orders';

type PoAction = 'SEND' | 'CONFIRM' | 'CANCEL';

interface PurchaseOrderViewProps {
    orderId: string | null;
    onClose: () => void;
}

const PurchaseOrderView = ({ orderId, onClose }: PurchaseOrderViewProps) => {
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [paymentTermsDraft, setPaymentTermsDraft] = useState('');
    const [poAction, setPoAction] = useState<PoAction | null>(null);
    const [actionValue, setActionValue] = useState('');

    const {
        data: getRes,
        isLoading,
        refetch,
    } = useGetPurchaseOrderById(orderId || '');

    const traceQuery = useGetPurchaseOrderTrace(orderId || '');
    const updatePaymentTermsMut = useUpdatePurchaseOrder();

    useEffect(() => {
        if (orderId) {
            refetch();
            traceQuery.refetch();
        }
    }, [orderId]);

    useEffect(() => {
        if (getRes?.data) {
            setPaymentTermsDraft(getRes.data.paymentTerms || '');
        }
    }, [getRes?.data]);

    const order: PurchaseOrderDetails | undefined = getRes?.data;
    const trace = traceQuery?.data?.data;
    const traceOrigin = trace?.traceOrigin;
    const tracePO = trace?.purchaseOrder;
    const traceItems = tracePO?.PurchaseOrderItems || tracePO?.items || tracePO?.orderItems || [];
    const grvs: TraceGoodsReceivedVoucher[] = trace?.goodsReceivedVouchers || [];
    const commercialMap: TraceCommercialEntry[] = trace?.commercialTraceMap || [];

    const generatePdf = useGeneratePurchaseOrderPdf();
    const approveMut = useApprovePurchaseOrder();
    const sendMut = useSendPurchaseOrder();
    const confirmMut = useSupplierConfirmPurchaseOrder();
    const cancelMut = useCancelPurchaseOrder();

    const handleApprove = () => {
        if (!orderId) return;
        approveMut.mutate(
            { id: orderId },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Purchase order approved');
                        refetch();
                    } else {
                        toast.error(data?.message || 'Approval failed');
                        refetch();
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Approval failed');
                    refetch();
                },
            },
        );
    };

    const handleRunPoAction = (action: PoAction) => {
        if (!orderId) return;
        const run = () => {
            if (action === 'SEND') {
                sendMut.mutate(
                    {
                        id: orderId,
                        sendMethod: 'PDF',
                        recipient: actionValue.trim() || undefined,
                    },
                    { onSuccess: onActionSuccess, onError: onActionError },
                );
            } else if (action === 'CONFIRM') {
                confirmMut.mutate(
                    { id: orderId, confirmationNotes: actionValue.trim() || undefined },
                    { onSuccess: onActionSuccess, onError: onActionError },
                );
            } else {
                cancelMut.mutate(
                    { id: orderId, cancelReason: actionValue.trim() || undefined },
                    { onSuccess: onActionSuccess, onError: onActionError },
                );
            }
        };
        if (action === 'CANCEL') {
            // @ts-ignore
            if (window.confirm('Cancel this purchase order?')) run();
        } else {
            run();
        }
    };

    const onActionSuccess = (data?: { success?: boolean; message?: string }) => {
        if (data?.success) {
            toast.success(data?.message || 'Purchase order updated');
        } else {
            toast.error(data?.message || 'Purchase order action failed');
        }
        setPoAction(null);
        setActionValue('');
        refetch();
    };

    const onActionError = (error: unknown) => {
        // @ts-ignore
        toast.error(error?.response?.data?.message || 'Purchase order action failed');
        setPoAction(null);
        setActionValue('');
        refetch();
    };

    const handleSavePaymentTerms = () => {
        if (!orderId || !order) return;
        updatePaymentTermsMut.mutate(
            {
                orderId,
                status: order.status as typeof PURCHASE_ORDER_STATUSES[number],
                paymentTerms: paymentTermsDraft.trim() || undefined,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Payment terms updated');
                        refetch();
                    } else {
                        toast.error(data?.message || 'Failed to update payment terms');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Failed to update payment terms');
                },
            },
        );
    };

    const handleGeneratePdf = async () => {
        if (!orderId) return;
        try {
            const res = await generatePdf.mutateAsync(orderId);
            const pdfUrl = res?.data?.pdfUrl || res?.data?.pdfLocalPath;
            if (!pdfUrl) {
                toast.error(res?.message || 'PDF generation returned no file URL');
                return;
            }
            const filename = `${res?.data?.poNumber || `PurchaseOrder_${orderId}`}.pdf`;
            downloadPdfFromUrl(pdfUrl, filename);
        } catch (error) {
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Failed to generate PDF');
        }
    };

    const items = order?.PurchaseOrderItems || order?.items || order?.orderItems || [];

    return (
        <Dialog open={!!orderId} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[860px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Purchase Order Details</DialogTitle>
                </DialogHeader>

                <PageLoader isLoading={isLoading && !order}>
                    {order && (
                        <div className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                            <div className="flex items-start justify-between">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                    <div>
                                        <span className="font-bold">Order No :</span> {order.orderNumber || order.id || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-bold">Status :</span>{' '}
                                        <span
                                            className={
                                                order.status === 'CANCELLED'
                                                    ? 'text-red-600'
                                                    : order.status === 'COMPLETED'
                                                      ? 'text-green-600'
                                                      : 'text-blue-600'
                                            }
                                        >
                                            {order.status || 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-bold">Supplier :</span> {order.CompanyCreditor?.name || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-bold">Expected Delivery :</span>{' '}
                                        {order.expectedDeliveryDate
                                            ? moment(order.expectedDeliveryDate).format('DD MMM, YY')
                                            : 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-bold">Delivery Cycle :</span> {order.deliveryCycle || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-bold">Payment Terms :</span> {order.paymentTerms || 'N/A'}
                                    </div>
                                    {order.poGroupId && (
                                        <div>
                                            <span className="font-bold">PO Group :</span>{' '}
                                            <span className="font-medium">{order.poGroupName || order.poGroupId}</span>
                                        </div>
                                    )}
                                    <div>
                                        <span className="font-bold">Created :</span>{' '}
                                        {order.createdAt ? moment(order.createdAt).format('DD MMM, YY HH:mm') : 'N/A'}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={handleGeneratePdf}
                                        disabled={generatePdf.isPending}
                                    >
                                        <Printer className="h-3.5 w-3.5" /> PDF
                                    </Button>
                                    {(order.status === 'DRAFT' || order.status === 'PENDING_APPROVAL') && (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            disabled={approveMut.isPending}
                                            onClick={handleApprove}
                                        >
                                            {approveMut.isPending ? 'Approving...' : 'Approve'}
                                        </Button>
                                    )}
                                    {order.status === 'APPROVED' && (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                setActionValue('');
                                                setPoAction('SEND');
                                            }}
                                        >
                                            Send
                                        </Button>
                                    )}
                                    {order.status === 'SENT' && (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => {
                                                setActionValue('');
                                                setPoAction('CONFIRM');
                                            }}
                                        >
                                            Supplier Confirm
                                        </Button>
                                    )}
                                    {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs text-red-600"
                                            onClick={() => {
                                                setActionValue('');
                                                setPoAction('CANCEL');
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                    {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={() => setIsStatusOpen(true)}
                                        >
                                            Update Status
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {order.notes && (
                                <div>
                                    <span className="font-bold">Notes :</span> {order.notes}
                                </div>
                            )}
                            {order.qualityNotes && (
                                <div>
                                    <span className="font-bold">Quality Notes :</span> {order.qualityNotes}
                                </div>
                            )}

                            {order.status === 'DRAFT' && (
                                <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-blue-300 bg-blue-50/50 p-2">
                                    <Label className="text-xs">Payment Terms</Label>
                                    <Input
                                        className="h-7 w-72 text-xs"
                                        value={paymentTermsDraft}
                                        onChange={(e) => setPaymentTermsDraft(e.target.value)}
                                        placeholder="e.g. Net 45 days, renegotiated"
                                    />
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={updatePaymentTermsMut.isPending}
                                        onClick={handleSavePaymentTerms}
                                    >
                                        {updatePaymentTermsMut.isPending ? 'Saving...' : 'Save Payment Terms'}
                                    </Button>
                                </div>
                            )}

                            <Separator />

                            <POItemsEditor items={items} onChange={() => {}} readonly showQualityNotes />

                            <Separator />

                            <div>
                                <div className="mb-1 flex items-center gap-2">
                                    <div className="font-bold">Trace</div>
                                    {traceOrigin && (
                                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                            {traceOrigin}
                                        </span>
                                    )}
                                </div>

                                {tracePO && (
                                    <div className="space-y-2 rounded-md border border-gray-200 p-2">
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                            <div>
                                                <span className="font-bold">PO No :</span>{' '}
                                                {tracePO.poNumber || tracePO.orderNumber || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-bold">Status :</span>{' '}
                                                <span className={traceStatusClass(tracePO.status)}>{tracePO.status || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="font-bold">Supplier :</span> {tracePO.CompanyCreditor?.name || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-bold">Expected Delivery :</span>{' '}
                                                {tracePO.expectedDeliveryDate ? formatTraceDate(tracePO.expectedDeliveryDate) : 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-bold">Total Qty :</span> {tracePO.totalQuantity ?? '0'}
                                            </div>
                                            <div>
                                                <span className="font-bold">Grand Total :</span> {tracePO.grandTotal ?? '0.00'}
                                            </div>
                                        </div>

                                        {traceItems.length > 0 && (
                                            <div className="overflow-hidden rounded border border-gray-200">
                                                <table className="min-w-full text-[11px]">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-left">
                                                            <th className="px-2 py-1">SKU</th>
                                                            <th className="px-2 py-1">Description</th>
                                                            <th className="px-2 py-1">UOM</th>
                                                            <th className="px-2 py-1 text-right">Ordered</th>
                                                            <th className="px-2 py-1 text-right">Received</th>
                                                            <th className="px-2 py-1 text-right">Net Cost</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {traceItems.map((item, idx) => (
                                                            <tr key={item.id || item.purchaseOrderItemId || idx} className="border-t">
                                                                <td className="px-2 py-1">{item.skuCode || 'N/A'}</td>
                                                                <td className="px-2 py-1">{item.description || 'N/A'}</td>
                                                                <td className="px-2 py-1">{item.uom || 'N/A'}</td>
                                                                <td className="px-2 py-1 text-right">{item.orderedQuantity ?? '0'}</td>
                                                                <td className="px-2 py-1 text-right">{item.receivedQuantity ?? '0'}</td>
                                                                <td className="px-2 py-1 text-right">{item.netCost ?? '0.00'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <TraceSection
                                    title="Goods Received Vouchers"
                                    isLoading={traceQuery.isLoading}
                                    rows={grvs}
                                    emptyText="No goods received vouchers linked to this purchase order."
                                    format={(g) => ({
                                        title: String(g.grvNumber || g.referenceNumber || 'GRV'),
                                        status: g.status ? String(g.status) : undefined,
                                        date: g.receivedAt || g.createdAt ? String(g.receivedAt || g.createdAt) : undefined,
                                        details: g.receivedQuantity != null ? `Qty received: ${g.receivedQuantity}` : '',
                                    })}
                                />

                                <TraceSection
                                    title="Commercial History"
                                    isLoading={traceQuery.isLoading}
                                    rows={commercialMap}
                                    emptyText="No commercial history linked to this purchase order."
                                    format={(c) => ({
                                        title: String(c.documentNumber || c.documentType || 'Entry'),
                                        status: c.status ? String(c.status) : undefined,
                                        date: c.createdAt ? String(c.createdAt) : undefined,
                                        details: c.amount != null ? `Amount: ${c.amount}` : '',
                                    })}
                                />
                            </div>
                        </div>
                    )}
                </PageLoader>
            </DialogContent>

            {orderId && order && (
                <PurchaseOrderStatusDialog
                    open={isStatusOpen}
                    onClose={() => setIsStatusOpen(false)}
                    order={order}
                />
            )}

            <Dialog open={!!poAction} onOpenChange={(o) => !o && setPoAction(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">
                            {poAction === 'SEND'
                                ? 'Send Purchase Order'
                                : poAction === 'CONFIRM'
                                  ? 'Supplier Confirmation'
                                  : 'Cancel Purchase Order'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label className="text-xs">
                            {poAction === 'SEND'
                                ? 'Recipient (email) — optional'
                                : poAction === 'CONFIRM'
                                  ? 'Confirmation notes — optional'
                                  : 'Cancel reason'}
                        </Label>
                        <Input
                            className="border-input h-8 rounded-md border bg-white px-2 py-1 text-xs"
                            value={actionValue}
                            autoFocus
                            onChange={(e) => setActionValue(e.target.value)}
                            placeholder={
                                poAction === 'SEND'
                                    ? 'e.g. supplier@example.com'
                                    : poAction === 'CONFIRM'
                                      ? 'e.g. Confirmed by supplier on phone'
                                      : 'e.g. Delivery no longer required'
                            }
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPoAction(null)}>
                                Close
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={(sendMut.isPending || confirmMut.isPending || cancelMut.isPending) && !!poAction}
                                onClick={() => poAction && handleRunPoAction(poAction)}
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </Dialog>
    );
};

export default PurchaseOrderView;

function formatTraceDate(value?: string) {
    return value ? moment(value).format('DD MMM, YY HH:mm') : 'N/A';
}

function traceStatusClass(status?: string) {
    switch (status) {
        case 'CANCELLED':
            return 'text-red-600';
        case 'COMPLETED':
            return 'text-green-600';
        default:
            return 'text-blue-600';
    }
}

async function downloadPdfFromUrl(url: string, filename: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

interface TraceRowLike {
    id?: string;
    [key: string]: unknown;
}

function TraceSection<T extends TraceRowLike>({
    title,
    isLoading,
    rows,
    emptyText,
    format,
}: {
    title: string;
    isLoading: boolean;
    rows: T[];
    emptyText: string;
    format: (row: T) => { title: string; status?: string; date?: string; details?: string };
}) {
    return (
        <div>
            <div className="mb-1 font-bold">{title}</div>
            {!isLoading && rows.length === 0 && <div className="text-xs text-muted-foreground">{emptyText}</div>}
            <div className="max-h-40 space-y-1 overflow-auto">
                {rows.map((row, idx) => {
                    const line = format(row);
                    return (
                        <div key={row?.id || idx} className="flex items-center justify-between border-b border-gray-200 py-1">
                            <div>
                                <span className="font-semibold">{line.title}</span>
                                {line.status && <span className="ml-2 text-blue-600">{line.status}</span>}
                                {line.details && <div className="text-xs text-muted-foreground">{line.details}</div>}
                            </div>
                            <div className="text-muted-foreground">{line.date ? moment(line.date).format('DD MMM, YY HH:mm') : ''}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
