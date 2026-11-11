import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { cleanDataPayload } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import {
    assetBaseSchema,
    useSaveAsset,
    AssetCreateSchema,
    ASSET_CATEGORIES,
    ASSET_CONDITIONS,
    CompanyAsset,
} from '@/api-queries/company-asset';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';

interface AssetFormProps {
    open: boolean;
    onClose: () => void;
    editData: CompanyAsset | null;
}

type LocationType = 'STORE' | 'DC' | 'NONE';

const AssetForm = ({ open, onClose, editData }: AssetFormProps) => {
    const isEditing = !!editData;
    const saveAsset = useSaveAsset();

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 200 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes)
        ? (warehousesRes as { id: string; name: string }[])
        : ((warehousesRes as { rows?: { id: string; name: string }[] } | undefined)?.rows || []);

    const storeOptions = (debtors || []).map((d) => ({ value: d.id, label: d.name }));
    const warehouseOptions = (warehouses || []).map((w) => ({ value: w.id, label: w.name }));

    const [locationType, setLocationType] = useState<LocationType>(() =>
        editData?.companyDebtorId ? 'STORE' : editData?.warehouseId ? 'DC' : 'NONE',
    );

    const form = useForm<AssetCreateSchema>({
        resolver: zodResolver(assetBaseSchema) as Resolver<AssetCreateSchema>,
        defaultValues: {
            assetCode: editData?.assetCode || '',
            name: editData?.name || '',
            category: editData?.category || 'COMPUTER',
            companyDebtorId: editData?.companyDebtorId || undefined,
            warehouseId: editData?.warehouseId || undefined,
            brand: editData?.brand || '',
            model: editData?.model || '',
            serialNumber: editData?.serialNumber || '',
            purchaseDate: editData?.purchaseDate || '',
            purchaseCost: editData?.purchaseCost ?? undefined,
            supplierName: editData?.supplierName || '',
            warrantyStartDate: editData?.warrantyStartDate || '',
            warrantyExpiryDate: editData?.warrantyExpiryDate || '',
            warrantyProvider: editData?.warrantyProvider || '',
            serviceIntervalDays: editData?.serviceIntervalDays ?? undefined,
            lastServiceDate: editData?.lastServiceDate || '',
            condition: editData?.condition || 'NEW',
        },
    });

    const { handleSubmit, control, setValue, formState } = form;

    useEffect(() => {
        if (open) {
            setLocationType(editData?.companyDebtorId ? 'STORE' : editData?.warehouseId ? 'DC' : 'NONE');
            form.reset();
        }
    }, [open]);

    const onLocationChange = (value: LocationType) => {
        setLocationType(value);
        setValue('companyDebtorId', value === 'STORE' ? form.getValues('companyDebtorId') : undefined);
        setValue('warehouseId', value === 'DC' ? form.getValues('warehouseId') : undefined);
    };

    function onSubmit(values: AssetCreateSchema) {
        const payload = cleanDataPayload(values);
        if (isEditing && editData) {
            saveAsset.mutate(
                { ...(payload as Partial<AssetCreateSchema>), id: editData.id, version: editData.version },
                {
                    onSuccess: () => {
                        toast.success('Asset updated successfully');
                        form.reset();
                        onClose();
                    },
                    onError: (error) => {
                        toast.error('Failed to update asset', {
                            description: (error as { response?: { data?: { message?: string } } })?.response?.data
                                ?.message,
                        });
                    },
                },
            );
            return;
        }

        saveAsset.mutate(payload as AssetCreateSchema, {
            onSuccess: () => {
                toast.success('Asset registered successfully');
                form.reset();
                onClose();
            },
            onError: (error) => {
                toast.error('Failed to register asset', {
                    description: (error as { response?: { data?: { message?: string } } })?.response?.data?.message,
                });
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[820px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {isEditing ? 'Edit Asset' : 'Register Asset'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="grid grid-cols-3 items-start gap-3">
                            <FormField
                                control={control}
                                name="assetCode"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Asset Code <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. PC-001" {...field} value={field.value || ''} />
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
                                            Asset Name <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. Till PC 1" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Category <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ASSET_CATEGORIES.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c.replace(/_/g, ' ')}
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
                                name="condition"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Condition <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select condition" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ASSET_CONDITIONS.map((c) => (
                                                        <SelectItem key={c} value={c}>
                                                            {c}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormItem className="gap-1">
                                <Label className="gap-1 text-xs">Location</Label>
                                <Select
                                    value={locationType}
                                    onValueChange={(v) => onLocationChange(v as LocationType)}
                                >
                                    <SelectTrigger className="!h-7 text-xs">
                                        <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STORE">Store</SelectItem>
                                        <SelectItem value="DC">Warehouse / DC</SelectItem>
                                        <SelectItem value="NONE">Head Office</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>

                            {locationType === 'STORE' ? (
                                <FormField
                                    control={control}
                                    name="companyDebtorId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Store</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="store"
                                                    selectedValue={field.value || null}
                                                    options={storeOptions}
                                                    onSelect={(v) => field.onChange(v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {locationType === 'DC' ? (
                                <FormField
                                    control={control}
                                    name="warehouseId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Warehouse / DC</Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="warehouse"
                                                    selectedValue={field.value || null}
                                                    options={warehouseOptions}
                                                    onSelect={(v) => field.onChange(v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            <FormField
                                control={control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Brand</Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. Dell" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Model</Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. OptiPlex 3000" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="serialNumber"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Serial Number</Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. SN12345" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="supplierName"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Supplier</Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. Dell SA" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="purchaseDate"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Purchase Date</Label>
                                        <FormControl>
                                            <Input type="date" className="h-7 text-xs" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="purchaseCost"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Purchase Cost</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="h-7 text-xs"
                                                placeholder="0.00"
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="serviceIntervalDays"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Service Interval (days)</Label>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                className="h-7 text-xs"
                                                placeholder="eg. 180"
                                                value={field.value ?? ''}
                                                onChange={(e) => field.onChange(e.target.valueAsNumber || '')}
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="lastServiceDate"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Last Service Date</Label>
                                        <FormControl>
                                            <Input type="date" className="h-7 text-xs" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="warrantyStartDate"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Warranty Start</Label>
                                        <FormControl>
                                            <Input type="date" className="h-7 text-xs" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="warrantyExpiryDate"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Warranty Expiry</Label>
                                        <FormControl>
                                            <Input type="date" className="h-7 text-xs" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={control}
                                name="warrantyProvider"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">Warranty Provider</Label>
                                        <FormControl>
                                            <Input className="h-7 text-xs" placeholder="eg. Dell" {...field} value={field.value || ''} />
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {formState.isValid ? null : (
                            <p className="text-[10px] text-red-600">Please complete the required fields before saving.</p>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                {isEditing ? 'Update Asset' : 'Save Asset'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default AssetForm;