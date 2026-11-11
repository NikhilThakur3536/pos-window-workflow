import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    getCashUpById,
    useGetShiftCashUps,
    useSubmitCashUp,
    type CashUpDetails,
} from '@/api-queries/till-management/cash-up';
import {
    shiftHandover,
    useGetCurrentShift,
    type ShiftDetails,
} from '@/api-queries/till-management/shifts';
import { useGetCurrentUserSession, useActiveTillSession, isTillSessionActive } from '@/api-queries/till-session';
import { useTillSessionState } from '@/stores/till-session.store';
import { useAuthUser } from '@/stores/auth-user.store';
import { AUTH_TOKEN_KEY } from '@/lib/constant';
import { generateUUIDForData } from '@/utils/helpers';
import CashUpForm from '@/modules/point-of-sale/cash-up/form';
import OpenTillDialog from '@/modules/common/point-of-sale/cash-sales/open-till-dialog';
import { clearDB } from '@/offline/db';

type CurrentShiftPayload =
    | ShiftDetails
    | { shift?: ShiftDetails | null; currentShift?: ShiftDetails | null }
    | null
    | undefined;

function getShift(payload: CurrentShiftPayload): ShiftDetails | null {
    if (!payload) return null;
    if ('id' in payload) return payload;
    return payload.shift || payload.currentShift || null;
}

function chooseCurrentCashUp(rows: CashUpDetails[] = []): CashUpDetails | null {
    const activeStatuses = [
        'DRAFT',
        'SUBMITTED',
        'PENDING_APPROVAL',
        'APPROVED',
        'RECOUNT_REQUIRED',
        'INVESTIGATION_PENDING',
    ];
    const current = rows
        .filter((cashUp) => activeStatuses.includes(cashUp.status || ''))
        .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))[0];
    if (current) return current;
    return (
        rows
            .filter((cashUp) => cashUp.status === 'REJECTED')
            .sort((a, b) => Date.parse(b.updatedAt || b.createdAt) - Date.parse(a.updatedAt || a.createdAt))[0] || null
    );
}

