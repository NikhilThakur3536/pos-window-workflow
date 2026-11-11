import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    SPVariantGroupDetails,
    SPVariantGroupCreateSchema,
    SPVariantGroupUpdateSchema,
    spVariantGroupCreateSchema,
    spVariantGroupUpdateSchema,
    useCreateSPVariantGroup,
    useUpdateSPVariantGroup,
} from '@/api-queries/variant-groups/sell-price';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload } from '@/utils/helpers';

interface SellPriceVariantGroupFormProps {
    open: boolean;
    onClose: () => void;
    editData: SPVariantGroupDetails | null;
}

const SellPriceVariantGroupForm = ({ open, editData, onClose }: SellPriceVariantGroupFormProps) => {
    const createItemData = useCreateSPVariantGroup();
    const updateItemData = useUpdateSPVariantGroup();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<SPVariantGroupCreateSchema | SPVariantGroupUpdateSchema>({
        resolver: zodResolver(isEditing ? spVariantGroupUpdateSchema : spVariantGroupCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            description: editData?.description || '',
            ...(editData
                ? { sellPriceVariantGroupId: editData.id }
                : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: SPVariantGroupCreateSchema | SPVariantGroupUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('SP Variant Group ID is required');

            return updateItemData.mutate(payload as SPVariantGroupUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('SP Variant Group updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('SP Variant Group updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as SPVariantGroupCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('SP Variant Group created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('SP Variant Group creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Variant Group' : 'Add New Variant Group'}</DialogTitle>
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
                                                    <Input placeholder="eg : Electronics" {...field} />
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
                                                    <Input placeholder="eg : ELECTRONICS" {...field} />
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
                                                        placeholder="Please enter description of the sell price variant group"
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
                                {editData ? 'Update Sell Price Variant Group' : 'Create Sell Price Variant Group'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SellPriceVariantGroupForm;
