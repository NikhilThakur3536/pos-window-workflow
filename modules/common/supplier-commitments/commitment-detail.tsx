import { useEffect, useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { toast } from 'sonner';
import moment from 'moment';
import { generateUUIDForData } from '@/utils/helpers';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    SUPPLIER_COMMITMENT_MOVEMENT_TYPES,
    useConsumeSupplierCommitment,
    useGetSupplierCommitmentById,
    useReverseSupplierCommitmentMovement,
    type SupplierCommitmentMovement,
    type SupplierCommitmentMovementType,
} from '@/api-queries/goods-receiving/supplier-commitments';
import { useApprovalAction } from '@/hooks/use-approval-action';

interface CommitmentDetailProps {
    commitmentId: string | null;
    onClose: () => void;
    onChanged: () => void;
}

const CommitmentDetail = ({ commitmentId, onClose, onChanged }: CommitmentDetailProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const query = useGetSupplierCommitmentById(commitmentId || '');
    const consumeMutation = useConsumeSupplierCommitment();
    const reverseMutation = useReverseSupplierCommitmentMovement();
    const approval = useApprovalAction();

    const [consumeOpen, setConsumeOpen] = useState(false);
    const [movementType, setMovementType] = useState<SupplierCommitmentMovementType>('ORDERED');
    const [quantity, setQuantity] = useState('');
    const [value, setValue] = useState('');
    const [sourceType, setSourceType] = useState('');
    const [sourceDocumentId, setSourceDocumentId] = useState('');
    const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
    const [clientDocumentId, setClientDocumentId] = useState('');

    const [reverseMovement, setReverseMovement] = useState<SupplierCommitmentMovement | null>(null);
    const [reverseReason, setReverseReason] = useState('');

    useEffect(() => {
        if (!consumeOpen) return;
        setMovementType('ORDERED');
        setQuantity('');
        setValue('');
        setSourceType('');
        setSourceDocumentId('');
        setSourceDocumentNumber('');
        setClientDocumentId(generateUUIDForData());
    }, [consumeOpen]);

    const details = query.data?.data;
    const movements = details?.movements || [];
    const fmt = (value?: number | null) => `${currencySymbol}${Number(value ?? 0).toFixed(2)}`;

    const refresh = () => {
        void query.refetch();
        onChanged();
    };

    const submitConsume = async () => {
        if (!details?.id) return;
        const parsedQuantity = quantity.trim() ? Number(quantity) : null;
        const parsedValue = value.trim() ? Number(value) : null;
        if (
            (parsedQuantity == null || !Number.isFinite(parsedQuantity) || parsedQuantity < 0) &&
            (parsedValue == null || !Number.isFinite(parsedValue) || parsedValue < 0)
        ) {
            return toast.error('Enter a quantity or value');
        }
        await approval.run(async (approvalToken) => {
            const response = await consumeMutation.mutateAsync({
                supplierPurchaseCommitmentId: details.id,
                movementType,
                quantity: parsedQuantity,
                value: parsedValue,
                ...(sourceType.trim() ? { sourceType: sourceType.trim() } : {}),
                ...(sourceDocumentId.trim() ? { sourceDocumentId: sourceDocumentId.trim() } : {}),
                ...(sourceDocumentNumber.trim() ? { sourceDocumentNumber: sourceDocumentNumber.trim() } : {}),
                clientDocumentId,
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Commitment consumption could not be posted');
                return;
            }
            toast.success('Commitment consumption posted');
            setConsumeOpen(false);
            refresh();
        }, 'Post Supplier Commitment Consumption');
    };

    const submitReverse = async () => {
        if (!reverseMovement) return;
        if (!reverseReason.trim()) return toast.error('Reason is required');
        await approval.run(async (approvalToken) => {
            const response = await reverseMutation.mutateAsync({
                movementId: reverseMovement.id,
                reason: reverseReason.trim(),
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Commitment movement could not be reversed');
                return;
            }
            toast.success('Commitment movement reversed');
            setReverseMovement(null);
            setReverseReason('');
            refresh();
        }, 'Reverse Supplier Commitment Movement');
    };

    return (
        <>
            <Dialog open={!!commitmentId} onOpenChange={(next) => !next && onClose()}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Supplier Purchase Commitment</DialogTitle>
                        <DialogDescription>Commitment details, remaining balance and movement history.</DialogDescription>
                    </DialogHeader>

                    <PageLoader isLoading={query.isLoading}>
                        {details ? (
                            <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-semibold">{details.name}</h3>
                                            <Badge variant="outline">{details.status || 'ACTIVE'}</Badge>
                                            {details.isOverCommitted && (
                                                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                                    Over committed
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            {details.commitmentCode} ·{' '}
                                            {details.CompanyCreditor?.name || details.companyCreditorId}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {details.periodStart
                                                ? moment(details.periodStart).format('DD MMM YYYY')
                                                : '—'}{' '}
                                            to{' '}
                                            {details.periodEnd
                                                ? moment(details.periodEnd).format('DD MMM YYYY')
                                                : '—'}
                                            {details.CompanyStockDetail?.description
                                                ? ` · ${details.CompanyStockDetail.description}`
                                                : ''}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setConsumeOpen(true)}
                                        disabled={reverseMutation.isPending}
                                    >
                                        Post Consumption
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {[
                                        ['Committed Qty', details.committedQuantity],
                                        ['Received Qty', details.totalReceivedQuantity],
                                        ['Remaining Qty', details.remainingQuantity],
                                        ['Committed Value', details.committedValue],
                                        ['Received Value', details.totalReceivedValue],
                                        ['Remaining Value', details.remainingValue],
                                        ['Ordered Qty', details.totalOrderedQuantity],
                                        ['Invoiced Qty', details.totalInvoicedQuantity],
                                    ].map(([label, itemValue]) => (
                                        <div key={String(label)} className="rounded-md border p-2">
                                            <div className="text-muted-foreground text-[11px]">{label}</div>
                                            <div className="font-mono text-sm font-semibold">
                                                {String(label).includes('Value')
                                                    ? fmt(itemValue as number | undefined)
                                                    : (itemValue ?? 0)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Movement</TableHead>
                                                <TableHead>Quantity</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead />
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {movements.length ? (
                                                movements.map((movement) => (
                                                    <TableRow key={movement.id}>
                                                        <TableCell className="text-xs">
                                                            {moment(
                                                                movement.movementDate ||
                                                                    movement.createdAt ||
                                                                    undefined,
                                                            ).format('DD MMM YYYY HH:mm')}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{movement.movementType}</Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {movement.quantity ?? '—'}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {movement.value != null ? fmt(movement.value) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <div>{movement.sourceType || '—'}</div>
                                                            <div className="text-muted-foreground">
                                                                {movement.sourceDocumentNumber ||
                                                                    movement.sourceDocumentId ||
                                                                    ''}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-red-600"
                                                                onClick={() => {
                                                                    setReverseMovement(movement);
                                                                    setReverseReason('');
                                                                }}
                                                            >
                                                                Reverse
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground text-center text-sm">
                                                        No commitment movements yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        ) : null}
                    </PageLoader>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={consumeOpen} onOpenChange={setConsumeOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Post Commitment Consumption</DialogTitle>
                        <DialogDescription>
                            Record ordered, received or invoiced consumption against this commitment.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Movement Type</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Movement Type"
                                    onlyTitle="Select movement type"
                                    selectedValue={movementType}
                                    options={SUPPLIER_COMMITMENT_MOVEMENT_TYPES.map((type) => ({
                                        label: type,
                                        value: type,
                                    }))}
                                    onSelect={(value) =>
                                        setMovementType(
                                            String(value || 'ORDERED') as SupplierCommitmentMovementType,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    className="mt-1"
                                    value={quantity}
                                    onChange={(event) => setQuantity(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Value</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="mt-1"
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Source Type</Label>
                                <Input
                                    className="mt-1"
                                    value={sourceType}
                                    onChange={(event) => setSourceType(event.target.value)}
                                    placeholder="PURCHASE_ORDER"
                                />
                            </div>
                            <div>
                                <Label>Source Document Number</Label>
                                <Input
                                    className="mt-1"
                                    value={sourceDocumentNumber}
                                    onChange={(event) => setSourceDocumentNumber(event.target.value)}
                                    placeholder="PO-1001"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Source Document ID</Label>
                            <Input
                                className="mt-1"
                                value={sourceDocumentId}
                                onChange={(event) => setSourceDocumentId(event.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConsumeOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitConsume} disabled={consumeMutation.isPending}>
                            {consumeMutation.isPending ? 'Posting…' : 'Post Consumption'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!reverseMovement} onOpenChange={(next) => !next && setReverseMovement(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reverse Commitment Movement</DialogTitle>
                        <DialogDescription>
                            Reverse {reverseMovement?.movementType} consumption.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Reason</Label>
                        <Input
                            className="mt-1"
                            value={reverseReason}
                            onChange={(event) => setReverseReason(event.target.value)}
                            placeholder="Purchase order cancelled"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReverseMovement(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitReverse}
                            disabled={reverseMutation.isPending}
                        >
                            {reverseMutation.isPending ? 'Reversing…' : 'Reverse Movement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={approval.openApproval}
                onClose={approval.closeApproval}
                approvalRequestId={approval.approval?.approvalRequestId}
                allowedMethods={approval.approval?.allowedMethods}
                actionLabel={approval.approval?.actionLabel}
                approverGroupName={approval.approval?.approverGroupName}
                onApproved={approval.handleApproved}
            />
        </>
    );
};

export default CommitmentDetail;
