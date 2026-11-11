import React from 'react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type Control } from 'react-hook-form';
import { PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';

interface FormFieldsProps {
    control: Control<PromotionCreateSchema | PromotionUpdateSchema>;
}

const BGGDVGIFormFields = ({ control }: FormFieldsProps) => {
    return (
        <>
            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Discount Value to Receive on group :</Label>

                <FormField
                    control={control}
                    name="discountValue"
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

export default BGGDVGIFormFields;
