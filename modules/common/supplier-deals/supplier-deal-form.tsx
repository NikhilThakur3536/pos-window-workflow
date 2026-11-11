import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';

// APIs & Types

import {
    SupplierDealDetails,
    SupplierDealCreateSchema,
    SupplierDealUpdateSchema,
    supplierDealCreateSchema,
    supplierDealUpdateSchema,
    useCreateSupplierDeal,
    useUpdateSupplierDeal,
} from '@/api-queries/goods-receiving/supplier-deals';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { Separator } from '@/components/ui/separator';
import { cleanDataPayload } from '@/utils/helpers';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useCreditorList } from '@/api-queries/creditor';
import SelectPopover from '@/components/select-popover';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';

interface SupplierDealFormProps {
    open: boolean;
    onClose: () => void;
    editData: SupplierDealDetails | null;
}

const SupplierDealForm = ({ open, editData, onClose }: SupplierDealFormProps) => {
    const stockDetails = useCompanyStockDetailsList({})?.data?.data?.rows;
    const suppliers = useCreditorList({})?.data?.data?.rows;
    // Optional deal scope: a deal may target one store and/or one warehouse.
    const debtors = useDebtorList({ limit: 100, offset: 0 })?.data?.data?.rows || [];
    // The warehouse list response has arrived as both an array and a { rows } wrapper.
    const rawWarehouses: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouses: WarehouseDetails[] = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : (rawWarehouses as { rows?: WarehouseDetails[] } | undefined)?.rows || [];

    const createItemData = useCreateSupplierDeal();
    const updateItemData = useUpdateSupplierDeal();

    const isEditing = !!editData;

    // Deals can optionally be scoped to a debtor and/or warehouse.
    const activeUser = useAuthUser((state) => state.user);

    const form = useForm<SupplierDealCreateSchema | SupplierDealUpdateSchema>({
        resolver: zodResolver(isEditing ? supplierDealUpdateSchema : supplierDealCreateSchema),
        defaultValues: {
            companyStockId: editData?.companyStockId || '',
            companyCreditorId: editData?.companyCreditorId || '',
            companyDebtorId: editData?.companyDebtorId || activeUser?.companyDebtorId || '',
            companyWarehouseId: editData?.companyWarehouseId || activeUser?.warehouseId || '',
            unitCode: editData?.unitCode || '',
            shrinkCode: editData?.shrinkCode || '',
            caseCode: editData?.caseCode || '',
            description: editData?.description || '',
            packdes: editData?.packdes || '',
            packSize: editData?.packSize || 0,
            dealUnit: editData?.dealUnit ?? 0,
            dealShrink: editData?.dealShrink || 0,
            startDate: editData?.startDate ? moment(editData.startDate).format('yyyy-MM-DD') : '',
            endDate: editData?.endDate ? moment(editData.endDate).format('yyyy-MM-DD') : '',
            ...(editData ? { supplierDealId: editData.id } : { timezone: moment.tz.guess() }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: SupplierDealCreateSchema | SupplierDealUpdateSchema) {
        const payload = cleanDataPayload(values);

        if (editData) {
            if (!editData.id) return toast.error('Supplier Deal ID is required');

            return updateItemData.mutate(payload as SupplierDealUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Supplier Deal updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Supplier Deal updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as SupplierDealCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Supplier Deal created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Supplier Deal creation failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response.data.message || 'Internal Server Error!');
            },
        });
    }

    function onOpenChange() {
        form.reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit Supplier Deal' : 'Add New Supplier Deal'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="companyCreditorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Supplier <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {suppliers && (
                                                    <SelectPopover
                                                        options={suppliers.map((data) => ({
                                                            label: `${data.name} (${data.accountNumber})`,
                                                            value: data.id,
                                                        }))}
                                                        title="Supplier"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="companyStockId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Stock <MandatoryField />
                                            </Label>

                                            <FormControl>
                                                {stockDetails && (
                                                    <SelectPopover
                                                        options={stockDetails.map((data) => ({
                                                            label: `${data.description} (${data?.itemCode})`,
                                                            value: data.id,
                                                        }))}
                                                        title="stock"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                {/* Store/warehouse scoped users are locked to their own scope. */}
                                {!activeUser?.companyDebtorId && (
                                    <FormField
                                        control={control}
                                        name="companyDebtorId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Store / Debtor</Label>
                                                <FormControl>
                                                    <SelectPopover
                                                        onlyTitle="Company-wide"
                                                        options={[
                                                            { label: 'Company-wide', value: '' },
                                                            ...debtors.map((data) => ({
                                                                label: data.name,
                                                                value: data.id,
                                                            })),
                                                        ]}
                                                        title="Store / Debtor"
                                                        selectedValue={field.value || ''}
                                                        onSelect={(value) => field.onChange(value || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {!activeUser?.warehouseId && (
                                    <FormField
                                        control={control}
                                        name="companyWarehouseId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Warehouse</Label>
                                                <FormControl>
                                                    <SelectPopover
                                                        onlyTitle="Company-wide"
                                                        options={[
                                                            { label: 'Company-wide', value: '' },
                                                            ...warehouses.map((data) => ({
                                                                label: data.name,
                                                                value: data.id,
                                                            })),
                                                        ]}
                                                        title="Warehouse"
                                                        selectedValue={field.value || ''}
                                                        onSelect={(value) => field.onChange(value || '')}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                <FormField
                                    control={control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Start Date <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input type="date" {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                End Date <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input type="date" {...field} className="h-7 text-xs" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Separator className="mt-3" />

                            <div className="grid grid-cols-3 items-start gap-3 space-y-2">
                                <FormField
                                    control={control}
                                    name="dealUnit"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Deal Price <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mt-2 grid grid-cols-3 items-start gap-3 space-y-2">
                                <FormField
                                    control={control}
                                    name="packSize"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Pack Size</Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="dealShrink"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Deal Shrink Price</Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    value={field.value ?? ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                                    className="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="packdes"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Pack Description</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="Enter Pack Description"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="unitCode"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Unit Code</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="Enter Unit Code"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="caseCode"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Case Code</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="Enter Case Code"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="shrinkCode"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Shrink Code</Label>

                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="Enter Shrink Code"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                {isEditing ? 'Update Supplier Deal' : 'Create Supplier Deal'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SupplierDealForm;
