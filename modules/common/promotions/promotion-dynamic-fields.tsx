import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { type Control, type Path, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { PROGRESSIVE_LEVELS, type PromotionCreateSchema, type PromotionUpdateSchema } from '@/api-queries/promotions';
import { type PromotionTypesDetails } from '@/api-queries/promotions/types';
import { useAuthUser } from '@/stores/auth-user.store';

type PromotionFormValues = PromotionCreateSchema | PromotionUpdateSchema;

type NumericFieldName =
    | 'quantityToBuy'
    | 'freeQuantity'
    | 'totalToPay'
    | 'priceToPayPerItem'
    | 'minimumSpend'
    | 'discountPercent'
    | 'discountValue'
    | 'maximumDiscount';

interface PromotionDynamicFieldsProps {
    control: Control<PromotionFormValues>;
    watch: UseFormWatch<PromotionFormValues>;
    setValue: UseFormSetValue<PromotionFormValues>;
    type?: PromotionTypesDetails | null;
    // BMF "All Items" (and a single "Any Item"): the header Quantity to buy / Total to
    // pay are derived from the item grid and shown read-only. With several "Any Item"
    // rows they are hidden (likely because each row is its own offer).
    bmfShowHeader?: boolean;
    bmfMultiAny?: boolean;
}

type ScaleRow = { quantity?: number; discountPercent?: number; discountValue?: number };
type ScaleValueKey = 'discountPercent' | 'discountValue';

// Shared numeric input block matching the existing promotion form styling.
const NumberField = ({
    control,
    name,
    label,
    readOnly,
}: {
    control: Control<PromotionFormValues>;
    name: NumericFieldName;
    label: string;
    readOnly?: boolean;
}) => (
    <div className="flex min-w-0 items-center gap-2">
        <Label className="shrink-0 text-xs font-medium">{label} :</Label>
        <FormField
            control={control}
            name={name as Path<PromotionFormValues>}
            render={({ field }) => (
                <FormItem className="min-w-0 flex-1 gap-0">
                    <FormControl>
                        <Input
                            className="h-6 w-full min-w-0 flex-1 text-[11px]"
                            type="number"
                            step={1}
                            value={field.value as number}
                            name={field.name}
                            ref={field.ref}
                            readOnly={readOnly}
                            onBlur={field.onBlur}
                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        />
                    </FormControl>
                    <FormMessage className="!text-[11px]" />
                </FormItem>
            )}
        />
    </div>
);

// Progressive level selector + tiered scale table (percent or value column depending on the flags).
const ProgressiveBlock = ({
    control,
    watch,
    setValue,
    valueKey,
}: {
    control: Control<PromotionFormValues>;
    watch: UseFormWatch<PromotionFormValues>;
    setValue: UseFormSetValue<PromotionFormValues>;
    valueKey: ScaleValueKey;
}) => {
    const progressiveLevel = watch('progressiveLevel');
    const scale = (watch('progressiveScale') as ScaleRow[] | undefined) || [];

    const persist = (rows: ScaleRow[]) =>
        setValue('progressiveScale', rows as unknown as PromotionFormValues['progressiveScale']);

    const valueLabel = valueKey === 'discountValue' ? 'Discount Value' : '% Discount';

    return (
        <>
            <div className="flex min-w-0 items-center gap-2">
                <Label className="shrink-0 text-xs font-medium">Progressive Level: </Label>
                <FormField
                    control={control}
                    name="progressiveLevel"
                    render={({ field }) => (
                        <FormItem className="min-w-0 flex-1 gap-0">
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-6 text-[11px]">
                                        <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {PROGRESSIVE_LEVELS?.map((level) => (
                                        <SelectItem key={level} value={level} className="h-6 text-[11px]">
                                            {level}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}
                />
            </div>

            {progressiveLevel !== 'NONE' && (
                <div className="col-span-2 h-[15vh] overflow-y-auto rounded-md border border-gray-200">
                    <table className="w-full rounded-md text-xs">
                        <thead className="rounded-md border-b bg-white">
                            <tr>
                                <th className="p-1 text-left font-medium text-gray-500">Quantity to Buy</th>
                                <th className="p-1 text-left font-medium text-gray-500">{valueLabel}</th>
                                <th className="p-1 text-right font-medium">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => persist([...scale, { quantity: 0, [valueKey]: 0 }])}
                                        className="h-max gap-1 p-0 text-[11px]"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Tier
                                    </Button>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {scale.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-500 italic">
                                        No tiers added yet. Click &quot;Add Tier&quot; to begin.
                                    </td>
                                </tr>
                            ) : (
                                scale.map((row, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-1">
                                            <Input
                                                type="number"
                                                step={1}
                                                className="h-6 text-[11px]"
                                                value={row.quantity || 0}
                                                onChange={(e) => {
                                                    const updated = [...scale];
                                                    updated[index] = {
                                                        ...updated[index],
                                                        quantity: e.target.valueAsNumber || 0,
                                                    };
                                                    persist(updated);
                                                }}
                                            />
                                        </td>
                                        <td className="p-1">
                                            <Input
                                                type="number"
                                                step={valueKey === 'discountValue' ? 1 : 0.01}
                                                className="h-6 text-[11px]"
                                                value={(row[valueKey] || 0) as number}
                                                onChange={(e) => {
                                                    const updated = [...scale];
                                                    updated[index] = {
                                                        ...updated[index],
                                                        [valueKey]: e.target.valueAsNumber || 0,
                                                    };
                                                    persist(updated);
                                                }}
                                            />
                                        </td>
                                        <td className="p-1 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => persist(scale.filter((_, i) => i !== index))}
                                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
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
            )}
        </>
    );
};

// SP "Price to pay each": a convenience fill-all for the per-item Promotion Price. When
// every grid row shares the same promotional price the field shows it; when the rows
// differ it shows a "Mixed" placeholder instead of a misleading value. Editing the field
// copies the price onto every row (the engine reads each row's promotionalPrice).
const SPPriceField = ({
    control,
    watch,
    setValue,
}: {
    control: Control<PromotionFormValues>;
    watch: UseFormWatch<PromotionFormValues>;
    setValue: UseFormSetValue<PromotionFormValues>;
}) => {
    const items = (watch('qualifyingItems') as { promotionalPrice?: number }[] | undefined) || [];
    const prices = items.map((item) => Number(item?.promotionalPrice) || 0);
    const mixed = prices.length > 0 && !prices.every((price) => price === prices[0]);
    // With rows present the grid is the source of truth; otherwise fall back to the
    // stored field value (e.g. before any item is added).
    const displayValue = (field?: number) => (mixed ? '' : items.length > 0 ? prices[0] : (field ?? ''));

    const handleChange = (value: number) => {
        setValue('priceToPayPerItem', value, { shouldValidate: false });
        if (items.length > 0) {
            setValue(
                'qualifyingItems',
                items.map((item) => ({ ...item, promotionalPrice: value })) as PromotionFormValues['qualifyingItems'],
                { shouldValidate: false },
            );
        }
    };

    return (
        <div className="flex min-w-0 items-center gap-2">
            <Label className="shrink-0 text-xs font-medium">Price to pay each :</Label>
            <FormField
                control={control}
                name="priceToPayPerItem"
                render={({ field }) => (
                    <FormItem className="min-w-0 flex-1 gap-0">
                        <FormControl>
                            <Input
                                className="h-6 w-full min-w-0 flex-1 text-[11px]"
                                type="number"
                                step={1}
                                placeholder={mixed ? 'Mixed' : undefined}
                                value={displayValue(field.value as number)}
                                name={field.name}
                                ref={field.ref}
                                onBlur={field.onBlur}
                                onChange={(e) => handleChange(e.target.valueAsNumber || 0)}
                            />
                        </FormControl>
                        <FormMessage className="!text-[11px]" />
                    </FormItem>
                )}
            />
        </div>
    );
};

// Renders only the field blocks whose requirement flag is true on the selected promotion type.
const PromotionDynamicFields = ({
    control,
    watch,
    setValue,
    type,
    bmfShowHeader = false,
    bmfMultiAny = false,
}: PromotionDynamicFieldsProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    if (!type) return null;

    return (
        <>
            {type.code === 'BMF'
                ? bmfShowHeader && (
                      // BMF (All Items / single Any): header Quantity to buy is the sum of
                      // the grid quantities, shown read-only.
                      <NumberField control={control} name="quantityToBuy" label="Quantity to buy" readOnly />
                  )
                : type.requiresQuantityToBuy && (
                      <NumberField
                          control={control}
                          name="quantityToBuy"
                          label={type.code === 'BIAGDPB' ? 'Full-price quantity' : 'Quantity to buy'}
                      />
                  )}
            {type.requiresFreeQuantity && <NumberField control={control} name="freeQuantity" label="Free quantity" />}
            {type.requiresDiscountPercent && (
                <NumberField
                    control={control}
                    name="discountPercent"
                    label={type.code === 'BIAGDPB' ? 'Discount % (cheaper item)' : '% Discount'}
                />
            )}
            {type.code === 'BIAGDPB' && (
                <div className="col-span-3 text-[11px] text-gray-600">
                    Full-price quantity counts only the items paid in full. For buy 2, get 50% off the
                    cheaper item, enter 1 and 50: one full-price item plus one item at 50%.
                </div>
            )}
            {type.requiresDiscountValue && (
                <NumberField control={control} name="discountValue" label="Discount value" />
            )}
            {(type.requiresMaximumDiscount || type.code === 'BIAGDPT') && (
                <NumberField control={control} name="maximumDiscount" label="Maximum discount" />
            )}
            {type.code === 'BMF'
                ? bmfShowHeader && (
                      // BMF (All Items / single Any): Total to pay is derived from the
                      // qualifying items (sum of quantity x promotionalPrice), so it is
                      // read-only. With several Any Item rows there is no common total.
                      <NumberField control={control} name="totalToPay" label="Total to pay" readOnly />
                  )
                : type.requiresTotalToPay && <NumberField control={control} name="totalToPay" label="Total to pay" />}
            {type.requiresMinimumSpend && <NumberField control={control} name="minimumSpend" label="Minimum spend" />}
            {type.requiresPromotionalPrice &&
                type.code !== 'BMF' &&
                (type.code === 'SP' ? (
                    // SP: fill-all for the per-row Promotion Price.
                    <SPPriceField control={control} watch={watch} setValue={setValue} />
                ) : (
                    <NumberField control={control} name="priceToPayPerItem" label="Price to pay each" />
                ))}
            {type.requiresProgressiveLevel && (
                <ProgressiveBlock
                    control={control}
                    watch={watch}
                    setValue={setValue}
                    valueKey={type.requiresDiscountValue ? 'discountValue' : 'discountPercent'}
                />
            )}
            {type.code === 'BIAGDVT' && (
                <div className="col-span-3 text-[11px] text-gray-600">
                    Buy {Number(watch('quantityToBuy')) || 0} and get {currencySymbol}{' '}
                    {Number(watch('discountValue')) || 0} off the eligible total.
                </div>
            )}
            {bmfMultiAny && (
                <div className="col-span-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-800">
                    Each item has its own offer. Add a single item, or switch to &quot;All Items&quot; to combine them.
                </div>
            )}
        </>
    );
};

export default PromotionDynamicFields;
