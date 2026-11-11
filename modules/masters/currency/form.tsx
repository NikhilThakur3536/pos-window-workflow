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

import {
    currencyMasterCreateSchema,
    currencyMasterUpdateSchema,
    useCreateCurrency,
    useUpdateCurrency,
    CurrencyMasterCreateSchema,
    CurrencyMasterUpdateSchema,
    CurrencyMasterDetails,
} from '@/api-queries/currency';

interface CurrencyMasterFormProps {
    open: boolean;
    onClose: () => void;
    editData: CurrencyMasterDetails | null;
}

const CurrencyMasterForm = ({ open, editData, onClose }: CurrencyMasterFormProps) => {
    const isEditing = !!editData;
    const createMutation = useCreateCurrency();
    const updateMutation = useUpdateCurrency();

    const form = useForm<CurrencyMasterCreateSchema | CurrencyMasterUpdateSchema>({
        resolver: zodResolver(isEditing ? currencyMasterUpdateSchema : currencyMasterCreateSchema),
        defaultValues: {
            code: editData?.code || '',
            name: editData?.name || '',
            symbol: editData?.symbol || '',
            decimalPlaces: editData?.decimalPlaces ?? 2,
            status: editData?.status || 'ACTIVE',
            ...(editData && { id: editData.id }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: CurrencyMasterCreateSchema | CurrencyMasterUpdateSchema) {
        if (isEditing && editData) {
            updateMutation.mutate(values as CurrencyMasterUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Currency updated successfully');
                        onClose();
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Update failed');
                },
            });
        } else {
            createMutation.mutate(values as CurrencyMasterCreateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Currency created successfully');
                        form.reset();
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
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Currency' : 'Add New Currency'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="name" className="min-w-[120px] text-sm font-medium">
                                    Currency Name <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. Dollar, Euro, Rand" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="min-w-[120px] text-sm font-medium">
                                    Currency Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. USD, EUR, ZAR" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="symbol" className="min-w-[120px] text-sm font-medium">
                                    Symbol <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="symbol"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="e.g. $, €, R" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="decimalPlaces" className="min-w-[120px] text-sm font-medium">
                                    Decimal Places <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="decimalPlaces"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        {...field}
                                                        value={field.value ?? 2}
                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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
                                                    <Select value={field.value || 'ACTIVE'} onValueChange={field.onChange}>
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

export default CurrencyMasterForm;