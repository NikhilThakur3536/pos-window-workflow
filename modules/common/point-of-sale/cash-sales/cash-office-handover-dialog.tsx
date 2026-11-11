import { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetCashOfficeSessions, useRequestCashOfficeHandover } from '@/api-queries/cash-office';

interface CashOfficeHandoverDialogProps {
    open: boolean;
    onClose: () => void;
    tillId: string;
    tillName?: string;
    suggestedAmount?: number;
    cashOfficeId?: string | null;
    cashOfficeName?: string | null;
    onCompleted?: () => void;
}

// A till routed CASH_OFFICE_THEN_SAFE cannot drop straight into a safe, so the
// cashier declares the cash here and the Cash Office queue counts and receives it.
const CashOfficeHandoverDialog = ({
    open,
    onClose,
    tillId,
    tillName,
    suggestedAmount,
    cashOfficeId,
    cashOfficeName,
    onCompleted,
}: CashOfficeHandoverDialogProps) => {
    const [declaredCash, setDeclaredCash] = useState('');
    const [sessionId, setSessionId] = useState('');

    const handoverMutation = useRequestCashOfficeHandover();
    const sessionQuery = useGetCashOfficeSessions({
        ...(cashOfficeId ? { cashOfficeId } : {}),
        dateFrom: moment().format('YYYY-MM-DD'),
        dateTo: moment().format('YYYY-MM-DD'),
        limit: 50,
        offset: 0,
    });

    const sessions = useMemo(
        () => (sessionQuery.data?.data?.rows || []).filter((session) => session.status === 'OPEN'),
        [sessionQuery.data],
    );

    useEffect(() => {
        if (!open) return;
        setDeclaredCash(suggestedAmount != null && suggestedAmount > 0 ? String(suggestedAmount) : '');
        setSessionId(sessions.length === 1 ? sessions[0].id : '');
    }, [open, suggestedAmount, sessions]);

    const handleSubmit = () => {
        const amount = Number(declaredCash);
        if (!sessionId) return toast.error('Select an open Cash Office session');
        if (Number.isNaN(amount) || amount <= 0) return toast.error('Enter the cash amount being handed over');

        handoverMutation.mutate(
            {
                cashOfficeSessionId: sessionId,
                tillId,
                requestType: 'MANUAL',
                declaredCashAmount: amount,
                declaredChequeAmount: 0,
                clientDocumentId: `TCOH-${tillId}-${Date.now()}`,
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        toast.success('Cash Office handover requested');
                        onCompleted?.();
                        onClose();
                    } else {
                        toast.error(res.message || 'Handover request failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && !handoverMutation.isPending && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Cash Office Handover</DialogTitle>
                    <DialogDescription>
                        {tillName || 'This till'} routes through the Cash Office before reaching a safe. Declaring the cash
                        here creates a handover for the Cash Office to count and receive.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm">Cash Office Session</Label>
                        <Select value={sessionId} onValueChange={setSessionId}>
                            <SelectTrigger>
                                <SelectValue placeholder={cashOfficeName || 'Select an open session'} />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map((session) => (
                                    <SelectItem key={session.id} value={session.id}>
                                        {session.businessDate || session.id}
                                        {session.openedByName ? ` — ${session.openedByName}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {sessions.length === 0 && !sessionQuery.isLoading && (
                            <p className="text-xs text-muted-foreground">
                                {cashOfficeName || 'The Cash Office'} has no open session for{' '}
                                {moment().format('YYYY-MM-DD')}. Ask the cashier to open one first.
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-sm">Declared Cash Amount</Label>
                        <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={declaredCash}
                            onChange={(e) => setDeclaredCash(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={handoverMutation.isPending}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        className="bg-amber-600 hover:bg-amber-700"
                        onClick={handleSubmit}
                        disabled={handoverMutation.isPending || sessions.length === 0}
                    >
                        {handoverMutation.isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Requesting…
                            </>
                        ) : (
                            'Request Handover'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CashOfficeHandoverDialog;
