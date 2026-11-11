'use client';

import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type {
    InvoiceCheckingSession,
    InvoiceCheckDiscrepancy,
    InvoiceCheckUserRef,
} from '@/api-queries/invoice-checking';
import { useGetInvoiceCheckById } from '@/api-queries/invoice-checking';

interface ViewCheckDialogProps {
    session: InvoiceCheckingSession | null;
    open: boolean;
    onClose: () => void;
}

const detailRow = (label: string, value?: string | number | null) => (
    <div className="flex items-start justify-between gap-4 border-b py-1.5 text-sm last:border-0">
        <span className="shrink-0 text-muted-foreground">{label}</span>
        <span className="min-w-0 break-words text-right font-medium">
            {value === null || value === undefined || value === '' ? '—' : value}
        </span>
    </div>
);

const shortId = (id?: string | null) => (id ? id.slice(0, 8) : null);

// The list API returns actor ids only, while the detail API also returns the nested
// user object. Prefer the resolved user, then the denormalised name, then a short id
// so a row is never blank just because the user object is absent.
const actorName = (
    user?: InvoiceCheckUserRef | null,
    id?: string | null,
    name?: string | null,
): string | null => {
    if (user) {
        const parts = [user.firstName, user.surname].filter(Boolean).join(' ');
        const label = parts || user.id;
        return [`${label}${user.staffNumber ? ` (#${user.staffNumber})` : ''}`, user.email].filter(Boolean).join(' · ');
    }
    if (name) return name;
    return shortId(id);
};

const fmtQty = (value?: string | number | null) => {
    if (value == null || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
};

const fmtPrice = (value?: string | number | null) => {
    if (value == null || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : null);

const SESSION_STATUS_TONE: Record<string, string> = {
    OPEN: 'bg-amber-100 text-amber-700',
    CHECKING: 'bg-cyan-100 text-cyan-700',
    REVIEW: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    POSTED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
};

const statusBadge = (status?: string) => {
    const tone =
        status === 'RESOLVED'
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'OPEN'
              ? 'bg-amber-100 text-amber-700'
              : SESSION_STATUS_TONE[status || ''] || 'bg-gray-100 text-gray-600';
    return (
        <Badge variant="outline" className={`text-[10px] font-medium ${tone}`}>
            {status || '—'}
        </Badge>
    );
};

const ViewCheckDialog = ({ session, open, onClose }: ViewCheckDialogProps) => {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // The list row may only carry summary fields, so pull the full session (nested
    // discrepancies, stock detail, resolved users) while the dialog is open and fall
    // back to whatever the row already had.
    const detailQuery = useGetInvoiceCheckById(open && session?.id ? session.id : null);
    const data: InvoiceCheckingSession | null = detailQuery.data?.data || session;

    const rows: InvoiceCheckDiscrepancy[] = useMemo(() => {
        const current = data;
        if (!current) return [];
        if (current.discrepancies?.length) return current.discrepancies;
        return (current.items || []).map((it) => ({
            sequenceNo: it.sequenceNo,
            companyStockDetailId: it.companyStockDetailId,
            itemCode: it.itemCode,
            description: it.description,
            expectedQuantity: it.expectedQuantity,
            actualQuantity: it.actualQuantity,
            acceptedQuantity: it.acceptedQuantity,
            rejectedQuantity: it.rejectedQuantity,
            unresolvedQuantity: it.unresolvedQuantity,
            discrepancyType: it.discrepancyType,
            expectedUnitPrice: it.expectedUnitPrice,
            reason: it.reason,
            batchNumber: it.batchNumber,
            expiryDate: it.expiryDate,
            stockDetail: { id: it.companyStockDetailId } as InvoiceCheckDiscrepancy['stockDetail'],
        }));
    }, [data]);

    if (!data) return null;

    const expectedBarcode = (d: InvoiceCheckDiscrepancy) => d.stockDetail?.barcode || d.expectedBarcode || null;
    const hasDetail = (d: InvoiceCheckDiscrepancy) =>
        !!(
            d.notes ||
            d.reasonId ||
            d.photoUrls?.length ||
            d.resolutions?.length ||
            d.scannedBarcode ||
            d.actualUnitPrice !== null ||
            d.actualUnitPrice !== undefined ||
            d.varianceQuantity !== null ||
            d.varianceQuantity !== undefined ||
            d.varianceValue !== null ||
            d.varianceValue !== undefined ||
            d.lineValue !== null ||
            d.lineValue !== undefined
        );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle className="flex flex-wrap items-center gap-3">
                        Invoice Check
                        <Badge variant="outline" className={`text-xs ${SESSION_STATUS_TONE[data.status] || ''}`}>
                            {data.status}
                        </Badge>
                        {data.direction ? (
                            <Badge variant="secondary" className="text-xs">
                                {data.direction}
                            </Badge>
                        ) : null}
                        {detailQuery.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                    </DialogTitle>
                </DialogHeader>

                {data.summary ? (
                    <div className="grid shrink-0 grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 sm:grid-cols-4 lg:grid-cols-6">
                        {(
                            [
                                ['Lines', data.summary.lineCount],
                                ['Open', data.summary.openCount],
                                ['Resolved', data.summary.resolvedCount],
                                ['Discrepancies', data.summary.discrepancyCount],
                                ['Total Value', fmtPrice(data.summary.totalValue)],
                                ['Variance Value', fmtPrice(data.summary.varianceValue)],
                            ] as const
                        ).map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
                                <div
                                    className={`text-sm font-semibold tabular-nums ${
                                        label === 'Variance Value' && Number(value) !== 0 ? 'text-red-600' : ''
                                    }`}
                                >
                                    {value ?? '—'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto pr-1 md:grid-cols-4">
                    <div className="min-w-0">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</div>
                        {detailRow('Document Type', data.sourceDocument?.type || data.sourceDocumentType)}
                        {detailRow('Document Number', data.sourceDocument?.number || data.sourceDocumentNumber)}
                        {detailRow('Document Id', data.sourceDocument?.id || data.sourceDocumentId)}
                        {detailRow('Document Ref', data.sourceDocument?.reference)}
                        {detailRow('Client Doc Id', data.clientDocumentId)}
                        {detailRow('Stock Movement Doc', data.stockMovementDocumentId)}
                        {detailRow('Location', data.locationId)}
                    </div>
                    <div className="min-w-0">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parties</div>
                        {detailRow('Creditor', data.companyCreditor?.name || data.companyCreditorName)}
                        {detailRow('Creditor Account', data.companyCreditor?.accountNumber)}
                        {detailRow('Creditor Email', data.companyCreditor?.emailAddress)}
                        {detailRow('Creditor Cell', data.companyCreditor?.cellphoneNumber)}
                        {detailRow('Creditor Id', shortId(data.companyCreditorId))}
                        {detailRow('Debtor', data.companyDebtor?.name || data.companyDebtorName)}
                        {detailRow('Debtor Account', data.companyDebtor?.accountNumber)}
                        {detailRow('Debtor Email', data.companyDebtor?.emailAddress)}
                        {detailRow('Debtor Cell', data.companyDebtor?.cellphoneNumber)}
                        {detailRow('Debtor Id', shortId(data.companyDebtorId))}
                        {detailRow(
                            'Warehouse',
                            data.warehouse?.warehouse || data.warehouse?.description || data.warehouseName || data.warehouseId,
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity</div>
                        {detailRow('Status', data.status)}
                        {detailRow('Check Stage', data.checkoutStage)}
                        {detailRow('Checked By', actorName(data.checkedByUser, data.checkedBy, data.checkedByName))}
                        {detailRow('Approved By', actorName(data.approvedByUser, data.approvedBy, data.approvedByName))}
                        {detailRow('Posted By', actorName(data.postedByUser, data.postedBy, data.postedByName))}
                        {detailRow('Created By', actorName(data.createdByUser, data.createdBy, data.createdByName))}
                    </div>
                    <div className="min-w-0">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timestamps</div>
                        {detailRow('Started At', fmtDateTime(data.startedAt))}
                        {detailRow('Completed At', fmtDateTime(data.completedAt))}
                        {detailRow('Posted At', fmtDateTime(data.postedAt))}
                        {detailRow('Approved At', fmtDateTime(data.approvedAt))}
                        {detailRow('Created At', fmtDateTime(data.createdAt))}
                        {detailRow('Updated At', fmtDateTime(data.updatedAt))}
                        {detailRow('Notes', data.notes)}
                    </div>
                </div>

                {rows.length ? (
                    <div>
                        <div className="mb-2 flex items-center justify-between">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Items ({rows.length})
                            </div>
                        </div>
                        <div className="max-h-[38vh] overflow-auto rounded-md border">
                            <table className="w-full min-w-[1320px] text-sm">
                                <thead className="sticky top-0 z-10 border-b bg-background text-xs text-muted-foreground">
                                    <tr className="text-left">
                                        <th className="w-6 p-2" />
                                        <th className="p-2">#</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2">Barcode</th>
                                        <th className="p-2 text-right">Expected</th>
                                        <th className="p-2 text-right">Actual</th>
                                        <th className="p-2 text-right">Accepted</th>
                                        <th className="p-2 text-right">Rejected</th>
                                        <th className="p-2 text-right">Unresolved</th>
                                        <th className="p-2 text-right">Exp. Price</th>
                                        <th className="p-2 text-right">Act. Price</th>
                                        <th className="p-2 text-right">Var. Qty</th>
                                        <th className="p-2 text-right">Line Value</th>
                                        <th className="p-2 text-right">Var. Value</th>
                                        <th className="p-2">Discrepancy</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Reason</th>
                                        <th className="p-2">Batch</th>
                                        <th className="p-2">Expiry</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((d, index) => {
                                        const rowKey = d.id || `${d.sequenceNo}-${index}`;
                                        const isOpen = !!expanded[rowKey];
                                        const detailAvailable = hasDetail(d);
                                        const expected = expectedBarcode(d);
                                        const scanned = d.scannedBarcode || null;
                                        const barcodeMismatch =
                                            !!expected && !!scanned && expected !== scanned;

                                        return (
                                            <Fragment key={rowKey}>
                                                <tr className="border-b align-top">
                                                    <td className="p-2">
                                                        {detailAvailable ? (
                                                            <button
                                                                type="button"
                                                                aria-label={isOpen ? 'Hide detail' : 'Show detail'}
                                                                onClick={() =>
                                                                    setExpanded((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }))
                                                                }
                                                                className="text-muted-foreground hover:text-foreground"
                                                            >
                                                                {isOpen ? (
                                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                                )}
                                                            </button>
                                                        ) : null}
                                                    </td>
                                                    <td className="p-2 text-muted-foreground">{d.sequenceNo ?? index + 1}</td>
                                                    <td className="max-w-[220px] p-2">
                                                        <div className="truncate font-medium">
                                                            {d.stockDetail?.description ||
                                                                d.description ||
                                                                d.itemCode ||
                                                                d.companyStockDetailId ||
                                                                '—'}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {d.stockDetail?.itemCode || d.itemCode || ''}
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        {expected || scanned ? (
                                                            <div className="font-mono text-[11px] leading-tight">
                                                                <div>{expected || '—'}</div>
                                                                {scanned ? (
                                                                    <div
                                                                        className={
                                                                            barcodeMismatch
                                                                                ? 'text-red-600'
                                                                                : 'text-muted-foreground'
                                                                        }
                                                                    >
                                                                        {scanned}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2 text-right tabular-nums">{fmtQty(d.expectedQuantity)}</td>
                                                    <td className="p-2 text-right tabular-nums">{fmtQty(d.actualQuantity)}</td>
                                                    <td className="p-2 text-right tabular-nums">{fmtQty(d.acceptedQuantity)}</td>
                                                    <td className="p-2 text-right font-medium text-red-600 tabular-nums">
                                                        {fmtQty(d.rejectedQuantity)}
                                                    </td>
                                                    <td className="p-2 text-right text-amber-600 tabular-nums">
                                                        {fmtQty(d.unresolvedQuantity)}
                                                    </td>
                                                    <td className="p-2 text-right tabular-nums">
                                                        {fmtPrice(d.expectedUnitPrice)}
                                                    </td>
                                                    <td className="p-2 text-right tabular-nums">
                                                        {fmtPrice(d.actualUnitPrice)}
                                                    </td>
                                                    <td
                                                        className={`p-2 text-right font-medium tabular-nums ${
                                                            Number(d.varianceQuantity) < 0
                                                                ? 'text-red-600'
                                                                : Number(d.varianceQuantity) > 0
                                                                  ? 'text-emerald-600'
                                                                  : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {d.varianceQuantity == null ? '—' : d.varianceQuantity}
                                                    </td>
                                                    <td className="p-2 text-right tabular-nums">{fmtPrice(d.lineValue)}</td>
                                                    <td
                                                        className={`p-2 text-right font-medium tabular-nums ${
                                                            Number(d.varianceValue) < 0
                                                                ? 'text-red-600'
                                                                : Number(d.varianceValue) > 0
                                                                  ? 'text-emerald-600'
                                                                  : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {fmtPrice(d.varianceValue)}
                                                    </td>
                                                    <td className="whitespace-nowrap p-2">
                                                        {d.discrepancyType && d.discrepancyType !== 'NONE' ? (
                                                            <Badge variant="secondary" className="text-[10px]">
                                                                {String(d.discrepancyType).replace(/_/g, ' ')}
                                                            </Badge>
                                                        ) : (
                                                            '—'
                                                        )}
                                                    </td>
                                                    <td className="p-2">{statusBadge(d.status)}</td>
                                                    <td className="p-2 text-muted-foreground">{d.reason || '—'}</td>
                                                    <td className="p-2 text-muted-foreground">{d.batchNumber || '—'}</td>
                                                    <td className="p-2 text-muted-foreground">{d.expiryDate || '—'}</td>
                                                </tr>

                                                {isOpen && detailAvailable ? (
                                                    <tr className="border-b bg-muted/40">
                                                        <td colSpan={19} className="p-3">
                                                            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                                                                <div className="min-w-0 space-y-1">
                                                                    <div className="font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        Line Detail
                                                                    </div>
                                                                    {detailRow('Discrepancy Id', shortId(d.id))}
                                                                    {detailRow('Stock Detail Id', shortId(d.companyStockDetailId))}
                                                                    {detailRow('Expected Barcode', expected)}
                                                                    {detailRow('Scanned Barcode', scanned)}
                                                                    {detailRow('Expected Unit Price', fmtPrice(d.expectedUnitPrice))}
                                                                    {detailRow('Actual Unit Price', fmtPrice(d.actualUnitPrice))}
                                                                    {detailRow('Line Value', fmtPrice(d.lineValue))}
                                                                    {detailRow('Variance Qty', d.varianceQuantity)}
                                                                    {detailRow('Variance Value', fmtPrice(d.varianceValue))}
                                                                    {detailRow('Reason Id', shortId(d.reasonId))}
                                                                    {detailRow('Notes', d.notes)}
                                                                </div>
                                                                <div className="min-w-0 space-y-1">
                                                                    <div className="font-semibold uppercase tracking-wide text-muted-foreground">
                                                                        Audit
                                                                    </div>
                                                                    {detailRow('Created At', fmtDateTime(d.createdAt))}
                                                                    {detailRow('Updated At', fmtDateTime(d.updatedAt))}
                                                                    {d.photoUrls?.length ? (
                                                                        <div className="border-b py-1.5">
                                                                            <div className="text-muted-foreground">Photos</div>
                                                                            <div className="mt-1 flex flex-wrap gap-2">
                                                                                {d.photoUrls.map((url) => (
                                                                                    <a
                                                                                        key={url}
                                                                                        href={url}
                                                                                        target="_blank"
                                                                                        rel="noreferrer"
                                                                                        className="break-all text-blue-600 underline"
                                                                                    >
                                                                                        {url.split('/').pop()}
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                    {d.resolutions?.length ? (
                                                                        <div className="border-b py-1.5">
                                                                            <div className="text-muted-foreground">Resolutions</div>
                                                                            <div className="mt-1 space-y-1">
                                                                                {d.resolutions.map((r, ri) => (
                                                                                    <div
                                                                                        key={r.id || ri}
                                                                                        className="rounded border bg-background px-2 py-1"
                                                                                    >
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <span className="font-medium">
                                                                                                {r.action || 'Resolution'}
                                                                                            </span>
                                                                                            {r.status ? statusBadge(r.status) : null}
                                                                                        </div>
                                                                                        <div className="text-muted-foreground">
                                                                                            {r.reason || '—'}
                                                                                        </div>
                                                                                        <div className="text-muted-foreground">
                                                                                            Qty {fmtQty(r.quantity)}
                                                                                            {r.linkedDocumentType
                                                                                                ? ` · ${r.linkedDocumentType} ${shortId(r.linkedDocumentId) || ''}`
                                                                                                : ''}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        {detailQuery.isFetching ? 'Loading check detail...' : 'No items recorded for this check.'}
                    </p>
                )}

                <DialogFooter className="shrink-0">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ViewCheckDialog;
