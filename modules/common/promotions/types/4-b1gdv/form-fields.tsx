import React from 'react';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { type Control, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PROGRESSIVE_LEVELS, PromotionCreateSchema, PromotionUpdateSchema } from '@/api-queries/promotions';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface B1GDVFormFieldsProps {
    control: Control<PromotionCreateSchema | PromotionUpdateSchema>;
    watch: UseFormWatch<PromotionCreateSchema | PromotionUpdateSchema>;
    setValue: UseFormSetValue<PromotionCreateSchema | PromotionUpdateSchema>;
}

const B1GDVFormFields = ({ control, watch, setValue }: B1GDVFormFieldsProps) => {
    const progressiveLevel = watch('progressiveLevel');
    const discountValues = watch('progressiveScale') || [];

    const addRow = () => {
        setValue('progressiveScale', [...discountValues, { quantity: 0, discountValue: 0 }]);
    };

    const removeRow = (index: number) => {
        const updated = discountValues.filter((_: any, i: number) => i !== index);
        setValue('progressiveScale', updated);
    };

    const updateRow = (index: number, field: 'quantity' | 'discountValue', value: number) => {
        const updated = [...discountValues];
        updated[index] = { ...updated[index], [field]: value };
        setValue('progressiveScale', updated);
    };

    return (
        <>
            <div>
                <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">Progressive Level: </Label>

                    <FormField
                        control={control}
                        name="progressiveLevel"
                        render={({ field }) => (
                            <FormItem className="flex-1 gap-0">
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-6 text-[11px]">
                                            <SelectValue placeholder="Select level" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {PROGRESSIVE_LEVELS?.map((data) => (
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

            {progressiveLevel === 'NONE' ? (
                <>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs font-medium">Pay for quantity :</Label>

                        <FormField
                            control={control}
                            name="totalToPay"
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
                        <Label className="text-xs font-medium">Discount Value to Receive each :</Label>

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
            ) : (
                <div className="col-span-2 h-[15vh] overflow-y-auto rounded-md border border-gray-200">
                    <table className="w-full rounded-md text-xs">
                        <thead className="rounded-md border-b bg-white">
                            <tr>
                                <th className="p-1 text-left font-medium text-gray-500">Quantity to Buy</th>
                                <th className="p-1 text-left font-medium text-gray-500">Discount Value</th>
                                <th className="p-1 text-right font-medium">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={addRow}
                                        className="h-max gap-1 p-0 text-[11px]"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Tier
                                    </Button>
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {discountValues.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-gray-500 italic">
                                        No tiers added yet. Click "Add Tier" to begin.
                                    </td>
                                </tr>
                            ) : (
                                discountValues.map((row: any, index: number) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-1">
                                            <Input
                                                type="number"
                                                step={1}
                                                className="h-6 text-[11px]"
                                                value={row.quantity || 0}
                                                onChange={(e) =>
                                                    updateRow(index, 'quantity', e.target.valueAsNumber || 0)
                                                }
                                            />
                                        </td>
                                        <td className="p-1">
                                            <Input
                                                type="number"
                                                step={0.01}
                                                className="h-6 text-[11px]"
                                                value={row.discountValue || 0}
                                                onChange={(e) =>
                                                    updateRow(index, 'discountValue', e.target.valueAsNumber || 0)
                                                }
                                            />
                                        </td>
                                        <td className="p-1 text-right">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => removeRow(index)}
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

export default B1GDVFormFields;
