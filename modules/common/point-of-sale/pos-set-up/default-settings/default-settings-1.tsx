import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Controller } from 'react-hook-form';
import { SettingFormValues } from '.';
import type { UseFormRegister, Control } from 'react-hook-form';

interface DefaultSettings1Props {
    register: UseFormRegister<SettingFormValues>;
    control: Control<SettingFormValues>;
}

const saleOptionsCheckboxes = [
    { id: 'live-updating-sales', name: 'liveUpdatingSales', label: 'Live Updating of Sales' },
    { id: 'show-all-selling-prices', name: 'showAllSellingPrices', label: 'Show All Selling Prices in POS' },
    { id: 'allow-switching-printer', name: 'allowSwitchingPrinter', label: 'Allow switching ON / OFF POS Printer' },
    {
        id: 'disable-promotional-pricing',
        name: 'disablePromotionalPricing',
        label: 'Disable Promotional Pricing for Laybyes',
    },
    { id: 'allow-line-comments', name: 'allowLineComments', label: 'Allow Line Comments' },
    { id: 'enable-return-reason', name: 'enableReturnReason', label: 'Enable Return Reason in POS' },
    { id: 'use-pos-slip-layout', name: 'usePosSlipLayout', label: 'Use POS Slip Layout Exclusive of Tax' },
    { id: 'line-by-line-return-reasons', name: 'lineByLineReturnReasons', label: 'Line By Line Return Reasons' },
    {
        id: 'enter-quantity-before-code',
        name: 'enterQuantityBeforeCode',
        label: 'Enter Quantity before Code',
        defaultChecked: true,
    },
    { id: 'strict-document-search', name: 'strictDocumentSearch', label: 'Strict Document Search' },
    {
        id: 'ask-negative-stock-overrides',
        name: 'askNegativeStockOverrides',
        label: 'Ask for Negative Stock Security Overrides',
    },
    { id: 'group-items-on-price-code', name: 'groupItemsOnPriceCode', label: 'Group Items on Price and Code' },
    {
        id: 'ask-negative-total-overrides',
        name: 'askNegativeTotalOverrides',
        label: 'Ask for Negative Total Security Overrides',
    },
    {
        id: 'automatically-log-off-supervisor',
        name: 'automaticallyLogOffSupervisor',
        label: 'Automatically Log Off Supervisor After Sale',
    },
    { id: 'warn-cashier-on-hand-amount', name: 'warnCashierOnHandAmount', label: 'Warn Cashier of On Hand Amount' },
    {
        id: 'ask-cash-account-before-sale',
        name: 'askCashAccountBeforeSale',
        label: 'Ask for Cash/Account before Starting Sale',
    },
    { id: 'enable-auto-manufacturing', name: 'enableAutoManufacturing', label: 'Enable Auto Manufacturing at EOD' },
    {
        id: 'ask-original-document',
        name: 'askOriginalDocument',
        label: 'Ask for Original Document (Cash Refund)',
        defaultChecked: true,
    },
    {
        id: 'no-initial-focus-tender-screen',
        name: 'noInitialFocusTenderScreen',
        label: 'No Initial Focus on Tender Screen',
    },
    { id: 'auto-restrict-access', name: 'autoRestrictAccess', label: 'Auto-Restrict Access After Cashup' },
    {
        id: 'disallow-loyalty-validation',
        name: 'disallowLoyaltyValidation',
        label: 'Disallow Loyalty Validation Offline',
    },
    { id: 'display-cashier-name', name: 'displayCashierName', label: 'Display Cashier Name During Sale' },
    { id: 'strict-debtor-search', name: 'strictDebtorSearch', label: 'Strict Debtor Search' },
    { id: 'print-voided-sales', name: 'printVoidedSales', label: 'Print Voided Sales' },
    { id: 'post-cod-debtor-audit-trail', name: 'postCodDebtorAuditTrail', label: 'Post COD Debtor Audit Trail' },
    { id: 'print-suspended-sales', name: 'printSuspendedSales', label: 'Print Suspended Sales' },
    { id: 'skip-saturdays', name: 'skipSaturdays', label: 'Skip Saturdays as a Trading Date' },
    { id: 'skip-sundays', name: 'skipSundays', label: 'Skip Sundays as a Trading Date' },
    { id: 'allow-changing-tax-rate', name: 'allowChangingTaxRate', label: 'Allow Changing of Line Item Tax Rate' },
];

const DefaultSettings1 = ({ register, control }: DefaultSettings1Props) => {
    return (
        <div className="grid gap-6">
            <Card className="gap-0 overflow-hidden pt-0 !pb-3">
                <CardHeader className="mb-3 gap-0 border-b bg-white !py-2">
                    <CardTitle>Sale Options</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 space-y-2">
                        <Label htmlFor="store-sales" className="text-sm">
                            Store individual sales for
                        </Label>

                        <div className="flex items-center gap-2">
                            <Input
                                id="store-sales"
                                type="number"
                                {...register('storeSalesDays', { valueAsNumber: true })}
                                className="w-24 bg-white text-sm"
                            />
                            <span className="text-sm">Days</span>
                        </div>

                        <Label htmlFor="max-transaction-value" className="text-sm">
                            Maximum Transaction Value
                        </Label>

                        <Input
                            id="max-transaction-value"
                            type="number"
                            step="0.01"
                            {...register('maxTransactionValue', { valueAsNumber: true })}
                            className="w-24 bg-white text-sm"
                        />

                        <Label htmlFor="minutes-pos-monitor" className="text-sm">
                            Minutes POS Monitor stays Active
                        </Label>

                        <Input
                            id="minutes-pos-monitor"
                            type="number"
                            {...register('minutesPosMonitorActive', { valueAsNumber: true })}
                            className="w-24 bg-white text-sm"
                        />

                        <Label htmlFor="allow-preview-saved-orders" className="text-sm">
                            Allow Preview Of Saved Sales Orders
                        </Label>

                        <Controller
                            control={control}
                            name="allowPreviewSavedOrders"
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger
                                        id="allow-preview-saved-orders"
                                        className="h-8 w-24 bg-white text-sm"
                                    >
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="no">No</SelectItem>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="prompt">Prompt</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {saleOptionsCheckboxes.map((checkbox) => (
                            <div key={checkbox.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={checkbox.id}
                                    {...register(checkbox.name as keyof SettingFormValues)}
                                    defaultChecked={checkbox.defaultChecked}
                                    className="bg-white"
                                />
                                <Label htmlFor={checkbox.id} className="text-sm">
                                    {checkbox.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DefaultSettings1;
