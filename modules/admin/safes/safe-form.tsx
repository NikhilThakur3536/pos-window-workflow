import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types
import {
    SafeDetails,
    SafeCreateSchema,
    SafeUpdateSchema,
    safeCreateSchema,
    safeUpdateSchema,
    useCreateSafe,
    useUpdateSafe,
} from '@/api-queries/safes';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface SafeFormProps {
    open: boolean;
    onClose: () => void;
    editData: SafeDetails | null;
}

const SafeForm = ({ open, editData, onClose }: SafeFormProps) => {
    const createItemData = useCreateSafe();
    const updateItemData = useUpdateSafe();

    const isEditing = !!editData;

    const form = useForm<SafeCreateSchema | SafeUpdateSchema>({
        resolver: zodResolver(isEditing ? safeUpdateSchema : safeCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            description: editData?.description || '',
            ...(editData ? { id: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: SafeCreateSchema | SafeUpdateSchema) {
        if (editData) {
            if (!editData.id) return toast.error('Safe ID is required');

            return updateItemData.mutate(values as SafeUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Safe updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Safe updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as SafeCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Safe created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Safe creation failed');
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
                    <DialogTitle>{isEditing ? 'Edit Safe' : 'Add New Safe'}</DialogTitle>
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
                                                    <Input placeholder="Enter safe name" {...field} />
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
                                    Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="Enter safe code" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormMessage />
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
                                                        placeholder="Please enter Description of the safe"
                                                        rows={5}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
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
                                {editData ? 'Update Safe' : 'Create Safe'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SafeForm;
