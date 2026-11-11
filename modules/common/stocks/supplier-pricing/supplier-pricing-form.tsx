import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    supplierPricingSchema,
    SupplierPricingSchema,
    SupplierPricingRecord,
    supplierPricingIsPrimary,
    useMutateSupplierPricing,
} from '@/api-queries/suppliers';
import { useCreditorList } from '@/api-queries/creditor';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import { CompanyCreditor } from '@/types';

interface SupplierPricingFormProps {
    open: boolean;
    onClose: () => void;
    editData: SupplierPricingRecord | null;
}

const DELIVERY_CYCLES = [
    { label: 'Single Delivery', value: 'SINGLE_DELIVERY' },
    { label: 'Multiple Deliveries', value: 'MULTIPLE_DELIVERIES' },
];

const SupplierPricingForm = ({ open, onClose, editData }: SupplierPricingFormProps) => {
    const mutate = useMutateSupplierPricing();
    const isEditing = !!editData;

    // Scope: debtor/warehouse users only see/scope their own supplier pricing rows.
    const activeUser = useAuthUser((state) => state.user);
    const scope = {
        companyDebtorId: activeUser?.companyDebtorId || null,
        companyWarehouseId: activeUser?.warehouseId || null,
    };

    const creditors = useCreditorList({ limit: 500 })?.data?.data?.rows;
    const stocks = useCompanyStockDetailsList({ limit: 500 })?.data?.data?.rows;

    const defaultValues = useMemo(() => {
        const base: SupplierPricingSchema = {
            companyCreditorId: editData?.companyCreditorId || '',
            companyStockDetailId: editData?.companyStockDetailId || '',
            supplierItemCode: editData?.supplierItemCode || '',
            currentCost: editData?.currentCost ?? editData?.unitCost ?? 0,
            leadTimeDays: editData?.leadTimeDays ?? null,
            deliveryCycle: editData?.deliveryCycle ?? null,
            minimumOrderQuantity: editData?.minimumOrderQuantity ?? null,
            companyDebtorId: editData?.companyDebtorId || scope.companyDebtorId,
            companyWarehouseId: editData?.companyWarehouseId || scope.companyWarehouseId,
            isPrimarySupplier: editData ? supplierPricingIsPrimary(editData) : false,
            status: editData?.status || 'ACTIVE',
        };
        return base;
    }, [editData, scope.companyDebtorId, scope.companyWarehouseId]);

    const form = useForm({
        resolver: zodResolver(supplierPricingSchema),
        defaultValues,
    });

    const { handleSubmit, control, reset } = form;

    useEffect(() => {
        if (open) reset(defaultValues);
    }, [open, defaultValues, reset]);

    const onSubmit = (values: SupplierPricingSchema) => {
        if (isEditing) {
            if (!editData?.id) return toast.error('Supplier pricing ID is required');
            mutate.mutate(
                { action: 'update', data: { ...values, id: editData.id } },
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success('Supplier pricing updated successfully');
                            reset();
                            onClose();
                        } else {
                            toast.error(data.message || 'Supplier pricing update failed');
                        }
                    },
                    onError: (error: any) => {
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
            return;
        }
        mutate.mutate(
            { action: 'create', data: values },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Supplier pricing created successfully');
                        reset();
                        onClose();
                    } else {
                        toast.error(data.message || 'Supplier pricing creation failed');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const numberField = (name: keyof SupplierPricingSchema, label: string, required = false, placeholder = '') => (
        <FormField
            control={control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <Label className="text-xs">
                        {label} {required && <MandatoryField />}
                    </Label>
                    <FormControl>
                        <Input
                            type="number"
                            placeholder={placeholder}
                            value={field.value == null ? '' : Number(field.value)}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') return field.onChange(null);
                                const num = parseFloat(raw);
                                field.onChange(Number.isNaN(num) ? null : num);
                            }}
                        />
                    </FormControl>
                    <FormMessage className="text-xs" />
                </FormItem>
            )}
        />
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Supplier Pricing' : 'Add Supplier Pricing'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the supplier cost and delivery fields for this product.'
                            : 'Enter the supplier cost and delivery fields for this product.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div
                            className="max-h-[70vh] space-y-4 overflow-auto pr-4 pb-4"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name="companyCreditorId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-xs">
                                                Supplier <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                {creditors && (
                                                    <SelectPopover
                                                        options={creditors.map((data: CompanyCreditor) => ({
                                                            label: `${data.name} (${data.accountNumber})`,
                                                            value: data.id,
                                                        }))}
                                                        title="supplier"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="companyStockDetailId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-xs">
                                                Product <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                {stocks && (
                                                    <SelectPopover
                                                        options={stocks.map((data: StockDetails) => ({
                                                            label: `${data.description} ${data.itemCode ? `(${data.itemCode})` : ''}`,
                                                            value: data.id,
                                                        }))}
                                                        title="product"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name="supplierItemCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-xs">Supplier Item Code</Label>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g., SUPP-12345"
                                                    value={field.value || ''}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-xs">Status</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={[
                                                        { label: 'Active', value: 'ACTIVE' },
                                                        { label: 'Inactive', value: 'INACTIVE' },
                                                    ]}
                                                    title="status"
                                                    selectedValue={field.value || 'ACTIVE'}
                                                    onSelect={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {numberField('currentCost', 'Current Cost', true, 'e.g., 125.50')}
                                {numberField('leadTimeDays', 'Lead Time (Days)')}
                                <FormField
                                    control={control}
                                    name="deliveryCycle"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Label className="text-xs">Delivery Cycle</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    options={[
                                                        { label: 'None', value: '' },
                                                        ...DELIVERY_CYCLES,
                                                    ]}
                                                    title="delivery cycle"
                                                    selectedValue={field.value || ''}
                                                    onSelect={(value) => field.onChange(value || null)}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {numberField('minimumOrderQuantity', 'Minimum Order Qty')}
                                <div className="flex items-end pb-1">
                                    <FormField
                                        control={control}
                                        name="isPrimarySupplier"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={!!field.value}
                                                        onCheckedChange={(checked) => field.onChange(!!checked)}
                                                    />
                                                </FormControl>
                                                <Label className="text-xs">Set as primary supplier</Label>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={mutate.isPending} className="bg-blue-600 hover:bg-blue-700">
                                {mutate.isPending ? 'Saving...' : isEditing ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SupplierPricingForm;