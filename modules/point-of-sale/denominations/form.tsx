import { useForm, type Resolver } from 'react-hook-form';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthUser } from '@/stores/auth-user.store';

import {
    DenominationDetails,
    DenominationCreateSchema,
    DenominationUpdateSchema,
    DenominationType,
    denominationCreateSchema,
    denominationUpdateSchema,
    useCreateDenomination,
    useUpdateDenomination,
} from '@/api-queries/till-management/denominations';
import { useGetCurrencies } from '@/api-queries/currency';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';

interface DenominationFormProps {
    open: boolean;
    onClose: () => void;
    editData: DenominationDetails | null;
}

const DenominationForm = ({ open, editData, onClose }: DenominationFormProps) => {
    const createItemData = useCreateDenomination();
    const updateItemData = useUpdateDenomination();
    const currencyCode = useAuthUser((state) => state.currency?.code) || '';

    const isEditing = !!editData;

    type DenominationFormValues = {
        label: string;
        value: number;
        conversionValue: number;
        currencyId: string;
        type?: DenominationType;
        id?: string;
    };

    const { data: currenciesData } = useGetCurrencies({ limit: 100, offset: 0 });
    const currencies = currenciesData?.data?.rows || [];

    const form = useForm<DenominationFormValues>({
        resolver: zodResolver(isEditing ? denominationUpdateSchema : denominationCreateSchema) as Resolver<DenominationFormValues>,
        defaultValues: {
            label: editData?.label || '',
            value: editData?.value !== undefined && editData?.value !== null ? Number(editData.value) : undefined,
            conversionValue: editData?.conversionValue ? Number(editData.conversionValue) : undefined,
            currencyId: editData?.currencyId || '',
            type: editData?.type || 'NOTE',
            ...(editData ? { id: editData.id } : {}),
        },
    });

    const { handleSubmit, control } = form;

    useEffect(() => {
        if (!isEditing && !form.getValues('currencyId') && currencies.length) {
            const match = currencies.find((c) => c.code === currencyCode);
            form.setValue('currencyId', match?.id || currencies[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currencies]);

    function onSubmit(values: DenominationFormValues) {
        if (editData) {
            if (!editData.id) return toast.error('Denomination ID is required');

            return updateItemData.mutate(values as DenominationUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Denomination updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Denomination updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(values as DenominationCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Denomination created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Denomination creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
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
                    <DialogTitle>{isEditing ? 'Edit Denomination' : 'Add New Denomination'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            <div className="flex items-start gap-4">
                                <Label htmlFor="label" className="min-w-[120px] text-sm font-medium">
                                    Label <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="label"
                                        render={({ field }) => (
                                            <FormItem>
                                    <FormControl>
                                        <Input placeholder="Enter label e.g. R100" {...field} />
                                    </FormControl>
                                    <FormMessage className="!-mt-1 !text-xs" />
                                </FormItem>
                            )}
                        />
                        <FormMessage />
                    </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="value" className="min-w-[120px] text-sm font-medium">
                                    Value <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                <FormField
                                    control={control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step="0.01"
                                                    placeholder="e.g. 5"
                                                    value={field.value ?? ''}
                                                    onChange={(e) =>
                                                        field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="conversionValue" className="min-w-[120px] text-sm font-medium">
                                    Conversion Value <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                <FormField
                                    control={control}
                                    name="conversionValue"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    step="0.01"
                                                    placeholder="e.g. 5"
                                                    value={field.value ?? ''}
                                                    onChange={(e) =>
                                                        field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                                                    }
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormMessage />
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <Label htmlFor="currencyId" className="mt-2 min-w-[120px] text-sm font-medium">
                                Currency <MandatoryField />
                            </Label>
                            <div className="flex-1">
                                <FormField
                                    control={control}
                                    name="currencyId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a currency" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {currencies.map((currency) => (
                                                            <SelectItem key={currency.id} value={currency.id}>
                                                                {currency.name} ({currency.code} {currency.symbol})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="type" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Type <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Select value={field.value || 'NOTE'} onValueChange={field.onChange}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="NOTE">Note</SelectItem>
                                                            <SelectItem value="COIN">Coin</SelectItem>
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
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update Denomination' : 'Create Denomination'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default DenominationForm;
