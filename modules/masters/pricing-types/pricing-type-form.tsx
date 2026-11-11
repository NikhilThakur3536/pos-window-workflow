import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    CompanyStockPricingType,
    useCreateCompanyStockPricingType,
    useUpdateCompanyStockPricingType,
} from '@/api-queries/company/stock-pricing-type';
import {
    createCompanyPricingTypeSchema,
    updateCompanyPricingTypeSchema,
    CreateCompanyPricingTypeSchema,
    UpdateCompanyPricingTypeSchema,
} from '@/schema/company/pricing-type';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface PricingTypeFormProps {
    open: boolean;
    onClose: () => void;
    editData: CompanyStockPricingType | null;
}

const PricingTypeForm = ({ open, editData, onClose }: PricingTypeFormProps) => {
    const createItemData = useCreateCompanyStockPricingType();
    const updateItemData = useUpdateCompanyStockPricingType();

    const isEditing = !!editData;

    const form = useForm<CreateCompanyPricingTypeSchema | UpdateCompanyPricingTypeSchema>({
        resolver: zodResolver(isEditing ? updateCompanyPricingTypeSchema : createCompanyPricingTypeSchema),
        defaultValues: {
            name: editData?.name || '',
            ...(editData ? { pricingTypeId: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: CreateCompanyPricingTypeSchema | UpdateCompanyPricingTypeSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Pricing Type ID is required');

            return updateItemData.mutate(values as UpdateCompanyPricingTypeSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Pricing Type updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Pricing Type updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as CreateCompanyPricingTypeSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Pricing Type created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Pricing Type creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Pricing Type' : 'Add New Pricing Type'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Pricing Type Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : Wholesale Price" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
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
                                {editData ? 'Update Pricing Type' : 'Add Pricing Type'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default PricingTypeForm;
