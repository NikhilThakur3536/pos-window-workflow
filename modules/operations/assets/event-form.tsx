import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { cleanDataPayload } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import SelectPopover from '@/components/select-popover';
import {
    assetEventSchema,
    useCreateAssetEvent,
    useGetAssetList,
    AssetEventCreateSchema,
    AssetEventType,
    ASSET_EVENT_TYPES,
    ASSET_CONDITIONS,
    ASSET_RETURN_STATUSES,
    CompanyAsset,
} from '@/api-queries/company-asset';
import { useGetUsers } from '@/api-queries/user';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';

interface AssetEventFormProps {
    open: boolean;
    onClose: () => void;
    // When a specific asset is passed (register row action) the asset picker is hidden.
    asset?: CompanyAsset | null;
}

const LABEL_FOR: Record<AssetEventType, string> = {
    ASSIGN: 'Assign to user',
    RETURN: 'Return to warehouse',
    TRANSFER: 'Transfer to another store / head office',
    SERVICE: 'Service / maintenance',
    BREAKDOWN: 'Breakdown',
    REPAIR_OUT: 'Send out for repair',
    REPAIR_IN: 'Repair completed / back in',
    WARRANTY_CLAIM: 'Warranty claim',
    RETIRE: 'Retire asset',
    LOST: 'Mark as lost',
};

