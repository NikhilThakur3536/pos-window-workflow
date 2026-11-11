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
    useResolveInvoiceCheck,
    useGetReasonMasterList,
    useGetInvoiceCheckById,
    useGetInvoiceLinkageDocuments,
    type InvoiceCheckingSession,
    type InvoiceCheckResolution,
    type InvoiceCheckResolutionInput,
    type InvoiceDiscrepancyAction,
    type InvoiceLinkedDocumentType,
    type ResolveInvoiceCheckInput,
    INVOICE_DISCREPANCY_ACTIONS,
    INVOICE_LINKED_DOCUMENT_TYPES,
    linkedDocumentTypesForAction,
} from '@/api-queries/invoice-checking';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';

interface ResolveRow {
    discrepancyId?: string;
    sequenceNo?: number;
    description?: string;
    expectedQuantity?: number;
    action: InvoiceDiscrepancyAction;
    availableQty: number;
    quantity: number;
    reasonId?: string;
    reason: string;
    linkedDocumentType?: InvoiceLinkedDocumentType;
    linkedDocumentId?: string;
}

interface ResolveCheckDialogProps {
    session: InvoiceCheckingSession | null;
    open: boolean;
    onClose: () => void;
    // Fired once the resolve call is accepted. The company debtor order flow uses
    // this to post the check straight after the decisions are saved.
    onResolved?: (session: InvoiceCheckingSession) => void;
}

