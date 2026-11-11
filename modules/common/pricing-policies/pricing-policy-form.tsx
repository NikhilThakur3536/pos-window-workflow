import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Checkbox } from '@/components/ui/checkbox';
import SelectPopover from '@/components/select-popover';
import { useState } from 'react';
import { useGetUserGroups } from '@/api-queries/user-groups';
import { useGetUsers } from '@/api-queries/user';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useGetCategories } from '@/api-queries/categories';
import {
    pricingPolicySchema,
    PricingPolicySchema,
    PricingPolicyDetails,
    useSavePricingPolicy,
} from '@/api-queries/pricing-policy';

interface PricingPolicyFormProps {
    open: boolean;
    onClose: () => void;
    editData: PricingPolicyDetails | null;
}

const SCOPE_OPTIONS: { value: string; label: string }[] = [
    { value: 'COMPANY', label: 'Company (all users)' },
    { value: 'GROUP', label: 'User Group' },
    { value: 'USER', label: 'User' },
    { value: 'SKU', label: 'Specific Product / SKU' },
    { value: 'CATEGORY', label: 'Product Category' },
];

const PricingPolicyForm = ({ open, editData, onClose }: PricingPolicyFormProps) => {
    const savePolicy = useSavePricingPolicy();
    const isEditing = !!editData;

    const initialScope: 'COMPANY' | 'GROUP' | 'USER' | 'SKU' | 'CATEGORY' = editData?.companyStockDetailId
        ? 'SKU'
        : editData?.companyStockCategoryId
          ? 'CATEGORY'
          : editData?.groupId
            ? 'GROUP'
            : editData?.userId
              ? 'USER'
              : 'COMPANY';

    const form = useForm<PricingPolicySchema>({
        resolver: zodResolver(pricingPolicySchema),
        defaultValues: {
            name: editData?.name || '',
            transactionType: editData?.transactionType || 'POS',
            scope: initialScope,
            companyDebtorId: editData?.companyDebtorId || '',
            companyWarehouseId: editData?.companyWarehouseId || '',
            companyStockDetailId: editData?.companyStockDetailId || '',
            companyStockCategoryId: editData?.companyStockCategoryId || '',
            groupId: editData?.groupId || '',
            userId: editData?.userId || '',
            maxDiscountPercent: editData?.maxDiscountPercent ?? 0,
            maxDiscountAmount: editData?.maxDiscountAmount ?? null,
            allowPriceOverride: editData?.allowPriceOverride || false,
            requireApprovalAboveLimit: editData?.requireApprovalAboveLimit || false,
            priority: editData?.priority ?? 10,
            status: editData?.status || 'ACTIVE',
            targetGpPercent: editData?.targetGpPercent ?? null,
            minGpPercent: editData?.minGpPercent ?? null,
            maxGpPercent: editData?.maxGpPercent ?? null,
            gpTolerancePercent: editData?.gpTolerancePercent ?? null,
            blockingGpVariancePercent: editData?.blockingGpVariancePercent ?? null,
            enforceGpPolicy: editData?.enforceGpPolicy ?? null,
            isCompanyGpDefault: editData?.isCompanyGpDefault ?? null,
        },
    });

    const { handleSubmit, control, watch, setValue } = form;
    const scope = watch('scope') || initialScope;

    // Scope option data
    const groups = useGetUserGroups({ limit: 100, offset: 0 })?.data?.data || [];
    const users = useGetUsers({ limit: 100, offset: 0 })?.data?.data || [];
    const debtors = useDebtorList({ limit: 100, offset: 0 })?.data?.data?.rows || [];
    const warehouseData: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouses: WarehouseDetails[] = Array.isArray(warehouseData)
        ? warehouseData
        : warehouseData &&
            typeof warehouseData === 'object' &&
            'rows' in warehouseData &&
            Array.isArray(warehouseData.rows)
          ? warehouseData.rows
          : [];
    const categories = useGetCategories({ limit: 100, offset: 0 })?.data?.data?.rows || [];

    const [productSearch, setProductSearch] = useState('');
    const productsQuery = useCompanyStockDetailsList({
        limit: 20,
        offset: 0,
        status: 'ACTIVE',
        ...(productSearch ? { search: productSearch } : {}),
    });
    const products = productsQuery?.data?.data?.rows || [];

    const onSubmit = (values: PricingPolicySchema) => {
        const isCompanyScope =
            values.scope !== 'GROUP' && values.scope !== 'USER' && values.scope !== 'SKU' && values.scope !== 'CATEGORY';

        savePolicy.mutate(
            {
                name: values.name,
                transactionType: values.transactionType,
                maxDiscountPercent: values.maxDiscountPercent,
                maxDiscountAmount: values.maxDiscountAmount,
                allowPriceOverride: values.allowPriceOverride,
                requireApprovalAboveLimit: values.requireApprovalAboveLimit,
                priority: values.priority,
                status: values.status,
                targetGpPercent: values.targetGpPercent ?? null,
                minGpPercent: values.minGpPercent ?? null,
                maxGpPercent: values.maxGpPercent ?? null,
                gpTolerancePercent: values.gpTolerancePercent ?? null,
                blockingGpVariancePercent: values.blockingGpVariancePercent ?? null,
                enforceGpPolicy: values.enforceGpPolicy ?? null,
                isCompanyGpDefault: values.isCompanyGpDefault ?? null,
                // Location scopes: apply to a single store / warehouse when set, otherwise company-wide.
                companyDebtorId: values.companyDebtorId || null,
                companyWarehouseId: values.companyWarehouseId || null,
                ...(isEditing && editData ? { id: editData.id } : {}),
                ...(isCompanyScope
                    ? { companyStockDetailId: null, companyStockCategoryId: null, groupId: null, userId: null }
                    : {
                          companyStockDetailId: values.scope === 'SKU' ? values.companyStockDetailId || null : null,
                          companyStockCategoryId:
                              values.scope === 'CATEGORY' ? values.companyStockCategoryId || null : null,
                          groupId: values.scope === 'GROUP' ? values.groupId || null : null,
                          userId: values.scope === 'USER' ? values.userId || null : null,
                      }),
            },
            {
                onSuccess: (res) => {
                    if (res?.success) {
                        toast.success(isEditing ? 'Pricing policy updated' : 'Pricing policy created');
                        form.reset();
                        onClose();
                    } else {
                        toast.error(res?.message || 'Failed to save pricing policy');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to save pricing policy');
                },
            },
        );
    };

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[620px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Pricing Policy' : 'Add Pricing Policy'}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Policy Name <MandatoryField />
                                    </Label>
                                    <FormControl>
                                        <Input placeholder="e.g. Retail POS Discount Limit" {...field} />
                                    </FormControl>
                                    <FormMessage className="!text-xs" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={control}
                            name="transactionType"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Transaction Type <MandatoryField />
                                    </Label>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select transaction type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Transaction Types</SelectItem>
                                            <SelectItem value="POS">POS / Cash Sale</SelectItem>
                                            <SelectItem value="ACCOUNT_SALE">Account Sale</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="!text-xs" />
                                </FormItem>
                            )}
                        />

                        {/* Location scopes: store / debtor and warehouse */}
                        <p className="text-sm font-semibold text-muted-foreground">Location Scope (optional)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="companyDebtorId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">Store / Debtor</Label>
                                        <SelectPopover
                                            title="Store / Debtor"
                                            onlyTitle="Applies to all stores"
                                            options={debtors.map((d) => ({ label: d.name, value: d.id }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="companyWarehouseId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">Warehouse</Label>
                                        <SelectPopover
                                            title="Warehouse"
                                            onlyTitle="Applies to all warehouses"
                                            options={warehouses.map((w) => ({
                                                label: (w.warehouse || w.name || w.description || '').trim(),
                                                value: w.id,
                                            }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Rule scope */}
                        <FormField
                            control={control}
                            name="scope"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <Label className="text-sm font-medium">Rule Scope</Label>
                                    <Select
                                        value={field.value || 'COMPANY'}
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (value === 'COMPANY') {
                                                setValue('companyStockDetailId', '');
                                                setValue('companyStockCategoryId', '');
                                                setValue('groupId', '');
                                                setValue('userId', '');
                                            }
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select scope" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {SCOPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="!text-xs" />
                                </FormItem>
                            )}
                        />

                        {scope === 'GROUP' && (
                            <FormField
                                control={control}
                                name="groupId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            User Group <MandatoryField />
                                        </Label>
                                        <SelectPopover
                                            title="User Group"
                                            onlyTitle="Select user group"
                                            options={groups.map((g) => ({ label: g.name, value: g.id }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {scope === 'USER' && (
                            <FormField
                                control={control}
                                name="userId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            User <MandatoryField />
                                        </Label>
                                        <SelectPopover
                                            title="User"
                                            onlyTitle="Select user"
                                            options={users.map((u) => ({
                                                label: `${u.firstName} ${u.surname}${u.staffNumber ? ` (${u.staffNumber})` : ''}`,
                                                value: u.id,
                                            }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {scope === 'CATEGORY' && (
                            <FormField
                                control={control}
                                name="companyStockCategoryId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Product Category <MandatoryField />
                                        </Label>
                                        <SelectPopover
                                            title="Product Category"
                                            onlyTitle="Select product category"
                                            options={categories.map((c) => ({ label: c.name, value: c.id }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}

                        {scope === 'SKU' && (
                            <FormField
                                control={control}
                                name="companyStockDetailId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Product / SKU <MandatoryField />
                                        </Label>
                                        <SelectPopover
                                            title="Product"
                                            onlyTitle="Search product / SKU..."
                                            options={products.map((p) => ({
                                                label: `${p.itemCode} - ${p.description}`,
                                                value: p.id,
                                            }))}
                                            selectedValue={field.value}
                                            onSelect={field.onChange}
                                            onSearch={setProductSearch}
                                            isSearching={productsQuery.isFetching}
                                        />
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="maxDiscountPercent"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Max Discount % <MandatoryField />
                                        </Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                max={100}
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="maxDiscountAmount"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">Max Discount Amount</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                placeholder="Blank = unlimited"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === '' ? null : e.target.valueAsNumber || null,
                                                    )
                                                }
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">Leave blank for unlimited.</p>
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Priority <MandatoryField />
                                    </Label>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="1"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                        />
                                    </FormControl>
                                    <FormMessage className="!text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="allowPriceOverride"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <Label className="text-sm">Allow price override</Label>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="requireApprovalAboveLimit"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <Label className="text-sm">Require approval above limit</Label>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="rounded-md border p-4">
                            <p className="mb-3 text-sm font-medium">Cost Consistency Limits</p>
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                                {(
                                    [
                                        ['targetGpPercent', 'Target GP%'],
                                        ['minGpPercent', 'Min GP%'],
                                        ['maxGpPercent', 'Max GP%'],
                                        ['gpTolerancePercent', 'Tolerance%'],
                                    ] as const
                                ).map(([name, label]) => (
                                    <FormField
                                        key={name}
                                        control={control}
                                        name={name}
                                        render={({ field }) => (
                                            <FormItem className="space-y-2">
                                                <Label className="text-sm">{label}</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                Number.isNaN(e.target.valueAsNumber)
                                                                    ? null
                                                                    : e.target.valueAsNumber,
                                                            )
                                                        }
                                                    />
                                                </FormControl>
                                                <FormMessage className="!text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                                <FormField
                                    control={control}
                                    name="enforceGpPolicy"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <Label className="text-sm font-medium">When GP limits are exceeded</Label>
                                            <FormControl>
                                                <div className="flex flex-col gap-2">
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            checked={field.value === false}
                                                            onChange={() => field.onChange(false)}
                                                        />
                                                        Warning only
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm">
                                                        <input
                                                            type="radio"
                                                            checked={field.value === true}
                                                            onChange={() => field.onChange(true)}
                                                        />
                                                        Require approval
                                                    </label>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <div className="flex flex-col gap-2">
                                    <FormField
                                        control={control}
                                        name="requireApprovalAboveLimit"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <Label className="text-sm">Require approval above discount limit</Label>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="isCompanyGpDefault"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox
                                                        checked={!!field.value}
                                                        onCheckedChange={(checked) => field.onChange(checked)}
                                                    />
                                                </FormControl>
                                                <Label className="text-sm">Company GP default</Label>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <FormField
                            control={control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="space-y-2">
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="!text-xs" />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={savePolicy.isPending}>
                                {savePolicy.isPending ? 'Saving...' : isEditing ? 'Update Policy' : 'Create Policy'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default PricingPolicyForm;
