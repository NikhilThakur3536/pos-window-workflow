import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    StockRangeDetails,
    StockRangeCreateSchema,
    StockRangeUpdateSchema,
    stockRangeBaseSchema,
    stockRangeUpdateSchema,
    useCreateStockRange,
    useUpdateStockRange,
} from '@/api-queries/company/stock-ranges';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import moment from 'moment-timezone';
import { useGetSubCategories } from '@/api-queries/categories/sub-categories';
import { cleanDataPayload } from '@/utils/helpers';
import SelectPopover from '@/components/select-popover';

interface StockRangeFormProps {
    open: boolean;
    onClose: () => void;
    editData: StockRangeDetails | null;
}

const StockRangeForm = ({ open, editData, onClose }: StockRangeFormProps) => {
    const subCategories = useGetSubCategories({})?.data?.data?.rows;

    const createItemData = useCreateStockRange();
    const updateItemData = useUpdateStockRange();

    const isEditing = !!editData;

    const form = useForm<StockRangeCreateSchema | StockRangeUpdateSchema>({
        resolver: zodResolver(isEditing ? stockRangeUpdateSchema : stockRangeBaseSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            subCategoryId: editData?.subCategoryId || '',
            description: editData?.description || '',
            timezone: editData ? undefined : moment.tz.guess(),
            ...(editData ? { id: editData.id } : {}),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: StockRangeCreateSchema | StockRangeUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('Stock Range ID is required');

            return updateItemData.mutate(payload as StockRangeUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Stock Range updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error(data.message || 'Stock Range updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as StockRangeCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Stock Range created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error(data.message || 'Stock Range creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Stock Range' : 'Add New Stock Range'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : Small" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : SMALL" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="subCategoryId" className="min-w-[120px] text-sm font-medium">
                                    Sub Category <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="subCategoryId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    {subCategories && (
                                                        <SelectPopover
                                                            title="Sub Category Id"
                                                            options={subCategories?.map((data) => ({
                                                                label: `${data?.name} (${data?.code})`,
                                                                value: data?.id,
                                                            }))}
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Description :
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Please enter Description of the stock range"
                                                        rows={5}
                                                        {...field}
                                                    />
                                                </FormControl>
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
                                {editData ? 'Update Stock Range' : 'Create Stock Range'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default StockRangeForm;