const LinkageFields = ({
    action,
    linkedDocumentType,
    linkedDocumentId,
    onTypeChange,
    onIdChange,
}: {
    action: InvoiceDiscrepancyAction;
    linkedDocumentType?: InvoiceLinkedDocumentType;
    linkedDocumentId?: string;
    onTypeChange: (type: InvoiceLinkedDocumentType) => void;
    onIdChange: (id: string) => void;
}) => {
    const allowedTypes = linkedDocumentTypesForAction(action);
    const { data: docsRes, isFetching } = useGetInvoiceLinkageDocuments(linkedDocumentType);

    const documents = useMemo(() => {
        const seen = new Set<string>();
        return (docsRes?.data || []).filter((doc) => {
            if (seen.has(doc.value)) return false;
            seen.add(doc.value);
            return true;
        });
    }, [docsRes]);

    if (!allowedTypes.length) {
        return (
            <td className="text-muted-foreground p-2 text-xs" colSpan={2}>
                {action} needs no linked document
            </td>
        );
    }

    return (
        <>
            <td className="p-2">
                <Select
                    value={linkedDocumentType || ''}
                    onValueChange={(value) => onTypeChange(value as InvoiceLinkedDocumentType)}
                >
                    <SelectTrigger className="h-8 w-44">
                        <SelectValue placeholder="Select doc" />
                    </SelectTrigger>
                    <SelectContent>
                        {allowedTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type.replace(/_/g, ' ')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
            <td className="p-2">
                <Select value={linkedDocumentId || ''} onValueChange={onIdChange} disabled={!linkedDocumentType}>
                    <SelectTrigger className="h-8 w-44">
                        <SelectValue
                            placeholder={
                                !linkedDocumentType ? 'Pick a type first' : isFetching ? 'Loading…' : 'Select document'
                            }
                        />
                    </SelectTrigger>
                    <SelectContent>
                        {!isFetching && !documents.length ? (
                            <SelectItem value="__empty" disabled>
                                No documents found
                            </SelectItem>
                        ) : null}
                        {documents.map((doc) => (
                            <SelectItem key={doc.value} value={doc.value}>
                                <span className="block truncate font-medium">{doc.label}</span>
                                {doc.meta ? (
                                    <span className="text-muted-foreground block truncate text-xs">{doc.meta}</span>
                                ) : null}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </td>
        </>
    );
};

const ResolveCheckDialog = ({ session, open, onClose, onResolved }: ResolveCheckDialogProps) => {
    const resolveMutation = useResolveInvoiceCheck();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const { data: detailRes } = useGetInvoiceCheckById(open && session?.id ? session.id : null);
    const detailSession = detailRes?.data || session;

    const { data: reasonRes } = useGetReasonMasterList({ limit: 200, status: 'ACTIVE' });
    const reasonOptions = useMemo(
        () => (reasonRes?.data || []).filter((r) => r.id && r.status !== 'INACTIVE'),
        [reasonRes],
    );

    const [rows, setRows] = useState<ResolveRow[]>([]);
    const [reason, setReason] = useState('');
    const [isPending, setIsPending] = useState(false);

    const pendingMetaRef = useRef<ResolveInvoiceCheckInput | null>(null);

    const buildRows = (): ResolveRow[] => {
        const priorQty = (d: { resolutions?: InvoiceCheckResolution[] }) =>
            (d.resolutions || []).reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);

        const rows = (detailSession?.discrepancies || []).map((d) => {
            const expected = Number(d.expectedQuantity) || 0;
            const rejected = Number(d.rejectedQuantity) || 0;
            const unresolved = Number(d.unresolvedQuantity) || 0;
            const other = Number(d.quantity) || 0;
            // The resolvable quantity is the size of the mismatch, which the API
            // reports as a signed variance (actual - expected). A shortage of one
            // arrives as varianceQuantity: -1 with rejectedQuantity and
            // unresolvedQuantity both still "0.000", so those counters alone would
            // wrongly report the line as having nothing to resolve.
            const variance = Math.abs(Number(d.varianceQuantity) || 0);
            const total = variance || rejected || unresolved || other;
            const resolvedSoFar = priorQty({ resolutions: d.resolutions || [] });
            const availableQty = Math.max(total - resolvedSoFar, 0);
            const existingResolution = (d.resolutions || []).find((r) => r.linkedDocumentType);

            const action = (INVOICE_DISCREPANCY_ACTIONS.find((a) => a === existingResolution?.action) ||
                'RETURN') as InvoiceDiscrepancyAction;
            const allowedTypes = linkedDocumentTypesForAction(action);
            // Drop legacy linkage (RETURN_NOTE, CREDIT_NOTE_REQ, RETURN_ORDER, OTHER)
            // that is not valid for this action.
            const existingType = INVOICE_LINKED_DOCUMENT_TYPES.find(
                (t) => t === existingResolution?.linkedDocumentType,
            );
            const linkedDocumentType = existingType && allowedTypes.includes(existingType) ? existingType : undefined;

            return {
                discrepancyId: d.id,
                sequenceNo: d.sequenceNo,
                description: d.stockDetail?.description || d.description || d.itemCode || d.companyStockDetailId || '',
                expectedQuantity: expected || Number(d.actualQuantity) || 0,
                action,
                availableQty,
                quantity: availableQty,
                reasonId: d.reasonId || '',
                reason: d.reason || '',
                linkedDocumentType,
                linkedDocumentId: linkedDocumentType ? existingResolution?.linkedDocumentId || '' : '',
            };
        });

        return rows.filter((r) => r.discrepancyId && r.availableQty > 0);
    };

    const totalResolved = useMemo(() => rows.reduce((sum, r) => sum + (r.quantity || 0), 0), [rows]);

    useEffect(() => {
        if (open && session) {
            setRows(buildRows());
            setReason('');
            pendingMetaRef.current = null;
        }
    }, [open, session?.id, detailSession?.id]);

    const updateRow = (index: number, patch: Partial<ResolveRow>) => {
        setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...patch } : row)));
    };

    const updateAction = (index: number, action: InvoiceDiscrepancyAction) => {
        const row = rows[index];
        const allowed = linkedDocumentTypesForAction(action);
        const keep = row.linkedDocumentType && allowed.includes(row.linkedDocumentType);
        updateRow(index, {
            action,
            ...(keep ? {} : { linkedDocumentType: undefined, linkedDocumentId: '' }),
        });
    };

    const updateLinkedDocumentType = (index: number, type: InvoiceLinkedDocumentType) => {
        updateRow(index, { linkedDocumentType: type, linkedDocumentId: '' });
    };

    const buildPayload = (): ResolveInvoiceCheckInput => ({
        id: session?.id || '',
        ...(reason ? { reason } : {}),
        resolutions: rows.map((r) => {
            const needsLinkage = linkedDocumentTypesForAction(r.action).length > 0;
            const resolution: InvoiceCheckResolutionInput = {
                ...(r.discrepancyId ? { discrepancyId: r.discrepancyId } : {}),
                action: r.action,
                quantity: r.quantity || 0,
                ...(r.reasonId ? { reasonId: r.reasonId } : {}),
                ...(r.reason?.trim() ? { reason: r.reason.trim() } : {}),
                ...(needsLinkage && r.linkedDocumentType ? { linkedDocumentType: r.linkedDocumentType } : {}),
                ...(needsLinkage && r.linkedDocumentId ? { linkedDocumentId: r.linkedDocumentId } : {}),
            };
            return resolution;
        }),
    });

    const handleSuccess = (data: { success: boolean; message?: string; data?: InvoiceCheckingSession }) => {
        if (data?.success) {
            toast.success('Discrepancies resolved');
            setIsPending(false);
            pendingMetaRef.current = null;
            onClose();
            // Resolve only records the decision, so hand the refreshed session back to
            // the caller to decide what happens next (the order flow posts the check).
            const resolved = data.data || detailSession || session;
            if (resolved) onResolved?.(resolved);
        } else {
            toast.error(data?.message || 'Resolve failed');
        }
    };

    const submitWithToken = (payload: ResolveInvoiceCheckInput) => {
        resolveMutation
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
                    setApproval({ ...info, actionLabel: 'Resolve Invoice Check' });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleSubmit = () => {
        if (!session) return;
        if (!rows.length) return toast.error('No discrepancies to resolve');
        for (const r of rows) {
            const label = r.description || `discrepancy ${r.sequenceNo ?? ''}`.trim() || 'a discrepancy';
            if (!r.quantity || r.quantity <= 0) return toast.error(`Enter the quantity to resolve for ${label}`);
            if (r.quantity > r.availableQty)
                return toast.error(`Quantity exceeds the resolvable quantity for ${label}`);
            // The documented resolve payload carries a free-text reason; the master
            // reason id stays optional so either alone is enough.
            if (!r.reasonId && !r.reason?.trim()) return toast.error(`Select or type a resolution reason for ${label}`);
            if (linkedDocumentTypesForAction(r.action).length > 0) {
                if (!r.linkedDocumentType)
                    return toast.error(
                        `${r.action} needs a linked document type (Debit Note, Credit Note${
                            r.action === 'CLAIM' ? ', Goods Receiving Claim' : ', Stock Movement'
                        }) for ${label}`,
                    );
                if (!r.linkedDocumentId) return toast.error(`Select the linked document for ${label}`);
            }
        }
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
        resolveMutation
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
                    setApproval({ ...info, actionLabel: 'Resolve Invoice Check' });
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
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Resolve Discrepancies</DialogTitle>
                        <DialogDescription>
                            {session?.sourceDocumentNumber || session?.sourceDocumentId || session?.id} ·{' '}
                            {rows.length
                                ? `${rows.length} discrepancy(ies) · ${totalResolved} unit(s) to resolve`
                                : 'No discrepancies'}
                        </DialogDescription>
                    </DialogHeader>

                    {rows.length ? (
                        <div className="max-h-[55vh] overflow-auto rounded-md border">
                            <table className="w-full min-w-[1080px] text-sm">
                                <thead className="text-muted-foreground border-b text-xs">
                                    <tr className="text-left">
                                        <th className="p-2">Description</th>
                                        <th className="p-2">Action</th>
                                        <th className="p-2 text-right">Qty</th>
                                        <th className="p-2">Reason</th>
                                        <th className="p-2">Reason Note</th>
                                        <th className="p-2">Linked Doc Type</th>
                                        <th className="p-2">Linked Doc Id</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr
                                            key={`${row.discrepancyId || ''}-${row.sequenceNo || index}`}
                                            className="border-b align-top"
                                        >
                                            <td className="max-w-[200px] truncate p-2">
                                                <div className="truncate">{row.description || '—'}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {row.expectedQuantity ? `Expected ${row.expectedQuantity}` : ''}
                                                    {row.availableQty ? ` · To resolve ${row.availableQty}` : ''}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <Select
                                                    value={row.action}
                                                    onValueChange={(value) =>
                                                        updateAction(index, value as InvoiceDiscrepancyAction)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {INVOICE_DISCREPANCY_ACTIONS.map((action) => (
                                                            <SelectItem key={action} value={action}>
                                                                {action.replace(/_/g, ' ')}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={row.availableQty}
                                                    className="h-8 w-24 text-right"
                                                    value={row.quantity || ''}
                                                    onChange={(e) =>
                                                        updateRow(index, { quantity: Number(e.target.value) || 0 })
                                                    }
                                                />
                                            </td>
                                            <td className="p-2">
                                                <Select
                                                    value={row.reasonId || ''}
                                                    onValueChange={(value) => {
                                                        if (value === 'none') return updateRow(index, { reasonId: '' });
                                                        const match = reasonOptions.find((r) => r.id === value);
                                                        const label =
                                                            match?.reason || match?.name || match?.description || '';
                                                        updateRow(index, { reasonId: value, reason: label });
                                                    }}
                                                >
                                                    <SelectTrigger className="h-8 w-40">
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
                                                    className="h-8 w-36"
                                                    placeholder="Reason"
                                                    value={row.reason || ''}
                                                    onChange={(e) => updateRow(index, { reason: e.target.value })}
                                                />
                                            </td>
                                            <LinkageFields
                                                action={row.action}
                                                linkedDocumentType={row.linkedDocumentType}
                                                linkedDocumentId={row.linkedDocumentId}
                                                onTypeChange={(type) => updateLinkedDocumentType(index, type)}
                                                onIdChange={(id) => updateRow(index, { linkedDocumentId: id })}
                                            />
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted-foreground py-6 text-center text-sm">
                            Every line on this check already matches, or its variance has been fully resolved.
                        </p>
                    )}

                    <div>
                        <Label className="text-sm font-medium">Overall Note</Label>
                        <Input
                            className="mt-1"
                            placeholder="Optional overall note for this resolution"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={handleSubmit}
                            disabled={isPending || resolveMutation.isPending || !rows.length}
                        >
                            {isPending || resolveMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
                                </>
                            ) : (
                                'Submit Resolution'
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

export default ResolveCheckDialog;
