import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { isValid, format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TenderDetails, useGetTenders, useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
import { TENDER_TYPES } from '@/lib/constant';
import { PaymentSuccessType } from '../..';
import moment from 'moment';
import { useAuthUser } from '@/stores/auth-user.store';
import { Textarea } from '@/components/ui/textarea';

export interface SplitPaymentEntry {
    tenderTypeId: string;
    tenderType: string;
    description: string;
    amount: number;
    remarks: string;
    tenderedAmount?: number;
    changeGiven?: number;
}

interface PaymentScreenProps {
    cartTotal: number;
    screenHeight: string;
    onBack: () => void;
    onPaymentSuccess: ({}: PaymentSuccessType) => void;
    isOnline: boolean;
}

interface PaymentEntryState {
    amount: string;
    cardNumber: string;
    cardExpiryInput: string;
    cardExpiryDate: Date | undefined;
    bankAccountNumber: string;
    chequeReference: string;
}

const defaultEntry: PaymentEntryState = {
    amount: '',
    cardNumber: '',
    cardExpiryInput: '',
    cardExpiryDate: undefined,
    bankAccountNumber: '',
    chequeReference: '',
};

export default function PaymentScreen({
    cartTotal,
    onBack,
    onPaymentSuccess,
    screenHeight,
    isOnline,
}: PaymentScreenProps) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const tenders = isOnline
        ? useGetTenders({ isParentNull: true, isDiscountParent: false })?.data?.data?.rows
        : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
              (tender) => !tender?.parentTenderId && !tender?.isDiscountParent,
          );

    const [checkedTenderIds, setCheckedTenderIds] = useState<string[]>([]);
    const [paymentEntries, setPaymentEntries] = useState<Record<string, PaymentEntryState>>({});

    const [refundReason, setRefundReason] = useState<string>('');
    const [refundReasonError, setRefundReasonError] = useState(false);

    const isMultiPayment = checkedTenderIds.length > 1;

    // Net Amount To Pay
    const netAmountToPay = useMemo(() => {
        return Math.max(0, cartTotal);
    }, [cartTotal]);

    const toggleTender = useCallback((tenderId: string) => {
        setCheckedTenderIds((prev) => {
            const isCurrentlyChecked = prev.includes(tenderId);

            if (isCurrentlyChecked) {
                setPaymentEntries((entries) => {
                    const next = { ...entries };
                    delete next[tenderId];
                    return next;
                });
                return prev.filter((id) => id !== tenderId);
            }

            setPaymentEntries((entries) => ({
                ...entries,
                [tenderId]: { ...defaultEntry },
            }));
            return [...prev, tenderId];
        });
    }, []);

    const handleEntryChange = useCallback(
        (tenderId: string, field: keyof PaymentEntryState, value: string | Date | undefined) => {
            setPaymentEntries((prev) => ({
                ...prev,
                [tenderId]: {
                    ...defaultEntry,
                    ...prev[tenderId],
                    [field]: value,
                },
            }));
        },
        [],
    );

    const handleExpiryInputChange = (tenderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        let digits = e.target.value.replace(/\D/g, '');

        if (digits.length > 8) {
            digits = digits.slice(0, 8);
        }

        let formatted = '';
        if (digits.length > 0) {
            formatted = digits.slice(0, 2);
        }
        if (digits.length > 2) {
            formatted += '/' + digits.slice(2, 4);
        }
        if (digits.length > 4) {
            formatted += '/' + digits.slice(4, 8);
        }

        handleEntryChange(tenderId, 'cardExpiryInput', formatted);

        if (digits.length === 8) {
            const day = parseInt(digits.slice(0, 2), 10);
            const month = parseInt(digits.slice(2, 4), 10);
            const year = parseInt(digits.slice(4, 8), 10);

            const parsedDate = new Date(year, month - 1, day);

            if (isValid(parsedDate) && parsedDate.getFullYear() === year) {
                handleEntryChange(tenderId, 'cardExpiryDate', parsedDate);
            } else {
                handleEntryChange(tenderId, 'cardExpiryDate', undefined);
            }
        } else {
            handleEntryChange(tenderId, 'cardExpiryDate', undefined);
        }
    };

    // ----- Live payment breakdown across all checked methods -----
    // Rule: only cash is allowed to exceed the remaining balance (excess becomes change).
    // Non-cash methods are always capped to the remaining balance.
    // With exactly one non-cash method selected and amount left empty, it auto-applies the full remaining balance.
    const paymentBreakdown = useMemo(() => {
        let remaining = netAmountToPay;
        let totalApplied = 0;
        let totalChangeDue = 0;
        const details: Record<string, { appliedAmount: number; changeGiven: number; rawAmount: number }> = {};

        checkedTenderIds.forEach((id) => {
            const tender = tenders?.find((t) => t.id === id);
            const entry = paymentEntries[id];
            if (!tender) return;

            const isCash = tender.type === TENDER_TYPES?.CASH;
            const isSingle = checkedTenderIds.length === 1;

            let rawAmount: number;
            if (isSingle && !isCash) {
                // Auto-fill full remaining when single non-cash and amount not entered
                const typed = parseFloat(entry?.amount || '0');
                rawAmount = isNaN(typed) || typed <= 0 ? remaining : typed;
            } else {
                rawAmount = parseFloat(entry?.amount || '0');
                if (isNaN(rawAmount) || rawAmount < 0) rawAmount = 0;
            }

            let appliedAmount = rawAmount;
            let changeGiven = 0;

            if (rawAmount > remaining) {
                if (isCash) {
                    changeGiven = Math.round((rawAmount - remaining) * 100) / 100;
                    appliedAmount = remaining;
                } else {
                    // Non-cash cannot exceed remaining – cap it
                    appliedAmount = remaining;
                }
            }

            appliedAmount = Math.round(appliedAmount * 100) / 100;
            remaining = Math.max(0, Math.round((remaining - appliedAmount) * 100) / 100);
            totalApplied = Math.round((totalApplied + appliedAmount) * 100) / 100;
            totalChangeDue = Math.round((totalChangeDue + changeGiven) * 100) / 100;

            details[id] = { appliedAmount, changeGiven, rawAmount };
        });

        return {
            details,
            totalApplied,
            remainingBalance: Math.max(0, Math.round((netAmountToPay - totalApplied) * 100) / 100),
            totalChangeDue,
        };
    }, [checkedTenderIds, paymentEntries, netAmountToPay, tenders]);

    const handleCheckout = useCallback(() => {
        if (checkedTenderIds.length === 0) {
            toast.error('Please select a payment method.');
            return;
        }

        for (const id of checkedTenderIds) {
            const tender = tenders?.find((t) => t.id === id);
            const entry = paymentEntries[id];
            if (!tender) continue;

            const isCash = tender.type === TENDER_TYPES?.CASH;
            const isCard = tender.type === TENDER_TYPES?.CREDIT_CARD || tender.type === TENDER_TYPES?.DEBIT_CARD;
            const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

            if (isCheque) {
                if (!entry?.bankAccountNumber?.trim() || !entry?.chequeReference?.trim()) {
                    toast.error(`Please enter Bank Account Number and Reference for ${tender.description}.`);
                    return;
                }
            } else if (isCard) {
                if (!entry?.cardNumber?.trim()) {
                    toast.error(`Please enter Card Number for ${tender.description}.`);
                    return;
                }
                if (!entry?.cardExpiryDate) {
                    toast.error(`Please enter Card Expiry Date for ${tender.description}.`);
                    return;
                }
            }

            const detail = paymentBreakdown.details[id];
            const rawAmount = detail?.rawAmount ?? 0;

            // Require a positive amount for cash always, and for multi-payment methods
            if (isCash || isMultiPayment) {
                if (!rawAmount || rawAmount <= 0) {
                    toast.error(`Please enter a valid amount for ${tender.description}.`);
                    return;
                }
            }

            // Non-cash methods can NEVER exceed the remaining balance (single or multi)
            if (!isCash && detail && detail.rawAmount > detail.appliedAmount + 0.001) {
                toast.error(`Amount for ${tender.description} cannot exceed the remaining balance.`);
                return;
            }
        }

        if (paymentBreakdown.remainingBalance > 0) {
            toast.error(
                `Remaining amount of ${currencySymbol} ${paymentBreakdown.remainingBalance.toFixed(2)} is still due.`,
            );
            return;
        }

        if (!refundReason) {
            setRefundReasonError(true);
            toast.error('Reason is mandatory.');
            return;
        }

        if (isMultiPayment) {
            const payments: SplitPaymentEntry[] = checkedTenderIds.map((id) => {
                const tender = tenders?.find((t) => t.id === id) as TenderDetails;
                const detail = paymentBreakdown.details[id];
                return {
                    tenderTypeId: tender.id,
                    tenderType: tender.type,
                    description: tender.description,
                    amount: detail?.appliedAmount || 0,
                    tenderedAmount: detail?.rawAmount,
                    changeGiven: detail?.changeGiven || 0,
                    remarks: `${tender.description} payment`,
                };
            });

            onPaymentSuccess({
                netAmountToPay,
                selectedPaymentMethod: {
                    id: payments[0].tenderTypeId,
                    type: payments[0].tenderType,
                    description: payments[0].description,
                } as TenderDetails,
                bankAccountNumber: '',
                chequeReference: '',
                cardNumber: '',
                cardExpiryDate: '',
                changeDue: paymentBreakdown.totalChangeDue,
                refundReason,
                isSplitPayment: true,
                payments,
            });
            return;
        }

        const singleId = checkedTenderIds[0];
        const tender = tenders?.find((t) => t.id === singleId) as TenderDetails;
        const entry = paymentEntries[singleId];
        const detail = paymentBreakdown.details[singleId];

        onPaymentSuccess({
            netAmountToPay,
            selectedPaymentMethod: tender,
            bankAccountNumber: entry?.bankAccountNumber?.trim() || '',
            chequeReference: entry?.chequeReference?.trim() || '',
            cardNumber: entry?.cardNumber?.trim() || '',
            cardExpiryDate: entry?.cardExpiryDate ? moment(entry.cardExpiryDate).format('DD/MM/YYYY') : '',
            changeDue: detail?.changeGiven || 0,
            refundReason,
        });
    }, [
        checkedTenderIds,
        paymentEntries,
        paymentBreakdown,
        tenders,
        currencySymbol,
        netAmountToPay,
        refundReason,
        isMultiPayment,
        onPaymentSuccess,
    ]);

    return (
        <div className={`flex ${screenHeight} w-full flex-col rounded-lg bg-white shadow-md`}>
            <div className="flex min-h-0 flex-1">
                <div className="flex w-1/2 min-h-0 flex-col overflow-y-auto border-r p-4">
                    <div className="border-b pb-4">
                        <h2 className="text-xl font-semibold">
                            Payment Method{checkedTenderIds.length > 1 ? 's' : ''}
                        </h2>

                        <ScrollArea className="h-72 w-full pr-2">
                            <div className="grid gap-4 py-4">
                                {tenders
                                    ?.filter((t) => t.status === 'ACTIVE')
                                    .map((tender) => {
                                        const isChecked = checkedTenderIds.includes(tender.id);
                                        const entry = paymentEntries[tender.id];
                                        const detail = paymentBreakdown.details[tender.id];
                                        const isCash = tender.type === TENDER_TYPES?.CASH;
                                        const isCard =
                                            tender.type === TENDER_TYPES?.CREDIT_CARD ||
                                            tender.type === TENDER_TYPES?.DEBIT_CARD;
                                        const isCheque = tender.type === TENDER_TYPES?.CHEQUE;

                                        return (
                                            <div key={tender.id}>
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={tender.id}
                                                        checked={isChecked}
                                                        onCheckedChange={() => toggleTender(tender.id)}
                                                    />
                                                    <Label htmlFor={tender.id}>{tender.description}</Label>
                                                </div>

                                                {isChecked && (
                                                    <div className="mt-2 grid gap-2 pl-6">
                                                        {isCash && (
                                                            <>
                                                                <Label htmlFor={`cashAmount-${tender.id}`} className="sr-only">
                                                                    Cash Amount
                                                                </Label>
                                                                <Input
                                                                    id={`cashAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Enter cash amount tendered"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'amount', e.target.value)
                                                                    }
                                                                    className="h-12 p-3 text-xl"
                                                                />
                                                                {detail && detail.changeGiven > 0 ? (
                                                                    <p className="text-xs font-medium text-green-600">
                                                                        Change due for this payment: {currencySymbol}{' '}
                                                                        {detail.changeGiven.toFixed(2)}
                                                                    </p>
                                                                ) : null}
                                                            </>
                                                        )}

                                                        {isCard && (
                                                            <>
                                                                <Label htmlFor={`cardNumber-${tender.id}`} className="sr-only">
                                                                    Card Number
                                                                </Label>
                                                                <Input
                                                                    id={`cardNumber-${tender.id}`}
                                                                    placeholder="Card Number"
                                                                    value={entry?.cardNumber || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'cardNumber', e.target.value)
                                                                    }
                                                                    className="h-8 text-base"
                                                                />

                                                                <Label htmlFor={`cardExpiry-${tender.id}`} className="sr-only">
                                                                    Expiry Date
                                                                </Label>
                                                                <div className="flex gap-2">
                                                                    <Input
                                                                        id={`cardExpiry-${tender.id}`}
                                                                        placeholder="DD/MM/YYYY"
                                                                        value={entry?.cardExpiryInput || ''}
                                                                        onChange={(e) => handleExpiryInputChange(tender.id, e)}
                                                                        maxLength={10}
                                                                        className="h-8 text-base"
                                                                    />

                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button
                                                                                variant="outline"
                                                                                className={cn(
                                                                                    'h-8 w-10 justify-start text-left text-base font-normal',
                                                                                    !entry?.cardExpiryDate && 'text-muted-foreground',
                                                                                )}
                                                                            >
                                                                                <CalendarIcon className="h-4 w-4" />
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar
                                                                                mode="single"
                                                                                selected={entry?.cardExpiryDate}
                                                                                onSelect={(date) => {
                                                                                    handleEntryChange(tender.id, 'cardExpiryDate', date);
                                                                                    if (date) {
                                                                                        handleEntryChange(
                                                                                            tender.id,
                                                                                            'cardExpiryInput',
                                                                                            format(date, 'dd/MM/yyyy'),
                                                                                        );
                                                                                    }
                                                                                }}
                                                                                disabled={(date) =>
                                                                                    date < new Date(new Date().setHours(0, 0, 0, 0))
                                                                                }
                                                                            />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                </div>

                                                                <Label htmlFor={`cardAmount-${tender.id}`} className="sr-only">
                                                                    Amount
                                                                </Label>
                                                                <Input
                                                                    id={`cardAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Amount for this card"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'amount', e.target.value)
                                                                    }
                                                                    className="h-8 text-base"
                                                                />
                                                            </>
                                                        )}

                                                        {isCheque && (
                                                            <>
                                                                <Label htmlFor={`bankAccountNumber-${tender.id}`} className="sr-only">
                                                                    Bank Account Number
                                                                </Label>
                                                                <Input
                                                                    id={`bankAccountNumber-${tender.id}`}
                                                                    placeholder="Bank Account Number"
                                                                    value={entry?.bankAccountNumber || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'bankAccountNumber', e.target.value)
                                                                    }
                                                                    className="h-8 text-base"
                                                                />
                                                                <Label htmlFor={`chequeReference-${tender.id}`} className="sr-only">
                                                                    Reference
                                                                </Label>
                                                                <Input
                                                                    id={`chequeReference-${tender.id}`}
                                                                    placeholder="Reference"
                                                                    value={entry?.chequeReference || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'chequeReference', e.target.value)
                                                                    }
                                                                    className="h-8 text-base"
                                                                />

                                                                <Label htmlFor={`chequeAmount-${tender.id}`} className="sr-only">
                                                                    Amount
                                                                </Label>
                                                                <Input
                                                                    id={`chequeAmount-${tender.id}`}
                                                                    type="number"
                                                                    placeholder="Amount for this cheque"
                                                                    value={entry?.amount || ''}
                                                                    onChange={(e) =>
                                                                        handleEntryChange(tender.id, 'amount', e.target.value)
                                                                    }
                                                                    className="h-8 text-base"
                                                                />
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </ScrollArea>

                        {isMultiPayment && (
                            <div className="mt-2 space-y-1 text-sm font-medium">
                                <div className="flex items-center justify-between">
                                    <span>Total Applied:</span>
                                    <span>
                                        {currencySymbol} {paymentBreakdown.totalApplied.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Remaining Balance:</span>
                                    <span>
                                        {currencySymbol} {paymentBreakdown.remainingBalance.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Change Due:</span>
                                    <span>
                                        {currencySymbol} {paymentBreakdown.totalChangeDue.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4">
                        <h3 className={`mb-2 text-lg font-semibold ${refundReasonError ? 'text-red-500' : ''}`}>
                            Return Reason *
                        </h3>

                        <div className="mb-2">
                            <Textarea
                                rows={5}
                                placeholder="Enter the reason for returning the good..."
                                className="h-32"
                                value={refundReason}
                                onChange={(e) => {
                                    setRefundReason(e.target.value);
                                    setRefundReasonError(false);
                                }}
                            />

                            {refundReasonError ? (
                                <div className="text-xs text-red-500">* Reason is required</div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="flex w-1/2 min-h-0 flex-col overflow-y-auto p-4">
                    <div className="grid flex-none gap-2">
                        <div className="space-y-1">
                            <Label htmlFor="amountToPay" className="text-lg font-medium">
                                Amount to Pay
                            </Label>
                            <Input
                                id="amountToPay"
                                value={`${currencySymbol} ${netAmountToPay.toFixed(2)}`}
                                readOnly
                                className="h-auto p-2 text-right text-2xl font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="changeDue" className="text-lg font-medium">
                                Change Due
                            </Label>
                            <Input
                                id="changeDue"
                                value={`${currencySymbol} ${paymentBreakdown.totalChangeDue.toFixed(2)}`}
                                readOnly
                                className="h-auto p-2 text-right text-2xl font-bold"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex w-full flex-none gap-2 border-t p-4">
                <Button className="flex-1" size="lg" onClick={handleCheckout}>
                    Checkout
                </Button>
                <Button variant="outline" className="flex-1" size="lg" onClick={onBack}>
                    Back
                </Button>
            </div>
        </div>
    );
}