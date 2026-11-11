'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import {
    useSaveCompanyDebtorOrderConfiguration,
    useGetCompanyDebtorOrderConfiguration,
    useGetCompanyDebtorOrderConfigurations,
    useDeleteCompanyDebtorOrderConfiguration,
    COMPANY_DEBTOR_ORDER_SOURCES,
    DELIVERY_FREQUENCIES,
    BATCH_ALLOCATION_STRATEGIES,
    type CompanyDebtorOrderConfiguration,
} from '@/api-queries/company-debtor-orders';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useGetUsers, type UserDetails } from '@/api-queries/user';
import { useAuthUser } from '@/stores/auth-user.store';
import { toast } from 'sonner';
import { Save, Trash2, Building2, Check } from 'lucide-react';
import { DataTable } from '@/components/dynamic-table/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import ConfirmDialog from '@/components/confirm-dialog';

const DAYS = [
    { value: '1', label: 'Monday' },
    { value: '2', label: 'Tuesday' },
    { value: '3', label: 'Wednesday' },
    { value: '4', label: 'Thursday' },
    { value: '5', label: 'Friday' },
    { value: '6', label: 'Saturday' },
    { value: '7', label: 'Sunday' },
];

const Configuration = () => {
    const currentUser = useAuthUser((state) => state.user);
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';

    const initialFilters = { search: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters(initialFilters);

    const { data: configsRes, isLoading: configsLoading } = useGetCompanyDebtorOrderConfigurations();
    const configs: CompanyDebtorOrderConfiguration[] = configsRes?.data?.rows || [];

    const totalRowCount = configs.length;

    const deleteMutation = useDeleteCompanyDebtorOrderConfiguration();
    const [deleteTarget, setDeleteTarget] = useState<CompanyDebtorOrderConfiguration | null>(null);

    const columns: ColumnDef<CompanyDebtorOrderConfiguration>[] = [
        {
            accessorKey: 'companyDebtor',
            header: 'Store',
            cell: ({ row }) => {
                const cd = row.original.companyDebtor;
                const name = cd?.name || row.original.companyDebtorName;
                const account = cd?.accountNumber || row.original.companyDebtorAccountNumber;
                return (
                    <div>
                        <div className="font-semibold">{name || '—'}</div>
                        {account ? <div className="text-xs text-muted-foreground">Account {account}</div> : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'orderEnabled',
            header: 'Enabled',
            cell: ({ row }) => (row.original.orderEnabled ? <Check className="h-4 w-4 text-emerald-600" /> : <span className="text-muted-foreground">—</span>),
        },
        {
            accessorKey: 'deliveryFrequency',
            header: 'Delivery Frequency',
            cell: ({ row }) => row.original.deliveryFrequency || '—',
        },
        {
            accessorKey: 'batchAllocationStrategy',
            header: 'Allocation',
            cell: ({ row }) => row.original.batchAllocationStrategy || '—',
        },
        {
            accessorKey: 'deliveryDayOne',
            header: 'Delivery Days',
            cell: ({ row }) => {
                const d1 = DAYS.find((d) => d.value === String(row.original.deliveryDayOne))?.label;
                const d2 = row.original.deliveryDayTwo
                    ? DAYS.find((d) => d.value === String(row.original.deliveryDayTwo))?.label
                    : null;
                return d2 ? `${d1} / ${d2}` : d1 || '—';
            },
        },
        {
            accessorKey: 'cutoffTime',
            header: 'Cutoff',
            cell: ({ row }) => row.original.cutoffTime || '—',
        },
        {
            accessorKey: 'leadTimeDays',
            header: 'Lead (days)',
            cell: ({ row }) => row.original.leadTimeDays ?? '—',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        title="Delete configuration"
                        onClick={() => setDeleteTarget(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // Store selector for editing
    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0, ...(appliedFilters.search ? { search: appliedFilters.search } : {}) });
    const stores = (debtorsRes?.data?.rows as any[]) || [];

    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const { data: conRes, isLoading: conLoading } = useGetCompanyDebtorOrderConfiguration(selectedStoreId || null);
    const existing = conRes?.data || null;

    const saveMutation = useSaveCompanyDebtorOrderConfiguration();

    const [form, setForm] = useState({
        orderEnabled: true,
        allowedPassword: true,
        orderSources: [...COMPANY_DEBTOR_ORDER_SOURCES],
        cutoffTime: '16:00',
        timezone: 'Asia/Kolkata',
        allowAfterCutoff: false,
        allowExpiredStockDispatch: false,
        deliveryFrequency: 'TWICE_WEEKLY' as (typeof DELIVERY_FREQUENCIES)[number],
        deliveryDayOne: 2,
        deliveryDayTwo: 5,
        leadTimeDays: 1,
        batchAllocationStrategy: 'AUTO' as (typeof BATCH_ALLOCATION_STRATEGIES)[number],
        responsibleUserId: '',
        defaultWarehouseId: '',
    });

    const [syncedKey, setSyncedKey] = useState('');

    // sync loaded config into form
    if (selectedStoreId && syncedKey !== selectedStoreId && conRes?.data) {
        const c = conRes.data;
        setForm({
            orderEnabled: c.orderEnabled ?? true,
            orderSources: c.allowedOrderSources?.length
                ? COMPANY_DEBTOR_ORDER_SOURCES.filter((source) => c.allowedOrderSources?.includes(source))
                : [...COMPANY_DEBTOR_ORDER_SOURCES],
            cutoffTime: c.cutoffTime || '16:00',
            timezone: c.timezone || 'Asia/Kolkata',
            allowAfterCutoff: c.allowAfterCutoff ?? false,
            allowExpiredStockDispatch: c.allowExpiredStockDispatch ?? false,
            deliveryFrequency: c.deliveryFrequency || 'TWICE_WEEKLY',
            deliveryDayOne: c.deliveryDayOne || 2,
            deliveryDayTwo: c.deliveryDayTwo ?? 5,
            leadTimeDays: c.leadTimeDays ?? 1,
            batchAllocationStrategy: c.batchAllocationStrategy || 'AUTO',
            responsibleUserId: c.responsibleUserId || '',
            defaultWarehouseId: c.defaultWarehouseId || '',
            allowedPassword: true,
        });
        setSyncedKey(selectedStoreId);
    }

    const warehouseRes = useGetWarehouses({ limit: 1000, offset: 0 })?.data;
    const rawWarehouses = (warehouseRes?.data || []) as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] };
    const warehouses: WarehouseDetails[] = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];
    const usersRes = useGetUsers({
        status: 'ACTIVE',
        limit: 1000,
        offset: 0,
        ...(selectedStoreId ? { companyDebtorId: selectedStoreId } : {}),
    })?.data;
    const users: UserDetails[] = usersRes?.data || [];

    const onStoreChange = (value: string) => {
        setSelectedStoreId(String(value || ''));
        setSyncedKey('');
        setForm({
            orderEnabled: true,
            allowedPassword: true,
            orderSources: [...COMPANY_DEBTOR_ORDER_SOURCES],
            cutoffTime: '16:00',
            timezone: 'Asia/Kolkata',
            allowAfterCutoff: false,
            allowExpiredStockDispatch: false,
            deliveryFrequency: 'TWICE_WEEKLY',
            deliveryDayOne: 2,
            deliveryDayTwo: 5,
            leadTimeDays: 1,
            batchAllocationStrategy: 'AUTO',
            responsibleUserId: '',
            defaultWarehouseId: '',
        });
    };

    const toggleSource = (src: string) => {
        const has = form.orderSources.includes(src as any);
        setForm((prev) => ({
            ...prev,
            orderSources: has ? prev.orderSources.filter((s) => s !== (src as any)) : [...prev.orderSources, src as any],
        }));
    };

    const handleSave = () => {
        if (!selectedStoreId) return;
        saveMutation.mutate(
            {
                companyDebtorId: selectedStoreId,
                orderEnabled: form.orderEnabled,
                allowedOrderSources: form.orderSources,
                cutoffTime: form.cutoffTime,
                timezone: form.timezone,
                allowAfterCutoff: form.allowAfterCutoff,
                allowExpiredStockDispatch: form.allowExpiredStockDispatch,
                deliveryFrequency: form.deliveryFrequency,
                deliveryDayOne: Number(form.deliveryDayOne),
                deliveryDayTwo: form.deliveryFrequency === 'TWICE_WEEKLY' || form.deliveryFrequency === 'WEEKLY' ? Number(form.deliveryDayTwo) : undefined,
                leadTimeDays: Number(form.leadTimeDays),
                batchAllocationStrategy: form.batchAllocationStrategy,
                responsibleUserId: form.responsibleUserId || undefined,
                defaultWarehouseId: form.defaultWarehouseId || undefined,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Company debtor order configuration saved');
                        setSyncedKey('');
                    } else {
                        toast.error(data.message || 'Save failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteMutation.mutate(deleteTarget.companyDebtorId, {
            onSuccess: (data) => {
                if (data.success) {
                    toast.success('Configuration deleted');
                    setDeleteTarget(null);
                } else {
                    toast.error(data.message || 'Delete failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const isLoading = configsLoading || conLoading;

    if (isStoreUser) {
        return (
            <Card className="m-4">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                    Company debtor order configuration is managed by the head office. Store users cannot modify it.
                </CardContent>
            </Card>
        );
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-[280px]">
                        <div className="mb-1 text-sm font-medium text-muted-foreground">Select Store</div>
                        <SelectPopover
                            title="Store"
                            onlyTitle="Select a store"
                            selectedValue={selectedStoreId}
                            options={stores.map((s) => ({ label: s.name || s.tradingAs || s.id, value: s.id }))}
                            onSelect={(value) => onStoreChange(String(value || ''))}
                        />
                    </div>
                    <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!selectedStoreId || saveMutation.isPending}
                        onClick={handleSave}
                    >
                        <Save className="mr-1 h-4 w-4" /> Save Configuration
                    </Button>
                </div>

                {!selectedStoreId ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Select a store to configure its order settings.
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4" /> Company Debtor Order Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={form.orderEnabled}
                                    onCheckedChange={(v) => setForm((prev) => ({ ...prev, orderEnabled: Boolean(v) }))}
                                />
                                <span className="text-sm">Enable company debtor ordering for this store</span>
                            </div>

                            <div>
                                <Label className="text-sm font-medium">Allowed Order Sources</Label>
                                <div className="mt-2 flex flex-wrap gap-4">
                                    {COMPANY_DEBTOR_ORDER_SOURCES.map((src) => (
                                        <label key={src} className="flex items-center gap-1 text-sm">
                                            <Checkbox
                                                checked={form.orderSources.includes(src)}
                                                onCheckedChange={() => toggleSource(src)}
                                            />
                                            {src}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <Label className="text-sm font-medium">Cutoff Time</Label>
                                    <Input
                                        type="time"
                                        className="mt-1"
                                        value={form.cutoffTime}
                                        onChange={(e) => setForm((prev) => ({ ...prev, cutoffTime: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Timezone</Label>
                                    <Input
                                        className="mt-1"
                                        value={form.timezone}
                                        onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Lead Time (days)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        className="mt-1"
                                        value={form.leadTimeDays}
                                        onChange={(e) => setForm((prev) => ({ ...prev, leadTimeDays: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.allowAfterCutoff}
                                        onCheckedChange={(v) => setForm((prev) => ({ ...prev, allowAfterCutoff: Boolean(v) }))}
                                    />
                                    Allow orders after cutoff
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={form.allowExpiredStockDispatch}
                                        onCheckedChange={(v) =>
                                            setForm((prev) => ({ ...prev, allowExpiredStockDispatch: Boolean(v) }))
                                        }
                                    />
                                    Allow dispatch of expired stock
                                </label>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Delivery Frequency</div>
                                    <SelectPopover
                                        title="Frequency"
                                        onlyTitle="Select frequency"
                                        selectedValue={form.deliveryFrequency}
                                        options={DELIVERY_FREQUENCIES.map((f) => ({ label: f, value: f }))}
                                        onSelect={(value) =>
                                            setForm((prev) => ({ ...prev, deliveryFrequency: (value || 'TWICE_WEEKLY') as any }))
                                        }
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Delivery Day 1</div>
                                    <SelectPopover
                                        title="Day"
                                        onlyTitle="Select day"
                                        selectedValue={String(form.deliveryDayOne)}
                                        options={DAYS}
                                        onSelect={(value) => setForm((prev) => ({ ...prev, deliveryDayOne: Number(value) }))}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Delivery Day 2</div>
                                    <SelectPopover
                                        title="Day"
                                        onlyTitle="Select day"
                                        selectedValue={String(form.deliveryDayTwo ?? 0)}
                                        options={DAYS}
                                        onSelect={(value) => setForm((prev) => ({ ...prev, deliveryDayTwo: Number(value) }))}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Batch Allocation Strategy</div>
                                    <SelectPopover
                                        title="Strategy"
                                        onlyTitle="Select strategy"
                                        selectedValue={form.batchAllocationStrategy}
                                        options={BATCH_ALLOCATION_STRATEGIES.map((s) => ({ label: s, value: s }))}
                                        onSelect={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                batchAllocationStrategy: ((value as (typeof BATCH_ALLOCATION_STRATEGIES)[number]) || 'FEFO'),
                                            }))
                                        }
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Responsible User</div>
                                    <SelectPopover
                                        title="User"
                                        onlyTitle="Select user"
                                        selectedValue={form.responsibleUserId || ''}
                                        options={users.map((u) => ({
                                            label: `${u.firstName} ${u.surname}`.trim(),
                                            value: u.id,
                                        }))}
                                        onSelect={(value) => setForm((prev) => ({ ...prev, responsibleUserId: String(value || '') }))}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 text-sm font-medium text-muted-foreground">Default Warehouse</div>
                                    <SelectPopover
                                        title="Warehouse"
                                        onlyTitle="Select warehouse"
                                        selectedValue={form.defaultWarehouseId || ''}
                                        options={warehouses.map((w) => ({ label: w.warehouse || w.name, value: w.id }))}
                                        onSelect={(value) => setForm((prev) => ({ ...prev, defaultWarehouseId: String(value || '') }))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Store Configurations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            query={configsRes as any}
                            data={configs}
                            columns={columns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={totalRowCount}
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">Showing {totalRowCount} configurations</div>
                            </div>
                        </DataTable>
                    </CardContent>
                </Card>

                <ConfirmDialog
                    open={!!deleteTarget}
                    setOpen={(v) => !v && setDeleteTarget(null)}
                    title="Delete this configuration?"
                    description={
                        deleteTarget
                            ? `Delete company debtor order configuration for ${
                                  deleteTarget.companyDebtor?.name || deleteTarget.companyDebtorName || 'this store'
                              }?`
                            : undefined
                    }
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default Configuration;
