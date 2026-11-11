import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import SelectPopover from '@/components/select-popover';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useCompanyStockPricingList } from '@/api-queries/company/stock-pricing';
import { scheduledPricingSchema, ScheduledPricingSchema, useSchedulePricing } from '@/api-queries/scheduled-pricing';
import moment from 'moment-timezone';

interface SchedulePricingDialogProps {
    open: boolean;
    onClose: () => void;
}

const SchedulePricingDialog = ({ open, onClose }: SchedulePricingDialogProps) => {
    const LIMIT = 100;
    const [stockRows, setStockRows] = useState<StockDetails[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [offset, setOffset] = useState(0);

    const stockQuery = useCompanyStockDetailsList({
        limit: LIMIT,
        offset,
        ...(searchTerm ? { search: searchTerm } : {}),
    });
    const stockCount = stockQuery?.data?.data?.count ?? 0;

    const offsetRef = useRef(offset);
    offsetRef.current = offset;

    useEffect(() => {
        const data = stockQuery?.data?.data;
        if (!data) return;
        setStockRows(offsetRef.current === 0 ? data.rows : (prev) => [...prev, ...data.rows]);
    }, [stockQuery?.data]);

    const schedulePricing = useSchedulePricing();

    const [selectedStockId, setSelectedStockId] = useState<string>('');
    const pricingQuery = useCompanyStockPricingList(selectedStockId);

    const form = useForm<ScheduledPricingSchema>({
        resolver: zodResolver(scheduledPricingSchema),
        defaultValues: {
            pricingId: '',
            priceExclusive: 0,
            priceInclusive: 0,
            effectiveAt: '',
        },
    });

    const { handleSubmit, control, reset, setValue } = form;

    useEffect(() => {
        if (open) {
            setSelectedStockId('');
            setSearchTerm('');
            setOffset(0);
            setStockRows([]);
            reset({
                pricingId: '',
                priceExclusive: 0,
                priceInclusive: 0,
                effectiveAt: '',
            });
            stockQuery.refetch();
        }
    }, [open, reset]);

    const handleStockSearch = useCallback((term: string) => {
        setSearchTerm(term);
        setOffset(0);
    }, []);

    const pricingTypes = pricingQuery?.data?.rows || [];

    const pricingOptions = pricingTypes
        .flatMap((pt) => pt.pricingTypes || [])
        .filter((t) => t && t.id)
        .map((t) => ({
            label: `${t.type?.name || 'Pricing'} (excl ${t.priceExclusive ?? ''})`,
            value: t.id,
        }));

    const onSubmit = (values: ScheduledPricingSchema) => {
        const payload = {
            ...values,
            effectiveAt: moment(values.effectiveAt).toISOString(),
        };

        schedulePricing.mutate(payload, {
            onSuccess: (res) => {
                if (res?.success) {
                    toast.success('Price scheduled successfully');
                    reset();
                    onClose();
                } else {
                    toast.error(res?.message || 'Failed to schedule price');
                }
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to schedule price');
            },
        });
    };

    function onOpenChange() {
        reset();
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Schedule Price Change</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Stock Item <MandatoryField />
                                </Label>
                                {stockRows.length > 0 && (
                                    <SelectPopover
                                        options={stockRows.map((data: StockDetails) => ({
                                            label: `${data.description} (${data.itemCode})`,
                                            value: data.id,
                                        }))}
                                        title="Stock Item"
                                        selectedValue={selectedStockId}
                                        onSelect={(value) => {
                                            setSelectedStockId(value || '');
                                            setValue('pricingId', '');
                                        }}
                                        mandatoryField
                                        onSearch={handleStockSearch}
                                        isSearching={stockQuery?.isFetching}
                                        hasMore={stockRows.length < stockCount}
                                        onLoadMore={() => setOffset((prev) => prev + LIMIT)}
                                    />
                                )}
                            </div>

                            <FormField
                                control={control}
                                name="pricingId"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Pricing <MandatoryField />
                                        </Label>
                                        <FormControl>
                                            {!selectedStockId ? (
                                                <p className="text-xs text-muted-foreground">
                                                    Select a stock item first to choose its pricing.
                                                </p>
                                            ) : (
                                                <SelectPopover
                                                    options={pricingOptions}
                                                    title="Pricing"
                                                    selectedValue={field.value}
                                                    onSelect={field.onChange}
                                                    mandatoryField
                                                />
                                            )}
                                        </FormControl>
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={control}
                                    name="priceExclusive"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <Label className="text-sm font-medium">
                                                Price (Excl.) <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={control}
                                    name="priceInclusive"
                                    render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <Label className="text-sm font-medium">
                                                Price (Incl.) <MandatoryField />
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                />
                                            </FormControl>
                                            <FormMessage className="!text-xs" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={control}
                                name="effectiveAt"
                                render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Effective Date &amp; Time <MandatoryField />
                                        </Label>
                                        <FormControl>
                                            <Input type="datetime-local" {...field} />
                                        </FormControl>
                                        <FormMessage className="!text-xs" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={schedulePricing.isPending}>
                                {schedulePricing.isPending ? 'Scheduling...' : 'Schedule Price'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default SchedulePricingDialog;
