'use client';

import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import SelectPopover from '@/components/select-popover';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import {
    PURCHASE_ORDER_STATUSES,
    PurchaseOrderDetails,
    PurchaseOrderUpdateSchema,
    purchaseOrderUpdateSchema,
    useUpdatePurchaseOrder,
} from '@/api-queries/purchase-orders';

interface PurchaseOrderStatusDialogProps {
    open: boolean;
    onClose: () => void;
    order: PurchaseOrderDetails;
}

const PurchaseOrderStatusDialog = ({ open, onClose, order }: PurchaseOrderStatusDialogProps) => {
    const updateItemData = useUpdatePurchaseOrder();

    const form = useForm<PurchaseOrderUpdateSchema>({
        resolver: zodResolver(purchaseOrderUpdateSchema),
        defaultValues: {
            orderId: order.id,
            status: (order.status as PurchaseOrderUpdateSchema['status']) || 'DRAFT',
            cancelReason: order.cancelReason || '',
            confirmationNotes: order.confirmationNotes || '',
        },
    });

    const { handleSubmit, control, watch } = form;
    const currentStatus = watch('status');

    function onSubmit(values: PurchaseOrderUpdateSchema) {
        const payload: PurchaseOrderUpdateSchema = { orderId: values.orderId, status: values.status };
        if (values.status === 'CANCELLED') {
            payload.cancelReason = values.cancelReason;
        }
        if (values.status === 'CONFIRMED') {
            payload.confirmationNotes = values.confirmationNotes;
        }

        updateItemData.mutate(payload, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Purchase Order status updated successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Failed to update purchase order status');
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
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Update Purchase Order Status</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
                        <FormField
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">
                                        Status <MandatoryField />
                                    </Label>
                                    <FormControl>
                                        <SelectPopover
                                            options={PURCHASE_ORDER_STATUSES.map((s) => ({ label: s, value: s }))}
                                            title="Status"
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        {currentStatus === 'CANCELLED' && (
                            <FormField
                                control={control}
                                name="cancelReason"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Cancel Reason <MandatoryField />
                                        </Label>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                className="h-7 text-xs"
                                                placeholder="Reason for cancellation"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {currentStatus === 'CONFIRMED' && (
                            <FormField
                                control={control}
                                name="confirmationNotes"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Confirmation Notes</Label>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                className="h-7 text-xs"
                                                placeholder="Supplier confirmation notes"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Update Status
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default PurchaseOrderStatusDialog;
