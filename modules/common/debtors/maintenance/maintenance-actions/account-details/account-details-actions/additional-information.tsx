import { useForm, Controller } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { useUpdateDebtorFn } from '@/api-queries/debtor';
import { CompanyDebtor, CompanyDebtorSetting } from '@/types/creditor.types';
import { useGetActiveDebtorGroups, debtorGroupLabel } from '@/api-queries/debtor/company-debtor-group';
import { toNumber } from '@/utils/helpers';
import { toast } from 'sonner';

interface AdditionalInformationFormData {
    debtorGroup?: string;
    onHold: boolean;
    onHoldDays?: number | string;
    status?: string;
    expiryDate?: string;
    notification?: string;
    emailDocuments: boolean;
    autoEmailInvoices: boolean;
    autoEmailCreditNotes: boolean;
    smsMarketing: boolean;
    requireInvOrderNo: boolean;
    autoDeleteBackOrder: boolean;
    paymentMethod?: string;
    invoiceDisc: number | string;
    settlementDisc: number | string;
    applyAsLineDiscount: boolean;
    allowCashSale: boolean;
    sellPrice?: string;
    defaultSellPrice?: string;
}

const AdditionalInformation = ({
    debtor,
    onClose,
    createMode = false,
    onDraftChange,
    onAccept,
}: {
    debtor: CompanyDebtor | null;
    onClose: () => void;
    createMode?: boolean;
    onDraftChange?: (settings: Partial<CompanyDebtorSetting>) => void;
    onAccept?: () => void;
}) => {
    const setting: CompanyDebtorSetting | undefined = debtor?.CompanyDebtorSetting ?? undefined;

    // Pre-filled from POST /api/company/debtor/get -> CompanyDebtorSetting. Note the API
    // column names differ from the labels: defaultPrintLayoutId / defaultEmailLayoutId,
    // autoEmailInvoice / autoEmailCreditNote, requireInvOrderNo, invoiceDiscount and
    // settlementDiscount.
    const buildDefaults = (): AdditionalInformationFormData => ({
        debtorGroup: setting?.debtorGroupId ?? debtor?.companyDebtorGroupId ?? '',
        onHold: setting?.onHold ?? false,
        onHoldDays: setting?.dormantDays ?? 0,
        status: setting?.status ? String(setting.status).toUpperCase() : '',
        expiryDate: setting?.expiryDate ?? '',
        notification: setting?.loyaltyAccount ?? '',
        emailDocuments: setting?.emailDocuments ?? false,
        autoEmailInvoices: setting?.autoEmailInvoice ?? false,
        autoEmailCreditNotes: setting?.autoEmailCreditNote ?? false,
        smsMarketing: setting?.smsMarketing ?? false,
        requireInvOrderNo: setting?.requireInvOrderNo ?? false,
        autoDeleteBackOrder: setting?.autoDeleteBackOrder ?? false,
        paymentMethod: setting?.paymentMethod ?? '',
        invoiceDisc: setting?.invoiceDiscount ?? 0,
        settlementDisc: setting?.settlementDiscount ?? 0,
        applyAsLineDiscount: setting?.applyAsLineDiscount ?? true,
        allowCashSale: setting?.allowCashSale ?? false,
        sellPrice: setting?.sellPrice ?? 'Own pricelist',
        defaultSellPrice: setting?.defaultSellPrice ?? 'Retail Price',
    });

    const { register, handleSubmit, control, reset, watch, getValues } = useForm<AdditionalInformationFormData>({
        defaultValues: buildDefaults(),
    });

    // Re-open for a different debtor and the form must show that debtor's saved values.
    useEffect(() => {
        reset(buildDefaults());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debtor?.id]);

    const { mutate: updateDebtorFn } = useUpdateDebtorFn();

    // 3022 - group payment allocation resolves invoices from the debtor's group,
    // so the groups come from the Debtor Group master rather than a fixed list.
    const debtorGroupsQuery = useGetActiveDebtorGroups();
    const debtorGroups = useMemo(() => debtorGroupsQuery.data?.data?.rows || [], [debtorGroupsQuery.data]);
    // A debtor can sit in a group that is no longer ACTIVE; keep it selectable so the
    // saved value does not silently fall back to "No Group" on the next edit.
    const currentGroupId = setting?.debtorGroupId || debtor?.companyDebtorGroupId || '';

    // Everything is sent, changed or not: the setting block is merged onto the one
    // the GET returned so account-sale settings and any field this tab does not
    // render survive the update, and the API column names are used verbatim.
    const buildSettings = (data: AdditionalInformationFormData): Partial<CompanyDebtorSetting> => {
        const resolvedGroupId = !data.debtorGroup || data.debtorGroup === '__none__' ? null : data.debtorGroup;

        return {
            ...(debtor?.CompanyDebtorSetting ?? {}),
            ...(debtor?.CompanyDebtorSetting?.id ? { id: debtor.CompanyDebtorSetting.id } : {}),
            ...(debtor?.id ? { companyDebtorId: debtor.id } : {}),
            debtorGroupId: resolvedGroupId,
            onHold: data.onHold,
            dormantDays: toNumber(data.onHoldDays),
            status: data.status ? String(data.status).toUpperCase() : data.status,
            expiryDate: data.expiryDate,
            loyaltyAccount: data.notification,
            autoEmailInvoice: data.autoEmailInvoices,
            autoEmailCreditNote: data.autoEmailCreditNotes,
            smsMarketing: data.smsMarketing,
            requireInvOrderNo: data.requireInvOrderNo,
            emailDocuments: data.emailDocuments,
            autoDeleteBackOrder: data.autoDeleteBackOrder,
            paymentMethod: data.paymentMethod,
            allowCashSale: data.allowCashSale,
            applyAsLineDiscount: data.applyAsLineDiscount,
            defaultSellPrice: data.defaultSellPrice,
            invoiceDiscount: toNumber(data.invoiceDisc),
            settlementDiscount: toNumber(data.settlementDisc),
            sellPrice: data.sellPrice,
        };
    };

    // In add mode there is no debtor row to save against yet, so keep the parent's
    // create extras in sync while the user types in this tab.
    useEffect(() => {
        if (!createMode || !onDraftChange) return;
        onDraftChange(buildSettings(getValues()));
        const subscription = watch((values) =>
            onDraftChange(buildSettings(values as AdditionalInformationFormData)),
        );
        return () => subscription.unsubscribe();
    }, [createMode, onDraftChange]);

    const onSubmit = (data: AdditionalInformationFormData) => {
        if (!debtor) return;

        const settings = buildSettings(data);
        const resolvedGroupId = settings.debtorGroupId ?? null;

        const {
            CompanyDebtorSetting: _setting,
            CompanyDebtorBankingInfo: _banking,
            bankingInfo: _bankingInfo,
            companyDebtorGroup,
            company,
            BillingCompany,
            taxProfile,
            ...record
        } = debtor;

        // The update endpoint reads `status` from the debtor record, so keep the
        // top-level value in sync with the Additional Information dropdown.
        const resolvedStatus = settings.status || record.status || null;

        updateDebtorFn(
            {
                debtorId: debtor.id,
                ...record,
                companyDebtorGroupId: resolvedGroupId,
                status: resolvedStatus,
                settings,
            },
            {
                onSuccess: () => {
                    toast.success('Debtor Info updated successfully');
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleShowHints = () => {
        console.log('Show Hints clicked for Additional Information');
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 gap-3 p-2 lg:grid-cols-2">
                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Additional Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="debtorGroup" className="text-sm">
                                    Debtor Group
                                </Label>
                                <Controller
                                    name="debtorGroup"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select debtor group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">No Group</SelectItem>
                                                {debtorGroups.map((group) => (
                                                    <SelectItem key={group.id} value={group.id}>
                                                        {debtorGroupLabel(group)}
                                                    </SelectItem>
                                                ))}
                                                {currentGroupId &&
                                                    !debtorGroups.some((group) => group.id === currentGroupId) && (
                                                        <SelectItem value={currentGroupId}>
                                                            {debtorGroupLabel({ id: currentGroupId } as any) || currentGroupId} (inactive group)
                                                        </SelectItem>
                                                    )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">On Hold</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="onHold"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                    <Input
                                        id="onHoldDays"
                                        type="number"
                                        placeholder="Days"
                                        className="h-8 w-20"
                                        {...register('onHoldDays', { valueAsNumber: true })}
                                        disabled={!control._formValues.onHold}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="status" className="text-sm">
                                    Status
                                </Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                                <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="expiryDate" className="text-sm">
                                    Expiry Date
                                </Label>
                                <Input
                                    id="expiryDate"
                                    type="date"
                                    {...register('expiryDate')}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="notification" className="text-sm">
                                    Notification
                                </Label>
                                <Controller
                                    name="notification"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select notification" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="REMINDER">REMINDER</SelectItem>
                                                <SelectItem value="ALERT">ALERT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">E-Mail Documents</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="emailDocuments"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Auto Email Invoices</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="autoEmailInvoices"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Auto Email Credit Notes</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="autoEmailCreditNotes"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">SMS Marketing</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="smsMarketing"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Require Inv Order No</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="requireInvOrderNo"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Auto Delete BackOrder</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="autoDeleteBackOrder"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 gap-0 overflow-hidden py-0 pb-2">
                        <CardHeader className="mb-2 gap-0 bg-white px-4 py-1">
                            <CardTitle className="text-sm">Sale and Discount Information</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-2 p-4">
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="paymentMethod" className="text-sm">
                                    Payment Method
                                </Label>
                                <Controller
                                    name="paymentMethod"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Not Selected">Not Selected</SelectItem>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="Card">Card</SelectItem>
                                                <SelectItem value="EFT">EFT</SelectItem>
                                                <SelectItem value="Cheque">Cheque</SelectItem>
                                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="invoiceDisc" className="text-sm">
                                    Invoice Disc%
                                </Label>
                                <Input
                                    id="invoiceDisc"
                                    type="number"
                                    step="0.01"
                                    {...register('invoiceDisc', { valueAsNumber: true })}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="settlementDisc" className="text-sm">
                                    Settlement Disc%
                                </Label>
                                <Input
                                    id="settlementDisc"
                                    type="number"
                                    step="0.01"
                                    {...register('settlementDisc', { valueAsNumber: true })}
                                    className="col-span-2 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Apply as Line Discount</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="applyAsLineDiscount"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label className="text-sm">Allow Cash Sale</Label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <Controller
                                        name="allowCashSale"
                                        control={control}
                                        render={({ field }) => (
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        )}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="sellPrice" className="text-sm">
                                    Sell Price
                                </Label>
                                <Controller
                                    name="sellPrice"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select sell price" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Own pricelist">Own pricelist</SelectItem>
                                                <SelectItem value="Standard">Standard</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor="defaultSellPrice" className="text-sm">
                                    Default Sell Price
                                </Label>
                                <Controller
                                    name="defaultSellPrice"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select default sell price" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Retail Price">Retail Price</SelectItem>
                                                <SelectItem value="Wholesale Price">Wholesale Price</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-4 flex-none">
                <AcceptHintActions
                    onShowHints={handleShowHints}
                    onAccept={onAccept ?? handleSubmit(onSubmit)}
                />
            </div>
        </form>
    );
};

export default AdditionalInformation;
