import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { cleanDataPayload } from '@/utils/helpers';
import SelectPopover from '@/components/select-popover';
import { useGetCategories } from '@/api-queries/categories';
import { useGetSubCategories } from '@/api-queries/categories/sub-categories';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useCreditorList, type CreditorListPayload } from '@/api-queries/creditor';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import {
    DispositionRule,
    DispositionRuleCreateSchema,
    DispositionRuleUpdateSchema,
    dispositionRuleCreateSchema,
    useCreateDispositionRule,
    useGetDispositionRules,
    useUpdateDispositionRule,
    NST_DISPOSITION_TYPES,
    NST_TRIGGER_MODES,
    NST_ACTION_TYPES,
    NST_DISCOUNT_TYPES,
    NST_SCOPE_TYPES,
    NSTScopeType,
    NSTRuleScope,
} from '@/api-queries/nst';

interface NSTRuleFormProps {
    open: boolean;
    onClose: () => void;
    editData: DispositionRule | null;
}

// There is no brand master wired into this app yet, so a brand scope falls back to a
// typed id instead of an empty select.
const SCOPE_ID_PLACEHOLDER: Partial<Record<NSTScopeType, string>> = {
    STOCK: 'Stock / batch id',
    BRAND: 'Brand id',
};

const toFormNumber = (value: unknown): number | undefined => {
    if (value === '' || value === undefined || value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

// Field errors can be nested (e.g. scopes[0].scopeId); walk them so the first real
// message is shown instead of the generic "correct the highlighted fields" fallback.
const firstErrorMessage = (errors: unknown): string | undefined => {
    if (!errors || typeof errors !== 'object') return undefined;
    if ('message' in errors && typeof (errors as { message?: unknown }).message === 'string') {
        return (errors as { message: string }).message;
    }
    for (const value of Object.values(errors)) {
        const message = firstErrorMessage(value);
        if (message) return message;
    }
    return undefined;
};

interface StockScopeSelectProps {
    value: string | null;
    onSelect: (value: string) => void;
}

const StockScopeSelect = ({ value, onSelect }: StockScopeSelectProps) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedLabel, setSelectedLabel] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const stockRows: StockDetails[] =
        useCompanyStockDetailsList({
            limit: 100,
            offset: 0,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
        })?.data?.data?.rows || [];

    const matched = stockRows.find((s) => s.id === value);
    const triggerLabel = matched
        ? `${matched.description} (${matched.itemCode})`
        : selectedLabel || value || 'Select stock';

    return (
        <Popover
            open={popoverOpen}
            onOpenChange={(next) => {
                setPopoverOpen(next);
                if (!next) setSearch('');
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    className="h-7 w-full justify-start px-2 text-xs font-normal"
                >
                    <span className="truncate">{triggerLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-2" align="start" onWheel={(e) => e.stopPropagation()}>
                <Input
                    autoFocus
                    className="mb-2 h-7 text-xs"
                    placeholder="Search stock..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                    {stockRows.length === 0 ? (
                        <div className="p-2 text-center text-xs text-gray-500">No stock found</div>
                    ) : (
                        stockRows.map((stock) => (
                            <button
                                key={stock.id}
                                type="button"
                                className={`w-full rounded-sm px-2 py-1 text-left text-xs hover:bg-gray-100 ${
                                    stock.id === value ? 'bg-blue-50 font-semibold' : ''
                                }`}
                                onClick={() => {
                                    setSelectedLabel(`${stock.description} (${stock.itemCode})`);
                                    onSelect(stock.id);
                                    setPopoverOpen(false);
                                    setSearch('');
                                }}
                            >
                                {stock.description} ({stock.itemCode})
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const NSTRuleForm = ({ open, onClose, editData }: NSTRuleFormProps) => {
    const isEditing = !!editData;
    const createRule = useCreateDispositionRule();
    const updateRule = useUpdateDispositionRule();
    const isSaving = createRule.isPending || updateRule.isPending;
    // Live active rules; `code` must stay unique among them so the same public rule code
    // cannot be created twice while an older rule still owns it.
    const activeRules = useGetDispositionRules({ status: 'ACTIVE' })?.data?.data;

    const categories = useGetCategories({ limit: 100 })?.data?.data?.rows;
    const subCategories = useGetSubCategories({ limit: 100 })?.data?.data?.rows;
    const warehouseRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehouseRes)
        ? (warehouseRes as { id: string; name: string }[])
        : (warehouseRes as { rows?: { id: string; name: string }[] } | undefined)?.rows || [];

    const creditors = useCreditorList({ limit: 200, offset: 0 } as CreditorListPayload)?.data?.data as
        { id: string; name: string }[] | { rows?: { id: string; name: string }[] } | undefined;
    const creditorRows: { id: string; name: string }[] = Array.isArray(creditors) ? creditors : (creditors?.rows ?? []);

    const categoryOptions = (categories || []).map((c) => ({ value: c.id, label: c.name }));
    const subCategoryOptions = (subCategories || []).map((s) => ({ value: s.id, label: s.name }));
    const warehouseOptions = (warehouses || []).map((w) => ({ value: w.id, label: w.name }));
    const supplierOptions = creditorRows.map((c) => ({ value: c.id, label: c.name }));
    const optionalNumber = (value: unknown): number | undefined =>
        value === '' || value === undefined || value === null ? undefined : Number(value);
    const ruleResolver = zodResolver(dispositionRuleCreateSchema) as Resolver<DispositionRuleCreateSchema>;

    const form = useForm<DispositionRuleCreateSchema>({
        resolver: (values, context, options) =>
            ruleResolver(
                {
                    ...values,
                    nearExpiryFromDays: Number(values.nearExpiryFromDays),
                    nearExpiryToDays: Number(values.nearExpiryToDays),
                    discountValue: optionalNumber(values.discountValue),
                    maximumDiscountPercentage: optionalNumber(values.maximumDiscountPercentage),
                    minimumMarginPercentage: optionalNumber(values.minimumMarginPercentage),
                    minimumApproverLevel: optionalNumber(values.minimumApproverLevel),
                    priority: optionalNumber(values.priority),
                },
                context,
                options,
            ),
        defaultValues: {
            code: editData?.code || '',
            name: editData?.name || '',
            dispositionType: editData?.dispositionType || 'NEAR_EXPIRY',
            triggerMode: editData?.triggerMode || 'MANUAL',
            nearExpiryFromDays: toFormNumber(editData?.nearExpiryFromDays) ?? 0,
            nearExpiryToDays: toFormNumber(editData?.nearExpiryToDays) ?? 30,
            actionType: editData?.actionType || 'DISCOUNT_SALE',
            discountType: editData?.discountType || 'PERCENTAGE',
            discountValue: toFormNumber(editData?.discountValue),
            maximumDiscountPercentage: toFormNumber(editData?.maximumDiscountPercentage),
            minimumMarginPercentage: toFormNumber(editData?.minimumMarginPercentage),
            allowSale: editData?.allowSale ?? true,
            allowPromotionStacking: editData?.allowPromotionStacking ?? false,
            requireApproval: editData?.requireApproval ?? false,
            minimumApproverLevel: toFormNumber(editData?.minimumApproverLevel) ?? 2,
            priority: toFormNumber(editData?.priority) ?? 100,
            // The API can echo `scopeId: null` for an "ALL" scope, which the form schema
            // (scopeId optional string) rejects. Drop null/blank ids so an existing rule
            // can always be opened and updated.
            scopes: editData?.scopes?.length
                ? editData.scopes.map((s) => ({
                      scopeType: s.scopeType,
                      ...(s.scopeId ? { scopeId: s.scopeId } : {}),
                  }))
                : [{ scopeType: 'ALL' }],
        },
    });

    const { handleSubmit, control, watch, setValue, setError } = form;
    const actionType = watch('actionType');
    const scopes = watch('scopes');

    useEffect(() => {
        if (open) form.reset();
    }, [open]);

    // The backend returns a single human message on failure; surface it directly under
    // the field it names, falling back to a toast when the field cannot be inferred.
    const showRuleError = (error: unknown) => {
        // @ts-ignore
        const message = error?.response?.data?.message || 'Internal Server Error!';
        const lower = message.toLowerCase();
        if (lower.includes('code')) {
            setError('code', { message });
            return;
        }
        if (lower.includes('discount value') || lower.includes('discountvalue')) {
            setError('discountValue', { message });
            return;
        }
        if (lower.includes('maximum')) {
            setError('maximumDiscountPercentage', { message });
            return;
        }
        if (lower.includes('margin')) {
            setError('minimumMarginPercentage', { message });
            return;
        }
        toast.error(message);
    };

    function onSubmit(values: DispositionRuleCreateSchema) {
        // A code already owned by another active rule is rejected up front so the list
        // can never end up with two ACTIVE rules sharing the same code.
        const codeTaken = (activeRules || []).some(
            (r) => r.code.toLowerCase() === (values.code || '').toLowerCase() && r.id !== editData?.id,
        );
        if (codeTaken) {
            setError('code', { message: 'Rule code already exists among active rules.' });
            return;
        }

        const toOptionalNumber = (value: number | string | undefined) =>
            value === undefined || value === '' ? undefined : Number(value);
        const payload = cleanDataPayload({
            ...values,
            nearExpiryFromDays: Number(values.nearExpiryFromDays),
            nearExpiryToDays: Number(values.nearExpiryToDays),
            discountValue: toOptionalNumber(values.discountValue),
            maximumDiscountPercentage: toOptionalNumber(values.maximumDiscountPercentage),
            minimumMarginPercentage: toOptionalNumber(values.minimumMarginPercentage),
            minimumApproverLevel: toOptionalNumber(values.minimumApproverLevel),
            priority: toOptionalNumber(values.priority),
        });
        // A brand new rule has to be live to match candidates, so creation is always ACTIVE.
        const createPayload: DispositionRuleCreateSchema = {
            ...(payload as DispositionRuleCreateSchema),
            status: 'ACTIVE',
        };

        if (isEditing && editData) {
            return updateRule.mutate(
                { ...(payload as Partial<DispositionRuleUpdateSchema>), id: editData.id, status: editData.status },
                {
                    onSuccess: (data) => {
                        if (data?.success) {
                            toast.success('NST rule updated successfully');
                            form.reset();
                            onClose();
                        } else {
                            toast.error('NST rule update failed');
                        }
                    },
                    onError: (error) => {
                        // An API validation message is surfaced under the offending field.
                        showRuleError(error);
                    },
                },
            );
        }

        createRule.mutate(createPayload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('NST rule created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('NST rule creation failed');
                }
            },
            onError: (error) => {
                // An API validation message is surfaced under the offending field.
                showRuleError(error);
            },
        });
    }

    const onScopeChange = (index: number, field: 'scopeType' | 'scopeId', value: string) => {
        const next = [...(scopes || [])];
        if (field === 'scopeType') {
            next[index] = { scopeType: value as (typeof NST_SCOPE_TYPES)[number] };
        } else {
            next[index] = { ...next[index], [field]: value };
        }
        setValue('scopes', next);
    };

    const addScope = () => {
        setValue('scopes', [...(scopes || []), { scopeType: 'CATEGORY' }]);
    };

    const removeScope = (index: number) => {
        setValue(
            'scopes',
            (scopes || []).filter((_: NSTRuleScope, i: number) => i !== index),
        );
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[820px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit NST Approval Rule' : 'Create NST Approval Rule'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit, (errors) => {
                            toast.error(
                                firstErrorMessage(errors) ||
                                    'Please correct the highlighted fields before saving the rule.',
                            );
                        })}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="grid grid-cols-3 items-start gap-3">
                            <FormField
                                control={control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Rule Code <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                className="h-7 text-xs"
                                                placeholder="eg. NEAR_EXPIRY_30"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Rule Name <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                className="h-7 text-xs"
                                                placeholder="eg. Near-expiry 30%"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="dispositionType"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Disposition Type <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {NST_DISPOSITION_TYPES.map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {t.replace(/_/g, ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="triggerMode"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Trigger Mode <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select trigger" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {NST_TRIGGER_MODES.map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {t}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="nearExpiryFromDays"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Near-Expiry From (days)</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                className="h-7 text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="nearExpiryToDays"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Near-Expiry To (days)</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                className="h-7 text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="actionType"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Action Type <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select action" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {NST_ACTION_TYPES.map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {t.replace(/_/g, ' ')}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            {actionType === 'DISCOUNT_SALE' ? (
                                <>
                                    <FormField
                                        control={control}
                                        name="discountType"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Discount Type</Label>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger className="!h-7 text-xs">
                                                            <SelectValue placeholder="Select discount" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {NST_DISCOUNT_TYPES.map((t) => (
                                                                <SelectItem key={t} value={t}>
                                                                    {t}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="discountValue"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Discount Value</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.currentTarget.value === ''
                                                                    ? undefined
                                                                    : e.currentTarget.valueAsNumber,
                                                            )
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="maximumDiscountPercentage"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Maximum Discount (%)</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.currentTarget.value === ''
                                                                    ? undefined
                                                                    : e.currentTarget.valueAsNumber,
                                                            )
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="minimumMarginPercentage"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Minimum Margin (%)</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                e.currentTarget.value === ''
                                                                    ? undefined
                                                                    : e.currentTarget.valueAsNumber,
                                                            )
                                                        }
                                                        className="h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}

                            <FormField
                                control={control}
                                name="minimumApproverLevel"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Minimum Approver Level</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || 1)}
                                                className="h-7 text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Priority</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                className="h-7 text-xs"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-3 items-start gap-3">
                            <FormField
                                control={control}
                                name="allowSale"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                        <Label className="text-xs">Allow Sale</Label>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="allowPromotionStacking"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                        <Label className="text-xs">Allow Promotion Stacking</Label>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="requireApproval"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                        <Label className="text-xs">Require Approval</Label>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold underline">Scopes</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={addScope}
                                >
                                    + Add Scope
                                </Button>
                            </div>

                            {(scopes || []).map((scope, index) => (
                                <div key={index} className="grid grid-cols-12 items-center gap-2">
                                    <div className="col-span-4">
                                        <Select
                                            value={scope.scopeType}
                                            onValueChange={(v) => onScopeChange(index, 'scopeType', v)}
                                        >
                                            <SelectTrigger className="!h-7 text-xs">
                                                <SelectValue placeholder="Scope type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {NST_SCOPE_TYPES.map((t) => (
                                                    <SelectItem key={t} value={t}>
                                                        {t}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {scope.scopeType !== 'ALL' ? (
                                        <div className="col-span-6">
                                            {scope.scopeType === 'CATEGORY' ? (
                                                <SelectPopover
                                                    title="category"
                                                    selectedValue={scope.scopeId || null}
                                                    options={categoryOptions}
                                                    onSelect={(v) => onScopeChange(index, 'scopeId', v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            ) : scope.scopeType === 'SUBCATEGORY' ? (
                                                <SelectPopover
                                                    title="subcategory"
                                                    selectedValue={scope.scopeId || null}
                                                    options={subCategoryOptions}
                                                    onSelect={(v) => onScopeChange(index, 'scopeId', v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            ) : (scope.scopeType as string) === 'WAREHOUSE' ? (
                                                <SelectPopover
                                                    title="warehouse"
                                                    selectedValue={scope.scopeId || null}
                                                    options={warehouseOptions}
                                                    onSelect={(v) => onScopeChange(index, 'scopeId', v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            ) : scope.scopeType === 'SUPPLIER' ? (
                                                <SelectPopover
                                                    title="supplier"
                                                    selectedValue={scope.scopeId || null}
                                                    options={supplierOptions}
                                                    onSelect={(v) => onScopeChange(index, 'scopeId', v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            ) : scope.scopeType === 'STOCK' ? (
                                                <StockScopeSelect
                                                    value={scope.scopeId || null}
                                                    onSelect={(v) => onScopeChange(index, 'scopeId', v || '')}
                                                />
                                            ) : (
                                                <Input
                                                    className="h-7 text-xs"
                                                    placeholder={SCOPE_ID_PLACEHOLDER[scope.scopeType] || 'Scope id'}
                                                    value={scope.scopeId || ''}
                                                    onChange={(e) => onScopeChange(index, 'scopeId', e.target.value)}
                                                />
                                            )}
                                        </div>
                                    ) : null}
                                    <div className={scope.scopeType === 'ALL' ? 'col-span-7' : 'col-span-1'}>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs text-red-600"
                                            onClick={() => removeScope(index)}
                                        >
                                            Remove
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                            >
                                {isSaving ? 'Saving...' : isEditing ? 'Update Rule' : 'Create Rule'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default NSTRuleForm;