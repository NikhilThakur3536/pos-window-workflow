import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import moment from 'moment-timezone';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import {
    StockVariantDetails,
    StockVariantCreateSchema,
    StockVariantUpdateSchema,
    stockVariantCreateSchema,
    stockVariantUpdateSchema,
    useCreateStockVariant,
    useUpdateStockVariant,
} from '@/api-queries/masters/stock-variants';

interface StockVariantFormProps {
    open: boolean;
    onClose: () => void;
    editData: StockVariantDetails | null;
}

const StockVariantForm = ({ open, editData, onClose }: StockVariantFormProps) => {
    const createItemData = useCreateStockVariant();
    const updateItemData = useUpdateStockVariant();

    const isEditing = !!editData;

    const form = useForm<StockVariantCreateSchema | StockVariantUpdateSchema>({
        resolver: zodResolver(isEditing ? stockVariantUpdateSchema : stockVariantCreateSchema),
        defaultValues: {
            identifier: editData?.identifier || '',
            description: editData?.description || '',
            timezone: moment.tz.guess(),
            ...(editData ? { variantId: editData.id } : {}),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: StockVariantCreateSchema | StockVariantUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Stock Variant ID is required');

            return updateItemData.mutate(values as StockVariantUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Stock Variant updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error(data.message || 'Stock Variant updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as StockVariantCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Stock Variant created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error(data.message || 'Stock Variant creation failed');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[540px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Stock Variant' : 'Add New Stock Variant'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="identifier" className="min-w-[120px] text-sm font-medium">
                                    Identifier <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="identifier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : Medium" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Description <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please enter Description of the stock variant"
                                                        rows={5}
                                                        {...field}
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
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Stock Variant' : 'Create Stock Variant'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default StockVariantForm;