'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
    useCheckInvoiceCheck,
    useGetReasonMasterList,
    INVOICE_CHECK_DIRECTIONS,
    INVOICE_DISCREPANCY_TYPES,
    type InvoiceCheckDirection,
    type InvoiceCheckingSession,
    type CheckInvoiceCheckInput,
} from '@/api-queries/invoice-checking';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useCompanyStockDetailsList, type StockDetails } from '@/api-queries/company/stock-details';

interface RecordRow {
    // The discrepancy id from the open response. The check endpoint keys lines by this,
    // so it must be carried through to the payload.
    id?: string;
    sequenceNo?: number;
    companyStockDetailId: string;
    description?: string;
    itemCode?: string;
    expectedQuantity: number;
    // Editable quantities accept '' while the box is empty; without it a typed 0 is
    // indistinguishable from an empty box (`0 || ''`) and can never be entered.
    actualQuantity: number | '';
    acceptedQuantity: number;
    rejectedQuantity: number | '';
    unresolvedQuantity: number | '';
    discrepancyType?: string;
    reasonId?: string;
    reason?: string;
    notes?: string;
    expectedBarcode?: string;
    scannedBarcode?: string;
    actualUnitPrice?: number;
    photoUrls?: string[];
}

interface RecordCheckDialogProps {
    session: InvoiceCheckingSession | null;
    open: boolean;
    onClose: () => void;
    onRecorded?: (session: InvoiceCheckingSession) => void;
}

// Keeps '' while the field is being cleared, otherwise stores the number (including 0).
const toQtyInput = (value: string): number | '' => (value === '' ? '' : Math.max(0, Number(value) || 0));
const qtyValue = (value: number | '' | undefined) => Number(value) || 0;

