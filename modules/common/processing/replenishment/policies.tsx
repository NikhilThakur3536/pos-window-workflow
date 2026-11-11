import { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { useForm, Controller } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmDialog from '@/components/confirm-dialog';
import SelectPopover from '@/components/select-popover';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { debtorGroupLabel, useGetDebtorGroups } from '@/api-queries/debtor/company-debtor-group';
import { useGetWarehouses } from '@/api-queries/warehouse';
import {
    type PolicyScopeType,
    type ReplenishmentPolicy,
    type ReplenishmentPolicyCreateSchema,
    type ReplenishmentPolicyUpdateSchema,
    getReplenishmentPolicies,
    replenishmentPolicyCreateSchema,
    replenishmentPolicyUpdateSchema,
    useCreateReplenishmentPolicy,
    useDeleteReplenishmentPolicy,
    useGetReplenishmentPolicies,
    useUpdateReplenishmentPolicy,
} from '@/api-queries/replenishment';
import { ReplenishmentTabs } from './components';
import { getLoginScope } from './scope';

const MONTH_OPTIONS = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
];

const num = (v?: number | string | null) => (v === null || v === undefined || v === '' ? '—' : v);

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

interface PolicyFormValues {
    id?: string;
    scopeType: PolicyScopeType;
    companyDebtorId?: string;
    warehouseId?: string;
    lookbackDays: number;
    coverDays: number;
    seasonalStartMonth: number;
    seasonalEndMonth: number;
    seasonalUpliftPercent: number;
    includeIncomingStock: boolean;
    includeReservedDemand: boolean;
    notes?: string;
    timezone?: string;
}

interface PolicyFormDialogProps {
    editing: ReplenishmentPolicy | null;
    allowedTypes: PolicyScopeType[];
    fixedStoreId?: string;
    fixedWarehouseId?: string;
    onClose: () => void;
}

