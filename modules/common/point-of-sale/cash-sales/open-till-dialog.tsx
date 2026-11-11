import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthUser } from '@/stores/auth-user.store';
import { useTillSessionState } from '@/stores/till-session.store';
import {
    TillSession,
    useOpenTillSession,
} from '@/api-queries/till-session';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { getTerminalErrorMessage } from '@/utils/terminal-errors';

interface OpenTillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onOpened?: (session: TillSession) => void;
}

const OpenTillDialog = ({ open, onOpenChange, onOpened }: OpenTillDialogProps) => {
    const user = useAuthUser((state) => state.user);
    const [openingFloat, setOpeningFloat] = useState<string>('');
    const eligibleTills = user?.eligibleTills || [];
    const selectedTill = eligibleTills.length === 1 ? eligibleTills[0] : null;

    const { mutate: openSession, isPending } = useOpenTillSession();

    const handleOpen = () => {
        if (eligibleTills.length !== 1 || !selectedTill) {
            toast.error(
                getTerminalErrorMessage(
                    eligibleTills.length > 1 ? 'TERMINAL_ASSIGNMENT_AMBIGUOUS' : 'TERMINAL_NOT_ASSIGNED',
                ),
            );
            return;
        }
        const terminalId = user?.terminalId;
        if (!terminalId) {
            toast.error('No terminal is bound to this login. Sign in again after completing terminal setup or assignment.');
            return;
        }
        const float = openingFloat === '' ? 0 : Number(openingFloat);
        if (Number.isNaN(float) || float < 0) {
            toast.error('Opening float must be a valid non-negative amount.');
            return;
        }

        openSession(
            {
                data: {
                    tillId: selectedTill.id,
                    openingFloat: float,
                    rosterAssignmentId: selectedTill.rosterAssignmentId || user?.rosterAssignmentId,
                },
                terminalId,
            },
            {
                onSuccess: (res) => {
                    if (!res?.success) {
                        toast.error(
                            getTerminalErrorMessage(
                                res?.message,
                                'Failed to open till. Please contact administrator.',
                            ),
                        );
                        return;
                    }
                    const session = res?.data as TillSession | undefined;
                    if (!session) {
                        toast.error('Till was not opened. Please try again.');
                        return;
                    }
                    useTillSessionState.getState().setTillSession(session);
                    toast.success(`${selectedTill.name} opened successfully. You can now accept payments.`);
                    setOpeningFloat('');
                    onOpenChange(false);
                    onOpened?.(session);
                },
                onError: (error) => {
                    const apiError = error as typeof error & {
                        response?: { data?: { message?: string; error?: string } };
                    };
                    toast.error(
                        getTerminalErrorMessage(
                            apiError.response?.data?.message ||
                                apiError.response?.data?.error ||
                                apiError.message,
                            'Failed to open till. Please contact administrator.',
                        ),
                    );
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px]">
                <DialogHeader>
                    <DialogTitle>Open Till</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Alert>
                        <AlertTitle className="text-sm font-medium">Till session required</AlertTitle>
                        <AlertDescription className="text-sm">
                            Checkouts are recorded against an opened till session. Open your till to start accepting
                            payments.
                        </AlertDescription>
                    </Alert>

                    {!selectedTill ? (
                        <div className="text-sm text-muted-foreground">
                            {eligibleTills.length > 1
                                ? getTerminalErrorMessage('TERMINAL_ASSIGNMENT_AMBIGUOUS')
                                : getTerminalErrorMessage('TERMINAL_NOT_ASSIGNED')}
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <Label>Assigned till</Label>
                                <p className="text-sm font-medium">{selectedTill.name || selectedTill.id}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Opening Float</Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={openingFloat}
                                    onChange={(e) => setOpeningFloat(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Cash available in the till at the start of the session.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleOpen}
                                    disabled={isPending || !selectedTill}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening...
                                        </>
                                    ) : (
                                        'Open Till'
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OpenTillDialog;