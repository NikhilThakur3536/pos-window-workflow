import { useForm, Controller } from 'react-hook-form';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { CompanyCreditorBankingInfo, UpdatedCompanyCreditor } from '@/types/creditor.types';
import { useCreditorList, useUpdateCreditorFn } from '@/api-queries/creditor';
import BankAccountTypeSelect from '@/components/custom-components/bank-account-type-select';
import { toast } from 'sonner';
import { cleanDataPayload, toNumber } from '@/utils/helpers';
import { useGetCurrencies } from '@/api-queries/currency';

// Bank Proof Of Payment is a checkbox on screen but a boolean column in the API.
const toBool = (value: string | boolean | undefined | null) => (typeof value === 'boolean' ? value : value === 'true');

// Account numbers and branch codes are strings: converting them to numbers would strip
// leading zeroes.
const asString = (value: string | number | null | undefined) => (value == null ? '' : String(value));

interface PaymentSettingsFormData {
    bankName?: string;
    bankAccount?: string;
    bankSubAccount?: string;
    bankBranchCode?: string;
    bankEftNumber?: string;
    bankAccountType: string;
    currency: string;
    bankProofOfPayment?: string | boolean;
    groupAccount?: string;
    insuredCreditLimit: string | number;
    interestRiskProfile?: string;
    enforceCreditLimitChecking: boolean;
    excludeFromInterest: boolean;
}