const AssetEventForm = ({ open, onClose, asset }: AssetEventFormProps) => {
    const createEvent = useCreateAssetEvent();
    const assets = useGetAssetList({ limit: 200 });
    const assetRows = Array.isArray(assets.data?.data) ? assets.data?.data : assets.data?.data?.rows || [];

    const usersQuery = useGetUsers({ limit: 200 });
    const users = usersQuery.data?.data || [];

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 200 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; warehouse: string }[] = Array.isArray(warehousesRes)
        ? (warehousesRes as { id: string; warehouse: string }[])
        : ((warehousesRes as { rows?: { id: string; warehouse: string }[] } | undefined)?.rows || []);
    useEffect(() => {
        if (open) {
            form.reset();
        }
    }, [open]);

    const form = useForm<AssetEventCreateSchema>({
        resolver: zodResolver(assetEventSchema) as Resolver<AssetEventCreateSchema>,
        defaultValues: {
            companyAssetId: asset?.id || '',
            eventType: '' as AssetEventType,
            clientEventId: '',
            toHeadOffice: false,
            isWarrantyCovered: false,
            notes: '',
        },
    });

    const { handleSubmit, control, watch, setValue } = form;
    const eventType = watch('eventType');

    // clientEventId carries the selected event type enum (e.g. "ASSIGN").
    // It lives in form state so the Zod resolver sees it during validation.
    useEffect(() => {
        setValue('clientEventId', eventType || '');
    }, [eventType, setValue]);

    const userOptions = users.map((u) => ({
        value: u.id,
        label: [u.firstName, u.surname].filter(Boolean).join(' ') || u.email || u.id,
    }));

    const assetOptions = assetRows.map((a) => ({
        value: a.id,
        label: `[${a.assetCode || '—'}] ${a.name}`,
    }));

    const storeOptions = (debtors || []).map((d) => ({ value: d.id, label: d.name }));
    const warehouseOptions = (warehouses || []).map((w) => ({
        value: w.id,
        label: (w.warehouse || '').trim(),
    }));

    function onSubmit(values: AssetEventCreateSchema) {
        const payload = cleanDataPayload({
            ...values,
            clientEventId: values.eventType,
        }) as Partial<AssetEventCreateSchema>;

        // The API expects ISO datetimes for schedule/complete dates.
        const toISO = (value: string | undefined) =>
            value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value;
        if (payload.scheduledFor) payload.scheduledFor = toISO(payload.scheduledFor);
        if (payload.completedAt) payload.completedAt = toISO(payload.completedAt);

        createEvent.mutate(payload as AssetEventCreateSchema, {
            onSuccess: () => {
                toast.success('Asset event logged successfully');
                form.reset();
                onClose();
            },
            onError: (error) => {
                toast.error('Failed to log asset event', {
                    description: (error as { response?: { data?: { message?: string } } })?.response?.data?.message,
                });
            },
        });
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-[720px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">Log Asset Event</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={handleSubmit(onSubmit, (errors) => {
                            console.log('Validation errors:', errors);
                            toast.error('Please fix the highlighted fields');
                        })}
                        className="space-y-3 rounded-md border border-blue-500 bg-gray-100 p-3 text-xs"
                    >
                        <div className="grid grid-cols-3 items-start gap-3">
                            {!asset ? (
                                <FormField
                                    control={control}
                                    name="companyAssetId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Asset <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="asset"
                                                    selectedValue={field.value || null}
                                                    options={assetOptions}
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
                                name="eventType"
                                render={({ field }) => (
                                    <FormItem className="gap-1">
                                        <Label className="gap-1 text-xs">
                                            Event Type <MandatoryField parentFontSize />
                                        </Label>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="!h-7 text-xs">
                                                    <SelectValue placeholder="Select event type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ASSET_EVENT_TYPES.map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {LABEL_FOR[t]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage className="text-[10px]" />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {asset ? (
                            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs">
                                <span className="font-medium">Asset:</span>{' '}
                                <span>
                                    [{asset.assetCode || '—'}] {asset.name}
                                </span>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-3 items-start gap-3">
                            {eventType === 'ASSIGN' ? (
                                <FormField
                                    control={control}
                                    name="toUserId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Assign To (User) <MandatoryField parentFontSize />
                                            </Label>
                                            <FormControl>
                                                <SelectPopover
                                                    title="user"
                                                    selectedValue={field.value || null}
                                                    options={userOptions}
                                                    onSelect={(v) => field.onChange(v || '')}
                                                    selectClass="h-7 text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {eventType === 'RETURN' ? (
                                <FormField
                                    control={control}
                                    name="toWarehouseId"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Return To (Warehouse) <MandatoryField parentFontSize />
                                            </Label>
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

                            {eventType === 'TRANSFER' ? (
                                <>
                                    <FormField
                                        control={control}
                                        name="toCompanyDebtorId"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Transfer To (Store) <MandatoryField parentFontSize />
                                                </Label>
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
                                    <FormField
                                        control={control}
                                        name="toHeadOffice"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 pt-5">
                                                <Switch
                                                    checked={!!field.value}
                                                    onCheckedChange={(v) => {
                                                        field.onChange(v);
                                                        if (v) setValue('toCompanyDebtorId', undefined);
                                                    }}
                                                />
                                                <Label className="text-xs">Transfer to Head Office</Label>
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}

                            {eventType === 'SERVICE' || eventType === 'REPAIR_OUT' ? (
                                <FormField
                                    control={control}
                                    name="vendorName"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">
                                                Vendor Name{' '}
                                                {eventType === 'SERVICE' ? <MandatoryField parentFontSize /> : null}
                                            </Label>
                                            <FormControl>
                                                <Input
                                                    className="h-7 text-xs"
                                                    placeholder="eg. IT Care"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {eventType === 'REPAIR_OUT' ? (
                                <FormField
                                    control={control}
                                    name="externalReference"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Job / External Ref</Label>
                                            <FormControl>
                                                <Input
                                                    className="h-7 text-xs"
                                                    placeholder="eg. JOB-778"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {eventType === 'WARRANTY_CLAIM' ? (
                                <>
                                    <FormField
                                        control={control}
                                        name="externalReference"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Claim Ref <MandatoryField parentFontSize />
                                                </Label>
                                                <FormControl>
                                                    <Input
                                                        className="h-7 text-xs"
                                                        placeholder="eg. WC-55"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="vendorName"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Warranty Provider</Label>
                                                <FormControl>
                                                    <Input
                                                        className="h-7 text-xs"
                                                        placeholder="eg. Dell"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}

                            {eventType === 'SERVICE' || eventType === 'REPAIR_OUT' ? (
                                <FormField
                                    control={control}
                                    name="scheduledFor"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Scheduled Date</Label>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    className="h-7 text-xs"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px]" />
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {eventType === 'SERVICE' ? (
                                <>
                                    <FormField
                                        control={control}
                                        name="completedAt"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Completed Date</Label>
                                                <FormControl>
                                                    <Input
                                                        type="date"
                                                        className="h-7 text-xs"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="cost"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Cost</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-7 text-xs"
                                                        placeholder="0.00"
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const n = e.target.valueAsNumber;
                                                            field.onChange(Number.isNaN(n) ? undefined : n);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}

                            {eventType === 'REPAIR_IN' ? (
                                <>
                                    <FormField
                                        control={control}
                                        name="cost"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">Repair Cost</Label>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-7 text-xs"
                                                        placeholder="0.00"
                                                        value={field.value ?? ''}
                                                        onChange={(e) => {
                                                            const n = e.target.valueAsNumber;
                                                            field.onChange(Number.isNaN(n) ? undefined : n);
                                                        }}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="isWarrantyCovered"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 pt-5">
                                                <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                                <Label className="text-xs">Warranty Covered</Label>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={control}
                                        name="returnStatus"
                                        render={({ field }) => (
                                            <FormItem className="gap-1">
                                                <Label className="gap-1 text-xs">
                                                    Return Status <MandatoryField parentFontSize />
                                                </Label>
                                                <FormControl>
                                                    <Select onValueChange={field.onChange} value={field.value || ''}>
                                                        <SelectTrigger className="!h-7 text-xs">
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ASSET_RETURN_STATUSES.map((s) => (
                                                                <SelectItem key={s} value={s}>
                                                                    {s}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            ) : null}

                            {eventType === 'WARRANTY_CLAIM' ? (
                                <FormField
                                    control={control}
                                    name="isWarrantyCovered"
                                    render={({ field }) => (
                                        <FormItem className="flex items-center gap-2 pt-5">
                                            <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                            <Label className="text-xs">Warranty Covered</Label>
                                        </FormItem>
                                    )}
                                />
                            ) : null}

                            {eventType === 'RETURN' || eventType === 'SERVICE' || eventType === 'BREAKDOWN' || eventType === 'REPAIR_IN' ? (
                                <FormField
                                    control={control}
                                    name="conditionAfter"
                                    render={({ field }) => (
                                        <FormItem className="gap-1">
                                            <Label className="gap-1 text-xs">Condition After</Label>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value || ''}>
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
                            ) : null}
                        </div>

                        <FormField
                            control={control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">Notes</Label>
                                    <FormControl>
                                        <Textarea className="text-xs" rows={2} placeholder="Optional notes" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700">
                                Log Event
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default AssetEventForm;