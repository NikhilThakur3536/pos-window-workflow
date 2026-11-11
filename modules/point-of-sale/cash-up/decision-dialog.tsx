import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCcw, SearchCheck, XCircle } from 'lucide-react';
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
import {
    getCashUpById,
    useDecideCashUp,
    type CashUpDecision,
    type CashUpDetails,
} from '@/api-queries/till-management/cash-up';
import { useAuthUser } from '@/stores/auth-user.store';
import { toast } from 'sonner';

interface CashUpDecisionDialogProps {
    open: boolean;
    data: CashUpDetails | null;
    onClose: () => void;
}

const formatMoney = (value: string | number | null | undefined, symbol: string) =>
    `${symbol} ${(Number(value || 0) || 0).toFixed(2)}`;

const DECISIONS: Array<{
    key: CashUpDecision;
    label: string;
    description: string;
    icon: typeof CheckCircle2;
    className: string;
}> = [
    {
        key: 'APPROVE',
        label: 'Accept variance',
        description: 'Accept the counted amount and approve this cash-up.',
        icon: CheckCircle2,
        className: 'bg-green-600 hover:bg-green-700',
    },
    {
        key: 'RECOUNT',
        label: 'Recount',
        description: 'Send it back to the cashier to count the drawer again.',
        icon: RefreshCcw,
        className: 'bg-amber-600 hover:bg-amber-700',
    },
    {
        key: 'INVESTIGATE',
        label: 'Investigate',
        description: 'Keep this cash-up under review while the variance is investigated.',
        icon: SearchCheck,
        className: 'bg-indigo-600 hover:bg-indigo-700',
    },
    {
        key: 'REJECT',
        label: 'Reject',
        description: 'Reject this cash-up. The cashier cannot resubmit it.',
        icon: XCircle,
        className: 'bg-red-600 hover:bg-red-700',
    },
];

const CashUpDecisionDialog = ({ open, data, onClose }: CashUpDecisionDialogProps) => {
    const decideMutation = useDecideCashUp();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (open) setNotes('');
    }, [open, data?.id]);

    if (!data) return null;

    const variance = Number(data.variance || 0) || 0;

    const runDecision = async (decision: CashUpDecision) => {
        if (decision !== 'APPROVE' && !notes.trim()) {
            toast.error('Enter notes explaining this decision.');
            return;
        }
        try {
            const response = await decideMutation.mutateAsync({
                id: data.id,
                decision,
                ...(notes.trim() ? { notes: notes.trim() } : {}),
            });
            if (!response?.success) {
                toast.error(response?.message || 'Update failed');
                return;
            }
            await getCashUpById(data.id);
            const verb =
                decision === 'APPROVE'
                    ? 'updated'
                    : decision === 'RECOUNT'
                      ? 'sent for recount'
                      : decision === 'INVESTIGATE'
                        ? 'sent for investigation'
                        : 'rejected';
            toast.success(`Cash-up ${verb}.`);
            onClose();
        } catch (error) {
            const apiError = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(apiError.response?.data?.message || apiError.message || 'Update failed');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && !decideMutation.isPending && onClose()}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-2xl">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Review Cash Up</DialogTitle>
                    <DialogDescription>
                        {data.till?.name || data.till?.tillNumber || ''}
                        {data.cashUpDate ? ` · ${data.cashUpDate}` : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto text-center text-sm">
                    <div className="rounded-md border p-2">
                        <div className="text-muted-foreground text-xs">Expected</div>
                        <div className="font-semibold tabular-nums">
                            {formatMoney(data.expectedTotal ?? data.expectedTotals, currencySymbol)}
                        </div>
                    </div>
                    <div className="rounded-md border p-2">
                        <div className="text-muted-foreground text-xs">Declared</div>
                        <div className="font-semibold tabular-nums">
                            {formatMoney(data.declaredTotal ?? data.declaredTotals, currencySymbol)}
                        </div>
                    </div>
                    <div className={`rounded-md border p-2 ${variance === 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                        <div className="text-muted-foreground text-xs">Variance</div>
                        <div className="font-semibold tabular-nums">{formatMoney(data.variance, currencySymbol)}</div>
                    </div>
                </div>

                {variance !== 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                            This cash-up has a variance of {formatMoney(data.variance, currencySymbol)}. Approving
                            accepts the counted amount.
                        </span>
                    </div>
                )}

                <div>
                    <Label className="text-sm font-medium">Notes</Label>
                    <Input
                        className="mt-1"
                        placeholder="Reason for the decision"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <DialogFooter className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
                    {DECISIONS.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Button
                                key={item.key}
                                type="button"
                                title={item.description}
                                className={`w-full ${item.className}`}
                                onClick={() => void runDecision(item.key)}
                                disabled={decideMutation.isPending || (item.key !== 'APPROVE' && !notes.trim())}
                            >
                                <Icon className="mr-1 h-4 w-4" />
                                {item.label}
                            </Button>
                        );
                    })}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CashUpDecisionDialog;
