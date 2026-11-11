import React from 'react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Control } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';

interface FormFieldsProps {
    control: Control<PromotionCreateSchema | PromotionUpdateSchema>;
}

const B1G1FormFields = ({ control }: FormFieldsProps) => {
    return (
        <>
            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Pay for quantity :</Label>

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
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                />
                            </FormControl>
                            <FormMessage className="!text-[11px]" />
                        </FormItem>
                    )}
                />
            </div>

            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Free Quantity :</Label>

                <FormField
                    control={control}
                    name="freeQuantity"
                    render={({ field }) => (
                        <FormItem className="flex-1 gap-0">
                            <FormControl>
                                <Input
                                    className="h-6 flex-1 text-[11px]"
                                    type="number"
                                    step={1}
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                />
                            </FormControl>
                            <FormMessage className="!text-[11px]" />
                        </FormItem>
                    )}
                />
            </div>
        </>
    );
};

export default B1G1FormFields;
