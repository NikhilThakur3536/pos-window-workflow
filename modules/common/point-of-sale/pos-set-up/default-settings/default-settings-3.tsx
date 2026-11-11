import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { SettingFormValues } from '.';
import type { UseFormRegister, Control } from 'react-hook-form';

interface DefaultSettings3Props {
    register: UseFormRegister<SettingFormValues>;
    control: Control<SettingFormValues>;
}

const DefaultSettings3 = ({ register, control }: DefaultSettings3Props) => {
    return (
        <div className="grid gap-6">
            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>POS Custom Fields</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <Button className="w-fit">Configure POS Custom Fields</Button>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="enforce-custom-fields"
                            {...register('enforceCustomFields')}
                            className="bg-white"
                        />
                        <Label htmlFor="enforce-custom-fields" className="text-sm">
                            Enforce Custom Fields On Sales
                        </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="pos-transaction-display-total-breakdown"
                            {...register('posTransactionDisplayTotalBreakdown')}
                            className="bg-white"
                        />
                        <Label htmlFor="pos-transaction-display-total-breakdown" className="text-sm">
                            POS Transaction Display Total Breakdown
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>EFT Slip Printing Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <Label htmlFor="eft-customer-copy" className="text-sm">
                            EFT Slip Customer Copy
                        </Label>
                        <Controller
                            control={control}
                            name="eftCustomerCopy"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="eft-customer-copy" className="h-8 w-[150px] bg-white text-sm">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="always-print">Always print</SelectItem>
                                        <SelectItem value="prompt-user">Prompt user</SelectItem>
                                        <SelectItem value="promt-user-if-declined">
                                            Prompt user only if declined, otherwise print
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-2">
                        <Label htmlFor="eft-merchant-copy" className="text-sm">
                            EFT Slip Merchant Copy
                        </Label>
                        <Controller
                            control={control}
                            name="eftMerchantCopy"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger id="eft-merchant-copy" className="h-8 w-[150px] bg-white text-sm">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="always-print">Always print</SelectItem>
                                        <SelectItem value="never-print">Never print</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Slip Communication Options</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="enable-print-email-prompt"
                            {...register('enablePrintEmailPrompt')}
                            className="bg-white"
                        />
                        <Label htmlFor="enable-print-email-prompt" className="text-sm">
                            Enable &apos;Print vs Email Prompt&apos; (For Cash Customers only ***)
                        </Label>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {`*** Does not apply to sales linked to a customer account (via F5) and/or loyalty account (via F9) as said accounts adhere to auto emailing rules.`}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
};

export default DefaultSettings3;
