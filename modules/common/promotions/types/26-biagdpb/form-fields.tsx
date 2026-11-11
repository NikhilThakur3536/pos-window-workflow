import React from 'react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Control } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';

interface BIAGDPBFormFieldsProps {
    control: Control<PromotionCreateSchema | PromotionUpdateSchema>;
}

const BIAGDPBFormFields = ({ control }: BIAGDPBFormFieldsProps) => {
    return (
        <>
            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Full-Price Quantity (X) :</Label>

                <FormField
                    control={control}
                    name="quantityToBuy"
                    render={({ field }) => (
                        <FormItem className="flex-1 gap-0">
                            <FormControl>
                                <Input
                                    className="h-6 text-[11px]"
                                    type="number"
                                    step={1}
                                    min={1}
                                    max={999}
                                    {...field}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        field.onChange(Number.isInteger(value) && value > 0 ? value : 1);
                                    }}
                                />
                            </FormControl>
                            <FormMessage className="!text-[11px]" />
                        </FormItem>
                    )}
                />
                <FormMessage className="!text-[11px] text-amber-700">
                    Enter a whole number greater than 0. This counts full-price items only: 1 means one
                    full-price item plus one discounted item (buy 2, get 50% off the cheaper item).
                </FormMessage>
            </div>

            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Discount % (Cheaper Item) :</Label>

                <FormField
                    control={control}
                    name="discountPercent"
                    render={({ field }) => (
                        <FormItem className="flex-1 gap-0">
                            <FormControl>
                                <Input
                                    className="h-6 text-[11px]"
                                    type="number"
                                    step={1}
                                    min={1}
                                    max={100}
                                    {...field}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        field.onChange(Number.isInteger(value) && value >= 1 && value <= 100 ? value : 10);
                                    }}
                                />
                            </FormControl>
                            <FormMessage className="!text-[11px]" />
                        </FormItem>
                    )}
                />
                <FormMessage className="!text-[11px] text-amber-700">
                    Enter a percentage from 1% to 100% (e.g., 50 for 50% off the cheaper item)
                </FormMessage>
            </div>
        </>
    );
};

export default BIAGDPBFormFields;