const PolicyFormDialog = ({ editing, allowedTypes, fixedStoreId, fixedWarehouseId, onClose }: PolicyFormDialogProps) => {
    const isEdit = !!editing;
    const stores = useDebtorList({ limit: 500 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];

    const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
    const createPolicy = useCreateReplenishmentPolicy();
    const updatePolicy = useUpdateReplenishmentPolicy();

    const initialScope = (editing?.scopeType as PolicyScopeType) || allowedTypes[0] || 'COMPANY';
    const resolver = useMemo(
        () =>
            (isEdit
                ? zodResolver(replenishmentPolicyUpdateSchema)
                : zodResolver(replenishmentPolicyCreateSchema)) as unknown as Resolver<PolicyFormValues>,
        [isEdit],
    );

    const form = useForm<PolicyFormValues>({
        resolver,
        defaultValues: {
            id: editing?.id,
            scopeType: initialScope,
            companyDebtorId: editing?.companyDebtorId || fixedStoreId || '',
            warehouseId: editing?.warehouseId || fixedWarehouseId || '',
            lookbackDays: editing?.lookbackDays ?? 45,
            coverDays: editing?.coverDays ?? (initialScope === 'STORE' ? 14 : 45),
            seasonalStartMonth: editing?.seasonalStartMonth ?? 10,
            seasonalEndMonth: editing?.seasonalEndMonth ?? 12,
            seasonalUpliftPercent: editing?.seasonalUpliftPercent ?? (initialScope === 'STORE' ? 30 : 40),
            includeIncomingStock: editing?.includeIncomingStock ?? true,
            includeReservedDemand: editing?.includeReservedDemand ?? true,
            notes: editing?.notes || '',
            timezone: moment.tz.guess(),
        },
    });

    const scopeType = form.watch('scopeType');
    const isWarehouse = scopeType === 'WAREHOUSE';
    const scopeLocked = isEdit || !!fixedStoreId || !!fixedWarehouseId;

    const handleScopeTypeChange = (next: PolicyScopeType) => {
        form.setValue('scopeType', next);
        form.setValue('companyDebtorId', next === 'STORE' ? fixedStoreId || '' : '');
        form.setValue('warehouseId', next === 'WAREHOUSE' ? fixedWarehouseId || '' : '');
        if (next === 'WAREHOUSE') {
            form.setValue('lookbackDays', 45);
            form.setValue('coverDays', 45);
            form.setValue('seasonalUpliftPercent', 40);
        } else if (next === 'STORE') {
            form.setValue('coverDays', 14);
            form.setValue('seasonalUpliftPercent', 30);
        }
        setApiErrors({});
    };

    const submit = (values: PolicyFormValues) => {
        const onSuccess = (res: { success?: boolean; message?: string }) => {
            if (res?.success === false) {
                setApiErrors(collectErrors(res));
                return;
            }
            toast.success(isEdit ? 'Policy updated' : 'Policy saved');
            onClose();
        };
        const onError = (error: unknown) => {
            const data = (error as { response?: { data?: unknown } })?.response?.data;
            const errors = collectErrors(data || error);
            setApiErrors(errors);
            toast.error(errors._ || 'Failed to save policy');
        };

        if (isEdit) {
            const payload: ReplenishmentPolicyUpdateSchema = {
                id: values.id as string,
                scopeType: values.scopeType,
                companyDebtorId: values.companyDebtorId,
                warehouseId: values.warehouseId,
                lookbackDays: values.lookbackDays,
                coverDays: values.coverDays,
                seasonalStartMonth: values.seasonalStartMonth,
                seasonalEndMonth: values.seasonalEndMonth,
                seasonalUpliftPercent: values.seasonalUpliftPercent,
                includeIncomingStock: values.includeIncomingStock,
                includeReservedDemand: values.includeReservedDemand,
                notes: values.notes,
            };
            updatePolicy.mutate(payload, { onSuccess, onError });
            return;
        }

        const payload: ReplenishmentPolicyCreateSchema = {
            scopeType: values.scopeType,
            ...(values.scopeType === 'STORE' ? { companyDebtorId: values.companyDebtorId } : {}),
            ...(values.scopeType === 'WAREHOUSE' ? { warehouseId: values.warehouseId } : {}),
            lookbackDays: values.lookbackDays,
            coverDays: values.coverDays,
            seasonalStartMonth: values.seasonalStartMonth,
            seasonalEndMonth: values.seasonalEndMonth,
            seasonalUpliftPercent: values.seasonalUpliftPercent,
            includeIncomingStock: values.includeIncomingStock,
            includeReservedDemand: values.includeReservedDemand,
            ...(values.notes ? { notes: values.notes } : {}),
            timezone: values.timezone,
        };
        createPolicy.mutate(payload, { onSuccess, onError });
    };

    const isPending = createPolicy.isPending || updatePolicy.isPending;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Policy' : 'New Policy'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-muted-foreground">Scope</Label>
                            <select
                                value={scopeType}
                                onChange={(e) => handleScopeTypeChange(e.target.value as PolicyScopeType)}
                                disabled={scopeLocked}
                                className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none disabled:opacity-60"
                            >
                                {allowedTypes.map((t) => (
                                    <option key={t} value={t}>
                                        {t === 'COMPANY' ? 'Company' : t === 'STORE' ? 'Store' : 'Warehouse / DC'}
                                    </option>
                                ))}
                            </select>
                            {fieldError(apiErrors, 'scopeType', form.formState.errors.scopeType) && (
                                <p className="mt-1 text-xs text-red-600">{fieldError(apiErrors, 'scopeType', form.formState.errors.scopeType)}</p>
                            )}
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
                                            disabled={!!fixedStoreId}
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
                                            disabled={!!fixedWarehouseId}
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

                        <div>
                            <Label className="text-xs text-muted-foreground">Lookback Days</Label>
                            <Input
                                type="number"
                                readOnly={isWarehouse}
                                className={`mt-1 h-8 ${isWarehouse ? 'bg-muted text-muted-foreground' : ''}`}
                                {...form.register('lookbackDays', { valueAsNumber: true })}
                            />
                            {fieldError(apiErrors, 'lookbackDays', form.formState.errors.lookbackDays) && (
                                <p className="mt-1 text-xs text-red-600">{fieldError(apiErrors, 'lookbackDays', form.formState.errors.lookbackDays)}</p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">
                                Coverage Days {isWarehouse ? '(fixed)' : scopeType === 'STORE' ? '(12 – 21)' : ''}
                            </Label>
                            <Input
                                type="number"
                                readOnly={isWarehouse}
                                className={`mt-1 h-8 ${isWarehouse ? 'bg-muted text-muted-foreground' : ''}`}
                                {...form.register('coverDays', { valueAsNumber: true })}
                            />
                            {fieldError(apiErrors, 'coverDays', form.formState.errors.coverDays) && (
                                <p className="mt-1 text-xs text-red-600">{fieldError(apiErrors, 'coverDays', form.formState.errors.coverDays)}</p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">
                                Seasonal Uplift % {isWarehouse ? '(fixed)' : scopeType === 'STORE' ? '(25 – 40)' : ''}
                            </Label>
                            <Input
                                type="number"
                                readOnly={isWarehouse}
                                className={`mt-1 h-8 ${isWarehouse ? 'bg-muted text-muted-foreground' : ''}`}
                                {...form.register('seasonalUpliftPercent', { valueAsNumber: true })}
                            />
                            {fieldError(apiErrors, 'seasonalUpliftPercent', form.formState.errors.seasonalUpliftPercent) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'seasonalUpliftPercent', form.formState.errors.seasonalUpliftPercent)}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Season Start Month</Label>
                            <Controller
                                control={form.control}
                                name="seasonalStartMonth"
                                render={({ field }) => (
                                    <select
                                        value={String(field.value ?? '')}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                    >
                                        {MONTH_OPTIONS.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            />
                            {fieldError(apiErrors, 'seasonalStartMonth', form.formState.errors.seasonalStartMonth) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'seasonalStartMonth', form.formState.errors.seasonalStartMonth)}
                                </p>
                            )}
                        </div>

                        <div>
                            <Label className="text-xs text-muted-foreground">Season End Month</Label>
                            <Controller
                                control={form.control}
                                name="seasonalEndMonth"
                                render={({ field }) => (
                                    <select
                                        value={String(field.value ?? '')}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                    >
                                        {MONTH_OPTIONS.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            />
                            {fieldError(apiErrors, 'seasonalEndMonth', form.formState.errors.seasonalEndMonth) && (
                                <p className="mt-1 text-xs text-red-600">
                                    {fieldError(apiErrors, 'seasonalEndMonth', form.formState.errors.seasonalEndMonth)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Controller
                            control={form.control}
                            name="includeIncomingStock"
                            render={({ field }) => (
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                                    Include incoming stock
                                </label>
                            )}
                        />
                        <Controller
                            control={form.control}
                            name="includeReservedDemand"
                            render={({ field }) => (
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                                    Include reserved demand
                                </label>
                            )}
                        />
                    </div>

                    <div>
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <Input {...form.register('notes')} className="mt-1 h-8" placeholder="Optional" />
                    </div>

                    {apiErrors._ && <p className="text-xs text-red-600">{apiErrors._}</p>}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isPending} className="flex items-center gap-1">
                            {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            {isEdit ? 'Save Changes' : 'Create Policy'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

const PoliciesScreen = () => {
    const userGroupPermissions = useUsersPermissions();
    const user = useAuthUser((state) => state.user);
    const loginScope = useMemo(() => getLoginScope(user), [user]);

    const canManage = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code,
        [SYSTEM_PERMISSIONS.CREATE],
    );

    const fixedStoreId = loginScope.fixed?.type === 'STORE' ? loginScope.fixed.companyDebtorId : undefined;
    const fixedWarehouseId = loginScope.fixed?.type === 'WAREHOUSE' ? loginScope.fixed.warehouseId : undefined;
    const allowedTypes: PolicyScopeType[] = fixedStoreId
        ? ['STORE']
        : fixedWarehouseId
          ? ['WAREHOUSE']
          : loginScope.allowedTypes.length === 1 && loginScope.allowedTypes[0] === 'WAREHOUSE'
            ? ['WAREHOUSE']
            : ['COMPANY', 'STORE', 'WAREHOUSE'];

    const stores = useDebtorList({ limit: 500 })?.data?.data?.rows;
    const groups = useGetDebtorGroups({ limit: 500 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ReplenishmentPolicy | null>(null);
    const [deleting, setDeleting] = useState<ReplenishmentPolicy | null>(null);

    const query = useGetReplenishmentPolicies({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const policies = useMemo(() => getReplenishmentPolicies(query.data), [query.data]);
    const totalCount = query.data?.count ?? policies.length;

    const deletePolicy = useDeleteReplenishmentPolicy();

    const scopeLabelOf = (type?: string) => {
        switch (type) {
            case 'COMPANY':
                return 'Company';
            case 'STORE':
                return 'Store';
            case 'STORE_GROUP':
                return 'Store Group';
            case 'WAREHOUSE':
                return 'Warehouse / DC';
            default:
                return type || '—';
        }
    };

    const locationLabel = (policy: ReplenishmentPolicy) => {
        if (policy.scopeType === 'STORE')
            return (
                policy.storeName ||
                (stores || []).find((s) => s.id === policy.companyDebtorId)?.name ||
                policy.companyDebtorId ||
                '—'
            );
        if (policy.scopeType === 'STORE_GROUP')
            return (
                policy.groupName ||
                debtorGroupLabel((groups || []).find((g) => g.id === policy.companyDebtorGroupId)) ||
                policy.companyDebtorGroupId ||
                '—'
            );
        if (policy.scopeType === 'WAREHOUSE')
            return (
                policy.warehouseName ||
                warehouses.find((w) => w.id === policy.warehouseId)?.name ||
                policy.warehouseId ||
                '—'
            );
        return 'Company-wide';
    };

    const fmtMonth = (m?: number) => (m && m >= 1 && m <= 12 ? MONTH_OPTIONS[m - 1].label.slice(0, 3) : '—');

    const columns: ColumnDef<ReplenishmentPolicy>[] = [
        { id: 'scope', header: 'Scope', cell: ({ row }) => scopeLabelOf(row.original.scopeType as string) },
        { id: 'location', header: 'Store Group / Store / Warehouse', cell: ({ row }) => locationLabel(row.original) },
        { id: 'lookback', header: 'Lookback Days', cell: ({ row }) => num(row.original.lookbackDays) },
        { id: 'cover', header: 'Coverage Days', cell: ({ row }) => num(row.original.coverDays) },
        {
            id: 'season',
            header: 'Seasonal Months',
            cell: ({ row }) => `${fmtMonth(row.original.seasonalStartMonth)} – ${fmtMonth(row.original.seasonalEndMonth)}`,
        },
        { id: 'uplift', header: 'Seasonal Uplift %', cell: ({ row }) => num(row.original.seasonalUpliftPercent) },
        {
            id: 'incoming',
            header: 'Incoming Stock',
            cell: ({ row }) => (row.original.includeIncomingStock ? 'Included' : 'Excluded'),
        },
        {
            id: 'reserved',
            header: 'Reserved Demand',
            cell: ({ row }) => (row.original.includeReservedDemand ? 'Included' : 'Excluded'),
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <Badge variant="outline">{String(row.original.status || 'ACTIVE')}</Badge>,
        },
        ...(canManage
            ? [
                  {
                      id: 'actions',
                      header: '',
                      cell: ({ row }: { row: { original: ReplenishmentPolicy } }) => (
                          <div className="flex items-center gap-1">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                      setEditing(row.original);
                                      setDialogOpen(true);
                                  }}
                              >
                                  <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => setDeleting(row.original)}
                              >
                                  <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                          </div>
                      ),
                  } as ColumnDef<ReplenishmentPolicy>,
              ]
            : []),
    ];

    const confirmDelete = () => {
        if (!deleting?.id) return;
        deletePolicy.mutate(deleting.id, {
            onSuccess: (res) => {
                if (res?.success === false) {
                    toast.error(res.message || 'Failed to delete policy');
                    return;
                }
                toast.success('Policy deleted');
                setDeleting(null);
            },
            onError: (error: unknown) =>
                toast.error(
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                        'Failed to delete policy',
                ),
        });
    };

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-3">
                <ReplenishmentTabs active="policies" />

                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold">Reorder policies</div>
                        <p className="text-xs text-muted-foreground">
                            Resolution order for a store: Store → Store Group → Company → Default.
                        </p>
                    </div>
                    {canManage && (
                        <Button
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                                setEditing(null);
                                setDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" /> New Policy
                        </Button>
                    )}
                </div>

                <DataTable
                    query={query}
                    data={policies}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalCount}
                    getRowId={(row, index) => row.id || String(index)}
                />
            </div>

            {dialogOpen && (
                <PolicyFormDialog
                    key={editing?.id || 'new'}
                    editing={editing}
                    allowedTypes={allowedTypes}
                    fixedStoreId={fixedStoreId}
                    fixedWarehouseId={fixedWarehouseId}
                    onClose={() => {
                        setDialogOpen(false);
                        setEditing(null);
                    }}
                />
            )}

            {deleting && (
                <ConfirmDialog
                    open={!!deleting}
                    setOpen={(open) => !open && setDeleting(null)}
                    title="Delete this policy?"
                    description="This action cannot be undone. The location will fall back to its parent/default policy."
                    variant="destructive"
                    confirmBtnTitle="Delete"
                    onConfirm={confirmDelete}
                />
            )}
        </PageLoader>
    );
};

export default PoliciesScreen;
