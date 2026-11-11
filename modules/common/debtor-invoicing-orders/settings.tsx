'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useDebtorList, useUpdateDebtorAccountSaleSettingsFn } from '@/api-queries/debtor';
import { CompanyCreditor } from '@/types';

const DEFAULT_ACCOUNT_SALE_SETTINGS = {
    accountSaleQuantityControlEnabled: false,
    accountSaleSalesLookbackDays: 30,
    accountSaleTargetStockDays: 21,
    accountSaleSeasonalUpliftPercent: 25,
    accountSaleSeasonStartMonth: 1,
    accountSaleSeasonEndMonth: 12,
};

const accountSaleSettingsSchema = z.object({
    enabled: z.boolean(),
    accountSaleSalesLookbackDays: z
        .number()
        .min(1, 'Lookback days must be between 1 and 365')
        .max(365, 'Lookback days must be between 1 and 365'),
    accountSaleTargetStockDays: z
        .number()
        .min(12, 'Target stock days must be between 12 and 21')
        .max(21, 'Target stock days must be between 12 and 21'),
    accountSaleSeasonalUpliftPercent: z
        .number()
        .min(25, 'Seasonal uplift must be between 25% and 40%')
        .max(40, 'Seasonal uplift must be between 25% and 40%'),
    accountSaleSeasonStartMonth: z
        .number()
        .min(1, 'Month must be between 1 and 12')
        .max(12, 'Month must be between 1 and 12'),
    accountSaleSeasonEndMonth: z
        .number()
        .min(1, 'Month must be between 1 and 12')
        .max(12, 'Month must be between 1 and 12'),
});

type AccountSaleSettingsFormValues = z.infer<typeof accountSaleSettingsSchema>;

const defaultValues: AccountSaleSettingsFormValues = {
    enabled: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleQuantityControlEnabled,
    accountSaleSalesLookbackDays: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleSalesLookbackDays,
    accountSaleTargetStockDays: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleTargetStockDays,
    accountSaleSeasonalUpliftPercent: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleSeasonalUpliftPercent,
    accountSaleSeasonStartMonth: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleSeasonStartMonth,
    accountSaleSeasonEndMonth: DEFAULT_ACCOUNT_SALE_SETTINGS.accountSaleSeasonEndMonth,
};

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

const AccountSaleSettings = () => {
    const [selectedDebtorId, setSelectedDebtorId] = useState<string>('');

    const { data: debtorData, isLoading: isLoadingDebtors } = useDebtorList({
        limit: 100,
        offset: 0,
        companyDebtorType: 'COMPANY_OWNED',
    });

    const { mutate: updateSettings, isPending: isSaving } = useUpdateDebtorAccountSaleSettingsFn();

    const companyOwnedDebtors = useMemo(() => debtorData?.data?.rows || [], [debtorData]);

    const selectedDebtor = useMemo<CompanyCreditor | undefined>(
        () => companyOwnedDebtors.find((debtor) => debtor.id === selectedDebtorId),
        [companyOwnedDebtors, selectedDebtorId],
    );

    const form = useForm<AccountSaleSettingsFormValues>({
        resolver: zodResolver(accountSaleSettingsSchema),
        defaultValues,
    });

    const { reset, watch } = form;
    const enabled = watch('enabled');

    useEffect(() => {
        if (!selectedDebtor) {
            reset(defaultValues);
            return;
        }

        const settings = selectedDebtor.settings;
        reset({
            enabled: settings?.accountSaleQuantityControlEnabled ?? false,
            accountSaleSalesLookbackDays: settings?.accountSaleSalesLookbackDays ?? 30,
            accountSaleTargetStockDays: settings?.accountSaleTargetStockDays ?? 21,
            accountSaleSeasonalUpliftPercent: settings?.accountSaleSeasonalUpliftPercent ?? 25,
            accountSaleSeasonStartMonth: settings?.accountSaleSeasonStartMonth ?? 1,
            accountSaleSeasonEndMonth: settings?.accountSaleSeasonEndMonth ?? 12,
        });
    }, [selectedDebtor, reset]);

    const onSubmit = (values: AccountSaleSettingsFormValues) => {
        if (!selectedDebtorId) {
            toast.error('Please select a company owned store first');
            return;
        }

        updateSettings(
            {
                debtorId: selectedDebtorId,
                settings: {
                    accountSaleQuantityControlEnabled: values.enabled,
                    accountSaleSalesLookbackDays: values.accountSaleSalesLookbackDays,
                    accountSaleTargetStockDays: values.accountSaleTargetStockDays,
                    accountSaleSeasonalUpliftPercent: values.accountSaleSeasonalUpliftPercent,
                    accountSaleSeasonStartMonth: values.accountSaleSeasonStartMonth,
                    accountSaleSeasonEndMonth: values.accountSaleSeasonEndMonth,
                },
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Store settings updated successfully');
                    } else {
                        toast.error(data?.message || 'Failed to update store settings');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    if (isLoadingDebtors) {
        return <PageLoader isLoading={isLoadingDebtors} />;
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Store Quantity Control Settings</CardTitle>
                    <CardDescription>
                        Configure account sale quantity recommendations for company owned stores (rule 3006). These
                        settings drive the recommended quantities returned when creating a debtor invoicing order.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Company Owned Store</Label>
                        <Select value={selectedDebtorId} onValueChange={setSelectedDebtorId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a company owned store" />
                            </SelectTrigger>
                            <SelectContent>
                                {companyOwnedDebtors.map((debtor) => (
                                    <SelectItem key={debtor.id} value={debtor.id}>
                                        {debtor.name} ({debtor.accountNumber})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                            <FormField
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <FormItem className="flex items-start justify-between gap-4 rounded-md border p-4">
                                        <div className="space-y-1">
                                            <FormLabel>Enable Quantity Control</FormLabel>
                                            <p className="text-sm text-muted-foreground">
                                                Validate and recommend order quantities based on the store&apos;s sales
                                                rate, seasonal uplift and target stock days.
                                            </p>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="accountSaleSalesLookbackDays"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel>Sales Lookback (days)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={365}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                    disabled={!enabled}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="accountSaleTargetStockDays"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel>Target Stock (days)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={12}
                                                    max={21}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                    disabled={!enabled}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="accountSaleSeasonalUpliftPercent"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel>Seasonal Uplift (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={25}
                                                    max={40}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                                                    disabled={!enabled}
                                                />
                                            </FormControl>
                                            <FormMessage className="!-mt-1 !text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="accountSaleSeasonStartMonth"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel>Season Start Month</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={String(field.value)}
                                                    onValueChange={(value) => field.onChange(Number(value))}
                                                    disabled={!enabled}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select month" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MONTHS.map((month) => (
                                                            <SelectItem key={month.value} value={month.value}>
                                                                {month.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="accountSaleSeasonEndMonth"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel>Season End Month</FormLabel>
                                            <FormControl>
                                                <Select
                                                    value={String(field.value)}
                                                    onValueChange={(value) => field.onChange(Number(value))}
                                                    disabled={!enabled}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Select month" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {MONTHS.map((month) => (
                                                            <SelectItem key={month.value} value={month.value}>
                                                                {month.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Settings'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default AccountSaleSettings;