import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    useApproveStockDisposition,
    useCancelStockDisposition,
    useWriteOffStockDisposition,
    useReturnStockDispositionToSupplier,
    StockDisposition,
} from '@/api-queries/nst';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { isApprovalRequiredError, type ApprovalAction } from '@/hooks/use-approval-required';

export type NSTActionType = 'APPROVE' | 'CANCEL' | 'WRITE_OFF' | 'RETURN';

const actionSchema = z.object({
    // Optional on the wire: the backend defaults a missing quantity to the full
    // remaining quantity, so only an explicit value needs validating.
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    reason: z.string().optional(),
});

type ActionValues = z.infer<typeof actionSchema>;

interface NSTActionsDialogProps {
    open: boolean;
    onClose: () => void;
    disposition: StockDisposition | null;
    action: NSTActionType;
}

const NSTActionsDialog = ({ open, onClose, disposition, action }: NSTActionsDialogProps) => {
    const [approvalOpen, setApprovalOpen] = useState(false);
    const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
    const [approvals, setApprovals] = useState<ApprovalAction[] | undefined>(undefined);

    const approveMut = useApproveStockDisposition();
    const cancelMut = useCancelStockDisposition();
    const writeOffMut = useWriteOffStockDisposition();
    const returnMut = useReturnStockDispositionToSupplier();

    const form = useForm<ActionValues>({
        resolver: zodResolver(actionSchema),
        defaultValues: { quantity: undefined, reason: '' },
    });

    useEffect(() => {
        if (open) {
            form.reset({ quantity: undefined, reason: '' });
            setApprovalOpen(false);
            setPendingApprovalId(null);
            setApprovals(undefined);
        }
    }, [open, disposition]);

    const isApprove = action === 'APPROVE';

    const buildApprovePayload = () => ({
        id: disposition?.id || '',
        ...(disposition?.companyDebtorId ? { companyDebtorId: disposition.companyDebtorId } : {}),
        reason: form.getValues('reason'),
    });

    const handleApproveResult = (data: { success: boolean; message?: string }) => {
        if (data?.success) {
            toast.success('NST approved successfully');
            setApprovalOpen(false);
            onClose();
        } else {
            toast.error(data?.message || 'NST approval failed');
        }
    };

    // Retry after the supervisor flow: resend the same body plus the token keyed by
    // the action code the 428 reported.
    const runApprove = (approvalToken: string, tokens?: Record<string, string>) => {
        if (!disposition) return;
        approveMut.mutate(
            {
                ...buildApprovePayload(),
                ...(tokens && Object.keys(tokens).length ? { approvalTokens: tokens } : { approvalToken }),
            },
            { onSuccess: handleApproveResult, onError: handleApproveError },
        );
    };

    const handleApproveError = (error: unknown) => {
        const info = isApprovalRequiredError(error);
        if (info) {
            // The first attempt may already have been gated; remember the request so
            // the retry targets the approval the backend actually asked for.
            setPendingApprovalId(info.approvalRequestId || disposition?.approvalId || disposition?.id || null);
            setApprovals(info.approvals);
            setApprovalOpen(true);
        } else {
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        }
    };

    // Called when the user confirms. The backend decides whether approval is needed;
    // only a 428 opens the supervisor dialog.
    const startApprove = () => {
        if (!disposition) return;
        approveMut.mutate(buildApprovePayload(), {
            onSuccess: handleApproveResult,
            onError: handleApproveError,
        });
    };

    const onSubmit = (values: ActionValues) => {
        if (!disposition) return;

        // Approve travels through the same submit path as the other actions so the
        // reason typed in the dialog is validated and sent, and Confirm always fires.
        if (isApprove) {
            startApprove();
            return;
        }

        const payload = {
            id: disposition.id,
            ...(disposition.companyDebtorId ? { companyDebtorId: disposition.companyDebtorId } : {}),
            // Omitted entirely when the field was left blank so the backend applies
            // the full remaining quantity.
            ...(values.quantity ? { quantity: values.quantity } : {}),
            ...(values.reason ? { reason: values.reason } : {}),
        };

        const config = {
            onSuccess: (data: { success: boolean; message?: string }) => {
                if (data?.success) {
                    toast.success('NST updated successfully');
                    onClose();
                } else {
                    toast.error(data?.message || 'NST update failed');
                }
            },
            onError: (error: unknown) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        };

        if (action === 'CANCEL') cancelMut.mutate(payload, config);
        else if (action === 'WRITE_OFF') writeOffMut.mutate(payload, config);
        else if (action === 'RETURN') returnMut.mutate(payload, config);
    };

    const actionLabel = {
        APPROVE: 'Approve NST',
        CANCEL: 'Cancel NST',
        WRITE_OFF: 'Write-off NST',
        RETURN: 'Return to Supplier',
    }[action];

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]" onWheel={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="font-semibold">{actionLabel}</DialogTitle>
                    </DialogHeader>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {!isApprove ? (
                            <div className="space-y-3">
                                <div>
                                    <Label className="gap-1 text-xs">
                                        Quantity <span className="text-muted-foreground">(blank = all remaining)</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        {...form.register('quantity', { valueAsNumber: true })}
                                    />
                                    {form.formState.errors.quantity && (
                                        <p className="text-destructive text-[10px]">
                                            {form.formState.errors.quantity.message}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label className="text-xs">Reason</Label>
                                    <Textarea {...form.register('reason')} className="h-16 text-xs" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs">
                                    This NST allocation requires supervisor approval. Completing this action will open
                                    the supervisor approval flow.
                                </p>
                                <div>
                                    <Label className="text-xs">Reason</Label>
                                    <Textarea
                                        {...form.register('reason')}
                                        className="h-16 text-xs"
                                        placeholder="Enter reason for approval"
                                    />
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={isApprove ? approveMut.isPending : false}
                            >
                                {isApprove && approveMut.isPending ? 'Approving…' : 'Confirm'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={approvalOpen}
                onClose={() => setApprovalOpen(false)}
                approvalRequestId={pendingApprovalId || undefined}
                approvals={approvals}
                actionLabel={actionLabel}
                onApproved={runApprove}
            />
        </>
    );
};

export default NSTActionsDialog;
