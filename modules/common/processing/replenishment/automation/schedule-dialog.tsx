import { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SelectPopover from '@/components/select-popover';
import { Loader2 } from 'lucide-react';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useGetCompanies } from '@/api-queries/company-details';
import { useCompanyStockPricingTypeList } from '@/api-queries/company/stock-pricing-type';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    type AutomationFrequency,
    type AutomationOutputType,
    type AutomationScheduleCreateSchema,
    type AutomationScheduleUpdateSchema,
    type AutomationScopeType,
    type ReplenishmentAutomationSchedule,
    AUTOMATION_FREQUENCIES,
    AUTOMATION_SCOPE_TYPES,
    AUTOMATION_WEEKDAYS,
    useSaveAutomationSchedule,
} from '@/api-queries/replenishment-automation';
import { automationOutputLabel, automationScopeLabel } from './components';

// Create / edit sheet for a replenishment automation schedule.
//
// Business rules enforced by the backend and mirrored here:
//   - A store schedule creates a Store Order (REQUESTED). It carries the store id and
//     the selling price type, and never a warehouse id.
//   - A company / warehouse schedule creates draft Purchase Orders grouped by supplier.
//     It never carries a store id nor a store selling price type.
//   - The target (scope + location) and the output type are fixed once the schedule
//     exists: an edit only changes the name, the timing, the supply source and the
//     enabled flag.
//   - A schedule is always created disabled first so the settings can be verified
//     before the first run.

const TIMEZONES = moment.tz.names();

const scheduleFormSchema = z
    .object({
        name: z.string().min(1, 'Schedule name is required'),
        scopeType: z.enum(['STORE', 'COMPANY', 'WAREHOUSE']),
        outputType: z.enum(['STORE_ORDER', 'PURCHASE_ORDER']),
        companyDebtorId: z.string().optional(),
        warehouseId: z.string().optional(),
        sourceCompanyId: z.string().optional(),
        sourceWarehouseId: z.string().optional(),
        companyStockPricingTypeId: z.string().optional(),
        frequency: z.enum(AUTOMATION_FREQUENCIES),
        weekday: z.number().min(0).max(6),
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Local time must be HH:mm'),
        timezone: z.string().min(1, 'Timezone is required'),
        enabled: z.boolean(),
    })
    .superRefine((val, ctx) => {
        if (val.scopeType === 'STORE' && !val.companyDebtorId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['companyDebtorId'],
                message: 'Select the store this schedule replenishes.',
            });
        }
        if (val.scopeType === 'WAREHOUSE' && !val.warehouseId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['warehouseId'],
                message: 'Select the warehouse this schedule replenishes.',
            });
        }
    });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

interface ScheduleDialogProps {
    editing: ReplenishmentAutomationSchedule | null;
    onClose: () => void;
    onSaved?: (scheduleId?: string) => void;
}

const collectErrors = (source: unknown): Record<string, string> => {
    const out: Record<string, string> = {};
    if (!source || typeof source !== 'object') return out;
    const data = source as { message?: string; errors?: Record<string, unknown> };
    if (data.message) out._ = data.message;
    if (data.errors && typeof data.errors === 'object') {
        Object.entries(data.errors).forEach(([key, value]) => {
            out[key] = Array.isArray(value)
                ? String(value[0])
                : typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value);
        });
    }
    return out;
};

const fieldError = (errors: Record<string, string>, key: string, fallback?: { message?: string }) =>
    errors[key] || fallback?.message;

