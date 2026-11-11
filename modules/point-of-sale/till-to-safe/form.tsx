import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    TillToSafeSchema,
    tillToSafeSchema,
    useCreateTillToSafeTransfer,
} from '@/api-queries/till-management/till-to-safe';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { TillDetails, useGetTills } from '@/api-queries/masters/tills';
import { SafeDetails, useGetSafes } from '@/api-queries/safes';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useAuthUser } from '@/stores/auth-user.store';

interface TillToSafeFormProps {
    open: boolean;
    onClose: () => void;
}

const TillToSafeForm = ({ open, onClose }: TillToSafeFormProps) => {
    const tillsList = useGetTills({})?.data?.data?.rows;
    const safesList = useGetSafes({})?.data?.data?.rows;
    const companyDebtorId = useAuthUser((state) => state.user?.companyDebtorId);

    const createTransfer = useCreateTillToSafeTransfer();

    const form = useForm<TillToSafeSchema>({
        resolver: zodResolver(tillToSafeSchema),
        defaultValues: {
            tillId: '',
            safeId: '',
            amount: 0,
            referenceNumber: '',
            reason: '',
            companyDebtorId: companyDebtorId || '',
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: TillToSafeSchema) {
        createTransfer.mutate(values, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Cash transferred to safe successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Transfer failed');
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
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a till" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tillsList?.map((data: TillDetails) => (
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
                                                            {safesList?.map((data: SafeDetails) => (
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
                                <Label htmlFor="referenceNumber" className="min-w-[120px] text-sm font-medium">
                                    Reference No.
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
                                <Label htmlFor="amount" className="min-w-[120px] text-sm font-medium">
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
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="reason" className="min-w-[120px] text-sm font-medium">
                                    Reason
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea placeholder="Enter reason" rows={3} {...field} />
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

export default TillToSafeForm;
