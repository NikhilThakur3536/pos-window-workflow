import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { SettingFormValues } from '.';
import type { UseFormRegister, Control } from 'react-hook-form';

interface DefaultSettings4Props {
    register: UseFormRegister<SettingFormValues>;
    control: Control<SettingFormValues>;
}

const termsOptions = [
    { id: 'term-1', label: '1', name: 'term1' },
    { id: 'term-2', label: '2', name: 'term2' },
    { id: 'term-3', label: '3', name: 'term3' },
];

const DefaultSettings4 = ({ register, control }: DefaultSettings4Props) => {
    return (
        <div className="grid gap-6">
            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Till Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="min-laybye-deposit" className="text-sm">
                            Minimum Laybye Deposit Percentage
                        </Label>
                        <Input
                            id="min-laybye-deposit"
                            type="number"
                            step="0.01"
                            {...register('minLaybyeDeposit', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="max-variance-sellprice" className="text-sm">
                            Maximum Variance Percentage on Sellprice
                        </Label>
                        <Input
                            id="max-variance-sellprice"
                            type="number"
                            step="0.01"
                            {...register('maxVarianceSellprice', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="months-allowed-laybyes" className="text-sm">
                            Number of months allowed on Laybyes
                        </Label>
                        <Input
                            id="months-allowed-laybyes"
                            type="number"
                            {...register('monthsAllowedLaybyes', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                        <Label htmlFor="selectable-terms" className="text-sm">
                            Selectable Terms / Months
                        </Label>

                        <div className="grid w-38 gap-2 bg-white p-2">
                            {termsOptions.map((term) => (
                                <div key={term.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={term.id}
                                        {...register(term.name as keyof SettingFormValues)}
                                        className="bg-white"
                                    />
                                    <Label htmlFor={term.id} className="text-sm">
                                        {term.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="number-of-terminals" className="text-sm">
                            Number of Terminals
                        </Label>
                        <Input
                            id="number-of-terminals"
                            type="number"
                            {...register('numberOfTerminals', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="max-line-discount" className="text-sm">
                            Maximum Line Discount
                        </Label>
                        <Input
                            id="max-line-discount"
                            type="number"
                            step="0.01"
                            {...register('maxLineDiscount', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="quantity-decimals" className="text-sm">
                            Quantity Decimals
                        </Label>
                        <Input
                            id="quantity-decimals"
                            type="number"
                            {...register('quantityDecimals', { valueAsNumber: true })}
                            className="w-36 text-sm"
                        />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="default-selling-price" className="text-sm">
                            Default Selling Price
                        </Label>
                        <Controller
                            control={control}
                            name="defaultSellingPrice"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="default-selling-price" className="h-8 w-38 bg-white text-sm">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retail-price">Retail Price</SelectItem>
                                        <SelectItem value="wholesale-price">Wholesale Price</SelectItem>
                                        <SelectItem value="alternative-price-1">Alternative Price 1</SelectItem>
                                        <SelectItem value="alternative-price-2">Alternative Price 2</SelectItem>
                                        <SelectItem value="alternative-price-3">Alternative Price 3</SelectItem>
                                        <SelectItem value="alternative-price-4">Alternative Price 4</SelectItem>
                                        <SelectItem value="alternative-price-5">Alternative Price 5</SelectItem>
                                        <SelectItem value="alternative-price-6">Alternative Price 6</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DefaultSettings4;
