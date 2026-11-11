import { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { AlertTriangle, Banknote, Building2, Loader2, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGetLiveTillDrawerBalance, useGetTillBalanceStatus } from '@/api-queries/till-session';
import { useGetTillCashCustodyStatus } from '@/api-queries/masters/tills';
import SafeDropDialog from './safe-drop-dialog';
import CashOfficeHandoverDialog from './cash-office-handover-dialog';

interface TillDrawerStatusProps {
    tillId: string | null;
    tillName?: string;
    userId?: string;
    companyDebtorId?: string;
    // Only poll while a session is open and the POS is online.
    enabled: boolean;
}

const formatAmount = (value: number | string | undefined | null) =>
    Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Live drawer status for the open till session. The drawer amount comes from
// /api/company/reports/till-cashier (available as soon as the session is open and
// not dependent on Cash-Up), and the safe threshold comes from
// /api/company/till/balance-status. When the threshold is exceeded the cashier is
// given an actionable Safe Drop / handover instead of a passive warning.
const TillDrawerStatus = ({ tillId, tillName, userId, companyDebtorId, enabled }: TillDrawerStatusProps) => {
    const [showSafeDrop, setShowSafeDrop] = useState(false);
    const [showCashOfficeHandover, setShowCashOfficeHandover] = useState(false);
    const [safeDropRefreshToken, setSafeDropRefreshToken] = useState(0);
    // The cashier can dismiss the panel for the current visit. It comes back on its own
    // when the screen is revisited (component remount resets this) or when the till
    // session changes, so it is never permanently hidden.
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        setDismissed(false);
    }, [tillId]);

    const today = useMemo(() => moment().format('YYYY-MM-DD'), []);

    const reportFilter = useMemo(
        () => ({
            ...(tillId ? { tillId } : {}),
            ...(userId ? { userId } : {}),
            ...(companyDebtorId ? { companyDebtorId } : {}),
            fromDate: today,
            toDate: today,
        }),
        [tillId, userId, companyDebtorId, today],
    );

    const isActive = enabled && !!tillId;
    const isVisible = isActive && !dismissed;

    // No polling while the panel is dismissed; it refetches as soon as it is shown again.
    const reportQuery = useGetLiveTillDrawerBalance(reportFilter, isVisible);
    const balanceStatusQuery = useGetTillBalanceStatus(isVisible ? tillId : null);
    const custodyQuery = useGetTillCashCustodyStatus(isVisible ? tillId : null);

    // Invalidate the polled report after a safe drop so the drawer amount refreshes.
    const safeDropCompleted = () => {
        setSafeDropRefreshToken((token) => token + 1);
        reportQuery.refetch();
        balanceStatusQuery.refetch();
    };

    const custody = custodyQuery.data?.data;
    const custodyKnown = custodyQuery.isFetched && !!custody;
    const viaCashOffice = custody?.cashCustodyRoute === 'CASH_OFFICE_THEN_SAFE';
    const tillToSafeAllowed = custodyKnown && !viaCashOffice && !!custody?.tillToSafeAllowed;
    const cashOfficeHandoverAllowed =
        custodyKnown && viaCashOffice && custody?.cashOfficeHandoverAllowed !== false;

    const reportRows = reportQuery.data?.data || [];
    const tillRow = useMemo(() => reportRows.find((row) => row.tillId === tillId), [reportRows, tillId]);

    const drawerBalance = Number(
        tillRow?.netDrawerBalance ?? reportQuery.data?.summary?.totalCashCurrentlyInTills ?? 0,
    );
    const openingFloat = Number(tillRow?.openingFloat ?? 0);
    const totalDropsToSafe = Number(tillRow?.totalDropsToSafe ?? 0);
    const totalCashSales = Number(tillRow?.totalCashSales ?? 0);

    const balanceStatus = balanceStatusQuery.data?.data;
    const isAboveThreshold = !!balanceStatus?.isAboveThreshold;
    const excess = Number(balanceStatus?.excess || 0);

    if (!isActive || dismissed) return null;

    return (
        <>
            <Card
                className={`fixed right-4 bottom-4 z-30 w-[300px] shadow-lg ${
                    isAboveThreshold ? 'border-amber-400 bg-amber-50' : 'bg-background'
                }`}
                data-testid="till-drawer-status"
                data-refresh-token={safeDropRefreshToken}
            >
                <CardContent className="space-y-2 p-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            {isAboveThreshold ? (
                                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                            ) : (
                                <Banknote className="text-muted-foreground h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate">{tillName || 'Till Drawer'}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {reportQuery.isFetching && (
                                <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
                            )}
                            <button
                                type="button"
                                aria-label="Close till drawer status"
                                title="Hide until you return to this screen"
                                onClick={() => setDismissed(true)}
                                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-0.5 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <div className="text-muted-foreground text-xs">In drawer</div>
                        <div className="text-xl font-semibold tabular-nums">{formatAmount(drawerBalance)}</div>
                    </div>

                    <div className="text-muted-foreground grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <div>Opening float</div>
                            <div className="text-foreground font-medium tabular-nums">{formatAmount(openingFloat)}</div>
                        </div>
                        <div>
                            <div>Cash sales</div>
                            <div className="text-foreground font-medium tabular-nums">
                                {formatAmount(totalCashSales)}
                            </div>
                        </div>
                        <div>
                            <div>Safe drops</div>
                            <div className="text-foreground font-medium tabular-nums">
                                {formatAmount(totalDropsToSafe)}
                            </div>
                        </div>
                        <div>
                            <div>Transactions</div>
                            <div className="text-foreground font-medium tabular-nums">
                                {tillRow?.transactionCount ?? 0}
                            </div>
                        </div>
                    </div>

                    {isAboveThreshold && (
                        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-100/60 p-2">
                            <div className="flex items-start gap-1.5 text-xs text-amber-900">
                                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                    {balanceStatus?.message ||
                                        'Till balance is above the safe threshold. Drop the excess to the safe or hand it over to the supervisor.'}
                                </span>
                            </div>
                            {excess > 0 && (
                                <div className="text-xs text-amber-900">
                                    Excess: <span className="font-semibold tabular-nums">{formatAmount(excess)}</span>
                                </div>
                            )}
                            {cashOfficeHandoverAllowed ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 w-full bg-amber-600 text-xs hover:bg-amber-700"
                                    onClick={() => setShowCashOfficeHandover(true)}
                                >
                                    <Building2 className="mr-1 h-3.5 w-3.5" />
                                    Cash Office Handover
                                </Button>
                            ) : tillToSafeAllowed ? (
                                <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 w-full bg-amber-600 text-xs hover:bg-amber-700"
                                    onClick={() => setShowSafeDrop(true)}
                                >
                                    Till to Safe
                                </Button>
                            ) : (
                                <div className="text-xs text-amber-900">
                                    {custodyQuery.isFetching
                                        ? 'Checking the permitted cash action for this till…'
                                        : custody?.message ||
                                          'No cash action is permitted for this till right now.'}
                                </div>
                            )}
                        </div>
                    )}

                    {!isAboveThreshold && balanceStatusQuery.isFetched && (
                        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Within safe threshold
                        </div>
                    )}
                </CardContent>
            </Card>

            {tillId && tillToSafeAllowed && !cashOfficeHandoverAllowed && (
                <SafeDropDialog
                    open={showSafeDrop}
                    onClose={() => setShowSafeDrop(false)}
                    tillId={tillId}
                    tillName={tillName}
                    safeId={custody?.safeId}
                    safeName={custody?.safeName}
                    suggestedAmount={excess > 0 ? excess : drawerBalance}
                    onCompleted={safeDropCompleted}
                />
            )}

            {tillId && cashOfficeHandoverAllowed && (
                <CashOfficeHandoverDialog
                    open={showCashOfficeHandover}
                    onClose={() => setShowCashOfficeHandover(false)}
                    tillId={tillId}
                    tillName={tillName}
                    suggestedAmount={excess > 0 ? excess : drawerBalance}
                    cashOfficeId={custody?.cashOfficeId}
                    cashOfficeName={custody?.cashOfficeName}
                    onCompleted={() => {
                        setSafeDropRefreshToken((token) => token + 1);
                        reportQuery.refetch();
                    }}
                />
            )}
        </>
    );
};

export default TillDrawerStatus;
