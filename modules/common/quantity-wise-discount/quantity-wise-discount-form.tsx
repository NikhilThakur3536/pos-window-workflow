import moment from 'moment-timezone';
import { useForm, useFieldArray } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types

import {
    QuantityWiseDiscountDetails,
    QuantityWiseDiscountCreateSchema,
    QuantityWiseDiscountUpdateSchema,
    quantityWiseDiscountCreateSchema,
    quantityWiseDiscountUpdateSchema,
    useCreateQuantityWiseDiscount,
    useUpdateQuantityWiseDiscount,
} from '@/api-queries/quantity-wise-discount';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload } from '@/utils/helpers';
import { useCreditorList } from '@/api-queries/creditor';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import SelectPopover from '@/components/select-popover';
import { CompanyCreditor } from '@/types';
import { Plus, Trash2 } from 'lucide-react';
import { useDebtorList } from '@/api-queries/debtor';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';

interface QuantityWiseDiscountFormProps {
    open: boolean;
    onClose: () => void;
    editData: QuantityWiseDiscountDetails | null;
    isGoodsDiscount?: boolean;
}

const QuantityWiseDiscountForm = ({
    open,
    editData,
    onClose,
    isGoodsDiscount = false,
}: QuantityWiseDiscountFormProps) => {
    const usersList = isGoodsDiscount ? useCreditorList({})?.data?.data?.rows : useDebtorList({})?.data?.data?.rows;
    const stockDetails = useCompanyStockDetailsList({ limit: 100, offset: 0 })?.data?.data?.rows;

    const discountLabel = isGoodsDiscount ? 'Goods' : 'Sales';
    const userLabel = isGoodsDiscount ? 'Creditor' : 'Debtor';

    const createItemData = useCreateQuantityWiseDiscount();
    const updateItemData = useUpdateQuantityWiseDiscount();

    const isEditing = !!editData;

    const form = useForm<QuantityWiseDiscountCreateSchema | QuantityWiseDiscountUpdateSchema>({
        resolver: zodResolver(
            isEditing
                ? quantityWiseDiscountUpdateSchema(isGoodsDiscount)
                : quantityWiseDiscountCreateSchema(isGoodsDiscount),
        ),
        defaultValues: {
            id: editData?.id,
            companyCreditorId: editData?.companyCreditorId || editData?.CompanyCreditor?.id || '',
            companyDebtorId: editData?.companyDebtorId || editData?.CompanyDebtor?.id || '',
            companyWarehouseId: editData?.companyWarehouseId || '',
            companyStockDetailId: editData?.companyStockDetailId || editData?.CompanyStockDetail?.id || '',
            isApplicableForCashSale: false,
            discounts: (editData?.discounts || []).map((discount) => ({
                quantity: Number(discount.quantity),
                maximumQuantity: discount.maximumQuantity != null ? Number(discount.maximumQuantity) : null,
                discountPercent: Number(discount.discountPercent),
                priority: Number(discount.priority ?? 0),
                allowStacking: discount.allowStacking ?? false,
            })),
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'discounts',
    });

    function onSubmit(values: QuantityWiseDiscountCreateSchema | QuantityWiseDiscountUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            // The update endpoint keys off the record id, which is not part of the form.
            return updateItemData.mutate(
                { ...(payload as QuantityWiseDiscountUpdateSchema), id: editData.id },
                {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Goods Discount updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Goods Discount updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as QuantityWiseDiscountCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Goods Discount created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Goods Discount creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    function onInvalid(errors: Record<string, unknown>) {
        const [fieldName, fieldError] = Object.entries(errors)[0] || [];
        toast.error(`${fieldName}: ${(fieldError as { message?: string })?.message || 'Invalid value'}`);
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    const isApplicableForCashSale = form.watch('isApplicableForCashSale');

    useEffect(() => {
        if (isApplicableForCashSale) {
            form.setValue('companyCreditorId', '');
            form.setValue('companyDebtorId', '');
        }
    }, [isApplicableForCashSale]);

    useEffect(() => {
        if (editData?.isApplicableForCashSale) {
            form.setValue('isApplicableForCashSale', editData?.isApplicableForCashSale);
        }
    }, [editData?.isApplicableForCashSale]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit' : 'Add New'} {discountLabel} Discount
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit, onInvalid)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] space-y-3 overflow-auto" onWheel={(e) => e.stopPropagation()}>
                            <div className="grid grid-cols-2 items-start gap-3">
                                {isApplicableForCashSale ? null : (
                                    <FormField
                                        control={control}
                                        name={isGoodsDiscount ? 'companyCreditorId' : 'companyDebtorId'}
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Company {userLabel} <MandatoryField />
                                                </Label>

                                                <FormControl>
                                                    {usersList && (
                                                        <SelectPopover
                                                            options={usersList.map((data: CompanyCreditor) => ({
                                                                label: `${data.name} (${data.accountNumber})`,
                                                                value: data.id,
                                                            }))}
                                                            title={userLabel}
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={control}
                                    name="companyStockDetailId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Stock <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {stockDetails && (
                                                    <SelectPopover
                                                        options={stockDetails.map((data: StockDetails) => ({
                                                            label: `${data.description} (${data?.itemCode})`,
                                                            value: data.id,
                                                        }))}
                                                        title="stock"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div>
                                <div className="col-span-2 h-[15vh] overflow-y-auto rounded-md border border-gray-200">
                                    <table className="w-full rounded-md text-xs">
                                        <thead className="rounded-md border-b bg-white">
                                            <tr>
                                                <th className="p-1 text-left font-medium text-gray-500">
                                                    Quantity from
                                                </th>
                                                <th className="p-1 text-left font-medium text-gray-500">
                                                    Quantity to
                                                </th>
                                                <th className="p-1 text-left font-medium text-gray-500">% Discount</th>
                                                <th className="p-1 text-left font-medium text-gray-500">Priority</th>
                                                <th className="p-1 text-left font-medium text-gray-500">Stack</th>
                                                <th className="p-1 text-right font-medium">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            append({
                                                                quantity: 0,
                                                                discountPercent: 0,
                                                                maximumQuantity: null,
                                                                priority: 0,
                                                                allowStacking: false,
                                                            })
                                                        }
                                                        className="h-max gap-1 p-0 text-[11px]"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Tier
                                                    </Button>
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {fields.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                                                        No tiers added yet. Click "Add Tier" to begin.
                                                    </td>
                                                </tr>
                                            ) : (
                                                fields.map((fieldItem, index) => (
                                                    <tr key={fieldItem.id} className="border-b">
                                                        <td className="p-1">
                                                            <FormField
                                                                control={control}
                                                                name={`discounts.${index}.quantity`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step={1}
                                                                                className="h-6 text-[11px]"
                                                                                {...field}
                                                                                value={field.value || ''}
                                                                                onChange={(e) =>
                                                                                    field.onChange(
                                                                                        e.target.valueAsNumber || '',
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px]" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>

                                                        <td className="p-1">
                                                            <FormField
                                                                control={control}
                                                                name={`discounts.${index}.discountPercent`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step={0.01}
                                                                                className="h-6 text-[11px]"
                                                                                {...field}
                                                                                value={field.value || ''}
                                                                                onChange={(e) =>
                                                                                    field.onChange(
                                                                                        e.target.valueAsNumber || '',
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px]" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>

                                                        <td className="p-1">
                                                            <FormField
                                                                control={control}
                                                                name={`discounts.${index}.maximumQuantity`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step={1}
                                                                                className="h-6 text-[11px]"
                                                                                {...field}
                                                                                value={field.value ?? ''}
                                                                                onChange={(e) =>
                                                                                    field.onChange(
                                                                                        e.target.valueAsNumber || null,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px]" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>

                                                        <td className="p-1">
                                                            <FormField
                                                                control={control}
                                                                name={`discounts.${index}.priority`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                type="number"
                                                                                step={1}
                                                                                className="h-6 text-[11px]"
                                                                                {...field}
                                                                                value={field.value ?? ''}
                                                                                onChange={(e) =>
                                                                                    field.onChange(
                                                                                        e.target.valueAsNumber || 0,
                                                                                    )
                                                                                }
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px]" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>

                                                        <td className="p-1 text-center">
                                                            <FormField
                                                                control={control}
                                                                name={`discounts.${index}.allowStacking`}
                                                                render={({ field }) => (
                                                                    <FormItem className="flex justify-center">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={!!field.value}
                                                                                onCheckedChange={field.onChange}
                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage className="text-[10px]" />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </td>

                                                        <td className="p-1 text-right">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => remove(index)}
                                                                className="h-6 w-6 p-0 text-red-600"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {form.formState.errors.discounts && (
                                    <p className="mt-1 text-[10px] text-red-500">
                                        {form.formState.errors.discounts.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-between gap-2 pt-2">
                            <div>
                                {isGoodsDiscount ? null : (
                                    <FormField
                                        control={control}
                                        name="isApplicableForCashSale"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <Label className="text-sm" htmlFor="isApplicableForCashSale">
                                                    Applicable for cash sale as well?
                                                </Label>
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                    {isEditing ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default QuantityWiseDiscountForm;