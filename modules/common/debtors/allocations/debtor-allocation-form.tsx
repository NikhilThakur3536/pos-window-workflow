import { useEffect } from 'react';
import { FileText, Wallet } from 'lucide-react';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// APIs & Types

import {
    useCreateDebtorAllocation,
    debtorAllocationCreateSchema,
    DebtorAllocationCreateSchema,
} from '@/api-queries/debtor/allocations';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useDebtorList } from '@/api-queries/debtor';
import { AccountSalesDetails, useGetAccountSales } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { CreditNotesDetails, useGetCreditNotes } from '@/api-queries/credit-note';
import { CompanyCreditor } from '@/types';
import { DebtorReceiptDetails, useGetDebtorReceipts } from '@/api-queries/debtor/receipts';
import { cleanDataPayload } from '@/utils/helpers';
import SelectPopover from '@/components/select-popover';

interface DebtorAllocationFormProps {
    open: boolean;
    onClose: () => void;
    preDefinedValues?:
        | {
              type: 'CREDIT_NOTE';
              creditNote: CreditNotesDetails;
              debtorReceipt?: never;
          }
        | {
              type: 'DEBTOR_RECEIPT';
              debtorReceipt: DebtorReceiptDetails;
              creditNote?: never;
          };
}

const DebtorAllocationForm = ({ open, onClose, preDefinedValues }: DebtorAllocationFormProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isPreDefined = !!preDefinedValues;
    const isPredefinedDebtorReceipt = preDefinedValues?.type === 'DEBTOR_RECEIPT';

    const createItemData = useCreateDebtorAllocation();

    const form = useForm<DebtorAllocationCreateSchema>({
        resolver: zodResolver(debtorAllocationCreateSchema),
        defaultValues: {
            companyDebtorId: preDefinedValues
                ? isPredefinedDebtorReceipt
                    ? preDefinedValues?.debtorReceipt?.CompanyDebtor?.id
                    : preDefinedValues?.creditNote?.CompanyDebtor?.id
                : '',
            debtorInvoicingOrderId: '',
            debtorReceiptId: isPredefinedDebtorReceipt ? preDefinedValues?.debtorReceipt?.id : '',
            creditNoteId: '',
            allocatedAmount: 0,
            allocationType: preDefinedValues?.type || 'DEBTOR_RECEIPT',
            allocationDate: new Date().toISOString().split('T')[0],
            timezone: moment.tz.guess(),
        },
    });
    const { handleSubmit, control, watch, setValue } = form;

    // Amounts
    const isDebtorReceipts = watch('allocationType') === 'DEBTOR_RECEIPT';

    const debtors = preDefinedValues
        ? [
              isPredefinedDebtorReceipt
                  ? preDefinedValues?.debtorReceipt?.CompanyDebtor
                  : preDefinedValues?.creditNote?.CompanyDebtor,
          ]
        : useDebtorList({})?.data?.data?.rows;
    const companyDebtorId = watch('companyDebtorId');

    const invoices = useGetAccountSales(companyDebtorId ? { companyDebtorId } : {})?.data?.data?.rows;

    const debtorReceipts = preDefinedValues
        ? isPredefinedDebtorReceipt
            ? [preDefinedValues?.debtorReceipt]
            : []
        : useGetDebtorReceipts(companyDebtorId ? { companyDebtorId, isAllocationPending: true } : {})?.data?.data?.rows;
    const creditNotes = preDefinedValues
        ? !isPredefinedDebtorReceipt
            ? [preDefinedValues?.creditNote]
            : []
        : useGetCreditNotes(companyDebtorId ? { companyDebtorId, isAllocationPending: true } : {})?.data?.data?.rows;

    function onSubmit(values: DebtorAllocationCreateSchema) {
        const payload = cleanDataPayload(values);

        createItemData.mutate(payload as DebtorAllocationCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Debtor Allocation created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Debtor Allocation creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    const allocationTypes = [
        { value: 'CREDIT_NOTE', label: 'Credit Note' },
        { value: 'DEBTOR_RECEIPT', label: 'Debtor Receipt' },
    ];

    useEffect(() => {
        setValue('creditNoteId', preDefinedValues?.type === 'CREDIT_NOTE' ? preDefinedValues?.creditNote?.id : '');
        setValue(
            'debtorReceiptId',
            preDefinedValues?.type === 'DEBTOR_RECEIPT' ? preDefinedValues?.debtorReceipt?.id : '',
        );
    }, [watch('allocationType')]);

    const invoiceId = watch('debtorInvoicingOrderId');
    const receiptId = isDebtorReceipts ? watch('debtorReceiptId') : watch('creditNoteId');
    const invoiceAmount = invoiceId ? invoices?.find((invoice) => invoice?.id === invoiceId)?.outstandingAmount : 0;
    const receiptAmount =
        (isDebtorReceipts
            ? debtorReceipts?.find((receipt) => receipt?.id === receiptId)?.unallocatedAmount
            : creditNotes?.find((cn) => cn?.id === receiptId)?.unallocatedAmount) || 0;

    const maxAmount = (+(invoiceAmount || 0) < +(receiptAmount || 0) ? invoiceAmount : receiptAmount) || 0;

    useEffect(() => {
        setValue('allocatedAmount', maxAmount);
    }, [invoiceAmount, receiptAmount]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add Debtor Allocation</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] overflow-auto" onWheel={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="companyDebtorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Company Debtor <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {debtors && (
                                                    <SelectPopover
                                                        disabled={isPreDefined}
                                                        options={debtors.map((data: CompanyCreditor) => ({
                                                            label: `${data.name} (${data.accountNumber})`,
                                                            value: data.id,
                                                        }))}
                                                        title="company debtor"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="debtorInvoicingOrderId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Invoices <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {invoices && (
                                                    <SelectPopover
                                                        disabled={!companyDebtorId}
                                                        options={invoices.map((data: AccountSalesDetails) => ({
                                                            label: `${data.invoiceNumber} (${moment(data.invoiceDate).format('DD-MM-YY')})`,
                                                            value: data.id,
                                                        }))}
                                                        title="invoice"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="allocationType"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Allocation Type <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value}
                                                    disabled={isPreDefined}
                                                >
                                                    <SelectTrigger className="!h-7 text-xs">
                                                        <SelectValue placeholder="Select allocation type" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {allocationTypes.map((data) => (
                                                            <SelectItem key={data.value} value={data.value}>
                                                                {data.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                {watch('allocationType') === 'DEBTOR_RECEIPT' ? (
                                    <FormField
                                        control={control}
                                        name="debtorReceiptId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Debtor Receipt <MandatoryField />
                                                </Label>

                                                <FormControl>
                                                    {debtorReceipts && (
                                                        <SelectPopover
                                                            disabled={!companyDebtorId || isPreDefined}
                                                            options={debtorReceipts?.map(
                                                                (data: DebtorReceiptDetails) => ({
                                                                    label: `${data?.referenceNumber} (${moment(data.receiptDate).format('DD-MM-YY')})`,
                                                                    value: data.id,
                                                                }),
                                                            )}
                                                            title="debtor receipt"
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                ) : (
                                    <FormField
                                        control={control}
                                        name="creditNoteId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Credit Notes <MandatoryField />
                                                </Label>

                                                <FormControl>
                                                    {creditNotes && (
                                                        <SelectPopover
                                                            disabled={!companyDebtorId}
                                                            options={creditNotes.map((data: CreditNotesDetails) => ({
                                                                label: `${data.creditNoteNumber} (${moment(data.creditNoteDate).format('DD-MM-YY')})`,
                                                                value: data.id,
                                                            }))}
                                                            title="credit note"
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
                                    <div>
                                        <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                                            Outstanding Invoice Amount
                                        </p>
                                        <p className="text-lg font-semibold text-green-700">
                                            {currencySymbol} {Number(invoiceAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <FileText size={20} className="text-green-600" />
                                </div>

                                <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow-md">
                                    <div>
                                        <p className="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
                                            {watch('allocationType') === 'DEBTOR_RECEIPT' ? 'Receipt' : 'C/Note'}{' '}
                                            Unallocated Amount
                                        </p>
                                        <p className="text-lg font-semibold text-red-700">
                                            {currencySymbol} {Number(receiptAmount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <Wallet size={20} className="text-red-600" />
                                </div>

                                <FormField
                                    control={control}
                                    name="allocationDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Allocation Date <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                <Input {...field} readOnly type="date" className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="allocatedAmount"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Allocation Amount <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => {
                                                        const value = e.target.valueAsNumber;
                                                        if (isNaN(value)) {
                                                            field.onChange('');
                                                        } else if (value <= maxAmount) {
                                                            field.onChange(value);
                                                        } else {
                                                            field.onChange(maxAmount);
                                                        }
                                                    }}
                                                    type="number"
                                                    className="h-7 text-xs"
                                                    max={maxAmount}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <div className="col-span-2 font-semibold">
                                    <span className="text-red-700">*</span> Maximum amount will always be the one lesser
                                    among invoice outstanding amount and receipt / note unallocated amount.
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Allocate Receipt
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DebtorAllocationForm;
