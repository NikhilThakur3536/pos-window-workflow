import moment from 'moment-timezone';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage, FormLabel } from '@/components/ui/form';

// APIs & Types

import {
    RetailPromotionCreateSchema,
    retailRetailPromotionCreateSchema,
    useCreateRetailPromotion,
} from '@/api-queries/promotions/retail-promotions';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Separator } from '@/components/ui/separator';
import { cleanDataPayload } from '@/utils/helpers';
import SelectPopover from '@/components/select-popover';
import { useGetPromotions } from '@/api-queries/promotions';
import { useDebtorList } from '@/api-queries/debtor';
import MultiSelectFormElement from '@/components/multi-select-form-element';
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
// import ImportModule from '@/components/import-sheets/import-module';

interface RetailPromotionFormProps {
    open: boolean;
    onClose: () => void;
}

const RetailPromotionForm = ({ open, onClose }: RetailPromotionFormProps) => {
    const promotions = useGetPromotions({})?.data?.data?.rows;

    const createItemData = useCreateRetailPromotion();

    const form = useForm<RetailPromotionCreateSchema>({
        resolver: zodResolver(retailRetailPromotionCreateSchema),
        defaultValues: {
            companyStockPromotionId: '',
            companyDebtorIds: [],
            allStore: false,
            timezone: moment.tz.guess(),
        },
    });

    const { handleSubmit, control } = form;

    const selectedPromotion = form.watch('companyStockPromotionId');
    const promotionBatchCode = promotions?.find((promotion) => promotion?.id === selectedPromotion)?.promotionBatchCode;

    const retailStores = useDebtorList({
        ...(promotionBatchCode ? { promotionBatchCode } : {}),
        companyDebtorType: 'COMPANY_OWNED',
    })?.data?.data?.rows;

    function onSubmit(values: RetailPromotionCreateSchema) {
        const payload = cleanDataPayload(values);

        if (payload?.companyDebtorIds && payload?.companyDebtorIds[0] === 'ALL') {
            delete payload.companyDebtorIds;
            payload.allStore = true;
        }

        createItemData.mutate(payload as RetailPromotionCreateSchema, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Retail Promotion(s) created successfully');
                    form.reset();
                    onClose();
                } else {
                    toast.error('Retail Promotion(s) creation failed');
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

    const [isForAll, setIsForAll] = useState(false);

    useEffect(() => {
        if (isForAll) {
            form.setValue('companyDebtorIds', ['ALL']);
        } else {
            form.setValue('companyDebtorIds', []);
        }
    }, [isForAll]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">Add New Retail Promotion</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="max-h-[70vh] overflow-auto">
                            <div className="my-3 flex w-full items-center justify-center gap-2">
                                <Separator className="flex-1" />
                                <div className="text-lg font-bold">Promotion</div>
                                <Separator className="flex-1" />
                            </div>

                            <div className="grid grid-cols-2 items-center gap-3">
                                <FormField
                                    control={control}
                                    name="companyStockPromotionId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <FormControl>
                                                {promotions && (
                                                    <SelectPopover
                                                        options={promotions.map((data) => ({
                                                            label: `${data.promotionDescription} (${data.promotionBatchCode})`,
                                                            value: data.id,
                                                        }))}
                                                        title="Promotion"
                                                        selectedValue={field.value}
                                                        onSelect={field.onChange}
                                                    />
                                                )}
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex-end flex items-center justify-end gap-5">
                                    <FormLabel htmlFor="isForAll">Create for all stores?</FormLabel>
                                    <Checkbox
                                        id="isForAll"
                                        checked={isForAll}
                                        onCheckedChange={() => setIsForAll(!isForAll)}
                                    />
                                </div>
                            </div>

                            <div className="my-3 flex w-full items-center justify-center gap-2">
                                <Separator className="flex-1" />
                                <div className="text-lg font-bold">Stores</div>
                                <Separator className="flex-1" />
                            </div>

                            <div>
                                {isForAll ? (
                                    <div className="w-full text-center text-lg font-semibold text-green-700">
                                        All Stores are selected
                                    </div>
                                ) : (
                                    <FormField
                                        control={control}
                                        name="companyDebtorIds"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <FormControl>
                                                    {retailStores && (
                                                        <MultiSelectFormElement
                                                            options={retailStores
                                                                ?.filter((store) => !store?.isPromotionExist)
                                                                .map((data) => ({
                                                                    label: `${data.name} (${data?.accountNumber})`,
                                                                    value: data.id,
                                                                }))}
                                                            title={
                                                                selectedPromotion
                                                                    ? 'Select stores'
                                                                    : 'Please select promotion first to map stores'
                                                            }
                                                            selectedValue={field.value}
                                                            onSelect={field.onChange}
                                                            disabled={!selectedPromotion}
                                                        />
                                                    )}
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>

                            <div className="my-2 flex items-center justify-between gap-2"></div>

                            <div className="mt-2 flex h-[25vh] w-full flex-col space-y-2 overflow-hidden rounded-lg border p-2">
                                <div className="text-base font-semibold text-blue-700">Already Mapped Stores : </div>

                                <div className="h-full flex-1 overflow-auto">
                                    {retailStores?.filter((store) => store?.isPromotionExist)?.length === 0 ? (
                                        <div className="flex h-full w-full items-center justify-center text-base text-gray-800 italic">
                                            {selectedPromotion
                                                ? 'No stores mapped yet to the selected promotion'
                                                : 'No promotion selected yet'}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                            {retailStores
                                                ?.filter((store) => store?.isPromotionExist)
                                                ?.map((store) => (
                                                    <div key={store?.id} className="rounded-sm bg-white p-1">
                                                        {store?.name} ({store?.accountNumber})
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>

                            {/* <ImportModule module="Promotion_Retail" route="simplePromotionRetail" noLabel /> */}

                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Create Promotion
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default RetailPromotionForm;
