import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingFormValues } from '.';
import { Controller } from 'react-hook-form';
import type { UseFormRegister, Control } from 'react-hook-form';

interface DefaultSettings2Props {
    register: UseFormRegister<SettingFormValues>;
    control: Control<SettingFormValues>;
}

const saleRepOptionsCheckboxes = [
    {
        id: 'ask-for-sales-rep',
        name: 'askForSalesRep',
        label: 'Ask For Sales Rep',
    },
    {
        id: 'post-cashier-number',
        name: 'postCashierNumber',
        label: 'Post Cashier Number as Rep Number',
    },
    {
        id: 'remember-last-rep',
        name: 'rememberLastRep',
        label: 'Remember Last Rep Used',
    },
    {
        id: 'use-debtor-rep',
        name: 'useDebtorRep',
        label: 'Use Debtor Rep',
    },
];

const DefaultSettings2 = ({ register, control }: DefaultSettings2Props) => {
    return (
        <div className="grid gap-6">
            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Point of Sale - Credit Purchases</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="ask-for-order-number" {...register('askForOrderNumber')} className="bg-white" />
                        <Label htmlFor="ask-for-order-number" className="text-sm">
                            Ask for Order Number
                        </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="ask-only-debtor-accounts"
                            {...register('askOnlyDebtorAccounts')}
                            className="bg-white"
                        />
                        <Label htmlFor="ask-only-debtor-accounts" className="text-sm">
                            Ask only for Debtor Accounts where Order Number is Required
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle className="flex items-center justify-between">
                        Cash Sale - Message Before Tenders{' '}
                        <div className="flex items-center space-x-2">
                            <Checkbox id="enable-cash-sale-message" {...register('enableCashSaleMessage')} />
                            <Label htmlFor="enable-cash-sale-message" className="text-sm">
                                Enable
                            </Label>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Textarea
                        placeholder="Enter message here..."
                        {...register('cashSaleMessage')}
                        className="min-h-[80px] bg-white p-2 text-sm"
                    />
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Sales Rep Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {saleRepOptionsCheckboxes.map(({ id, name, label }) => (
                        <div key={id} className="flex items-center space-x-2">
                            <Checkbox id={id} {...register(name as keyof SettingFormValues)} className="bg-white" />
                            <Label htmlFor={id} className="text-sm">
                                {label}
                            </Label>
                        </div>
                    ))}

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Label htmlFor="default-sales-rep" className="text-sm">
                                Default Sales Rep
                            </Label>

                            <Controller
                                control={control}
                                name="defaultSalesRep"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="default-sales-rep" className="h-8 w-40 bg-white text-sm">
                                            <SelectValue placeholder="Select Default Rep" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="default">Akash Sharma</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Label htmlFor="auto-lock-terminal" className="w-max text-sm">
                                Auto Lock terminal after X Seconds (0 = disabled)
                            </Label>

                            <Input
                                id="auto-lock-terminal"
                                type="number"
                                {...register('autoLockTerminal', { valueAsNumber: true })}
                                className="w-20 text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Duty Free Store Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="duty-free" {...register('dutyFree')} className="bg-white" />
                        <Label htmlFor="duty-free" className="text-sm">
                            Duty Free
                        </Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DefaultSettings2;
