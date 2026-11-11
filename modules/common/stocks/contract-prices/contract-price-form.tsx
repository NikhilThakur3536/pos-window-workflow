import React, { useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { format } from 'date-fns';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
    useCreateStockContractPrice,
    useUpdateStockContractPrice,
    createPriceDiscountSchema,
    updatePriceDiscountSchema,
    StockContractPrice,
    CreatePriceDiscountSchema,
    UpdatePriceDiscountSchema,
} from '@/api-queries/contract-prices';
import { useDebtorList } from '@/api-queries/debtor';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import { CompanyCreditor } from '@/types';
import { contractPricesDebtorFilters } from '.';

interface StockContractPriceFormProps {
    open: boolean;
    onClose: () => void;
    editData: StockContractPrice | null;
}

const StockContractPriceForm = React.memo(({ open, onClose, editData }: StockContractPriceFormProps) => {
    const createItemData = useCreateStockContractPrice();
    const updateItemData = useUpdateStockContractPrice();

    const debtors = useDebtorList({})?.data?.data?.rows;
    const stocks = useCompanyStockDetailsList({})?.data?.data?.rows;

    const isEditing = !!editData;

    const form = useForm({
        resolver: zodResolver(isEditing ? updatePriceDiscountSchema : createPriceDiscountSchema),
        defaultValues: {
            ...(isEditing ? { contractPriceId: editData.id } : {}),
            discountType: editData?.discountType || 'Discount per Product per Debtor',
            sellPriceExclusive: editData?.sellPriceExclusive ?? 0,
            sellPriceInclusive: editData?.sellPriceInclusive ?? 0,
            latestCost: editData?.latestCost ?? 0,
            profit: editData?.profit ?? undefined,
            gpPercent: editData?.gpPercent ?? undefined,
            discountPercent: editData?.discountPercent ?? 0,
            startDate: editData?.startDate || format(new Date(), 'yyyy-MM-dd'),
            endDate: editData?.endDate ?? undefined,
            companyDebtorId: editData?.companyDebtorId ?? undefined,
            companyStockDetailId: editData?.companyStockDetailId ?? undefined,
            ...(editData?.discountType !== 'Discount per Product per Debtor'
                ? {
                      minorDepartmentId: editData?.minorDepartmentId ?? undefined,
                      majorDepartmentId: editData?.majorDepartmentId ?? undefined,
                  }
                : {}),
            groupId: editData?.groupId ?? undefined,
        },
    });

    const { handleSubmit, control, watch, formState, reset, setValue } = form;
    const discountType = watch('discountType');

    useEffect(() => {
    if (open) {
        reset({
            ...(editData?.id ? { contractPriceId: editData.id } : {}),

            discountType:
                editData?.discountType || 'Discount per Product per Debtor',

            sellPriceExclusive: editData?.sellPriceExclusive ?? 0,
            sellPriceInclusive: editData?.sellPriceInclusive ?? 0,
            latestCost: editData?.latestCost ?? 0,
            profit: editData?.profit ?? undefined,
            gpPercent: editData?.gpPercent ?? undefined,
            discountPercent: editData?.discountPercent ?? 0,

            startDate:
                editData?.startDate ||
                format(new Date(), 'yyyy-MM-dd'),

            endDate: editData?.endDate ?? undefined,

            companyDebtorId:
                editData?.companyDebtorId ?? undefined,

            companyStockDetailId:
                editData?.companyStockDetailId ?? undefined,

            minorDepartmentId:
                editData?.minorDepartmentId ?? undefined,

            majorDepartmentId:
                editData?.majorDepartmentId ?? undefined,

            groupId: editData?.groupId ?? undefined,
        });
    }
}, [editData, open, reset]);

    const onSubmit = (values: CreatePriceDiscountSchema | UpdatePriceDiscountSchema) => {
        if (isEditing) {
            if (!editData.id) return toast.error('Tax Rate ID is required');

            return updateItemData.mutate(values as UpdatePriceDiscountSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Stock Contract Price updated successfully');
                        reset();
                        onClose();
                    } else {
                        toast.error('Stock Contract Price update failed');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }
        createItemData.mutate(values as CreatePriceDiscountSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Stock Contract Price created successfully');
                    reset();
                    onClose();
                } else {
                    toast.error('Stock Contract Price creation failed');
                }
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const companyStockDetailId = watch('companyStockDetailId');

    // useEffect(() => {
    //     if (companyStockDetailId) {
    //         const selectedStock = stocks?.find((stock) => stock.id === companyStockDetailId);

    //         setValue(
    //             'sellPriceExclusive',
    //             selectedStock?.pricingTypes?.find((type) => type?.isDefault)?.priceExclusive ||
    //                 selectedStock?.pricingTypes?.[0]?.priceExclusive ||
    //                 0,
    //         );

    //         setValue(
    //             'sellPriceInclusive',
    //             selectedStock?.pricingTypes?.find((type) => type?.isDefault)?.priceInclusive ||
    //                 selectedStock?.pricingTypes?.[0]?.priceInclusive ||
    //                 0,
    //         );
    //     }
    // }, [companyStockDetailId]);

    useEffect(() => {
    // skip auto-fill while editing
    if (isEditing) return;

    if (companyStockDetailId) {
        const selectedStock = stocks?.find(
            (stock) => stock.id === companyStockDetailId
        );

        setValue(
            'sellPriceExclusive',
            selectedStock?.pricingTypes?.find(
                (type) => type?.isDefault
            )?.priceExclusive ||
                selectedStock?.pricingTypes?.[0]?.priceExclusive ||
                0,
        );

        setValue(
            'sellPriceInclusive',
            selectedStock?.pricingTypes?.find(
                (type) => type?.isDefault
            )?.priceInclusive ||
                selectedStock?.pricingTypes?.[0]?.priceInclusive ||
                0,
        );
    }
}, [companyStockDetailId, stocks, isEditing, setValue]);

    return (
        <>
            <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {isEditing ? 'Edit Stock Contract Price' : 'Add New Stock Contract Price'}
                        </DialogTitle>
                        <DialogDescription>
                            {isEditing
                                ? 'Update the details of the stock contract price.'
                                : 'Enter the details to create a new stock contract price.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div
                                className="max-h-[70vh] space-y-4 overflow-auto pr-4 pb-4"
                                onWheel={(e) => e.stopPropagation()}
                            >
                                <div>
                                    <FormField
                                        control={control}
                                        name="discountType"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Discount Types <MandatoryField />
                                                </Label>

                                                <FormControl>
                                                    {contractPricesDebtorFilters && (
                                                        <SelectPopover
                                                            disabled={true}
                                                            options={contractPricesDebtorFilters.map((data) => ({
                                                                label: data,
                                                                value: data,
                                                            }))}
                                                            title="discount type"
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={control}
                                        name="discountPercent"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="discountPercent">Discount Percent *</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g., 10"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                                ? parseFloat(e.target.value)
                                                                : 0;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    {(discountType === 'Discount per Product per Debtor' ||
                                        discountType === 'Discount per Department per Debtor') && (
                                        <FormField
                                            control={control}
                                            name="companyDebtorId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">
                                                        Company Debtor <MandatoryField />
                                                    </Label>

                                                    <FormControl>
                                                        {debtors && (
                                                            <SelectPopover
                                                                options={debtors.map((data: CompanyCreditor) => ({
                                                                    label: `${data.name} (${data.accountNumber})`,
                                                                    value: data.id,
                                                                }))}
                                                                title="company debtor"
                                                                selectedValue={field.value}
                                                                onSelect={field.onChange}
                                                            />
                                                        )}
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {discountType === 'Discount per Product per Debtor' && (
                                        <FormField
                                            control={control}
                                            name="companyStockDetailId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">
                                                        Product <MandatoryField />
                                                    </Label>

                                                    <FormControl>
                                                        {stocks && (
                                                            <SelectPopover
                                                                options={stocks.map((data: StockDetails) => ({
                                                                    label: `${data.description} ${data.itemCode ? `(${data.itemCode})` : ''}`,
                                                                    value: data.id,
                                                                }))}
                                                                title="products"
                                                                selectedValue={field.value}
                                                                onSelect={field.onChange}
                                                            />
                                                        )}
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {(discountType === "Discount per Product per Debtor's Group" ||
                                        discountType === "Discount per Department per Debtor's group") && (
                                        <FormField
                                            control={control}
                                            name="groupId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Label htmlFor="groupId">Debtor Group Code *</Label>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g., GROUP789"
                                                            {...field}
                                                            value={field.value ?? ''}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    )}

                                    {discountType === 'Discount per Product per Debtor' && (
                                        <FormField
                                            control={control}
                                            name="gpPercent"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Label htmlFor="gpPercent">GP Percent *</Label>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g., 20"
                                                            {...field}
                                                            value={field.value ?? ''}
                                                            onChange={(e) => {
                                                                const value = e.target.value
                                                                    ? parseFloat(e.target.value)
                                                                    : 0;
                                                                field.onChange(value);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    {discountType !== 'Discount per Product per Debtor' && (
                                        <FormField
                                            control={control}
                                            name="minorDepartmentId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Label htmlFor="minorDepartmentId">Minor Department Code</Label>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="e.g., MINOR456"
                                                            {...field}
                                                            value={field.value ?? ''}
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-xs" />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <FormField
                                        control={control}
                                        name="sellPriceExclusive"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="sellPriceExclusive">Sell Price Excl. *</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g., 100.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                                ? parseFloat(e.target.value)
                                                                : 0;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="sellPriceInclusive"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="sellPriceInclusive">Sell Price Incl. *</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g., 120.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                                ? parseFloat(e.target.value)
                                                                : 0;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="latestCost"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="latestCost">Latest Cost *</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g., 80.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                                ? parseFloat(e.target.value)
                                                                : 0;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="profit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="profit">Profit @ Latest Cost *</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g., 20.00"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                                ? parseFloat(e.target.value)
                                                                : 0;
                                                            field.onChange(value);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="startDate">Start Date *</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <Label htmlFor="endDate">End Date</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage className="text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={formState.isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="bg-blue-600 hover:bg-blue-700"
                                        disabled={
                                            formState.isSubmitting ||
                                            createItemData.isPending ||
                                            updateItemData.isPending
                                            // isSubmitDisabled
                                        }
                                    >
                                        {formState.isSubmitting || createItemData.isPending || updateItemData.isPending
                                            ? 'Processing...'
                                            : isEditing
                                              ? 'Update Stock Contract Price'
                                              : 'Create Stock Contract Price'}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
});

export default StockContractPriceForm;
