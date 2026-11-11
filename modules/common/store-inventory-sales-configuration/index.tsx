'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebtorList } from '@/api-queries/debtor';
import {
    useSaveStoreInventorySalesConfiguration,
    storeInventorySalesConfigurationSchema,
    STORE_ORDER_MODES,
    STORE_INVENTORY_POSTING_TRIGGERS,
    STORE_INVOICE_CREATION_MODES,
    DEFAULT_STORE_INVENTORY_POSTING_TRIGGER,
    type StoreInventorySalesConfigurationInput,
} from '@/api-queries/store-inventory-sales-configuration';

const TRIGGER_LABEL: Record<string, string> = {
    ACCOUNT_SALE: 'Account Sale',
    DELIVERY_CONFIRMATION: 'Delivery Confirmation',
};

const ORDER_MODE_LABEL: Record<string, string> = {
    MANUAL: 'Manual',
    AUTOMATED_RECOMMENDATION: 'Automated Recommendation',
    HYBRID: 'Hybrid',
};

const DEFAULTS: StoreInventorySalesConfigurationInput = {
    companyDebtorId: '',
    orderMode: 'MANUAL',
    salesLookbackDays: 30,
    targetStockDays: 7,
    safetyStockDays: 2,
    seasonalUpliftPercent: 0,
    inventoryPostingTrigger: DEFAULT_STORE_INVENTORY_POSTING_TRIGGER,
    invoiceCreationMode: 'MANUAL_DC_CASHIER',
    status: 'ACTIVE',
};

const NUMERIC_FIELDS: Array<{
    name: 'salesLookbackDays' | 'targetStockDays' | 'safetyStockDays' | 'seasonalUpliftPercent';
    label: string;
    hint: string;
    step?: string;
}> = [
    { name: 'salesLookbackDays', label: 'Sales Lookback (days)', hint: 'Days of sales history used for recommendations' },
    { name: 'targetStockDays', label: 'Target Stock (days)', hint: 'Days of stock cover to hold on hand' },
    { name: 'safetyStockDays', label: 'Safety Stock (days)', hint: 'Extra buffer above the target cover' },
    {
        name: 'seasonalUpliftPercent',
        label: 'Seasonal Uplift (%)',
        hint: 'Seasonal increase applied to the target cover',
        step: '0.01',
    },
];

// Store Inventory & Sales Configuration is saved per store. The posting trigger chosen here is
// snapshotted onto each new Store Order, so changing it later does not affect existing orders.
const StoreInventorySalesConfiguration = () => {
    const [form, setForm] = useState<StoreInventorySalesConfigurationInput>(DEFAULTS);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = debtorsRes?.data?.rows || [];
    const saveMutation = useSaveStoreInventorySalesConfiguration();

    const update = <K extends keyof StoreInventorySalesConfigurationInput>(
        key: K,
        value: StoreInventorySalesConfigurationInput[K],
    ) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => {
            if (!prev[key as string]) return prev;
            const next = { ...prev };
            delete next[key as string];
            return next;
        });
    };

    const handleSubmit = () => {
        const parsed = storeInventorySalesConfigurationSchema.safeParse(form);
        if (!parsed.success) {
            const fieldErrors: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                const key = String(issue.path[0] || 'form');
                if (!fieldErrors[key]) fieldErrors[key] = issue.message;
            });
            setErrors(fieldErrors);
            return toast.error('Correct the highlighted fields');
        }

        saveMutation.mutate(parsed.data, {
            onSuccess: (res) => {
                if (res.success) toast.success(res.message || 'Configuration saved');
                else toast.error(res.message || 'Configuration could not be saved');
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const numberField = (
        name: (typeof NUMERIC_FIELDS)[number]['name'],
        step?: string,
    ) => (
        <Input
            type="number"
            min={0}
            step={step || '1'}
            value={form[name]}
            onChange={(e) => update(name, e.target.value === '' ? 0 : Number(e.target.value))}
        />
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Store Inventory & Sales Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="min-w-0 space-y-1.5">
                        <Label className="text-sm">
                            Store <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.companyDebtorId}
                            onValueChange={(value) => update('companyDebtorId', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a store" />
                            </SelectTrigger>
                            <SelectContent>
                                {stores.map((store) => (
                                    <SelectItem key={store.id} value={store.id}>
                                        {store.name || store.tradingAs || store.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.companyDebtorId && (
                            <p className="text-xs text-destructive">{errors.companyDebtorId}</p>
                        )}
                    </div>

                    <div className="min-w-0 space-y-1.5">
                        <Label className="text-sm">Order Mode</Label>
                        <Select
                            value={form.orderMode}
                            onValueChange={(value) => update('orderMode', value as StoreInventorySalesConfigurationInput['orderMode'])}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STORE_ORDER_MODES.map((mode) => (
                                    <SelectItem key={mode} value={mode}>
                                        {ORDER_MODE_LABEL[mode] || mode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {NUMERIC_FIELDS.map((field) => (
                        <div key={field.name} className="min-w-0 space-y-1.5">
                            <Label className="text-sm">{field.label}</Label>
                            {numberField(field.name, field.step)}
                            <p className="text-xs text-muted-foreground">{field.hint}</p>
                            {errors[field.name] && <p className="text-xs text-destructive">{errors[field.name]}</p>}
                        </div>
                    ))}

                    <div className="min-w-0 space-y-1.5">
                        <Label className="text-sm">Inventory Posting Trigger</Label>
                        <Select
                            value={form.inventoryPostingTrigger}
                            onValueChange={(value) =>
                                update(
                                    'inventoryPostingTrigger',
                                    value as StoreInventorySalesConfigurationInput['inventoryPostingTrigger'],
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STORE_INVENTORY_POSTING_TRIGGERS.map((trigger) => (
                                    <SelectItem key={trigger} value={trigger}>
                                        {TRIGGER_LABEL[trigger] || trigger}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Captured on each new Store Order. Changing it later does not affect existing orders.
                        </p>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                        <Label className="text-sm">Invoice Creation Mode</Label>
                        <Select
                            value={form.invoiceCreationMode}
                            onValueChange={(value) =>
                                update(
                                    'invoiceCreationMode',
                                    value as StoreInventorySalesConfigurationInput['invoiceCreationMode'],
                                )
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {STORE_INVOICE_CREATION_MODES.map((mode) => (
                                    <SelectItem key={mode} value={mode}>
                                        {mode.replace(/_/g, ' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                        <Label className="text-sm">Status</Label>
                        <Select
                            value={form.status}
                            onValueChange={(value) =>
                                update('status', value as StoreInventorySalesConfigurationInput['status'])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={handleSubmit}
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            <>
                                <Save className="mr-1 h-4 w-4" /> Save Configuration
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default StoreInventorySalesConfiguration;
