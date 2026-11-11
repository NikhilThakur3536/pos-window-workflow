import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashUpDetails, CashUpDenomination, CashUpUser } from '@/api-queries/till-management/cash-up';
import moment from 'moment';

interface CashUpViewDialogProps {
    data: CashUpDetails | null;
    onClose: () => void;
}

const CashUpViewDialog = ({ data, onClose }: CashUpViewDialogProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const formatMoney = (value?: string | number | null) => {
        const num = Number(value || 0) || 0;
        return `${currencySymbol} ${num.toFixed(2)}`;
    };

    const declaredTotal = data?.declaredTotal ?? data?.declaredTotals ?? null;

    const expectedTotal = data?.expectedTotal ?? data?.expectedTotals ?? null;

    const fullName = (user?: CashUpUser | null) => {
        if (!user) return null;
        return [user.firstName, user.lastName || user.surname].filter(Boolean).join(' ') || null;
    };

    const denominations = data?.denominations?.length ? data.denominations : data?.CashUpDenominations || [];
    const total = denominations.reduce((sum, d) => {
        if (d.value !== null && d.value !== undefined && Number.isFinite(Number(d.value))) {
            return sum + Number(d.value);
        }
        const conv = Number(d.denomination?.conversionValue || d.Denomination?.conversionValue || 0) || 0;
        return sum + conv * d.count;
    }, 0);

    const denomLabel = (d: CashUpDenomination) =>
        d.denomination?.label || d.Denomination?.label || 'Denomination';

    const denomValue = (d: CashUpDenomination) =>
        Number(d.value) ||
        (Number(d.denomination?.conversionValue || d.Denomination?.conversionValue || 0) || 0) * d.count;

    return (
        <Dialog open={!!data} onOpenChange={() => onClose()}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[520px]">
                <DialogHeader className="shrink-0">
                    <DialogTitle>Cash Up Details</DialogTitle>
                </DialogHeader>

                {data ? (
                    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Cash Up Date: </span>
                                <span>{data.cashUpDate ? moment(data.cashUpDate).format('DD/MM/YYYY') : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Till: </span>
                                <span>{data.till?.name || data.till?.tillNumber || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Cashier: </span>
                                <span>{fullName(data.createdByUser) || data.createdByName || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Store: </span>
                                <span>{data.store?.name || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Submitted: </span>
                                <span>
                                    {data.submittedAt
                                        ? moment(data.submittedAt).format('DD/MM/YYYY, HH:mm')
                                        : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Shift: </span>
                                <span>
                                    {data.shift?.currentShiftNumber ? `Shift ${data.shift.currentShiftNumber}` : 'N/A'}
                                    {data.shift?.status ? ` (${data.shift.status})` : ''}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Cash Float: </span>
                                <span>{formatMoney(data.cashFloat)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status: </span>
                                <span>{data.status || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Expected: </span>
                                <span>{expectedTotal !== null ? formatMoney(expectedTotal) : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Declared: </span>
                                <span>{declaredTotal !== null ? formatMoney(declaredTotal) : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Variance: </span>
                                <span>
                                    {data.variance !== undefined && data.variance !== null
                                        ? formatMoney(data.variance)
                                        : 'N/A'}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Resolution: </span>
                                <span>{data.resolution || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Approved By: </span>
                                <span>{fullName(data.approvedBy) || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-3">
                            {denominations.length === 0 && (
                                <div className="text-muted-foreground text-center text-sm">
                                    No denominations recorded.
                                </div>
                            )}
                            {denominations.map((d, idx) => (
                                <div
                                    key={d.id || idx}
                                    className="flex items-center justify-between border-b pb-2 last:border-0"
                                >
                                    <span className="text-sm">{denomLabel(d)}</span>
                                    <span className="text-sm">
                                        {d.count} x{' '}
                                        {formatMoney(
                                            String(
                                                d.denomination?.conversionValue || d.Denomination?.conversionValue || 0,
                                            ),
                                        )}{' '}
                                        = <strong>{formatMoney(String(denomValue(d)))}</strong>
                                    </span>
                                </div>
                            ))}
                        </div>

                        {(data.varianceActions || []).length > 0 && (
                            <div className="rounded-md border p-3">
                                <div className="mb-2 text-sm font-medium">Variance Actions</div>
                                <div className="space-y-2">
                                    {data.varianceActions?.map((action, idx) => (
                                        <div
                                            key={action.id || idx}
                                            className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                                        >
                                            <div>
                                                <div className="font-medium">
                                                    {action.tenderType || action.type || 'Action'}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {action.notes || action.reason || action.resolution || ''}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    Expected {formatMoney(action.expected)} · Declared{' '}
                                                    {formatMoney(action.declared)} · Variance{' '}
                                                    {formatMoney(action.variance)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div>
                                                    {action.resolution || (action.resolved ? 'Resolved' : 'Pending')}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {fullName(action.resolvedBy) || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground">Discount: </span>
                                <span>{formatMoney(data.discountAmount)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Coupon: </span>
                                <span>{formatMoney(data.couponAmount)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Cheques: </span>
                                <span>{formatMoney(data.cheques)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Bank Transfers: </span>
                                <span>{formatMoney(data.bankTransfers)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Vouchers Cashed In: </span>
                                <span>{formatMoney(data.vouchersCashedIn)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Safe Drop: </span>
                                <span>{formatMoney(data.safeDrop)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Other: </span>
                                <span>{formatMoney(data.other)}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">EPOS: </span>
                                <span>{formatMoney(data.epos)}</span>
                            </div>
                        </div>

                        <div className="bg-muted flex items-center justify-between rounded-md px-4 py-3">
                            <span className="text-sm font-medium">Total</span>
                            <span className="text-lg font-bold">{formatMoney(String(total))}</span>
                        </div>

                        <div className="flex shrink-0 justify-end border-t pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
};

export default CashUpViewDialog;
