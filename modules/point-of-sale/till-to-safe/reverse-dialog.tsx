import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import {
    ReverseTillToSafeSchema,
    reverseTillToSafeSchema,
    TillToSafeDetails,
    useReverseTillToSafeTransfer,
} from '@/api-queries/till-management/till-to-safe';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';

interface ReverseDialogProps {
    data: TillToSafeDetails | null;
    onClose: () => void;
}

const ReverseDialog = ({ data, onClose }: ReverseDialogProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const reverseTransfer = useReverseTillToSafeTransfer();

    const form = useForm<ReverseTillToSafeSchema>({
        resolver: zodResolver(reverseTillToSafeSchema),
        defaultValues: {
            id: data?.id || '',
            reversalReason: '',
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: ReverseTillToSafeSchema) {
        reverseTransfer.mutate(values, {
            onSuccess: (res) => {
                if (res.success) {
                    toast.success('Transfer reversed successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Reversal failed');
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
        <Dialog open={!!data} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Reverse Transfer to Safe</DialogTitle>
                </DialogHeader>

                {data && (
                    <div className="space-y-4">
                        <div className="rounded-md bg-muted px-4 py-3 text-sm">
                            <div className="flex justify-between">
                                <span>Amount</span>
                                <strong>
                                    {currencySymbol} {data.amount}
                                </strong>
                            </div>
                            <div className="mt-1 flex justify-between">
                                <span>Reference No.</span>
                                <span>{data.referenceNumber || 'N/A'}</span>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <Label htmlFor="reversalReason" className="min-w-[120px] text-sm font-medium">
                                        Reversal Reason
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="reversalReason"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Enter reason for reversal"
                                                            rows={3}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                    <Button type="button" variant="outline" onClick={onClose}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-red-600 hover:bg-red-700"
                                        disabled={reverseTransfer.isPending}
                                    >
                                        Reverse Transfer
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ReverseDialog;
