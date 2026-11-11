import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    CategoryDetails,
    CategoryCreateSchema,
    CategoryUpdateSchema,
    categoryCreateSchema,
    categoryUpdateSchema,
    useCreateCategory,
    useUpdateCategory,
} from '@/api-queries/categories';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload } from '@/utils/helpers';
import ImageManager from '@/components/image-manager';

interface CategoryFormProps {
    open: boolean;
    onClose: () => void;
    editData: CategoryDetails | null;
}

const CategoryForm = ({ open, editData, onClose }: CategoryFormProps) => {
    const createItemData = useCreateCategory();
    const updateItemData = useUpdateCategory();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);

    const isEditing = !!editData;

    const form = useForm<CategoryCreateSchema | CategoryUpdateSchema>({
        resolver: zodResolver(isEditing ? categoryUpdateSchema : categoryCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            targetGpPercent: editData?.targetGpPercent ?? null,
            minGpPercent: editData?.minGpPercent ?? null,
            maxGpPercent: editData?.maxGpPercent ?? null,
            gpTolerancePercent: editData?.gpTolerancePercent ?? null,
            blockingGpVariancePercent: editData?.blockingGpVariancePercent ?? null,
            enforceGpPolicy: editData?.enforceGpPolicy ?? null,
            description: editData?.description || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: CategoryCreateSchema | CategoryUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('Category ID is required');

            return updateItemData.mutate(payload as CategoryUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Category updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Category updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as CategoryCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Category created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Category creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Category Name <MandatoryField />
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
                                    Category Code <MandatoryField />
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
                                <Label htmlFor="targetGpPercent" className="min-w-[120px] text-sm font-medium">
                                    Target GP%
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="targetGpPercent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="eg : 22.5%"
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
                                <Label className="min-w-[120px] text-sm font-medium">GP Limits</Label>
                                <div className="grid flex-1 grid-cols-2 gap-4">
                                    {(
                                        [
                                            ['minGpPercent', 'Min GP%', 'eg : 15%'],
                                            ['maxGpPercent', 'Max GP%', 'eg : 45%'],
                                            ['gpTolerancePercent', 'Tolerance%', 'eg : 2%'],
                                        ] as const
                                    ).map(([name, label, placeholder]) => (
                                        <div key={name}>
                                            <Label htmlFor={name} className="mb-1 block text-xs">
                                                {label}
                                            </Label>
                                            <FormField
                                                control={control}
                                                name={name}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                placeholder={placeholder}
                                                                {...field}
                                                                value={field.value ?? ''}
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        Number.isNaN(e.target.valueAsNumber)
                                                                            ? null
                                                                            : e.target.valueAsNumber,
                                                                    )
                                                                }
                                                            />
                                                        </FormControl>
                                                        <FormMessage className="!-mt-1 !text-xs" />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    ))}
                                    <div className="col-span-2">
                                        <FormField
                                            control={control}
                                            name="enforceGpPolicy"
                                            render={({ field }) => (
                                                <FormItem className="space-y-2">
                                                    <Label htmlFor="enforceGpPolicy" className="text-sm font-medium">
                                                        When GP limits are exceeded
                                                    </Label>
                                                    <FormControl>
                                                        <div className="flex flex-col gap-2">
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="radio"
                                                                    checked={field.value === false}
                                                                    onChange={() => field.onChange(false)}
                                                                />
                                                                Warning only
                                                            </label>
                                                            <label className="flex items-center gap-2 text-sm">
                                                                <input
                                                                    type="radio"
                                                                    checked={field.value === true}
                                                                    onChange={() => field.onChange(true)}
                                                                />
                                                                Require approval
                                                            </label>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage className="!text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                                        placeholder="Please enter Description of the category"
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
                                            scopeType="CATEGORY"
                                            scopeId={editData.id}
                                            helperText="Upload, reorder, set the primary image, or delete category images. Changes apply immediately."
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
                                {editData ? 'Update Category' : 'Create Category'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CategoryForm;
