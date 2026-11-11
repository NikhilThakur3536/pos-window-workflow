import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Controller, useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { TENDER_TYPES } from '@/lib/constant';
import {
    TenderMaster,
    TenderMasterCreateSchema,
    TenderMasterUpdateSchema,
    TenderMasterFormValues,
    tenderMasterCreateSchema,
    tenderMasterUpdateSchema,
    useCreateTenderMaster,
    useUpdateTenderMaster,
} from '@/api-queries/masters/tenders';

interface TenderMasterFormProps {
    open: boolean;
    onClose: () => void;
    editData: TenderMaster | null;
    mode: 'parent' | 'child';
    defaultType?: string;
    parent?: TenderMaster | null;
}

const TENDER_TYPE_OPTIONS = [
    TENDER_TYPES.CASH,
    TENDER_TYPES.CARD,
    TENDER_TYPES.EFT,
    TENDER_TYPES.CHEQUE,
    TENDER_TYPES.COUPON,
    TENDER_TYPES.VOUCHER,
];

const TenderMasterForm = ({ open, onClose, editData, mode, defaultType = '', parent }: TenderMasterFormProps) => {
    const createItemData = useCreateTenderMaster();
    const updateItemData = useUpdateTenderMaster();

    const isEditing = !!editData;
    const isChild = mode === 'child';

    const form = useForm<TenderMasterFormValues>({
        resolver: (isEditing ? zodResolver(tenderMasterUpdateSchema) : zodResolver(tenderMasterCreateSchema)) as unknown as Resolver<TenderMasterFormValues>,
        defaultValues: {
            code: editData?.code || '',
            type: editData?.type || defaultType,
            description: editData?.description || '',
            category: isChild ? false : (editData?.category ?? true),
            isMainType: isChild ? false : (editData?.isMainType ?? true),
            isBankable: editData?.isBankable ?? false,
            isStockDiscount: editData?.isStockDiscount ?? isChild,
            isDiscountParent:
                isChild
                    ? false
                    : (editData?.isDiscountParent ??
                      (defaultType === TENDER_TYPES.COUPON || defaultType === TENDER_TYPES.VOUCHER)),
            parentTenderId: editData?.parentTenderId || parent?.id || null,
            fixedDiscountType:
                editData?.fixedDiscountType || (defaultType === TENDER_TYPES.VOUCHER ? 'FIXED_VALUE' : 'PERCENTAGE'),
            fixedDiscountValue: editData?.fixedDiscountValue != null ? Number(editData.fixedDiscountValue) : undefined,
        },
    });

    const { handleSubmit, control, watch, setValue } = form;

    const selectedType = watch('type') || defaultType;
    const isDiscountCategoryType = selectedType === TENDER_TYPES.COUPON || selectedType === TENDER_TYPES.VOUCHER;

    function onSubmit(values: TenderMasterFormValues) {
        const payload = {
            code: values.code.trim(),
            type: values.type,
            description: values.description.trim(),
            category: isChild ? false : Boolean(values.category),
            isMainType: isChild ? false : Boolean(values.isMainType),
            isBankable: Boolean(values.isBankable),
            isStockDiscount: Boolean(values.isStockDiscount),
            isDiscountParent: isChild ? false : Boolean(values.isDiscountParent),
            ...(isChild && parent?.id ? { parentTenderId: parent.id } : {}),
            ...(isChild
                ? {
                      fixedDiscountType: values.fixedDiscountType || (defaultType === TENDER_TYPES.VOUCHER ? 'FIXED_VALUE' : 'PERCENTAGE'),
                      fixedDiscountValue: values.fixedDiscountValue ?? 0,
                  }
                : {}),
        };

        if (isEditing) {
            if (!editData?.id) return toast.error('Payment method id is required');

            return updateItemData.mutate(
                { ...payload, tenderTypeId: editData.id } as TenderMasterUpdateSchema,
                {
                    onSuccess: (data) => {
                        if (data.success) {
                            toast.success(isChild ? 'Voucher / Coupon updated successfully' : 'Payment method updated successfully');
                            form.reset();
                            onClose();
                        } else {
                            toast.error('Updation failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
        }

        if (isChild && !parent?.id) return toast.error('Select a valid parent to add a voucher / coupon');

        createItemData.mutate(payload as TenderMasterCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success(isChild ? 'Voucher / Coupon created successfully' : 'Payment method created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    const formTitle = isEditing ? 'Edit Payment Method' : isChild ? `Add ${selectedType === TENDER_TYPES.VOUCHER ? 'Voucher' : 'Coupon'}` : 'Add Payment Method';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{formTitle}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="mb-0 grid gap-6 py-4">
                            {!isChild && (
                                <div className="flex items-start gap-4">
                                    <Label htmlFor="type" className="mt-2 min-w-[120px] text-sm font-medium">
                                        Tender Type <MandatoryField />
                                    </Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select
                                                            value={field.value || undefined}
                                                            onValueChange={(val) => {
                                                                field.onChange(val);
                                                                if (!isEditing) {
                                                                    setValue('isDiscountParent', val === TENDER_TYPES.COUPON || val === TENDER_TYPES.VOUCHER);
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select tender type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {TENDER_TYPE_OPTIONS.map((type) => (
                                                                    <SelectItem key={type} value={type}>
                                                                        {type}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <Label htmlFor="code" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Code <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder={isChild ? 'eg : CPN10 / VCHR500' : 'eg : CASH'} {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label htmlFor="description" className="mt-2 min-w-[120px] text-sm font-medium">
                                    Description <MandatoryField />
                                </Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input placeholder="eg : Cash Payments" {...field} />
                                                </FormControl>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {!isChild && (
                                <div className="flex items-start gap-4">
                                    <Label className="mt-1 min-w-[120px] text-sm font-medium">Category</Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                                                    </FormControl>
                                                    <span className="text-xs text-muted-foreground">Parent tender group (COUPON / VOUCHER categories)</span>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isChild && (
                                <div className="flex items-start gap-4">
                                    <Label className="mt-1 min-w-[120px] text-sm font-medium">Main Type</Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="isMainType"
                                            render={({ field }) => (
                                                <FormItem className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                                                    </FormControl>
                                                    <span className="text-xs text-muted-foreground">Shown as a main tender on the POS payment screen</span>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isChild && (
                                <div className="flex items-start gap-4">
                                    <Label className="mt-1 min-w-[120px] text-sm font-medium">Discount Parent</Label>
                                    <div className="flex-1">
                                        <Controller
                                            control={control}
                                            name="isDiscountParent"
                                            render={({ field }) => (
                                                <div className="flex items-center gap-2">
                                                    <Checkbox
                                                        checked={!!field.value}
                                                        disabled={!isEditing && isDiscountCategoryType}
                                                        onCheckedChange={(v) => field.onChange(v === true)}
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {isDiscountCategoryType ? 'Coupons & vouchers are grouped under this category' : 'Has coupon / voucher child tenders'}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {isChild && (
                                <div className="flex items-start gap-4">
                                    <Label className="mt-1 min-w-[120px] text-sm font-medium">Discount Type</Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="fixedDiscountType"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Select value={field.value || undefined} onValueChange={field.onChange}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select discount type" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                                                                <SelectItem value="FIXED_VALUE">Fixed Amount</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            {isChild && (
                                <div className="flex items-start gap-4">
                                    <Label className="mt-2 min-w-[120px] text-sm font-medium">Discount Value</Label>
                                    <div className="flex-1">
                                        <FormField
                                            control={control}
                                            name="fixedDiscountValue"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            placeholder={watch('fixedDiscountType') === 'PERCENTAGE' ? 'eg : 10' : 'eg : 500'}
                                                            value={field.value ?? ''}
                                                            onChange={(e) =>
                                                                field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="!-mt-1 !text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex items-start gap-4">
                                <Label className="mt-1 min-w-[120px] text-sm font-medium">Bankable</Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="isBankable"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                                                </FormControl>
                                                <span className="text-xs text-muted-foreground">Treated as a bank movement (CARD / EFT / CHEQUE)</span>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Label className="mt-1 min-w-[120px] text-sm font-medium">Stock Discount</Label>
                                <div className="flex-1">
                                    <FormField
                                        control={control}
                                        name="isStockDiscount"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2">
                                                <FormControl>
                                                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                                                </FormControl>
                                                <span className="text-xs text-muted-foreground">Applied against stock value (coupons / vouchers)</span>
                                                <FormMessage className="!-mt-1 !text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                                {editData ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default TenderMasterForm;