const PaymentSettings = ({
    creditor,
    onClose,
    createMode = false,
    onDraftChange,
    onAccept,
}: {
    creditor: UpdatedCompanyCreditor | null;
    onClose: () => void;
    createMode?: boolean;
    onDraftChange?: (bankingInfo: Record<string, unknown>) => void;
    onAccept?: () => void;
}) => {
    const { data: currenciesData } = useGetCurrencies({ limit: 100, offset: 0 });
    const currencies = currenciesData?.data?.rows || [];
    // Group Account -> /api/company/creditor/all, selected creditor’s id in bankingInfo.groupAccountCreditorId
    const creditorsQuery = useCreditorList({ limit: 1000, offset: 0 });
    const allCreditors = useMemo(() => creditorsQuery.data?.data?.rows || [], [creditorsQuery.data]);
    const bankingInfo = creditor?.bankingInfo ?? creditor?.CompanyCreditorBankingInfo;
    const reviewRequired = !!bankingInfo?.reviewRequired;
    // While a review is pending the bank fields are intentionally left blank: the review
    // record is a placeholder and must not be reused as payment bank details.
    const source = reviewRequired ? undefined : bankingInfo;
    const [reviewResolved, setReviewResolved] = useState(false);
    const showReview = reviewRequired && !reviewResolved;

    const buildDefaults = (): PaymentSettingsFormData => ({
        bankName: asString(source?.bankName),
        bankAccount: asString(source?.bankAccount),
        bankSubAccount: asString(source?.bankSubAccount),
        bankBranchCode: asString(source?.bankBranchCode),
        bankEftNumber: asString(source?.bankEftNumber),
        bankAccountType: asString(source?.bankAccountType),
        currency: asString(source?.currencyId),
        bankProofOfPayment: toBool(source?.bankProofOfPayment),
        groupAccount: asString((source as any)?.groupAccountCreditorId ?? source?.groupAccountId),
        insuredCreditLimit: asString(source?.InsuredCreditLimit),
        interestRiskProfile: asString(source?.interesetRiskProfile),
        enforceCreditLimitChecking: !!source?.enforceCreditLimitChecking,
        excludeFromInterest: !!source?.excludeFromInterest,
    });

    const { register, handleSubmit, control, reset, watch, getValues } = useForm<PaymentSettingsFormData>({
        defaultValues: buildDefaults(),
    });

    // Re-open the tab for a different creditor and the form must show that creditor's values.
    useEffect(() => {
        reset(buildDefaults());
        setReviewResolved(false);
    }, [creditor?.id]);

    const { mutate: updateCreditorFn, isPending } = useUpdateCreditorFn();

    // Only bank fields and the credit block that lives in bankingInfo are sent. Bank-row
    // ids, ownership ids and review timestamps are never sent: the backend owns them.
    const buildBankingInfo = (data: PaymentSettingsFormData): Partial<CompanyCreditorBankingInfo> =>
        cleanDataPayload({
            bankName: data.bankName,
            bankAccount: data.bankAccount,
            bankSubAccount: data.bankSubAccount,
            bankBranchCode: data.bankBranchCode,
            bankEftNumber: data.bankEftNumber,
            bankAccountType: data.bankAccountType,
            bankProofOfPayment: toBool(data.bankProofOfPayment),
            currencyId: data.currency,
            groupAccountCreditorId: data.groupAccount && data.groupAccount !== 'N/A' ? data.groupAccount : null,
            enforceCreditLimitChecking: data.enforceCreditLimitChecking,
            excludeFromInterest: data.excludeFromInterest,
            InsuredCreditLimit: toNumber(data.insuredCreditLimit),
            interesetRiskProfile: data.interestRiskProfile,
        } as any);

    // In add mode there is no creditor row to save against yet, so keep the parent's
    // create extras in sync while the user types in this tab.
    useEffect(() => {
        if (!createMode || !onDraftChange) return;
        onDraftChange(buildBankingInfo(getValues()));
        const subscription = watch((values) => onDraftChange(buildBankingInfo(values as PaymentSettingsFormData)));
        return () => subscription.unsubscribe();
    }, [createMode, onDraftChange]);

    const onSubmit = (data: PaymentSettingsFormData) => {
        if (!creditor) return;

        updateCreditorFn(
            {
                creditorId: creditor.id,
                // Terms and credit limit are main-account fields and are edited on the
                // Account Information tab, so they are not sent from here.
                bankingInfo: buildBankingInfo(data),
            },
            {
                onSuccess: () => {
                    toast.success('Creditor Info updated successfully');
                    reset();
                    onClose();
                },
                onError: (error: any) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleConfirmReview = () => {
        if (!creditor) return;

        const values = getValues();
        if (!values.bankName?.trim() || !values.bankAccount?.trim()) {
            toast.error('Bank name and account number are required to confirm banking details');
            return;
        }

        updateCreditorFn(
            {
                creditorId: creditor.id,
                bankingInfo: {
                    confirmReview: true,
                    bankName: values.bankName,
                    bankAccount: values.bankAccount,
                    ...(values.bankBranchCode ? { bankBranchCode: values.bankBranchCode } : {}),
                },
            },
            {
                onSuccess: () => {
                    toast.success('Banking details confirmed');
                    setReviewResolved(true);
                },
                onError: (error: any) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for Payment Settings');
    };

    const bankName = watch('bankName');
    const bankAccount = watch('bankAccount');
    const canConfirmReview = Boolean(bankName?.trim() && bankAccount?.trim());

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-2 gap-3 p-2">
                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                Banking Information
                                {showReview ? (
                                    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                                        Banking details need review
                                    </Badge>
                                ) : null}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-2 p-4 py-0">
                            {showReview ? (
                                <p className="text-muted-foreground text-xs">
                                    Verify the bank name, account number and branch code, then confirm the details
                                    below.
                                </p>
                            ) : null}
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankName" className="text-sm">
                                    Bank Name
                                </Label>
                                <Input id="bankName" {...register('bankName')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankAccount" className="text-sm">
                                    Bank Account
                                </Label>
                                <Input
                                    id="bankAccount"
                                    inputMode="numeric"
                                    {...register('bankAccount')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankSubAccount" className="text-sm">
                                    Bank Sub Account
                                </Label>
                                <Input id="bankSubAccount" {...register('bankSubAccount')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankBranchCode" className="text-sm">
                                    Bank Branch Code
                                </Label>
                                <Input
                                    id="bankBranchCode"
                                    inputMode="numeric"
                                    {...register('bankBranchCode')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankEftNumber" className="text-sm">
                                    Bank EFT Number
                                </Label>
                                <Input id="bankEftNumber" {...register('bankEftNumber')} className="col-span-2 h-8" />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="bankAccountType" className="text-sm">
                                    Bank Account Type
                                </Label>
                                <Controller
                                    name="bankAccountType"
                                    control={control}
                                    render={({ field }) => (
                                        <BankAccountTypeSelect
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            className="col-span-2 h-8 w-full"
                                        />
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="currency" className="text-sm">
                                    Currency
                                </Label>
                                <Controller
                                    name="currency"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Currency" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {currencies.map((currency: any) => (
                                                    <SelectItem key={currency.id} value={currency.id}>
                                                        {currency.code || currency.name}
                                                    </SelectItem>
                                                ))}
                                                {field.value && !currencies.some((c: any) => c.id === field.value) && (
                                                    <SelectItem value={field.value}>{field.value}</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Bank Proof of Payment</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="bankProofOfPayment"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            {showReview ? (
                                <div className="flex justify-end pt-1">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleConfirmReview}
                                        disabled={!canConfirmReview || isPending}
                                    >
                                        Confirm Banking Details
                                    </Button>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Credit Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-2 p-4 py-0">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="groupAccount" className="text-sm">
                                    Group Account
                                </Label>
                                <Controller
                                    name="groupAccount"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select group account" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="N/A">N/A</SelectItem>
                                                {allCreditors.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name || c.accountNumber || c.id}
                                                    </SelectItem>
                                                ))}
                                                {field.value && field.value !== 'N/A' && !allCreditors.some((c: any) => c.id === field.value) && (
                                                    <SelectItem value={field.value}>{field.value}</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="insuredCreditLimit" className="text-sm">
                                    Insured Credit Limit
                                </Label>
                                <Input
                                    id="insuredCreditLimit"
                                    type="number"
                                    {...register('insuredCreditLimit')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="interestRiskProfile" className="text-sm">
                                    Interest Risk Profile
                                </Label>
                                <Input
                                    id="interestRiskProfile"
                                    {...register('interestRiskProfile')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Enforce Credit Limit Checking</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="enforceCreditLimitChecking"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Exclude from Interest</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="excludeFromInterest"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-4 flex-none">
                <AcceptHintActions onShowHints={handleShowHints} onAccept={onAccept ?? handleSubmit(onSubmit)} />
            </div>
        </form>
    );
};

export default PaymentSettings;
