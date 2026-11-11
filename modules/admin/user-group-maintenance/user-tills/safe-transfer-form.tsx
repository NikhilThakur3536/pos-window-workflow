import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// APIs & Types
import {
    UserTillReportDetails,
    useTransferTillCashToSafe,
    tillToSafeSchema,
    TillToSafeSchema,
} from '@/api-queries/user/reports/till-reports';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { TillDetails, useGetTills } from '@/api-queries/masters/tills';
import { useGetSafes } from '@/api-queries/safes';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface TillToSafeTransferFormProps {
    open: boolean;
    onClose: () => void;
    tillData: UserTillReportDetails;
}

const TillToSafeTransferForm = ({ open, tillData, onClose }: TillToSafeTransferFormProps) => {
    const tillsList = useGetTills({})?.data?.data?.rows;
    const safesList = useGetSafes({})?.data?.data?.rows;

    const transferTillCashToSafe = useTransferTillCashToSafe();

    const form = useForm<TillToSafeSchema>({
        resolver: zodResolver(tillToSafeSchema),
        defaultValues: {
            referenceNumber: '',
            tillId: tillData?.tillId,
            safeId: '',
            amount: 0,
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: TillToSafeSchema) {
        if (tillData) {
            if (!tillData.tillId) return toast.error('Till ID is required');

            return transferTillCashToSafe.mutate(values as TillToSafeSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('User Till updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('User Till updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>Transfer Cash to Safe</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="tillId" className="min-w-[120px] text-sm font-medium">
                                    Select Till <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="tillId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value} disabled>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a till" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tillsList &&
                                                                tillsList.map((data: TillDetails) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name} ({data.tillNumber})
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
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="safeId" className="min-w-[120px] text-sm font-medium">
                                    Select Safe <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="safeId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a safe" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {safesList &&
                                                                safesList.map((data) => (
                                                                    <SelectItem key={data.id} value={data.id}>
                                                                        {data.name} ({data.code})
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
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
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
                                    <FormMessage />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
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
                                                        type="number"
                                                        placeholder="e.g. 100"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                Transfer Cash
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default TillToSafeTransferForm;
