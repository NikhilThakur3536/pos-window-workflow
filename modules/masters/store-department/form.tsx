'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

import {
    debtorStoreDepartmentSchema,
    useCreateDebtorStoreDepartment,
    useUpdateDebtorStoreDepartment,
    DebtorStoreDepartmentItem,
} from '@/api-queries/store-department';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebtorList,FilterProps } from '@/api-queries/debtor';
import z from 'zod';

type FormValues = z.infer<typeof debtorStoreDepartmentSchema>;

interface DebtorStoreDepartmentFormProps {
    open: boolean;
    onClose: () => void;
    editData: DebtorStoreDepartmentItem | null;
}

const DebtorStoreDepartmentForm = ({ open, editData, onClose }: DebtorStoreDepartmentFormProps) => {
    const isEditing = !!editData;

    const { data: debtorsData, isLoading: isDebtorsLoading } = useDebtorList({
    page: 1,
    limit: 100,
  } as FilterProps);

    const createMutation = useCreateDebtorStoreDepartment();
    const updateMutation = useUpdateDebtorStoreDepartment();

    const form = useForm<FormValues>({
        resolver: zodResolver(debtorStoreDepartmentSchema),
        defaultValues: {
            name: editData?.name || '',
            description: editData?.description || '',
            companyDebtorId: editData?.companyDebtorId || '',
            timezone: editData?.timezone || 'Asia/Kolkata',
            status: editData?.status || 'ACTIVE',
        },
    });

    const { handleSubmit, control } = form;

    const onSubmit = (values: FormValues) => {
        if (isEditing && editData) {
            updateMutation.mutate(
                { ...values, id: editData.id },
                {
                    onSuccess: () => {
                        toast.success('Department updated successfully');
                        onClose();
                    },
                    onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Update failed');
                    },
                },
            );
        } else {
            createMutation.mutate(values, {
                onSuccess: () => {
                    toast.success('Department created successfully');
                    form.reset();
                    onClose();
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Creation failed');
                },
            });
        }
    };

    const onOpenChange = () => {
        form.reset();
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[140px] text-sm font-medium">
                                    Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. Sales Department" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="min-w-[140px] text-sm font-medium">
                                    Description
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Enter department description..."
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

                            <div className="flex items-start gap-4">
                                <Label htmlFor="companyDebtorId" className="min-w-[140px] text-sm font-medium">
                                    Company Debtor
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="companyDebtorId"
                                        render={({ field }) => (
                                            <FormItem>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value || undefined}
                                                defaultValue={field.value || undefined}
                                            >
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Company Debtor" />
                                                </SelectTrigger>
                                                </FormControl>

                                                <SelectContent>
                                                {isDebtorsLoading ? (
                                                    <SelectItem value="" disabled>Loading debtors...</SelectItem>
                                                ) : (
                                                    debtorsData?.data?.rows.map((debtor: any) => (
                                                    <SelectItem key={debtor.id} value={debtor.id}>
                                                        {debtor.name || debtor.companyName || debtor.id}
                                                    </SelectItem>
                                                    ))
                                                )}
                                                </SelectContent>
                                            </Select>

                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="timezone" className="min-w-[140px] text-sm font-medium">
                                    Timezone <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="timezone"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. Asia/Kolkata, UTC" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="status" className="min-w-[140px] text-sm font-medium">
                                    Status <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                     <FormField
                    control={control}
                    name="status"
                    render={({ field }) => (
                            <FormItem>
                                <Select
                                onValueChange={field.onChange}
                                value={field.value}
                                defaultValue={field.value}
                                >
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                </FormControl>

                                <SelectContent>
                                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                    <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                                    <SelectItem value="DELETED">DELETED</SelectItem>
                                </SelectContent>
                                </Select>

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
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {createMutation.isPending || updateMutation.isPending
                                    ? 'Saving...'
                                    : isEditing
                                      ? 'Update'
                                      : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DebtorStoreDepartmentForm;

