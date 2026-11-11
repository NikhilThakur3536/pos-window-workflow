import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// APIs & Types
import {
    SubCategoryDetails,
    SubCategoryCreateSchema,
    SubCategoryUpdateSchema,
    subCategoryCreateSchema,
    subCategoryUpdateSchema,
    useCreateSubCategory,
    useUpdateSubCategory,
} from '@/api-queries/categories/sub-categories';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useGetCategories } from '@/api-queries/categories';
import { TaxRateDetails, useGetTaxRates } from '@/api-queries/company-details/tax-rates';
import { cleanDataPayload } from '@/utils/helpers';
import SelectPopover from '@/components/select-popover';
import ImageManager from '@/components/image-manager';

interface SubCategoryFormProps {
    open: boolean;
    onClose: () => void;
    editData: SubCategoryDetails | null;
}

const SubCategoryForm = ({ open, editData, onClose }: SubCategoryFormProps) => {
    const categories = useGetCategories({})?.data?.data?.rows;
    const taxRates = useGetTaxRates({})?.data?.data?.rows;

    const createItemData = useCreateSubCategory();
    const updateItemData = useUpdateSubCategory();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<SubCategoryCreateSchema | SubCategoryUpdateSchema>({
        resolver: zodResolver(isEditing ? subCategoryUpdateSchema : subCategoryCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            taxRateId: editData?.taxId || '',
            categoryId: editData?.categoryId || '',
            description: editData?.description || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: SubCategoryCreateSchema | SubCategoryUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('Sub Category ID is required');

            return updateItemData.mutate(payload as SubCategoryUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Sub Category updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Sub Category updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as SubCategoryCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Sub Category created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Sub Category creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Sub Category' : 'Add New Sub Category'}</DialogTitle>
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
                                                    <Input placeholder="eg : Mobile" {...field} />
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
                                                    <Input placeholder="eg : MOBILE" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    Category <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    {categories && (
                                                        <SelectPopover
                                                            title="Category Id"
                                                            options={categories?.map((data) => ({
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
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    Tax Rate
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="taxRateId"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    {taxRates && (
                                                        <SelectPopover
                                                            title="Tax Rate"
                                                            options={taxRates?.map((data) => ({
                                                                label: `${data?.description} (${data?.taxRateId})`,
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
                                                        placeholder="Please enter Description of the sub category"
                                                        rows={5}
                                                        {...field}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {editData ? (
                                <div className="flex items-start gap-4">
                                    <Label className="min-w-[120px] pt-1 text-sm font-medium">Images</Label>
                                    <div className="flex-1">
                                        <ImageManager
                                            mode="managed"
                                            scope="category"
                                            scopeType="SUBCATEGORY"
                                            scopeId={editData.id}
                                            helperText="Upload, reorder, set the primary image, or delete sub-category images. Changes apply immediately."
                                        />
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Sub Category' : 'Create Sub Category'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SubCategoryForm;