const RecordCheckDialog = ({ session, open, onClose, onRecorded }: RecordCheckDialogProps) => {
    const checkMutation = useCheckInvoiceCheck();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const { data: reasonRes } = useGetReasonMasterList({ limit: 200, status: 'ACTIVE' });
    const reasonOptions = useMemo(
        () => (reasonRes?.data || []).filter((r) => r.id && r.status !== 'INACTIVE'),
        [reasonRes],
    );
    const discrepancyOptions = INVOICE_DISCREPANCY_TYPES;
    const reasonLabel = (reasonId?: string) => {
        if (!reasonId) return undefined;
        const match = reasonOptions.find((r) => r.id === reasonId);
        return match?.reason || match?.name || match?.description || undefined;
    };

    const { data: stockRes } = useCompanyStockDetailsList({ limit: 1000, offset: 0, status: 'ACTIVE' });
    const stockById = useMemo(() => {
        const map: Record<string, StockDetails> = {};
        (stockRes?.data?.rows || []).forEach((s) => {
            if (s?.id) map[s.id] = s;
        });
        return map;
    }, [stockRes]);

    const [rows, setRows] = useState<RecordRow[]>([]);
    const [direction, setDirection] = useState<InvoiceCheckDirection>('INCOMING');
    const [isPending, setIsPending] = useState(false);

    const pendingMetaRef = useRef<CheckInvoiceCheckInput | null>(null);

    const buildRows = (): RecordRow[] => {
        const fromItems = (session?.items || []).map((it, idx) => ({
            id: it.id,
            sequenceNo: it.sequenceNo ?? idx + 1,
            companyStockDetailId: it.companyStockDetailId,
            description: it.description || stockById[it.companyStockDetailId]?.description || '',
            itemCode: it.itemCode || stockById[it.companyStockDetailId]?.itemCode || '',
            expectedQuantity: it.expectedQuantity || 0,
            actualQuantity: it.actualQuantity ?? it.expectedQuantity ?? 0,
            acceptedQuantity: it.acceptedQuantity ?? it.expectedQuantity ?? 0,
            rejectedQuantity: it.rejectedQuantity ?? 0,
            unresolvedQuantity: it.unresolvedQuantity ?? 0,
            discrepancyType: it.discrepancyType || '',
            actualUnitPrice: it.actualUnitPrice ?? it.expectedUnitPrice ?? 0,
            expectedBarcode: stockById[it.companyStockDetailId]?.barcode || '',
            photoUrls: it.photoUrls || [],
        }));
        if (fromItems.length) return fromItems;

        // The listing payload returns checked lines under `discrepancies` (with nested stockDetail),
        // so fall back to it when the session has no `items`.
        return (session?.discrepancies || []).map((d, idx) => ({
            id: d.id,
            sequenceNo: d.sequenceNo ?? idx + 1,
            companyStockDetailId: d.companyStockDetailId || '',
            description:
                d.stockDetail?.description ||
                d.description ||
                d.itemCode ||
                stockById[d.companyStockDetailId || '']?.description ||
                '',
            itemCode: d.itemCode || d.stockDetail?.itemCode || stockById[d.companyStockDetailId || '']?.itemCode || '',
            expectedQuantity: Number(d.expectedQuantity) || 0,
            actualQuantity: Number(d.actualQuantity ?? d.expectedQuantity) || 0,
            acceptedQuantity: Number(d.acceptedQuantity ?? d.actualQuantity ?? d.expectedQuantity) || 0,
            rejectedQuantity: Number(d.rejectedQuantity) || 0,
            unresolvedQuantity: Number(d.unresolvedQuantity) || 0,
            discrepancyType: d.discrepancyType || '',
            reasonId: d.reasonId || '',
            notes: d.notes || '',
            expectedBarcode:
                d.expectedBarcode || d.stockDetail?.barcode || stockById[d.companyStockDetailId || '']?.barcode || '',
            scannedBarcode: d.scannedBarcode || '',
            actualUnitPrice:
                d.actualUnitPrice != null
                    ? Number(d.actualUnitPrice)
                    : d.expectedUnitPrice != null
                      ? Number(d.expectedUnitPrice)
                      : undefined,
            photoUrls: d.photoUrls || [],
        }));
    };

    useEffect(() => {
        if (open && session) {
            setRows(buildRows());
            setDirection((session.direction as InvoiceCheckDirection) || 'INCOMING');
            pendingMetaRef.current = null;
        }
    }, [open, session?.id]);

    const updateRow = (index: number, patch: Partial<RecordRow>) => {
        setRows((prev) =>
            prev.map((row, idx) => {
                if (idx !== index) return row;
                const next = { ...row, ...patch };
                next.acceptedQuantity = Math.max(
                    0,
                    qtyValue(next.actualQuantity) - qtyValue(next.rejectedQuantity) - qtyValue(next.unresolvedQuantity),
                );
                return next;
            }),
        );
    };

    const rowsWithDiscrepancy = rows.filter(
        (r) => qtyValue(r.rejectedQuantity) > 0 || qtyValue(r.unresolvedQuantity) > 0,
    );

    const buildPayload = (): CheckInvoiceCheckInput => ({
        id: session?.id || '',
        direction,
        items: rows.map((r) => ({
            // The endpoint identifies each line by its discrepancy id; sequenceNo alone
            // does not bind a checked line back to the expected one.
            ...(r.id ? { id: r.id } : {}),
            sequenceNo: r.sequenceNo,
            expectedQuantity: r.expectedQuantity,
            actualQuantity: qtyValue(r.actualQuantity),
            acceptedQuantity: r.acceptedQuantity || 0,
            rejectedQuantity: qtyValue(r.rejectedQuantity),
            unresolvedQuantity: qtyValue(r.unresolvedQuantity),
            ...(r.discrepancyType ? { discrepancyType: r.discrepancyType } : {}),
            ...(r.reasonId ? { reasonId: r.reasonId } : {}),
            // The check payload documents a free-text reason, so send the typed text
            // and fall back to the selected master reason's label.
            ...(r.reason || r.reasonId ? { reason: r.reason || reasonLabel(r.reasonId) } : {}),
            ...(r.notes ? { notes: r.notes } : {}),
            ...(r.expectedBarcode ? { expectedBarcode: r.expectedBarcode } : {}),
            ...(r.scannedBarcode ? { scannedBarcode: r.scannedBarcode } : {}),
            ...(r.actualUnitPrice ? { actualUnitPrice: r.actualUnitPrice } : {}),
            ...(r.photoUrls && r.photoUrls.length ? { photoUrls: r.photoUrls } : {}),
        })),
    });

    const handleSuccess = (data: { success: boolean; message?: string; data?: InvoiceCheckingSession }) => {
        if (data?.success) {
            toast.success('Invoice check recorded');
            if (data.data && onRecorded) onRecorded(data.data as InvoiceCheckingSession);
            setIsPending(false);
            pendingMetaRef.current = null;
            onClose();
        } else {
            toast.error(data?.message || 'Record failed');
        }
    };

    const submitWithToken = (payload: CheckInvoiceCheckInput) => {
        checkMutation
            .mutateAsync(payload)
            .then((data) => {
                setIsPending(false);
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = payload;
                    setApproval({ ...info, actionLabel: 'Record Invoice Check' });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleSubmit = () => {
        if (!session) return;
        if (!rows.length) return toast.error('No lines to record');
        setIsPending(true);
        submitWithToken(buildPayload());
    };

    const handleApproved = (token: string) => {
        const meta = pendingMetaRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        setIsPending(true);
        checkMutation
            .mutateAsync({ ...meta, approvalToken: token })
            .then((data) => {
                setIsPending(false);
                pendingMetaRef.current = null;
                closeApproval();
                handleSuccess(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    setApproval({ ...info, actionLabel: 'Record Invoice Check' });
                } else {
                    closeApproval();
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleOpenChange = (next: boolean) => {
        if (!next && !isPending) onClose();
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-5xl">
                    <DialogHeader>
                        <DialogTitle>Record Invoice Check</DialogTitle>
                        <DialogDescription>
                            {session?.sourceDocumentNumber || session?.sourceDocumentId || session?.id}
                            {rowsWithDiscrepancy.length
                                ? ` · ${rowsWithDiscrepancy.length} line(s) with discrepancies`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Direction</Label>
                            <Select
                                value={direction}
                                onValueChange={(value) => setDirection(value as InvoiceCheckDirection)}
                            >
                                <SelectTrigger className="h-9 w-40">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INVOICE_CHECK_DIRECTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {rows.length ? (
                        <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="text-muted-foreground border-b text-xs">
                                    <tr className="text-left">
                                        <th className="p-2">#</th>
                                        <th className="p-2">Description</th>
                                        <th className="p-2 text-right">Expected</th>
                                        <th className="p-2 text-right">Actual</th>
                                        <th className="p-2 text-right">Accepted</th>
                                        <th className="p-2 text-right">Rejected</th>
                                        <th className="p-2 text-right">Unresolved</th>
                                        <th className="p-2">Discrepancy</th>
                                        <th className="p-2">Reason</th>
                                        <th className="p-2">Reason Detail</th>
                                        <th className="p-2">Exp Barcode</th>
                                        <th className="p-2">Scanned Barcode</th>
                                        <th className="p-2">Notes</th>
                                        <th className="p-2 text-right">Unit Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={row.sequenceNo ?? index} className="border-b align-top">
                                            <td className="text-muted-foreground p-2 text-xs">
                                                {row.sequenceNo ?? index + 1}
                                            </td>
                                            <td className="max-w-[200px] truncate p-2">
                                                {row.description ||
                                                    stockById[row.companyStockDetailId]?.description ||
                                                    row.itemCode ||
                                                    row.companyStockDetailId}
                                            </td>
                                            <td className="p-2 text-right">{row.expectedQuantity}</td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 w-20 text-right"
                                                    value={row.actualQuantity}
                                                    onChange={(e) =>
                                                        updateRow(index, { actualQuantity: toQtyInput(e.target.value) })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2 text-right font-medium">{row.acceptedQuantity}</td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 w-20 text-right"
                                                    value={row.rejectedQuantity}
                                                    onChange={(e) =>
                                                        updateRow(index, {
                                                            rejectedQuantity: toQtyInput(e.target.value),
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-8 w-20 text-right"
                                                    value={row.unresolvedQuantity}
                                                    onChange={(e) =>
                                                        updateRow(index, {
                                                            unresolvedQuantity: toQtyInput(e.target.value),
                                                        })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Select
                                                    value={row.discrepancyType || ''}
                                                    onValueChange={(value) =>
                                                        updateRow(index, { discrepancyType: value })
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-36">
                                                        <SelectValue placeholder="None" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {discrepancyOptions.map((option) => (
                                                            <SelectItem key={option} value={option}>
                                                                {option.replace(/_/g, ' ')}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2">
                                                <Select
                                                    value={row.reasonId || ''}
                                                    onValueChange={(value) =>
                                                        updateRow(index, { reasonId: value === 'none' ? '' : value })
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-44">
                                                        <SelectValue placeholder="No reason" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No reason</SelectItem>
                                                        {reasonOptions.map((r) => (
                                                            <SelectItem key={r.id} value={r.id}>
                                                                {r.reason || r.name || r.description || r.id}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    className="h-8 w-52 text-xs"
                                                    placeholder="Describe the variance"
                                                    value={row.reason || ''}
                                                    onChange={(e) => updateRow(index, { reason: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    className="h-8 w-24 font-mono text-xs"
                                                    placeholder="Expected"
                                                    value={row.expectedBarcode || ''}
                                                    onChange={(e) =>
                                                        updateRow(index, { expectedBarcode: e.target.value })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    className="h-8 w-24 font-mono text-xs"
                                                    placeholder="Scanned"
                                                    value={row.scannedBarcode || ''}
                                                    onChange={(e) =>
                                                        updateRow(index, { scannedBarcode: e.target.value })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    className="h-8 w-32"
                                                    placeholder="Optional"
                                                    value={row.notes || ''}
                                                    onChange={(e) => updateRow(index, { notes: e.target.value })}
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="0.01"
                                                    className="h-8 w-24 text-right"
                                                    value={row.actualUnitPrice ?? ''}
                                                    onChange={(e) =>
                                                        updateRow(index, {
                                                            actualUnitPrice: Number(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground py-6 text-center text-sm">No lines available to record.</p>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleSubmit}
                            disabled={isPending || checkMutation.isPending || !rows.length}
                        >
                            {isPending || checkMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
                                </>
                            ) : (
                                'Submit Check'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleApproved}
            />
        </>
    );
};

export default RecordCheckDialog;
