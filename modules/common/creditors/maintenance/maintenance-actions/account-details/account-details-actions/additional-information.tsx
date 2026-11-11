import { useForm, Controller } from 'react-hook-form';
import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AcceptHintActions from '@/components/custom-components/accept-hints-actions';
import { UpdatedCompanyCreditor } from '@/types/creditor.types';
import { useUpdateCreditorFn } from '@/api-queries/creditor';
import { toast } from 'sonner';
import { cleanDataPayload } from '@/utils/helpers';
import { useGetActiveCompanyCreditorGroups, companyCreditorGroupLabel } from '@/api-queries/creditor/company-creditor-group';

interface AdditionalInformationFormData {
    creditorGroup?: string;
    onHold: boolean;
    onHoldDays?: number;
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
    invoiceDisc: number;
    settlementDisc: number;
    applyAsLineDiscount: boolean;
    allowCashSale: boolean;
    sellPrice?: string;
    defaultSellPrice?: string;
}

const AdditionalInformation = ({
    creditor,
    onClose,
    createMode = false,
    onDraftChange,
    onAccept,
}: {
    creditor: UpdatedCompanyCreditor | null;
    onClose: () => void;
    createMode?: boolean;
    onDraftChange?: (settings: Record<string, unknown>) => void;
    onAccept?: () => void;
}) => {
    const creditorGroupsQuery = useGetActiveCompanyCreditorGroups?.();
    const creditorGroups = useMemo(
        () => creditorGroupsQuery?.data?.data?.rows || [],
        [creditorGroupsQuery?.data],
    );
    const currentGroupId = creditor?.CompanyCreditorSetting?.creditorGroupId || '';

    const { register, handleSubmit, control, reset, watch, getValues } = useForm<AdditionalInformationFormData>({
        defaultValues: {
            creditorGroup: creditor?.CompanyCreditorSetting?.creditorGroupId || '',
            onHold: creditor?.CompanyCreditorSetting?.onHold || false,
            onHoldDays: creditor?.CompanyCreditorSetting?.dormantDays || 0,
            status: creditor?.CompanyCreditorSetting?.status
                ? String(creditor.CompanyCreditorSetting.status).toUpperCase()
                : '',
            expiryDate: creditor?.CompanyCreditorSetting?.expiryDate || '',
            notification: creditor?.CompanyCreditorSetting?.smsRecipient || '',
            emailDocuments: creditor?.CompanyCreditorSetting?.emailDocuments || false,
            autoEmailInvoices: false,
            autoEmailCreditNotes: true,
            smsMarketing: false,
            requireInvOrderNo: creditor?.CompanyCreditorSetting?.requireGRVOrder || false,
            autoDeleteBackOrder: creditor?.CompanyCreditorSetting?.autoDeleteBackOrder || false,
            paymentMethod: creditor?.CompanyCreditorSetting?.paymentMethod || '',
            invoiceDisc: creditor?.CompanyCreditorSetting?.rebatePercentage || 0,
            settlementDisc: creditor?.CompanyCreditorSetting?.settlementDiscountPercentage || 0,
            applyAsLineDiscount: true,
            allowCashSale: false,
            sellPrice: 'Own pricelist',
            defaultSellPrice: 'Retail Price',
        },
    });

    const { mutate: updateCreditorFn } = useUpdateCreditorFn();

    const buildDraftSettings = (values: AdditionalInformationFormData) =>
        cleanDataPayload({
            ...values,
            status: values.status ? String(values.status).toUpperCase() : values.status,
        });

    // In add mode there is no creditor row to save against yet, so keep the parent's
    // create extras in sync while the user types in this tab.
    useEffect(() => {
        if (!createMode || !onDraftChange) return;
        onDraftChange(buildDraftSettings(getValues()));
        const subscription = watch((values) =>
            onDraftChange(buildDraftSettings(values as AdditionalInformationFormData)),
        );
        return () => subscription.unsubscribe();
    }, [createMode, onDraftChange]);

    useEffect(() => {
        if (creditor) {
            reset({
                creditorGroup: creditor?.CompanyCreditorSetting?.creditorGroupId || '',
                onHold: creditor?.CompanyCreditorSetting?.onHold || false,
                onHoldDays: creditor?.CompanyCreditorSetting?.dormantDays || 0,
                status: creditor?.CompanyCreditorSetting?.status
                    ? String(creditor.CompanyCreditorSetting.status).toUpperCase()
                    : '',
                expiryDate: creditor?.CompanyCreditorSetting?.expiryDate || '',
                notification: creditor?.CompanyCreditorSetting?.smsRecipient || '',
                emailDocuments: creditor?.CompanyCreditorSetting?.emailDocuments || false,
                autoEmailInvoices: false,
                autoEmailCreditNotes: true,
                smsMarketing: false,
                requireInvOrderNo: creditor?.CompanyCreditorSetting?.requireGRVOrder || false,
                autoDeleteBackOrder: creditor?.CompanyCreditorSetting?.autoDeleteBackOrder || false,
                paymentMethod: creditor?.CompanyCreditorSetting?.paymentMethod || '',
                invoiceDisc: creditor?.CompanyCreditorSetting?.rebatePercentage || 0,
                settlementDisc: creditor?.CompanyCreditorSetting?.settlementDiscountPercentage || 0,
                applyAsLineDiscount: true,
                allowCashSale: false,
                sellPrice: 'Own pricelist',
                defaultSellPrice: 'Retail Price',
            });
        }
    }, [creditor?.id]);

    const onSubmit = (data: AdditionalInformationFormData) => {
        if (creditor) {
            const resolvedGroupId = !data.creditorGroup || data.creditorGroup === '__none__' || data.creditorGroup === 'No Group' ? null : data.creditorGroup;
            const settings = cleanDataPayload({
                ...(creditor?.CompanyCreditorSetting ?? {}),
                ...(creditor?.CompanyCreditorSetting?.id ? { id: creditor.CompanyCreditorSetting.id } : {}),
                ...(creditor?.id ? { companyCreditorId: creditor.id } : {}),
                creditorGroupId: resolvedGroupId,
                onHold: data.onHold,
                dormantDays: data.onHoldDays,
                status: data.status ? String(data.status).toUpperCase() : data.status,
                expiryDate: data.expiryDate,
                smsRecipient: data.notification,
                autoEmailInvoice: data.autoEmailInvoices,
                autoEmailCreditNote: data.autoEmailCreditNotes,
                smsMarketing: data.smsMarketing,
                requireGRVOrder: data.requireInvOrderNo,
                emailDocuments: data.emailDocuments,
                autoDeleteBackOrder: data.autoDeleteBackOrder,
                paymentMethod: data.paymentMethod,
                allowCashSale: data.allowCashSale,
                applyAsLineDiscount: data.applyAsLineDiscount,
                defaultSellPrice: data.defaultSellPrice,
                rebatePercentage: data.invoiceDisc,
                settlementDiscountPercentage: data.settlementDisc,
                sellPrice: data.sellPrice,
            });
            // Banking is owned by the Payment Settings tab: never send its row id or
            // ownership columns from this tab.
            const {
                bankingInfo: _bankingInfo,
                CompanyCreditorBankingInfo: _banking,
                CompanyCreditorSetting: _setting,
                ...record
            } = creditor;
            const payload = {
                ...record,
                creditorId: creditor.id,
                // Keep a top-level status for APIs that read it from the record
                // instead of the settings block.
                status: settings.status || creditor.CompanyCreditorSetting?.status || null,
                settings,
            };

            updateCreditorFn(
                payload,
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
        }
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
                                <Label htmlFor="creditorGroup" className="text-sm">
                                    Creditor Group
                                </Label>
                                <Controller
                                    name="creditorGroup"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="col-span-2 h-8 w-full">
                                                <SelectValue placeholder="Select creditor group" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">No Group</SelectItem>
                                                {creditorGroups.map((group: any) => (
                                                    <SelectItem key={group.id} value={group.id}>
                                                        {companyCreditorGroupLabel?.(group) || group.groupId || group.description || group.id}
                                                    </SelectItem>
                                                ))}
                                                {currentGroupId &&
                                                    !creditorGroups.some((group: any) => group.id === currentGroupId) && (
                                                        <SelectItem value={currentGroupId}>
                                                            {(companyCreditorGroupLabel?.({ id: currentGroupId } as any) || currentGroupId)} (inactive group)
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
