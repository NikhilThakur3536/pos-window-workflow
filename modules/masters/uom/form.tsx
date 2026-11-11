'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import { uomCreateSchema, useCreateUom, useUpdateUom, UomCreateSchema, UomDetails } from '@/api-queries/masters/uom';

interface UomFormProps {
    open: boolean;
    onClose: () => void;
    editData: UomDetails | null;
}

const UomForm = ({ open, editData, onClose }: UomFormProps) => {
    const isEditing = !!editData;
    const createMutation = useCreateUom();
    const updateMutation = useUpdateUom();

    const form = useForm<UomCreateSchema>({
        resolver: zodResolver(uomCreateSchema),
        defaultValues: {
            name: editData?.name || '',
            code: editData?.code || '',
            description: editData?.description || '',
            status: (editData?.status as UomCreateSchema['status']) || 'ACTIVE',
        },
    });

    const { handleSubmit, control, reset } = form;

    function onSubmit(values: UomCreateSchema) {
        if (isEditing && editData) {
            // The id travels in the PUT path, not the body.
            updateMutation.mutate(
                { ...values, id: editData.id },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('UOM updated successfully');
                            onClose();
                        }
                    },
                    onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Update failed');
                    },
                },
            );
        } else {
            createMutation.mutate(values, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('UOM created successfully');
                        onClose();
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Creation failed');
                },
            });
        }
    }

    function onOpenChange() {
        reset();
        onClose();
    }

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit UOM' : 'Add New UOM'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    UOM Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. Unit, Shrink, Box" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    UOM Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. UNIT, SHRINK, BOX" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="min-w-[120px] text-sm font-medium">
                                    Description
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Pack of 6 units"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="status" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Status
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select
                                                        value={field.value || 'ACTIVE'}
                                                        onValueChange={field.onChange}
                                                    >
                                                        <SelectTrigger className="w-full">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                        </SelectContent>
                                                    </Select>
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
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UomForm;
