import {
    DebtorReceiptCreateSchema,
    DebtorReceiptTenderPayment,
    debtorReceiptDetailsSchema,
    DebtorReceiptDetailsSchema,
    useCreateDebtorReceipt,
} from '@/api-queries/debtor/receipts';
import { useRouter } from 'next/navigation';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import { useInvoiceCountState } from '@/stores/invoice-count.store';
import { useNetworkStore } from '@/stores/network.store';
import { CompanyCreditor } from '@/types';
import { cleanDataPayload, generateInvoiceNumber } from '@/utils/helpers';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, FileText, LogOut, RefreshCw, Settings } from 'lucide-react';
import moment from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { Form } from '@/components/ui/form';
import { RepDialog } from '../../hoc/rep-dialog';
import { DebtorDialog } from '../../hoc/debtor-dialog';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { TaxRateDetails, useGetTaxRates } from '@/api-queries/company-details/tax-rates';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { AppliedDiscountType } from '@/api-queries/point-of-sale/cash-sales';
import { TenderDetails } from '@/api-queries/point-of-sale/tenders';
import PaymentScreen from '../../point-of-sale/cash-sales/actions/payment-screen';
import { COLOR_CODES_FOR_INVOICE_FORMS, TENDER_TYPES } from '@/lib/constant';
import { toast } from 'sonner';
import { DebtorAllocationSummaryDetails, useGetDebtorAllocationSummary } from '@/api-queries/debtor/allocations';

export interface PaymentSuccessType {
    netAmountToPay: number;
    manualDiscount: number;
    selectedPaymentMethod: TenderDetails;
    changeDue: number;
    bankAccountNumber: string;
    chequeReference: string;
    cardNumber: string;
    cardExpiryDate: string;
    appliedDiscount: AppliedDiscountType;
    isSplitPayment?: boolean;
    payments?: Array<{
        tenderTypeId: string;
        tenderType: string;
        description?: string;
        amount: number;
        remarks?: string;
    }>;
}

