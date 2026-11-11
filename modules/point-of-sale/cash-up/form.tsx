import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthUser } from '@/stores/auth-user.store';

import {
    CashUpDetails,
    CashUpSchema,
    CashUpTenderRow,
    cashUpSchema,
    toCashUpTenderRows,
    useCreateCashUp,
    useGetCashUpTenders,
    useUpdateCashUp,
} from '@/api-queries/till-management/cash-up';
import { useGetDenominations, DenominationDetails } from '@/api-queries/till-management/denominations';
import { useGetShifts, ShiftDetails } from '@/api-queries/till-management/shifts';
import { useGetTills, TillDetails } from '@/api-queries/masters/tills';
import { useGetUserTills } from '@/api-queries/user/user-tills';
import { useTillSessionState } from '@/stores/till-session.store';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import moment from 'moment';
import { useEffect, useMemo } from 'react';

interface CashUpFormProps {
    open: boolean;
    onClose: () => void;
    editData: CashUpDetails | null;
    currentShift?: ShiftDetails | null;
}

const CashUpForm = ({ open, editData, onClose, currentShift }: CashUpFormProps) => {
    const createItemData = useCreateCashUp();
    const updateItemData = useUpdateCashUp();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const authUser = useAuthUser((state) => state.user);

    // The cashier's open session is what they are physically counting, so it is the
    // default till for a new cash-up.
    const tillSession = useTillSessionState((state) => state.tillSession);

    const denominationsList = useGetDenominations({})?.data?.data?.rows;
    const tillsQuery = useGetTills({}, { enabled: !currentShift });
    const tillsList = currentShift ? [] : tillsQuery.data?.data?.rows || [];

    const isEditing = !!editData;

    // A cashier may only cash up a till that is actively assigned to them. Editing an
    // existing cash-up still needs the full list, because the till on a submitted or
    // approved cash-up may belong to a different cashier by then.
    const userTillsQuery = useGetUserTills(
        { userId: authUser?.id, status: 'ACTIVE', limit: 500 },
        !currentShift,
    );
    const assignedTills = useMemo(
        () => (userTillsQuery.data?.data?.rows || []).map((row) => row.till).filter(Boolean) as TillDetails[],
        [userTillsQuery.data],
    );

    const currentTill = currentShift?.till?.id
        ? {
              id: currentShift.till.id,
              name: currentShift.till.name,
              tillNumber: currentShift.till.tillNumber,
          }
        : tillSession?.till
          ? {
                id: tillSession.till.id,
                name: tillSession.till.name,
                tillNumber: tillSession.till.tillNumber,
            }
          : null;

    const assignableTills = useMemo(() => {
        if (currentShift) return currentTill ? [currentTill] : [];
        if (isEditing || assignedTills.length === 0) return tillsList;
        return assignedTills;
    }, [currentShift, currentTill, isEditing, assignedTills, tillsList]);

    const defaultDenominations = () =>
        (denominationsList || []).map((d: DenominationDetails) => ({
            denominationId: d.id,
            count: 0,
        }));

    const form = useForm<CashUpSchema>({
        resolver: zodResolver(cashUpSchema),
        defaultValues: {
            tillId: editData?.tillId || currentShift?.till?.id || tillSession?.tillId || '',
            shiftId: editData?.shiftId || currentShift?.id || '',
            cashUpDate: editData?.cashUpDate
                ? moment(editData.cashUpDate).format('YYYY-MM-DD')
                : moment().format('YYYY-MM-DD'),
            companyDebtorId: editData?.companyDebtorId || '',
            denominations: [],
        },
    });

    const { handleSubmit, control, watch } = form;

    const watchedTillId = watch('tillId');

    const selectedTill = currentShift
        ? currentTill
        : tillsList.find((t: TillDetails) => t.id === watchedTillId);

    const selectedShiftId = watch('shiftId');

    const shiftsQuery = useGetShifts(
        selectedTill?.tillNumber ? { tillNumber: selectedTill.tillNumber, limit: 100 } : { tillNumber: '', limit: 0 },
        !currentShift,
    );
    const shiftsList = shiftsQuery.data?.data?.rows;

    useEffect(() => {
        if (currentShift) return;
        if (selectedTill?.tillNumber && shiftsList && selectedShiftId) {
            const stillAvailable = shiftsList?.some((s) => s.id === selectedShiftId);
            if (!stillAvailable) form.setValue('shiftId', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTill?.tillNumber, shiftsList]);

    const { fields, replace } = useFieldArray({ control, name: 'denominations' });

    // The form is mounted with a stable key, so defaultValues is only read on first
    // mount. Default to the open session's till whenever a new cash-up is raised and
    // nothing has been picked yet.
    useEffect(() => {
        if (isEditing) return;
        if (currentShift) {
            form.setValue('tillId', currentShift.till?.id || tillSession?.tillId || '');
            form.setValue('shiftId', currentShift.id);
            return;
        }
        if (form.getValues('tillId')) return;
        if (tillSession?.tillId) form.setValue('tillId', tillSession.tillId);
    }, [open, isEditing, currentShift, tillSession?.tillId, form]);

    useEffect(() => {
        if (denominationsList?.length) {
            if (editData?.denominations?.length) {
                replace(
                    editData.denominations.map((cd) => ({
                        denominationId: cd.denominationId,
                        count: cd.count,
                    })),
                );
            } else {
                replace(defaultDenominations());
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [denominationsList, open]);

    const watchedDenominations = watch('denominations');

    const totalAmount = (watchedDenominations || []).reduce((sum, item) => {
        const denom = denominationsList?.find((d: DenominationDetails) => d.id === item.denominationId);
        return sum + (Number(denom?.conversionValue || 0) || 0) * (item.count || 0);
    }, 0);

    // Tender preview: what the backend says was taken on this till for the cash-up
    // date, so the cashier can sanity-check the notes they are counting against it.
    // This is a preview only - the authoritative expected/variance figures are
    // derived server-side when the cash-up is created.
    const watchedCashUpDate = watch('cashUpDate');
    const tendersQuery = useGetCashUpTenders({
        ...(watchedTillId ? { tillId: watchedTillId } : {}),
        ...(watchedCashUpDate ? { date: watchedCashUpDate } : {}),
    });
    const tenderRows = useMemo(() => toCashUpTenderRows(tendersQuery.data?.data), [tendersQuery.data]);
    const tenderTotals = tendersQuery.data?.data?.totals;
    const tenderBankableTotals = tendersQuery.data?.data?.bankableTotals;

    const formatAmount = (value: number | string | undefined | null) =>
        `${currencySymbol} ${(Number(value || 0) || 0).toFixed(2)}`;

    function onSubmit(values: CashUpSchema) {
        // status is never part of the payload: create opens as DRAFT server-side and
        // every later transition goes through its own permission-gated action.
        const payload = {
            tillId: values.tillId,
            ...(values.shiftId ? { shiftId: values.shiftId } : {}),
            cashUpDate: values.cashUpDate,
            ...(values.companyDebtorId ? { companyDebtorId: values.companyDebtorId } : {}),
            // cashFloat is the declared counted cash for the shift, sent as a 2-decimal
            // string alongside the denomination breakdown.
            cashFloat: totalAmount.toFixed(2),
            denominations: values.denominations.filter((d) => d.count > 0),
        };

        if (editData) {
            if (!editData.id) return toast.error('Cash up ID is required');

            return updateItemData.mutate(
                { ...payload, id: editData.id },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('Cash up draft saved');
                            form.reset();
                            onClose();
                        } else {
                            toast.error('Cash up draft could not be saved');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }

        createItemData.mutate(payload, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Cash up recorded successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Cash up recording failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[640px]">
                <DialogHeader className="shrink-0">
                    <DialogTitle>{isEditing ? 'Edit Cash Up' : 'New Cash Up'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    {/* The header above and the footer buttons below stay pinned. Everything
                        in between (fields, denominations, total and tender preview) lives in
                        one scroll container so every section is reachable on short screens. */}
                    <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-2 pr-1">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="tillId" className="min-w-[120px] text-sm font-medium">
                                    Till <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="tillId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || undefined}
                                                        disabled={!!currentShift}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a till" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {assignableTills.map((data) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.name} ({data.tillNumber})
                                                                </SelectItem>
                                                            ))}
                                                            {assignableTills.length === 0 && (
                                                                <div className="text-muted-foreground px-2 py-2 text-xs">
                                                                    No tills available. Please contact your
                                                                    administrator.
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="shiftId" className="min-w-[120px] text-sm font-medium">
                                    Shift
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="shiftId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value || undefined}
                                                        disabled={!!currentShift}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a shift" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {shiftsList?.map((data: ShiftDetails) => (
                                                                <SelectItem key={data.id} value={data.id}>
                                                                    {data.tillNumber}{' '}
                                                                    {data.currentShiftNumber !== undefined &&
                                                                    data.currentShiftNumber !== null
                                                                        ? `- Shift ${data.currentShiftNumber}`
                                                                        : ''}
                                                                    {data.store?.name ? ` (${data.store.name})` : ''}
                                                                    {data.status ? ` [${data.status}]` : ''}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="cashUpDate" className="min-w-[120px] text-sm font-medium">
                                    Cash Up Date <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="cashUpDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <Label className="text-sm font-medium">Notes & Coins</Label>
                                </div>
                                <div className="space-y-2 rounded-md border p-3">
                                    {fields.length === 0 && (
                                        <div className="text-muted-foreground text-center text-sm">
                                            No denominations available. Please add denominations first.
                                        </div>
                                    )}
                                    {fields.map((field, index) => {
                                        const denom = denominationsList?.find(
                                            (d: DenominationDetails) =>
                                                d.id === watchedDenominations?.[index]?.denominationId,
                                        );
                                        return (
                                            <div key={field.id} className="flex items-center gap-3">
                                                <div className="w-32 text-sm font-medium">
                                                    {denom?.label || 'Denomination'} ({currencySymbol}{' '}
                                                    {Number(denom?.conversionValue || 0) || 0})
                                                </div>
                                                <div className="flex-1">
                                                    <FormField
                                                        control={control}
                                                        name={`denominations.${index}.count`}
                                                        render={({ field: countField }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        placeholder="Count"
                                                                        value={countField.value ?? ''}
                                                                        onChange={(e) =>
                                                                            countField.onChange(
                                                                                e.target.valueAsNumber || 0,
                                                                            )
                                                                        }
                                                                    />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-muted flex items-center justify-between rounded-md px-4 py-3">
                                <span className="text-sm font-medium">Total Amount</span>
                                <span className="text-lg font-bold">
                                    {currencySymbol} {totalAmount.toFixed(2)}
                                </span>
                            </div>

                            {watchedTillId && (
                                <div className="space-y-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-sm font-medium">Tender Preview</Label>
                                        {tenderRows.length > 0 && (
                                            <span className="text-muted-foreground text-xs">
                                                {tenderRows.length} tender(s)
                                            </span>
                                        )}
                                        {tendersQuery.isFetching && (
                                            <span className="text-muted-foreground text-xs">Loading...</span>
                                        )}
                                    </div>

                                    {tenderRows.length === 0 ? (
                                        <p className="text-muted-foreground text-xs">
                                            {tendersQuery.isFetching
                                                ? 'Loading tender totals for the selected till...'
                                                : 'No tenders recorded for this till on the selected date.'}
                                        </p>
                                    ) : (
                                        <>
                                            <div className="min-w-0 overflow-x-auto rounded-md border">
                                                <table className="w-full min-w-[380px] text-xs">
                                                    <thead>
                                                        <tr className="text-muted-foreground">
                                                            <th className="pb-1 text-left font-medium">Tender</th>
                                                            <th className="pb-1 text-right font-medium">Count</th>
                                                            <th className="pb-1 text-right font-medium">Amount</th>
                                                            <th className="pb-1 text-right font-medium">Refunds</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {tenderRows.map((row: CashUpTenderRow, index: number) => (
                                                            <tr key={row.tenderTypeId || row.saleType || index}>
                                                                <td className="py-0.5 pr-2">
                                                                    {row.description || row.saleType || 'Tender'}
                                                                    {row.isBankable === false ? (
                                                                        <span className="text-muted-foreground">
                                                                            {' '}
                                                                            (non-bankable)
                                                                        </span>
                                                                    ) : null}
                                                                </td>
                                                                <td className="py-0.5 text-right tabular-nums">
                                                                    {row.count ?? 0}
                                                                </td>
                                                                <td className="py-0.5 text-right tabular-nums">
                                                                    {formatAmount(row.amount)}
                                                                </td>
                                                                <td className="py-0.5 text-right tabular-nums">
                                                                    {formatAmount(row.refundAmount)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-2 space-y-1 border-t pt-2 text-xs">
                                                <div className="flex items-center justify-between font-medium">
                                                    <span>Total collection</span>
                                                    <span className="tabular-nums">
                                                        {formatAmount(tenderTotals?.totalCollection)}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center justify-between">
                                                    <span>Transactions</span>
                                                    <span className="tabular-nums">
                                                        {tenderTotals?.transactionCount ?? 0}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center justify-between">
                                                    <span>Bankable</span>
                                                    <span className="tabular-nums">
                                                        {formatAmount(tenderBankableTotals?.bankableTotal)}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground flex items-center justify-between">
                                                    <span>Non-bankable</span>
                                                    <span className="tabular-nums">
                                                        {formatAmount(tenderBankableTotals?.nonBankableTotal)}
                                                    </span>
                                                </div>
                                                {Number(tenderBankableTotals?.cashInDrawer) !== 0 && (
                                                    <div className="flex items-center justify-between font-medium">
                                                        <span>Cash in drawer</span>
                                                        <span className="tabular-nums">
                                                            {formatAmount(tenderBankableTotals?.cashInDrawer)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 justify-end gap-3 border-t pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Save Draft' : 'Create Cash Up'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CashUpForm;