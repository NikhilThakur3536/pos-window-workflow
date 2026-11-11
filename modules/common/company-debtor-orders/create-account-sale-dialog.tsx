'use client';

import { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    useCreateAccountSale,
    useGetAccountSalePreview,
    useGetInventoryPostingStatus,
    type AccountSalePreviewItem,
    type CompanyDebtorOrder,
} from '@/api-queries/company-debtor-orders';

interface CreateAccountSaleDialogProps {
    open: boolean;
    onClose: () => void;
    record: CompanyDebtorOrder;
    storeName?: (id?: string) => string;
}

// Account Sale is how a store pays for goods it has picked. The preview endpoint owns the
// rules: it reports each line's maxInvoiceableQuantity and the create endpoint re-validates
// it, so quantity inputs are clamped to the preview rather than trusted from the order.
const CreateAccountSaleDialog = ({ open, onClose, record, storeName }: CreateAccountSaleDialogProps) => {
    const saleOrderId = record.saleOrderId || record.id;
    const [invoiceDate, setInvoiceDate] = useState(moment().format('YYYY-MM-DD'));
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState('');
    // Generated once per dialog so a retry re-uses the same id and cannot double-post stock.
    const [clientEventId] = useState(
        () => `${record.clientDocumentId || saleOrderId}-ACCOUNTSALE-${Date.now()}`,
    );

    const previewQuery = useGetAccountSalePreview(open ? saleOrderId : null, record.companyDebtorId);
    const postingQuery = useGetInventoryPostingStatus(open ? saleOrderId : null, record.companyDebtorId);
    const createMutation = useCreateAccountSale();

    const preview = previewQuery.data?.data;
    const items: AccountSalePreviewItem[] = preview?.items || [];
    const currency = preview?.currency || '';

    // Pre-select the full invoiceable quantity for every line the store can bill.
    useEffect(() => {
        if (!open) return;
        setInvoiceDate(moment().format('YYYY-MM-DD'));
        setNotes('');
        const next: Record<string, number> = {};
        items.forEach((item) => {
            next[item.salesOrderItemId] = Math.max(0, Number(item.maxInvoiceableQuantity || 0));
        });
        setQuantities(next);
    }, [open, previewQuery.data]);

    const rows = useMemo(
        () =>
            items.map((item) => {
                const entered = quantities[item.salesOrderItemId];
                const max = Math.max(0, Number(item.maxInvoiceableQuantity || 0));
                const qty = Math.min(Number.isFinite(entered) ? Number(entered) : 0, max);
                return { ...item, enteredQuantity: qty, lineTotal: qty * Number(item.unitPrice || 0) };
            }),
        [items, quantities],
    );

    const total = useMemo(() => rows.reduce((sum, row) => sum + row.lineTotal, 0), [rows]);
    const invoiceableLines = rows.filter((row) => row.enteredQuantity > 0);
    const triggerIsAccountSale = postingQuery.data?.data?.inventoryPostingTriggerSnapshot === 'ACCOUNT_SALE';
    const alreadyPosted = !!postingQuery.data?.data?.inventoryPosted;

    const setQuantity = (item: AccountSalePreviewItem, raw: string) => {
        const max = Math.max(0, Number(item.maxInvoiceableQuantity || 0));
        const parsed = raw === '' ? 0 : Number(raw);
        if (Number.isNaN(parsed)) return;
        setQuantities((prev) => ({ ...prev, [item.salesOrderItemId]: Math.min(parsed, max) }));
    };

    const handleSubmit = () => {
        if (invoiceableLines.length === 0) return toast.error('Enter a quantity on at least one line');

        const overLimit = rows.find(
            (row) => Number(quantities[row.salesOrderItemId] || 0) > Number(row.maxInvoiceableQuantity || 0),
        );
        if (overLimit) {
            return toast.error(
                `Quantity for ${overLimit.description || overLimit.itemCode || 'a line'} exceeds the invoiceable maximum`,
            );
        }

        createMutation.mutate(
            {
                saleOrderId,
                companyDebtorId: record.companyDebtorId,
                terminalId: useAuthUser.getState().user?.terminalId || undefined,
                ...(invoiceDate ? { invoiceDate } : {}),
                ...(record.lifecycleVersion != null ? { lifecycleVersion: record.lifecycleVersion } : {}),
                ...(clientEventId ? { clientEventId } : {}),
                ...(notes ? { notes } : {}),
                items: invoiceableLines.map((row) => ({
                    salesOrderItemId: row.salesOrderItemId,
                    quantity: row.enteredQuantity,
                })),
            },
            {
                onSuccess: (res) => {
                    if (!res.success) return toast.error(res.message || 'Account Sale could not be created');
                    const created = res.data;
                    toast.success(
                        created?.invoiceNumber
                            ? `Account Sale ${created.invoiceNumber} created`
                            : 'Account Sale created',
                    );
                    if (created?.inventoryPosted) {
                        toast.success('Inventory posted for this order');
                    }
                    onClose();
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const fmtMoney = (value?: number | string) =>
        value == null || value === '' ? '—' : Number(value).toFixed(2);

    return (
        <Dialog open={open} onOpenChange={(next) => !next && !createMutation.isPending && onClose()}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Create Account Sale</DialogTitle>
                    <DialogDescription>
                        {record.clientDocumentId || saleOrderId} — {storeName?.(record.companyDebtorId) || record.companyDebtorName || '—'}
                    </DialogDescription>
                </DialogHeader>

                <PageLoader isLoading={previewQuery.isLoading}>
                    <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
                        {previewQuery.isError && (
                            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                                {previewQuery.data?.message || 'Could not load the invoiceable quantities for this order.'}
                            </div>
                        )}

                        {alreadyPosted && (
                            <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    Inventory has already been posted for this order
                                    {postingQuery.data?.data?.inventoryPostedAt
                                        ? ` on ${new Date(postingQuery.data.data.inventoryPostedAt).toLocaleString()}`
                                        : ''}
                                    . Creating another Account Sale will not post stock again.
                                </span>
                            </div>
                        )}

                        {!alreadyPosted && triggerIsAccountSale && (
                            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                                This store posts inventory on Account Sale. Saving will post the invoiced quantities to stock
                                immediately.
                            </div>
                        )}

                        {items.length > 0 ? (
                            <div className="overflow-hidden rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                                        <tr className="text-left">
                                            <th className="p-2">Product</th>
                                            <th className="p-2 text-right">Picked</th>
                                            <th className="p-2 text-right">Invoiced</th>
                                            <th className="p-2 text-right">Max Invoiceable</th>
                                            <th className="p-2 text-right">Rate</th>
                                            <th className="p-2 text-right">Quantity</th>
                                            <th className="p-2 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => {
                                            const max = Math.max(0, Number(row.maxInvoiceableQuantity || 0));
                                            const disabled = max <= 0;
                                            return (
                                                <tr key={row.salesOrderItemId} className="border-b last:border-0">
                                                    <td className="p-2">
                                                        <div className="font-medium">{row.description || '—'}</div>
                                                        {row.itemCode && (
                                                            <div className="font-mono text-xs text-muted-foreground">
                                                                {row.itemCode}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right tabular-nums">{row.pickedQuantity ?? '—'}</td>
                                                    <td className="p-2 text-right tabular-nums">
                                                        {row.alreadyInvoicedQuantity ?? 0}
                                                    </td>
                                                    <td className="p-2 text-right font-medium tabular-nums">{max}</td>
                                                    <td className="p-2 text-right tabular-nums">{fmtMoney(row.unitPrice)}</td>
                                                    <td className="p-2 text-right">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={max}
                                                            step="0.01"
                                                            className="h-8 w-24 text-right"
                                                            disabled={disabled}
                                                            value={row.enteredQuantity}
                                                            onChange={(e) => setQuantity(row, e.target.value)}
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right font-mono tabular-nums">
                                                        {fmtMoney(row.lineTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="border-t bg-muted/20">
                                        <tr>
                                            <td className="p-2 font-medium" colSpan={6}>
                                                Total
                                            </td>
                                            <td className="p-2 text-right font-mono font-semibold tabular-nums">
                                                {fmtMoney(total)} {currency}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            !previewQuery.isError && (
                                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                                    {preview?.message || 'No picked quantities are available to invoice for this order.'}
                                </div>
                            )
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label className="text-sm">Invoice Date</Label>
                                <Input
                                    type="date"
                                    value={invoiceDate}
                                    onChange={(e) => setInvoiceDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm">Notes</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>
                </PageLoader>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || invoiceableLines.length === 0}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating…
                            </>
                        ) : (
                            'Create Account Sale'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CreateAccountSaleDialog;