const ScheduleDialog = ({ editing, onClose, onSaved }: ScheduleDialogProps) => {
    const isEdit = !!editing;
    const currentCompany = useAuthUser((state) => state.company);
    const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
    const saveSchedule = useSaveAutomationSchedule();

    const stores = useDebtorList({ limit: 500 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];
    const pricingTypesRes = useCompanyStockPricingTypeList({ limit: 200 })?.data?.data?.rows;
    const pricingTypes: { id: string; name: string }[] = pricingTypesRes || [];
    const companiesRes = useGetCompanies({ limit: 100 })?.data?.data;
    const companies: { id: string; companyName: string }[] = Array.isArray(companiesRes) ? companiesRes : [];

    const initialScope = (editing?.scopeType?.toUpperCase() as AutomationScopeType) || 'STORE';
    const initialOutput: AutomationOutputType =
        (editing?.outputType?.toUpperCase() as AutomationOutputType) ||
        (initialScope === 'STORE' ? 'STORE_ORDER' : 'PURCHASE_ORDER');

    const resolver = useMemo(() => zodResolver(scheduleFormSchema) as unknown as Resolver<ScheduleFormValues>, []);

    const form = useForm<ScheduleFormValues>({
        resolver,
        defaultValues: {
            name: editing?.name || '',
            scopeType: initialScope,
            outputType: initialOutput,
            companyDebtorId: editing?.companyDebtorId || '',
            warehouseId: editing?.warehouseId || '',
            sourceCompanyId: editing?.sourceCompanyId || currentCompany?.id || '',
            sourceWarehouseId: editing?.sourceWarehouseId || '',
            companyStockPricingTypeId: editing?.companyStockPricingTypeId || '',
            frequency: (editing?.frequency?.toUpperCase() as AutomationFrequency) || 'DAILY',
            weekday: typeof editing?.weekday === 'number' ? editing.weekday : 1,
            localTime: editing?.localTime || '09:00',
            timezone: editing?.timezone || moment.tz.guess(),
            // A new schedule is always saved disabled so the settings can be verified
            // before the first run. An existing schedule keeps its current flag.
            enabled: editing ? !!editing.enabled : false,
        },
    });

    const scopeType = form.watch('scopeType');
    const frequency = form.watch('frequency');
    const isStoreScope = scopeType === 'STORE';
    const targetLocked = isEdit;

    // The output type is derived from the target: a store is replenished with a store
    // order, a company or a warehouse with supplier purchase orders.
    useEffect(() => {
        const next: AutomationOutputType = scopeType === 'STORE' ? 'STORE_ORDER' : 'PURCHASE_ORDER';
        if (form.getValues('outputType') !== next) form.setValue('outputType', next);
    }, [scopeType, form]);

    // A target change invalidates the location that belongs to the other scope.
    const handleScopeChange = (next: AutomationScopeType) => {
        form.setValue('scopeType', next);
        form.setValue('outputType', next === 'STORE' ? 'STORE_ORDER' : 'PURCHASE_ORDER');
        form.setValue('companyDebtorId', '');
        form.setValue('warehouseId', '');
        setApiErrors({});
    };

    const submit = (values: ScheduleFormValues) => {
        const onSuccess = (res: { success?: boolean; message?: string; data?: { id?: string } }) => {
            if (res?.success === false) {
                setApiErrors(collectErrors(res));
                return;
            }
            toast.success(isEdit ? 'Schedule updated' : 'Schedule saved');
            onSaved?.(res?.data?.id || editing?.id);
            onClose();
        };
        const onError = (error: unknown) => {
            const data = (error as { response?: { data?: unknown } })?.response?.data;
            const errors = collectErrors(data || error);
            setApiErrors(errors);
            toast.error(errors._ || 'Failed to save the schedule');
        };

        if (isEdit) {
            // Only the editable fields travel on an update. The target and the output
            // type are fixed for the life of the schedule.
            const payload: AutomationScheduleUpdateSchema = {
                id: editing?.id as string,
                name: values.name.trim(),
                sourceCompanyId: values.sourceCompanyId || null,
                sourceWarehouseId: values.sourceWarehouseId || null,
                frequency: values.frequency,
                ...(values.frequency === 'WEEKLY' ? { weekday: values.weekday } : {}),
                localTime: values.localTime,
                timezone: values.timezone,
                enabled: values.enabled,
            };
            saveSchedule.mutate(payload, { onSuccess, onError });
            return;
        }

        const payload: AutomationScheduleCreateSchema = {
            name: values.name.trim(),
            scopeType: values.scopeType,
            outputType: values.outputType,
            ...(values.scopeType === 'STORE' ? { companyDebtorId: values.companyDebtorId || null } : {}),
            ...(values.scopeType === 'WAREHOUSE' ? { warehouseId: values.warehouseId || null } : {}),
            sourceCompanyId: values.sourceCompanyId || null,
            sourceWarehouseId: values.sourceWarehouseId || null,
            ...(values.scopeType === 'STORE' ? { companyStockPricingTypeId: values.companyStockPricingTypeId || null } : {}),
            frequency: values.frequency,
            ...(values.frequency === 'WEEKLY' ? { weekday: values.weekday } : {}),
            localTime: values.localTime,
            timezone: values.timezone,
            // A new schedule is always created disabled: it is enabled from the
            // schedules list once the settings were verified.
            enabled: false,
        };
        saveSchedule.mutate(payload, { onSuccess, onError });
    };

    const isPending = saveSchedule.isPending;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Schedule' : 'New Schedule'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
                    <div>
                        <Label className="text-xs text-muted-foreground">Schedule Name</Label>
                        <Input
                            {...form.register('name')}
                            className="mt-1 h-8"
                            placeholder="e.g. FINETECH daily replenishment"
                        />
                        {fieldError(apiErrors, 'name', form.formState.errors.name) && (
                            <p className="mt-1 text-xs text-red-600">
                                {fieldError(apiErrors, 'name', form.formState.errors.name)}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Target</Label>
                            <select
                                value={scopeType}
                                onChange={(e) => handleScopeChange(e.target.value as AutomationScopeType)}
                                disabled={targetLocked}
                                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none disabled:opacity-60"
                            >
                                {AUTOMATION_SCOPE_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {automationScopeLabel(type)}
                                    </option>
                                ))}
                            </select>
                            {targetLocked && (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    The target of a schedule cannot be changed after it was created.
                                </p>
                            )}
                            {fieldError(apiErrors, 'scopeType', form.formState.errors.scopeType) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'scopeType', form.formState.errors.scopeType)}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Creates</Label>
                            <Input
                                value={automationOutputLabel(form.watch('outputType'))}
                                readOnly
                                disabled
                                className="mt-1 h-8 bg-muted text-muted-foreground"
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                {isStoreScope
                                    ? 'A Store Order in REQUESTED state is created for the store.'
                                    : 'Draft Purchase Orders grouped by supplier are created.'}
                            </p>
                        </div>

                        {scopeType === 'STORE' && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Store</Label>
                                <Controller
                                    control={form.control}
                                    name="companyDebtorId"
                                    render={({ field }) => (
                                        <SelectPopover
                                            title="Store"
                                            options={(stores || []).map((d) => ({ value: d.id, label: d.name }))}
                                            selectedValue={field.value || null}
                                            onSelect={(v) => field.onChange(v || '')}
                                            disabled={targetLocked}
                                            selectClass="h-8 text-sm"
                                            wrapperClass="mt-1"
                                        />
                                    )}
                                />
                                {fieldError(apiErrors, 'companyDebtorId', form.formState.errors.companyDebtorId) && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {fieldError(apiErrors, 'companyDebtorId', form.formState.errors.companyDebtorId)}
                                    </p>
                                )}
                            </div>
                        )}

                        {scopeType === 'WAREHOUSE' && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Warehouse / DC</Label>
                                <Controller
                                    control={form.control}
                                    name="warehouseId"
                                    render={({ field }) => (
                                        <SelectPopover
                                            title="Warehouse"
                                            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                                            selectedValue={field.value || null}
                                            onSelect={(v) => field.onChange(v || '')}
                                            disabled={targetLocked}
                                            selectClass="h-8 text-sm"
                                            wrapperClass="mt-1"
                                        />
                                    )}
                                />
                                {fieldError(apiErrors, 'warehouseId', form.formState.errors.warehouseId) && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {fieldError(apiErrors, 'warehouseId', form.formState.errors.warehouseId)}
                                    </p>
                                )}
                            </div>
                        )}

                        {isStoreScope && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Selling Price Type</Label>
                                <Controller
                                    control={form.control}
                                    name="companyStockPricingTypeId"
                                    render={({ field }) => (
                                        <SelectPopover
                                            title="Selling Price Type"
                                            options={pricingTypes.map((p) => ({ value: p.id, label: p.name }))}
                                            selectedValue={field.value || null}
                                            onSelect={(v) => field.onChange(v || '')}
                                            selectClass="h-8 text-sm"
                                            wrapperClass="mt-1"
                                        />
                                    )}
                                />
                                {fieldError(
                                    apiErrors,
                                    'companyStockPricingTypeId',
                                    form.formState.errors.companyStockPricingTypeId,
                                ) && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {fieldError(
                                            apiErrors,
                                            'companyStockPricingTypeId',
                                            form.formState.errors.companyStockPricingTypeId,
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-md border bg-muted/20 p-3">
                        <div className="mb-2 text-xs font-semibold">Supply source</div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">Source Company</Label>
                                <Controller
                                    control={form.control}
                                    name="sourceCompanyId"
                                    render={({ field }) => (
                                        <SelectPopover
                                            title="Source Company"
                                            options={[
                                                ...(currentCompany
                                                    ? [
                                                          {
                                                              value: currentCompany.id,
                                                              label: currentCompany.companyName || 'Current company',
                                                          },
                                                          ]
                                                    : []),
                                                ...companies.map((c) => ({ value: c.id, label: c.companyName })),
                                            ].filter(
                                                (option, index, list) =>
                                                    list.findIndex((o) => o.value === option.value) === index,
                                            )}
                                            selectedValue={field.value || null}
                                            onSelect={(v) => field.onChange(v || '')}
                                            selectClass="h-8 text-sm"
                                            wrapperClass="mt-1"
                                        />
                                    )}
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Source Warehouse / DC</Label>
                                <Controller
                                    control={form.control}
                                    name="sourceWarehouseId"
                                    render={({ field }) => (
                                        <SelectPopover
                                            title="Source Warehouse"
                                            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                                            selectedValue={field.value || null}
                                            onSelect={(v) => field.onChange(v || '')}
                                            selectClass="h-8 text-sm"
                                            wrapperClass="mt-1"
                                        />
                                    )}
                                />
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                    Leave empty to supply from the company / DC.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Frequency</Label>
                            <select
                                value={frequency}
                                onChange={(e) => form.setValue('frequency', e.target.value as AutomationFrequency)}
                                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                            >
                                {AUTOMATION_FREQUENCIES.map((f) => (
                                    <option key={f} value={f}>
                                        {f === 'DAILY' ? 'Daily' : 'Weekly'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {frequency === 'WEEKLY' && (
                            <div>
                                <Label className="text-xs text-muted-foreground">Day of Week</Label>
                                <Controller
                                    control={form.control}
                                    name="weekday"
                                    render={({ field }) => (
                                        <select
                                            value={String(field.value ?? 1)}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                        >
                                            {AUTOMATION_WEEKDAYS.map((d) => (
                                                <option key={d.value} value={d.value}>
                                                    {d.label}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                />
                            </div>
                        )}

                        <div>
                            <Label className="text-xs text-muted-foreground">Local Time</Label>
                            <Input type="time" {...form.register('localTime')} className="mt-1 h-8" />
                            {fieldError(apiErrors, 'localTime', form.formState.errors.localTime) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'localTime', form.formState.errors.localTime)}
                                </p>
                            )}
                        </div>

                        <div className={frequency === 'WEEKLY' ? 'col-span-1' : 'col-span-2'}>
                            <Label className="text-xs text-muted-foreground">Timezone</Label>
                            <Controller
                                control={form.control}
                                name="timezone"
                                render={({ field }) => (
                                    <select
                                        value={field.value || moment.tz.guess()}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                    >
                                        {TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>
                                                {tz}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            />
                            {fieldError(apiErrors, 'timezone', form.formState.errors.timezone) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'timezone', form.formState.errors.timezone)}
                                </p>
                            )}
                        </div>
                    </div>

                    {isEdit ? (
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <Controller
                                control={form.control}
                                name="enabled"
                                render={({ field }) => (
                                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                                )}
                            />
                            Enabled — the schedule runs automatically at the configured time
                        </label>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">
                            New schedules are saved disabled. Verify the settings, then enable the schedule from the
                            schedules list.
                        </p>
                    )}

                    {apiErrors._ && <p className="text-xs text-red-600">{apiErrors._}</p>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending} className="flex items-center gap-1">
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Schedule'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ScheduleDialog;
