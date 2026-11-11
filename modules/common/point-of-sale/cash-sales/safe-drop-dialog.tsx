import { useEffect } from 'react';
import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useGetSafes } from '@/api-queries/safes';
import {
    TillToSafeSchema,
    tillToSafeSchema,
    useTransferTillCashToSafe,
} from '@/api-queries/user/reports/till-reports';

interface SafeDropDialogProps {
    open: boolean;
    onClose: () => void;
    tillId: string;
    tillName?: string;
    safeId?: string | null;
    safeName?: string | null;
    // Pre-fills the amount with the threshold excess reported by
    // /api/company/till/balance-status so the cashier drops the advised amount.
    suggestedAmount?: number;
    onCompleted?: () => void;
}

const SafeDropDialog = ({
    open,
    onClose,
    tillId,
    tillName,
    safeId,
    safeName,
    suggestedAmount,
    onCompleted,
}: SafeDropDialogProps) => {
    const safesList = useGetSafes({})?.data?.data?.rows;
    const transferTillCashToSafe = useTransferTillCashToSafe();

    const form = useForm<TillToSafeSchema>({
        resolver: zodResolver(tillToSafeSchema),
        defaultValues: {
            referenceNumber: '',
            tillId,
            safeId: safeId || '',
            amount: suggestedAmount ?? 0,
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control, formState, reset } = form;

    useEffect(() => {
        if (!open) return;
        reset({
            referenceNumber: '',
            tillId,
            safeId: safeId || '',
            amount: suggestedAmount ?? 0,
            timezone: moment.tz.guess(),
        });
    }, [open, tillId, safeId, suggestedAmount, reset]);

    function onSubmit(values: TillToSafeSchema) {
        transferTillCashToSafe.mutate(values, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Cash dropped to safe successfully.');
                    reset({
                        referenceNumber: '',
                        tillId,
                        safeId: safeId || '',
                        amount: suggestedAmount ?? 0,
                        timezone: moment.tz.guess(),
                    });
                    onClose();
                    onCompleted?.();
                } else {
                    toast.error('Safe drop failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            reset({
                referenceNumber: '',
                tillId,
                safeId: safeId || '',
                amount: suggestedAmount ?? 0,
                timezone: moment.tz.guess(),
            });
            onClose();
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>Safe Drop</DialogTitle>
                    <DialogDescription>
                        Move cash from {tillName || 'the till'} to a safe before continuing. This reduces the amount
                        held in the drawer without closing the session.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 py-2">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="safeId" className="min-w-[120px] text-sm font-medium">
                                    Select Safe <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="safeId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                        disabled={!!safeId}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a safe" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {safeId && !safesList?.some((safe) => safe.id === safeId) ? (
                                                                <SelectItem value={safeId}>
                                                                    {safeName || safeId}
                                                                </SelectItem>
                                                            ) : null}
                                                            {safesList?.map((safe) => (
                                                                <SelectItem key={safe.id} value={safe.id}>
                                                                    {safe.name} ({safe.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {safeId ? (
                                                        <p className="text-xs text-muted-foreground">
                                                            This till is configured to drop to {safeName || 'its assigned safe'}.
                                                        </p>
                                                    ) : null}
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="referenceNumber" className="min-w-[120px] text-sm font-medium">
                                    Reference No. <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="referenceNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter reference number" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="safeDropAmount" className="min-w-[120px] text-sm font-medium">
                                    Amount <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="amount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        id="safeDropAmount"
                                                        type="number"
                                                        min={0}
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={transferTillCashToSafe.isPending || formState.isSubmitting}
                            >
                                {transferTillCashToSafe.isPending ? 'Dropping...' : 'Drop to Safe'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SafeDropDialog;
