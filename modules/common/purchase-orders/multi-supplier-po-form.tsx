'use client';

import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import { cleanDataPayload } from '@/utils/helpers';
import {
    MultiSupplierCreateSchema,
    multiSupplierCreateSchema,
    useCreateMultiSupplierPurchaseOrder,
} from '@/api-queries/purchase-orders';
import { useCreditorList } from '@/api-queries/creditor';
import POItemsEditor from './components/po-items-editor';

interface MultiSupplierPOFormProps {
    open: boolean;
    onClose: () => void;
}

const MultiSupplierPOForm = ({ open, onClose }: MultiSupplierPOFormProps) => {
    const suppliers = useCreditorList({})?.data?.data?.rows;

    const createMulti = useCreateMultiSupplierPurchaseOrder();

    const form = useForm<MultiSupplierCreateSchema>({
        resolver: zodResolver(multiSupplierCreateSchema),
        defaultValues: {
            expectedDeliveryDate: '',
            poGroupName: '',
            paymentTerms: '',
            notes: '',
            suppliers: [
                {
                    companyCreditorId: '',
                    paymentTerms: '',
                    items: [],
                },
            ],
        },
    });

    const { handleSubmit, control } = form;
    const { fields, append, remove } = useFieldArray({ control, name: 'suppliers' });
    const suppliersWatch = useWatch({ control, name: 'suppliers' }) || [];

    function onSubmit(values: MultiSupplierCreateSchema) {
        const payload = cleanDataPayload(values);
        createMulti.mutate(payload as MultiSupplierCreateSchema, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success(data?.message || 'Multi-supplier purchase order created successfully');
                    toast.info(`${data.data?.supplierCount || 0} purchase orders created under ${data.data?.poGroupId || 'one group'}`);
                    form.reset();
                    onClose();
                } else {
                    toast.error(data?.message || 'Failed to create multi-supplier purchase order');
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[960px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Create Multi-Supplier Purchase Order</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs">
                        <div className="max-h-[70vh] overflow-auto">
                            <div className="grid grid-cols-2 items-start gap-3">
                                <FormField
                                    control={control}
                                    name="expectedDeliveryDate"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Expected Delivery Date <MandatoryField />
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
                                    name="poGroupName"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Group Name</Label>
                                            <FormControl>
                                                <Input {...field} className="h-7 text-xs" placeholder="e.g. Q2 Stock Replenishment" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="paymentTerms"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Payment Terms (global default)</Label>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-7 text-xs"
                                                    placeholder="e.g. Net 15 days unless overridden per supplier"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Notes</Label>
                                            <FormControl>
                                                <Input {...field} className="h-7 text-xs" placeholder="Enter notes" />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-gray-700">
                                    Suppliers <span className="font-normal text-muted-foreground">({fields.length} added)</span>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => append({ companyCreditorId: '', paymentTerms: '', items: [] })}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Supplier
                                </Button>
                            </div>

                            <div className="mt-2 text-[10px] text-amber-600">
                                A multi-supplier purchase order requires at least 2 suppliers. The requirement is split across them and
                                issued as independent POs bound by a shared poGroupId.
                            </div>

                            <Separator className="my-3" />

                            <div className="space-y-3">
                                {fields.map((fieldData, index) => (
                                    <div key={fieldData.id} className="space-y-2 rounded-md border border-gray-300 bg-white p-2">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="grid flex-1 grid-cols-2 gap-3">
                                                <FormField
                                                    control={control}
                                                    name={`suppliers.${index}.companyCreditorId`}
                                                    render={({ field }) => (
                                                        <FormItem className="gap-1">
                                                            <Label className="gap-1 text-xs">
                                                                Supplier <MandatoryField />
                                                            </Label>
                                                            <FormControl>
                                                                <SelectPopover
                                                                    options={(suppliers || []).map((data) => ({
                                                                        label: `${data.name} (${data.accountNumber})`,
                                                                        value: data.id,
                                                                    }))}
                                                                    title="Supplier"
                                                                    selectedValue={field.value}
                                                                    onSelect={field.onChange}
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="text-[10px]" />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={control}
                                                    name={`suppliers.${index}.paymentTerms`}
                                                    render={({ field }) => (
                                                        <FormItem className="gap-1">
                                                            <Label className="gap-1 text-xs">Payment Terms (this supplier)</Label>
                                                            <FormControl>
                                                                <Input
                                                                    {...field}
                                                                    className="h-7 text-xs"
                                                                    placeholder="Optional override, e.g. Net 30 days, ex-warehouse"
                                                                />
                                                            </FormControl>
                                                            <FormMessage className="text-[10px]" />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            {fields.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <POItemsEditor
                                            items={suppliersWatch[index]?.items || []}
                                            onChange={(items) =>
                                                form.setValue(`suppliers.${index}.items`, items, { shouldValidate: true })
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Create Multi-Supplier Purchase Order
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default MultiSupplierPOForm;