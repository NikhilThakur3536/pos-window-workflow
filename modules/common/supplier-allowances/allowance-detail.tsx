import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
    SUPPLIER_ALLOWANCE_MOVEMENT_ENTRY_TYPES,
    useGetSupplierAllowanceById,
    usePostSupplierAllowanceMovement,
    useReverseSupplierAllowanceMovement,
    type SupplierAllowanceMovement,
    type SupplierAllowanceMovementEntryType,
} from '@/api-queries/goods-receiving/supplier-allowances';
import { useApprovalAction } from '@/hooks/use-approval-action';

interface AllowanceDetailProps {
    allowanceId: string | null;
    onClose: () => void;
    onChanged: () => void;
}

const AllowanceDetail = ({ allowanceId, onClose, onChanged }: AllowanceDetailProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const query = useGetSupplierAllowanceById(allowanceId || '');
    const postMutation = usePostSupplierAllowanceMovement();
    const reverseMutation = useReverseSupplierAllowanceMovement();
    const approval = useApprovalAction();

    const [movementOpen, setMovementOpen] = useState(false);
    const [entryType, setEntryType] = useState<SupplierAllowanceMovementEntryType>('CLAIMED');
    const [amount, setAmount] = useState('');
    const [sourceType, setSourceType] = useState('');
    const [sourceDocumentId, setSourceDocumentId] = useState('');
    const [sourceDocumentNumber, setSourceDocumentNumber] = useState('');
    const [reason, setReason] = useState('');
    const [clientDocumentId, setClientDocumentId] = useState('');

    const [reverseMovement, setReverseMovement] = useState<SupplierAllowanceMovement | null>(null);
    const [reverseReason, setReverseReason] = useState('');

    useEffect(() => {
        if (!movementOpen) return;
        setEntryType('CLAIMED');
        setAmount('');
        setSourceType('');
        setSourceDocumentId('');
        setSourceDocumentNumber('');
        setReason('');
        setClientDocumentId(generateUUIDForData());
    }, [movementOpen]);

    const details = query.data?.data;
    const movements = details?.movements || [];
    const fmt = (value?: number | null) => `${currencySymbol}${Number(value ?? 0).toFixed(2)}`;

    const refresh = () => {
        void query.refetch();
        onChanged();
    };

    const submitMovement = async () => {
        if (!details?.id) return;
        const parsedAmount = Number(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return toast.error('Enter a movement amount greater than zero');
        }
        await approval.run(async (approvalToken) => {
            const response = await postMutation.mutateAsync({
                supplierAllowanceId: details.id,
                entryType,
                amount: parsedAmount,
                ...(sourceType.trim() ? { sourceType: sourceType.trim() } : {}),
                ...(sourceDocumentId.trim() ? { sourceDocumentId: sourceDocumentId.trim() } : {}),
                ...(sourceDocumentNumber.trim() ? { sourceDocumentNumber: sourceDocumentNumber.trim() } : {}),
                clientDocumentId,
                ...(reason.trim() ? { reason: reason.trim() } : {}),
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Allowance movement could not be posted');
                return;
            }
            toast.success('Allowance movement posted');
            setMovementOpen(false);
            refresh();
        }, 'Post Supplier Allowance Movement');
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
                toast.error(response.message || 'Allowance movement could not be reversed');
                return;
            }
            toast.success('Allowance movement reversed');
            setReverseMovement(null);
            setReverseReason('');
            refresh();
        }, 'Reverse Supplier Allowance Movement');
    };

    return (
        <>
            <Dialog open={!!allowanceId} onOpenChange={(next) => !next && onClose()}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Supplier Allowance Ledger</DialogTitle>
                        <DialogDescription>Allowance details, balance and movement history.</DialogDescription>
                    </DialogHeader>

                    <PageLoader isLoading={query.isLoading}>
                        {details ? (
                            <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-semibold">{details.name}</h3>
                                            <Badge variant="outline">{details.status || 'ACTIVE'}</Badge>
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            {details.allowanceCode} · {details.allowanceType} · {details.basis} ·{' '}
                                            {details.rate}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {details.CompanyCreditor?.name || details.companyCreditorId}
                                            {details.CompanyStockDetail?.description
                                                ? ` · ${details.CompanyStockDetail.description}`
                                                : ''}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setMovementOpen(true)}
                                        disabled={reverseMutation.isPending}
                                    >
                                        Post Movement
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                                    {[
                                        ['Earned', details.totalEarned],
                                        ['Claimed', details.totalClaimed],
                                        ['Approved', details.totalApproved],
                                        ['Used', details.totalUsed],
                                        ['Balance', details.balance],
                                    ].map(([label, value]) => (
                                        <div key={String(label)} className="rounded-md border p-2">
                                            <div className="text-muted-foreground text-[11px]">{label}</div>
                                            <div className="font-mono text-sm font-semibold">
                                                {fmt(value as number | undefined)}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="overflow-x-auto rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Entry</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead>Reason</TableHead>
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
                                                            <Badge variant="outline">{movement.entryType}</Badge>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs">
                                                            {fmt(movement.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <div>{movement.sourceType || '—'}</div>
                                                            <div className="text-muted-foreground">
                                                                {movement.sourceDocumentNumber ||
                                                                    movement.sourceDocumentId ||
                                                                    ''}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="max-w-[220px] text-xs">
                                                            {movement.reason || '—'}
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
                                                        No ledger movements yet.
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

            <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Post Allowance Movement</DialogTitle>
                        <DialogDescription>Manual claim, approval or usage entry against this allowance.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Entry Type</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Entry Type"
                                    onlyTitle="Select entry type"
                                    selectedValue={entryType}
                                    options={SUPPLIER_ALLOWANCE_MOVEMENT_ENTRY_TYPES.map((type) => ({
                                        label: type,
                                        value: type,
                                    }))}
                                    onSelect={(value) =>
                                        setEntryType(
                                            String(value || 'CLAIMED') as SupplierAllowanceMovementEntryType,
                                        )
                                    }
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                className="mt-1"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Source Type</Label>
                                <Input
                                    className="mt-1"
                                    value={sourceType}
                                    onChange={(event) => setSourceType(event.target.value)}
                                    placeholder="SUPPLIER_CLAIM"
                                />
                            </div>
                            <div>
                                <Label>Source Document Number</Label>
                                <Input
                                    className="mt-1"
                                    value={sourceDocumentNumber}
                                    onChange={(event) => setSourceDocumentNumber(event.target.value)}
                                    placeholder="CLM-1001"
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
                        <div>
                            <Label>Reason</Label>
                            <Textarea
                                className="mt-1"
                                rows={2}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMovementOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={submitMovement} disabled={postMutation.isPending}>
                            {postMutation.isPending ? 'Posting…' : 'Post Movement'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!reverseMovement} onOpenChange={(next) => !next && setReverseMovement(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reverse Allowance Movement</DialogTitle>
                        <DialogDescription>
                            Reverse {reverseMovement?.entryType} of {fmt(reverseMovement?.amount)}.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label>Reason</Label>
                        <Textarea
                            className="mt-1"
                            rows={3}
                            value={reverseReason}
                            onChange={(event) => setReverseReason(event.target.value)}
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

export default AllowanceDetail;