const DebtorReceiptForm = ({ onClose }: { onClose: () => void }) => {
    const router = useRouter();
    const isOnline = useNetworkStore((state) => state?.online);

    // Form

    const { debtorReceiptCount, setDebtorReceiptCount } = useInvoiceCountState();

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const { mutate: createDebtorReceipt, isPending } = useCreateDebtorReceipt();

    const form = useForm<DebtorReceiptDetailsSchema>({
        resolver: zodResolver(debtorReceiptDetailsSchema),
        defaultValues: {
            companyDebtorId: '',
            name: '',
            address: '',
            secondNarrative: '',
            // amount related
            amount: 0,
            discount: 0,
            actualCreditOnAccount: 0,
            receiptDate: new Date().toISOString().split('T')[0],
        },
    });

    const {
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = form;

    // ----------------- Modals Start -----------------

    const [isDebtorDialogOpen, setIsDebtorDialogOpen] = useState(false);
    const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);

    // ----------------- Modals End -----------------

    const taxRates = useGetTaxRates({})?.data?.data?.rows;

    const [selectedDebtor, setSelectedDebtor] = useState<CompanyCreditor | null>(null);

    const handleSelectDebtor = (debtor: CompanyCreditor) => {
        setValue('companyDebtorId', debtor.id);
        setSelectedDebtor(debtor || null);
        setValue('name', debtor.name || '');
        setValue('address', debtor.postalAddress || debtor.deliveryAddress || '');

        setIsDebtorDialogOpen(false);
    };

    const [selectedRep, setSelectedRep] = useState<SalesRepresentativeDetails | null>(null);

    const handleSelectRep = (rep: SalesRepresentativeDetails) => {
        setSelectedRep(rep || null);
        setValue('salesRepresentativeId', `${rep.id}`);
    };

    useEffect(() => {
        const newDebtorReceiptNumber = generateInvoiceNumber('DR', debtorReceiptCount + 1);
        setValue('referenceNumber', newDebtorReceiptNumber);
    }, [debtorReceiptCount]);

    // Amounts

    const amount = watch('amount');
    const discount = watch('discount');

    useEffect(() => {
        setValue('actualCreditOnAccount', amount + (discount || 0));
    }, [discount, amount]);

    // Check out and Payment

    const [receiptDetails, setReceiptDetails] = useState<DebtorReceiptDetailsSchema | null>(null);

    const handleShowHints = () => {
        console.log('Show Hints clicked for account sales');
    };

    const handleAccept = () => {
        handleSubmit(onSubmit)();
    };

    const isElectronApp = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
    const screenHeight = isElectronApp ? 'h-[75vh]' : 'h-[81vh]';
    const [showPaymentScreen, setShowPaymentScreen] = useState(false);

    function onSubmit(values: DebtorReceiptDetailsSchema) {
        const cleanedPayload = cleanDataPayload(values);
        setReceiptDetails(cleanedPayload as DebtorReceiptDetailsSchema);
        setShowPaymentScreen(true);
    }

    const resetFormAndStatesAfterSubmission = (form: UseFormReturn<DebtorReceiptDetailsSchema>) => {
        form.reset();
        setSelectedDebtor(null);
        setSelectedRep(null);
        setDebtorReceiptCount(debtorReceiptCount + 1);
    };

    const handlePaymentSuccess = useCallback(
        ({
            netAmountToPay,
            changeDue,
            selectedPaymentMethod,
            bankAccountNumber,
            chequeReference,
            cardNumber,
            cardExpiryDate,
            manualDiscount,
            appliedDiscount,
            payments,
        }: PaymentSuccessType) => {
            if (!selectedDebtor && !receiptDetails) return;

            const normalizedPayments: DebtorReceiptTenderPayment[] = (
                payments && payments.length > 0
                    ? payments
                    : [
                          {
                              tenderTypeId: selectedPaymentMethod?.id || '',
                              tenderType: selectedPaymentMethod?.type || '',
                              amount: netAmountToPay,
                          },
                      ]
            )
                .filter((payment) => payment.tenderTypeId && payment.tenderType)
                .map((payment) => ({
                    tenderTypeId: payment.tenderTypeId,
                    tenderType: payment.tenderType,
                    amount: Number(payment.amount) || 0,
                }));

            const payload: DebtorReceiptCreateSchema = {
                companyDebtorId: receiptDetails?.companyDebtorId || '',
                name: receiptDetails?.name || '',
                address: receiptDetails?.address || '',
                receiptDate: receiptDetails?.receiptDate || '',
                referenceNumber: receiptDetails?.referenceNumber || '',
                amount: receiptDetails?.amount || 0,
                actualCreditOnAccount: receiptDetails?.actualCreditOnAccount || 0,
                secondNarrative: receiptDetails?.secondNarrative,
                salesRepresentativeId: receiptDetails?.salesRepresentativeId,
                manualDiscount,
                discountTaxTypeId: receiptDetails?.discountTaxTypeId,
                tenderTypeId: selectedPaymentMethod?.id || '',
                tenderType: selectedPaymentMethod?.type || '',
                tenderValue: netAmountToPay,
                payments: normalizedPayments,
                timezone: moment.tz.guess(),
                ...(selectedPaymentMethod?.type === TENDER_TYPES?.CASH && changeDue ? { changeDue } : {}),
                ...(selectedPaymentMethod?.type === TENDER_TYPES?.CHEQUE
                    ? { bankAccountNumber, reference: chequeReference }
                    : {}),
                ...(selectedPaymentMethod?.type === TENDER_TYPES?.CREDIT_CARD ? { cardNumber, cardExpiryDate } : {}),
                ...(appliedDiscount?.type === TENDER_TYPES?.COUPON
                    ? { couponId: appliedDiscount.id, couponAmount: appliedDiscount.value }
                    : {}),
                ...(appliedDiscount?.type === TENDER_TYPES?.VOUCHER
                    ? { voucherId: appliedDiscount.id, voucherAmount: appliedDiscount.value }
                    : {}),
                ...(selectedRep?.id && { salesRepresentativeId: selectedRep.id }),
            };

            createDebtorReceipt(payload, {
                onSuccess: async (data) => {
                    if (data.success) {
                        const handover = data.data?.cashOfficeHandover;
                        toast.success('Payment confirmed! Debtor receipt generated.');
                        // The backend auto-routes cash above the till threshold to the
                        // Cash Office, so tell the user a handover queue now exists.
                        if (handover) {
                            const cash = handover.cashAmount ?? data.data?.cashAmount;
                            toast.success(
                                `Cash routed to Cash Office (${handover.handoverMode || 'CASH_OFFICE_HANDOVER'})${
                                    cash != null ? ` · ${currencySymbol} ${Number(cash).toFixed(2)}` : ''
                                }. A handover has been queued.`,
                                { duration: 8000 },
                            );
                        }
                        resetFormAndStatesAfterSubmission(form);
                        router.refresh();
                    } else {
                        toast.error(data.message || 'Debtor receipt creation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        },
        [selectedDebtor, receiptDetails, router, currencySymbol],
    );

    // Balance Details and Last Payment
    const initialBalanceDetails = {
        current: 0,
        thirtyDays: 0,
        sixtyDays: 0,
        ninetyDays: 0,
        oneTwentyDays: 0,
        oneFiftyDays: 0,
        oneEightyDays: 0,
        totalBalance: 0,
        dateLastPayment: '',
        amountLastPayment: 0,
        paymentsUnallocated: 0,
        settlementDiscountAmount: 0,
        settlementDiscountPercentage: 0,
        lastReceiptNumber: '',
        receiptDate: '',
    };

    const [balanceDetails, setBalanceDetails] = useState<DebtorAllocationSummaryDetails>(initialBalanceDetails);

    const { data: debtorAllocationSummaryDetails } = useGetDebtorAllocationSummary(watch('companyDebtorId'));

    useEffect(() => {
        if (debtorAllocationSummaryDetails) {
            const balanceDetailsData = debtorAllocationSummaryDetails?.data;
            setBalanceDetails({
                ...balanceDetailsData,
                amountLastPayment: balanceDetailsData?.amountLastPayment || 0,
                lastReceiptNumber: balanceDetails?.lastReceiptNumber || 'N/A',
                dateLastPayment: balanceDetails?.dateLastPayment || 'N/A',
            });
        } else {
            setBalanceDetails(initialBalanceDetails);
        }
    }, [debtorAllocationSummaryDetails]);

    return (
        <PageLoader isLoading={isPending}>
            <div
                className={`flex ${showPaymentScreen ? '' : 'flex-col'} ${COLOR_CODES_FOR_INVOICE_FORMS?.DEBTOR_RECEIPTS} `}
            >
                <h1 className="px-4 py-2 text-2xl font-bold">Debtor Receipt</h1>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
                        <div
                            className={`relative ${showPaymentScreen ? 'w-100' : 'grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4'} grid overflow-y-auto px-4 py-2`}
                        >
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-gray-700">Receipt Details</h3>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="companyDebtorId" className="w-28 shrink-0 text-xs">
                                        Received From <MandatoryField />
                                    </Label>
                                    <div className="relative flex-grow">
                                        <FormField
                                            control={control}
                                            name="companyDebtorId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                value={selectedDebtor?.accountNumber || ''}
                                                                className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                                readOnly
                                                                onClick={() => setIsDebtorDialogOpen(true)}
                                                            />
                                                        </FormControl>
                                                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                                    </div>
                                                    <FormMessage className="!-mt-2 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="name" className="w-28 shrink-0 text-xs">
                                        Name <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        readOnly
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="address" className="text-xs">
                                        Address Details
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        {...field}
                                                        className="border-input h-12 rounded-md border bg-white text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* <div className="flex items-center gap-2">
                                    <Label htmlFor="receiptDate" className="w-28 shrink-0 text-xs">
                                        Receipt Date <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="receiptDate"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="date"
                                                        max={new Date().toISOString().split('T')[0]}
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div> */}

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="receiptDate" className="w-28 shrink-0 text-xs">
                                        Receipt Date <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="receiptDate"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="date"
                                                        max={new Date().toISOString().split('T')[0]} // UI restriction
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                        onChange={(e) => {
                                                            const selectedDate = e.target.value;
                                                            const today = new Date().toISOString().split('T')[0];

                                                            if (selectedDate > today) {
                                                                toast.error("Receipt date cannot be in the future");
                                                                // Reset to today
                                                                field.onChange(today);
                                                            } else {
                                                                field.onChange(selectedDate);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="creditNoteNumber" className="w-28 shrink-0 text-xs">
                                        Ref No. <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="referenceNumber"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                        readOnly
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="secondNarrative" className="w-28 shrink-0 text-xs">
                                        2nd Narrative
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="secondNarrative"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="salesRepresentativeId" className="w-28 shrink-0 text-xs">
                                        Rep Number
                                    </Label>

                                    <div className="flex-grow">
                                        <FormField
                                            control={control}
                                            name="salesRepresentativeId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="relative">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                value={selectedRep?.name || ''}
                                                                className="border-input h-7 w-full cursor-pointer rounded-md border bg-white px-2 py-1 pr-8 text-xs"
                                                                readOnly
                                                                onClick={() => setIsRepDialogOpen(true)}
                                                            />
                                                        </FormControl>
                                                        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                                                    </div>
                                                    <FormMessage className="!-mt-2 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-gray-700">
                                    Local Currency ( {currencySymbol} )
                                </h3>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="amount" className="w-28 shrink-0 text-xs">
                                        The Sum of <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0}
                                                        step="1"
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                        value={field.value || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.valueAsNumber;
                                                            if (val != null && !Number.isNaN(val) && val < 0) return;
                                                            field.onChange(val || '');
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="discountAmount" className="w-28 shrink-0 text-xs">
                                        Discount
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="discount"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0}
                                                        step="1"
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                        value={field.value || ''}
                                                        onChange={(e) => {
                                                            const val = +e.target.value;
                                                            if (val < 0) return;
                                                            if (val >= +amount) {
                                                                toast.error('Discount cannot be greater than amount');
                                                                return;
                                                            }
                                                            field.onChange(e.target.valueAsNumber || '');
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label htmlFor="discountTaxTypeId" className="w-28 shrink-0 text-xs">
                                        Tax Rates
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="discountTaxTypeId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="border-input h-7 rounded-md border bg-white px-2 py-1 text-xs">
                                                            <SelectValue placeholder="Select tax rate" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {taxRates &&
                                                                taxRates?.map((data: TaxRateDetails) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.description}{' '}
                                                                        {data.taxRateId ? `(${data.taxRateId})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Label
                                        htmlFor="actualCreditOnAccount"
                                        className="inline-block w-28 shrink-0 text-xs"
                                    >
                                        Actual Credit on Account <MandatoryField />
                                    </Label>
                                    <FormField
                                        control={control}
                                        name="actualCreditOnAccount"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        type="number"
                                                        min={0}
                                                        step="1"
                                                        className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                        value={field.value || ''}
                                                        readOnly
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-2 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {!showPaymentScreen && (
                                <>
                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-700">Balance Details</h3>

                                        {[
                                            { label: 'Current', key: 'current' },
                                            { label: '30 Days', key: 'thirtyDays' },
                                            { label: '60 Days', key: 'sixtyDays' },
                                            { label: '90 Days', key: 'ninetyDays' },
                                            { label: '120 Days', key: 'oneTwentyDays' },
                                            { label: '150 Days', key: 'oneFiftyDays' },
                                            { label: '180 Days', key: 'oneEightyDays' },
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center gap-2">
                                                <Label className="w-28 shrink-0 text-xs">{item.label}</Label>
                                                <Input
                                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    value={balanceDetails[item.key as keyof typeof balanceDetails]}
                                                    readOnly
                                                />
                                            </div>
                                        ))}

                                        <div className="flex items-center gap-2">
                                            <Label className="w-28 shrink-0 text-xs">Total</Label>
                                            <Input
                                                className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                value={balanceDetails.totalBalance}
                                                readOnly
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor="paymentsUnallocated"
                                                className="inline-block w-28 shrink-0 text-xs"
                                            >
                                                Payment Unallocated
                                            </Label>
                                            <Input
                                                readOnly
                                                value={balanceDetails.paymentsUnallocated}
                                                className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor="settlementDiscountPercentage"
                                                className="inline-block w-28 shrink-0 text-xs"
                                            >
                                                Settlement Discount %
                                            </Label>
                                            <Input
                                                value={balanceDetails.settlementDiscountPercentage}
                                                readOnly
                                                className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                            />
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Label
                                                htmlFor="settlementDiscountAmount"
                                                className="inline-block w-28 shrink-0 text-xs"
                                            >
                                                Settlement Discount Amount
                                            </Label>
                                            <Input
                                                value={balanceDetails.settlementDiscountAmount}
                                                readOnly
                                                className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-sm font-semibold text-gray-700">Last Payment Details</h3>

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label className="w-28 shrink-0 text-xs">Account Number</Label>
                                                <Input
                                                    value={selectedDebtor?.accountNumber || ''}
                                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    readOnly
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Label className="w-28 shrink-0 text-xs">Last Receipt Number</Label>
                                                <Input
                                                    value={balanceDetails.lastReceiptNumber}
                                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    readOnly
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Label className="w-28 shrink-0 text-xs">Receipt Date</Label>
                                                <Input
                                                    value={balanceDetails.receiptDate}
                                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    readOnly
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Label className="w-28 shrink-0 text-xs">
                                                    Amount ( in {currencySymbol} )
                                                </Label>
                                                <Input
                                                    value={balanceDetails.amountLastPayment}
                                                    className="border-input h-7 rounded-md border bg-white px-2 py-1 text-right text-xs"
                                                    readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {showPaymentScreen && (
                                <div className="absolute inset-0 z-50 bg-white/5" style={{ cursor: 'not-allowed' }} />
                            )}
                        </div>

                        {!showPaymentScreen && (
                            <AcceptHintActions
                                onShowHints={handleShowHints}
                                onAccept={handleAccept}
                                saveButtonTitle="Checkout"
                                SaveButtonIcon={LogOut}
                            >
                                <Button variant="secondary" onClick={() => onClose()}>
                                    <ArrowLeft /> Back
                                </Button>
                            </AcceptHintActions>
                        )}
                    </form>
                </Form>

                {showPaymentScreen && (
                    <PaymentScreen
                        cartTotal={watch('amount')}
                        onBack={() => setShowPaymentScreen(false)}
                        onPaymentSuccess={handlePaymentSuccess}
                        screenHeight={screenHeight}
                        isOnline={isOnline}
                        onApplyPromotion={() => null}
                        cartItems={[]}
                        appliedPromotion={null}
                        setAppliedPromotion={() => null}
                        appliedPromotionDiscount={0}
                    />
                )}
            </div>

            {isDebtorDialogOpen && (
                <DebtorDialog
                    isOpen={isDebtorDialogOpen}
                    onClose={() => setIsDebtorDialogOpen(false)}
                    onSelectDebtor={handleSelectDebtor}
                    isOnline={isOnline}
                />
            )}

            {isRepDialogOpen && (
                <RepDialog
                    isOpen={isRepDialogOpen}
                    onClose={() => setIsRepDialogOpen(false)}
                    onSelectRep={handleSelectRep}
                    isOnline={isOnline}
                    key={`${isOnline}`}
                />
            )}
        </PageLoader>
    );
};

export default DebtorReceiptForm;