const MyShift = () => {
    const queryClient = useQueryClient();
    const authUser = useAuthUser((state) => state.user);
    const logout = useAuthUser((state) => state.logout);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const currentShiftQuery = useGetCurrentShift();
    const currentSessionQuery = useGetCurrentUserSession(!!authUser?.token);
    const tillSessionQuery = useActiveTillSession(!!authUser?.token);
    const shift = getShift(currentShiftQuery.data?.data);
    const activeTillSession = isTillSessionActive(tillSessionQuery.data?.data)
        ? tillSessionQuery.data.data
        : null;
    const cashUpsQuery = useGetShiftCashUps(shift?.id);
    const cashUp = useMemo(
        () => chooseCurrentCashUp(cashUpsQuery.data?.data?.rows),
        [cashUpsQuery.data],
    );
    const [openTill, setOpenTill] = useState(false);
    const [cashUpFormOpen, setCashUpFormOpen] = useState(false);
    const [editingCashUp, setEditingCashUp] = useState<CashUpDetails | null>(null);
    const [closing, setClosing] = useState(false);
    const submitMutation = useSubmitCashUp();

    const sessionId =
        currentSessionQuery.data?.data?.sessionId ||
        currentSessionQuery.data?.data?.id;
    const currentSessionVerified = currentSessionQuery.isSuccess && !currentSessionQuery.isFetching;
    const currentShiftVerified = currentShiftQuery.isSuccess && !currentShiftQuery.isFetching;
    const isOwnOpenShift =
        currentSessionVerified &&
        currentShiftVerified &&
        shift?.status === 'OPEN' &&
        !!authUser?.id &&
        shift.cashierUserId === authUser.id &&
        !!sessionId &&
        shift.userSessionId === sessionId;
    const cashUpStatus = cashUp?.status || '';
    const canClose =
        cashUpStatus === 'APPROVED' &&
        !['RECOUNT', 'INVESTIGATE'].includes(cashUp?.resolution || '') &&
        !['RECOUNT_REQUIRED', 'INVESTIGATION_PENDING'].includes(cashUpStatus) &&
        shift?.status === 'OPEN' &&
        isOwnOpenShift &&
        cashUp?.shiftId === shift.id &&
        cashUp.shift?.id === shift.id;

    const refresh = async () => {
        await Promise.all([
            currentShiftQuery.refetch(),
            currentSessionQuery.refetch(),
            tillSessionQuery.refetch(),
            cashUpsQuery.refetch(),
        ]);
    };

    const startCashUp = (data?: CashUpDetails | null) => {
        setEditingCashUp(data || null);
        setCashUpFormOpen(true);
    };

    const submitCashUp = async () => {
        if (!cashUp?.id) return;
        if (!isOwnOpenShift || cashUp.shiftId !== shift?.id) {
            toast.error('This cash-up is not linked to your current open shift and login session.');
            return;
        }
        try {
            const response = await submitMutation.mutateAsync({ id: cashUp.id, status: 'SUBMITTED' });
            if (!response.success) {
                toast.error(response.message || 'Failed to submit cash-up.');
                return;
            }
            try {
                await getCashUpById(cashUp.id);
            } catch (error) {
                const refreshError = error as {
                    response?: { data?: { message?: string } };
                    message?: string;
                };
                await refresh();
                toast.error(
                    `Cash-up submitted, but refresh failed: ${refreshError.response?.data?.message || refreshError.message || 'Please refresh this screen.'}`,
                );
                return;
            }
            await refresh();
            toast.success('Cash-up submitted. Awaiting supervisor review.');
        } catch (error) {
            const apiError = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(apiError.response?.data?.message || apiError.message || 'Failed to submit cash-up.');
        }
    };

    const closeMyShift = async () => {
        if (!cashUp?.id || !shift?.id || !canClose) return;
        if (!window.confirm('Close your shift and sign out? The next cashier will need to log in.')) return;
        setClosing(true);
        const requestKey = `pending-shift-handover:${shift.id}:${cashUp.id}`;
        const handoverRequestId = window.localStorage.getItem(requestKey) || generateUUIDForData();
        window.localStorage.setItem(requestKey, handoverRequestId);
        try {
            const response = await shiftHandover({ cashUpId: cashUp.id, handoverRequestId });
            if (!response?.success) throw new Error(response?.message || 'Shift handover failed.');
            window.localStorage.removeItem(requestKey);
            try {
                await clearDB();
            } catch (error) {
                console.error('Failed to clear offline user data after shift closure:', error);
                toast.error('Shift closed. Some offline user data could not be cleared.');
            }
            window.localStorage.removeItem(AUTH_TOKEN_KEY);
            window.localStorage.removeItem('companyContext');
            useTillSessionState.getState().clearTillSession();
            logout();
            queryClient.clear();
            window.location.replace('/auth/login');
        } catch (error) {
            const apiError = error as { response?: { data?: { message?: string } }; message?: string };
            toast.error(apiError.response?.data?.message || apiError.message || 'Shift handover failed.');
        } finally {
            setClosing(false);
        }
    };

    const formatAmount = (value: string | number | null | undefined) =>
        `${currencySymbol} ${(Number(value || 0) || 0).toFixed(2)}`;

    const currentSessionError = currentSessionQuery.error as
        | { response?: { data?: { message?: string } }; message?: string }
        | null;
    const shiftError = currentShiftQuery.error as
        | { response?: { data?: { message?: string } }; message?: string }
        | null;
    const cashUpsError = cashUpsQuery.error as
        | { response?: { data?: { message?: string } }; message?: string }
        | null;
    const tillSessionError = tillSessionQuery.error as
        | { response?: { data?: { message?: string } }; message?: string }
        | null;

    return (
        <PageLoader isLoading={currentShiftQuery.isLoading}>
            <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold">My Shift / Cash-Up</h1>
                    <Button variant="outline" onClick={refresh} disabled={currentShiftQuery.isFetching}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                </div>

                {currentSessionError && (
                    <p className="text-sm text-destructive">
                        {currentSessionError.response?.data?.message ||
                            currentSessionError.message ||
                            'Could not restore the current login session.'}
                    </p>
                )}
                {shiftError && (
                    <p className="text-sm text-destructive">
                        {shiftError.response?.data?.message || shiftError.message || 'Could not load the current shift.'}
                    </p>
                )}
                {cashUpsError && (
                    <p className="text-sm text-destructive">
                        {cashUpsError.response?.data?.message ||
                            cashUpsError.message ||
                            'Could not load the cash-up for this shift.'}
                    </p>
                )}
                {tillSessionError && (
                    <p className="text-sm text-destructive">
                        {tillSessionError.response?.data?.message ||
                            tillSessionError.message ||
                            'Could not verify the current till session.'}
                    </p>
                )}

                {!shift ? (
                    <Card>
                        <CardContent className="space-y-3 pt-6">
                            <p className="text-sm text-muted-foreground">
                                There is no open financial shift linked to this login.
                            </p>
                            {!activeTillSession && (
                                <Button
                                    onClick={() => setOpenTill(true)}
                                    disabled={tillSessionQuery.isLoading || !!tillSessionError}
                                >
                                    Open Till
                                </Button>
                            )}
                            {activeTillSession && (
                                <p className="text-sm">
                                    A till session is already open. Refresh this screen; do not open another till or
                                    shift.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <span>{shift.till?.name || shift.till?.tillNumber || shift.tillNumber || 'Till'}</span>
                                <Badge variant={shift.status === 'OPEN' ? 'default' : 'secondary'}>
                                    {shift.status || 'Unknown'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p>
                                Shift number:{' '}
                                {shift.currentShiftNumber === undefined ? '—' : shift.currentShiftNumber}
                            </p>
                            <p>
                                Cash-up status: <strong>{cashUpStatus || 'Not started'}</strong>
                            </p>
                            {shift.status === 'CLOSED' && (
                                <p className="font-medium text-muted-foreground">Shift closed.</p>
                            )}
                            {cashUp && (
                                <>
                                    <p>Counted / declared: {formatAmount(cashUp.declaredTotal ?? cashUp.declaredTotals)}</p>
                                    {cashUp.reviewMessage && <p>Review: {cashUp.reviewMessage}</p>}
                                    {cashUp.notes && <p>Notes: {cashUp.notes}</p>}
                                </>
                            )}
                            {!isOwnOpenShift && shift.status === 'OPEN' && (
                                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <p>
                                        This open shift is not linked to your current login session. You cannot close
                                        another cashier&apos;s shift from this screen.
                                    </p>
                                </div>
                            )}
                            {!shift.userSessionId && (
                                <p className="text-amber-700">
                                    This shift has no login-session link. Close My Shift is unavailable.
                                </p>
                            )}
                            {cashUp && cashUp.shiftId !== shift.id && (
                                <p className="text-amber-700">
                                    This cash-up is not linked to the current shift. Shift closure is unavailable.
                                </p>
                            )}
                            {cashUpStatus === 'SUBMITTED' || cashUpStatus === 'PENDING_APPROVAL' ? (
                                <p className="font-medium text-cyan-700">Awaiting supervisor review.</p>
                            ) : cashUp?.resolution === 'INVESTIGATE' ||
                              cashUpStatus === 'INVESTIGATION_PENDING' ? (
                                <p className="font-medium text-amber-700">Under Review.</p>
                            ) : null}
                            <div className="flex flex-wrap gap-2 pt-2">
                                {!cashUp &&
                                    !cashUpsQuery.isLoading &&
                                    !cashUpsError &&
                                    shift.status === 'OPEN' &&
                                    isOwnOpenShift && (
                                    <Button onClick={() => startCashUp()}>Start Cash-Up</Button>
                                )}
                                {(cashUpStatus === 'DRAFT' || cashUpStatus === 'RECOUNT_REQUIRED') &&
                                    isOwnOpenShift && (
                                    <>
                                        <Button variant="outline" onClick={() => startCashUp(cashUp)}>
                                            {cashUp?.resolution === 'RECOUNT' || cashUpStatus === 'RECOUNT_REQUIRED'
                                                ? 'Recount Cash-Up'
                                                : 'Continue Cash-Up'}
                                        </Button>
                                        <Button onClick={submitCashUp} disabled={submitMutation.isPending}>
                                            Submit Cash-Up
                                        </Button>
                                    </>
                                )}
                                {cashUp?.resolution === 'RECOUNT' &&
                                    cashUpStatus !== 'DRAFT' &&
                                    cashUpStatus !== 'RECOUNT_REQUIRED' &&
                                    isOwnOpenShift && (
                                    <Button variant="outline" onClick={() => startCashUp(cashUp)}>
                                        Recount Cash-Up
                                    </Button>
                                )}
                                {canClose && (
                                    <Button onClick={closeMyShift} disabled={closing}>
                                        {closing ? 'Closing…' : 'Close My Shift'}
                                    </Button>
                                )}
                                {cashUpStatus === 'APPROVED' && shift.status === 'OPEN' && !canClose && (
                                    <p className="text-sm text-muted-foreground">
                                        This cash-up is approved, but the current shift/session ownership check does
                                        not permit closure.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                <CashUpForm
                    open={cashUpFormOpen}
                    onClose={() => {
                        setCashUpFormOpen(false);
                        setEditingCashUp(null);
                        void refresh();
                    }}
                    editData={editingCashUp}
                    currentShift={shift}
                    key={editingCashUp?.id || shift?.id || 'new-cash-up'}
                />
                <OpenTillDialog
                    open={openTill}
                    onOpenChange={setOpenTill}
                    onOpened={() => void refresh()}
                />
            </div>
        </PageLoader>
    );
};

export default MyShift;
