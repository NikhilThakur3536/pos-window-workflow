import React from 'react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { type Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PromotionCreateSchema, PromotionUpdateSchema, REOCCURENCE_TYPES } from '@/api-queries/promotions';

interface BAFRVFormFieldsProps {
    control: Control<PromotionCreateSchema | PromotionUpdateSchema>;
}

const BAFRVFormFields = ({ control }: BAFRVFormFieldsProps) => {
    return (
        <>
            <div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">Reoccurence: </Label>

                    <FormField
                        control={control}
                        name="reoccurence"
                        render={({ field }) => (
                            <FormItem className="flex-1 gap-0">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-6 text-[11px]">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {REOCCURENCE_TYPES?.map((data) => (
                                            <SelectItem key={data} value={data} className="h-6 text-[11px]">
                                                {data}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Label className="text-xs font-medium">Quantity to buy :</Label>

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
                <Label className="text-xs font-medium">Total To Pay for items</Label>

                <FormField
                    control={control}
                    name="totalToPay"
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

export default BAFRVFormFields;
