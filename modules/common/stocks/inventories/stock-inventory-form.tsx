import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebtorList } from '@/api-queries/debtor';

// APIs & Types

import {
    StockInventoryDetails,
    StockInventoryCreateSchema,
    StockInventoryUpdateSchema,
    stockInventoryCreateSchema,
    stockInventoryUpdateSchema,
    useCreateStockInventory,
    useUpdateStockInventory,
} from '@/api-queries/company/stock-inventories';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { useAuthUser } from '@/stores/auth-user.store';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';
import { cleanDataPayload } from '@/utils/helpers';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import SelectPopover from '@/components/select-popover';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useEffect } from 'react';

interface StockInventoryFormProps {
    open: boolean;
    onClose: () => void;
    companyStockDetailId: string;
    editData: StockInventoryDetails | null;
    tab?: 'store' | 'warehouse';
    presetDebtorId?: string;
}

const StockInventoryForm = ({
    open,
    editData,
    onClose,
    companyStockDetailId,
    tab,
    presetDebtorId = '',
}: StockInventoryFormProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isStoreUser = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const warehousesRes = useGetWarehouses({});
    const rawWarehouses = (warehousesRes?.data?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses: WarehouseDetails[] = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : rawWarehouses?.rows || [];

    const createItemData = useCreateStockInventory();
    const updateItemData = useUpdateStockInventory();
    const companyId = useAuthUser((state) => state?.user?.companyId);
    const domainId = useAuthUser((state) => state?.user?.domainId);
    const debtors = useDebtorList({companyDebtorType: 'COMPANY_OWNED'})?.data?.data?.rows;

    const stockDetails = companyStockDetailId ? [] : useCompanyStockDetailsList({})?.data?.data?.rows;

    const isEditing = !!editData;
    const showPhysicalCount = isEditing && !isStoreUser;

    const form = useForm<StockInventoryCreateSchema | StockInventoryUpdateSchema>({
        resolver: zodResolver(isEditing ? stockInventoryUpdateSchema : stockInventoryCreateSchema),
        defaultValues: {
            companyStockDetailId: editData ? editData.companyStockDetailId : companyStockDetailId,
            companyDebtorId: editData?.companyDebtorId || (tab === 'store' ? presetDebtorId || undefined : undefined),
            warehouseId: editData?.warehouseId || undefined,
            location: editData?.location || undefined,
            batchNumber: editData?.batchNumber || undefined,
            expiryDate: editData?.expiryDate ? moment(editData.expiryDate).format('YYYY-MM-DD') : '',
            lastRestockDate: editData?.lastRestockDate ? moment(editData.lastRestockDate).format('YYYY-MM-DD') : '',
            lastSaleDate: editData?.lastSaleDate ? moment(editData.lastSaleDate).format('YYYY-MM-DD') : '',

            stockOnHand: editData?.stockOnHand || 0,
            reservedStock: editData?.reservedStock || 0,
            availableStock: editData?.availableStock || 0,
            minimumStockLevel: editData?.minimumStockLevel || 0,
            maximumStockLevel: editData?.maximumStockLevel || 0,

            unitCost: editData?.unitCost || 0,
            totalValue: editData?.totalValue || 0,

            ...(showPhysicalCount
                ? {
                      lastPhysicalCount: editData?.lastPhysicalCount || 0,
                      lastPhysicalCountDate: editData?.lastPhysicalCountDate
                          ? moment(editData.lastPhysicalCountDate).format('YYYY-MM-DD')
                          : '',
                  }
                : {}),

            ...(editData
                ? { companyStockInventoryId: editData.id }
                : { timezone: moment.tz.guess(), companyId, domainId }),
        },
    });

    const { handleSubmit, control } = form;

    function onSubmit(values: StockInventoryCreateSchema | StockInventoryUpdateSchema) {
        const payload = cleanDataPayload(values);
        if (editData) {
            if (!editData.id) return toast.error('Stock ID is required');

            return updateItemData.mutate(payload as StockInventoryUpdateSchema, {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Stock Inventory updated successfully');
                        form.reset();
                        onClose();
                    } else {
                        toast.error('Stock Inventory updation failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }

        createItemData.mutate(payload as StockInventoryCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Stock Inventory added successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Stock Inventory addition failed');
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
        <PageLoader isLoading={createItemData.isPending || updateItemData.isPending}>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[820px]" onWheel={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle className="font-semibold">
                            {isEditing ? 'Edit Inventory' : 'Add New Inventory'}
                        </DialogTitle>
                    </DialogHeader>

                    <Form {...form}>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                        >
                            <div className="max-h-[70vh] space-y-2 overflow-auto">
                                <div className="grid grid-cols-3 items-start gap-3">
                                    {!companyStockDetailId && stockDetails ? (
                                        <FormField
                                            control={control}
                                            name="companyStockDetailId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">
                                                        Products <MandatoryField parentFontSize />
                                                    </Label>

                                                    <FormControl>
                                                        <SelectPopover
                                                            options={stockDetails.map((data: StockDetails) => ({
                                                                label: `${data.description} (${data.itemCode})`,
                                                                value: data.id,
                                                            }))}
                                                            title="product"
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                            selectClass="h-7 text-xs"
                                                        />
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    ) : null}

                                    {tab !== 'warehouse' ? (
                                        <FormField
                                            control={control}
                                            name="companyDebtorId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">
                                                        Debtor / Store
                                                    </Label>

                                                    <FormControl>
                                                        <SelectPopover
                                                            title="debtor"
                                                            selectedValue={field.value}
                                                            options={
                                                                debtors
                                                                    ? debtors.map((debtor) => ({
                                                                        value: debtor?.id,
                                                                        label: `${debtor?.name} (${debtor?.accountNumber})`,
                                                                    }))
                                                                    : []
                                                            }
                                                            onSelect={field.onChange}
                                                            selectClass="h-7 text-xs"
                                                        />
                                                    </FormControl>

                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    ) : null}

                                    {tab !== 'store' ? (
                                        <FormField
                                            control={control}
                                            name="warehouseId"
                                            render={({ field }) => (
                                                <FormItem className="gap-1">
                                                    <Label className="gap-1 text-xs">Warehouse</Label>

                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger className="!h-7 text-xs">
                                                                <SelectValue placeholder="Select warehouse" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {warehouses &&
                                                                    warehouses?.map((data: WarehouseDetails) => (
                                                                        <SelectItem key={data.id} value={data.id}>
                                                                            {data.warehouse} ({data.groupCode})
                                                                        </SelectItem>
                                                                    ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                    <FormMessage className="text-[10px]" />
                                                </FormItem>
                                            )}
                                        />
                                    ) : null}

                                    <FormField
                                        control={control}
                                        name="batchNumber"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Batch Number</Label>

                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="h-7 text-xs"
                                                        placeholder="Enter Batch Number"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="unitCost"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Unit Cost (in {currencySymbol})</Label>
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

                                    <FormField
                                        control={control}
                                        name="totalValue"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Total Value <MandatoryField parentFontSize />
                                                </Label>
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
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Location</Label>

                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        className="h-7 text-xs"
                                                        placeholder="Enter city, state..."
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
                                        name="stockOnHand"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Stock on hand <MandatoryField parentFontSize />
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = isNaN(e.target.valueAsNumber)
                                                                ? 0
                                                                : e.target.valueAsNumber;

                                                            field.onChange(value);
                                                        }}
                                                        className="h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="reservedStock"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Reserved Stock</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        readOnly
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        className="h-7 cursor-default bg-gray-100 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="availableStock"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Available Stock <MandatoryField parentFontSize />
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const value = isNaN(e.target.valueAsNumber)
                                                                ? 0
                                                                : e.target.valueAsNumber;

                                                            field.onChange(value);
                                                        }}
                                                        className="h-7 text-xs"
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="minimumStockLevel"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Minimum Stock Level <MandatoryField parentFontSize />
                                                </Label>
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
                                        name="maximumStockLevel"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Maximum Stock Level <MandatoryField parentFontSize />
                                                </Label>
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
                                </div>

                                <div className="grid grid-cols-3 items-start gap-3">
                                    <div className="col-span-3">
                                        <Separator className="my-2" />
                                        <div className="font-semibold underline">Dates</div>
                                    </div>

                                    <FormField
                                        control={control}
                                        name="expiryDate"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Expiry</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="lastRestockDate"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Last Restock</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={control}
                                        name="lastSaleDate"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Last Sale</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>

                            {showPhysicalCount ? (
                                <div className="grid grid-cols-3 items-start gap-3">
                                    <div className="col-span-3">
                                        <Separator className="my-2" />
                                        <div className="font-semibold underline">Physical Stock</div>
                                    </div>

                                    <FormField
                                        control={control}
                                        name="lastPhysicalCount"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Physical Count</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        {...field}
                                                        value={field.value ?? ''}
                                                        onChange={(e) =>
                                                            field.onChange(
                                                                Number.isNaN(e.target.valueAsNumber)
                                                                    ? ''
                                                                    : e.target.valueAsNumber,
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
                                        name="lastPhysicalCountDate"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Physical Count Date</Label>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-7 text-xs" />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                    {isEditing ? 'Update Inventory' : 'Add Inventory'}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default StockInventoryForm;
