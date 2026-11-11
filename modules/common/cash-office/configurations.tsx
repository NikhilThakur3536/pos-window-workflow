import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import { Plus, Pencil, Power, Box, Store, Shield, Banknote, Warehouse } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    useGetCashOfficeConfigurations,
    useCreateCashOfficeConfiguration,
    useUpdateCashOfficeConfiguration,
    useChangeCashOfficeConfigurationStatus,
    type CashOfficeConfiguration,
    type CashOfficeConfigurationInput,
} from '@/api-queries/cash-office';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useGetSafes, type SafeDetails } from '@/api-queries/safes';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashOfficeStatusBadge, formatMoney } from './shared';

interface ConfigForm {
    code: string;
    name: string;
    scope: string;
    companyDebtorId: string;
    companyWarehouseId: string;
    safeId: string;
    cashThresholdAmount: string;
    invoicePaymentThresholdAmount: string;
    autoHandoverEnabled: boolean;
    manualHandoverEnabled: boolean;
    varianceApprovalLimit: string;
    receiptPrefix: string;
    pendingEscalationMinutes: string;
}

const emptyForm: ConfigForm = {
    code: '',
    name: '',
    scope: 'COMPANY',
    companyDebtorId: '',
    companyWarehouseId: '',
    safeId: '',
    cashThresholdAmount: '0',
    invoicePaymentThresholdAmount: '500',
    autoHandoverEnabled: false,
    manualHandoverEnabled: false,
    varianceApprovalLimit: '0',
    receiptPrefix: '',
    pendingEscalationMinutes: '30',
};

const CashOfficeConfigurations = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';

    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const initialFilters = { search: '', status: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const listQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CashOfficeConfiguration[] = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const debtorsRes = useDebtorList({ limit: 1000, offset: 0 });
    const debtors = debtorsRes?.data?.data?.rows || [];
    const debtorNameById = useMemo(() => {
        const map: Record<string, string> = {};
        (debtors as { id: string; name?: string; accountNumber?: string }[]).forEach((d) => {
            if (d.id) map[d.id] = d.name || d.accountNumber || d.id;
        });
        return map;
    }, [debtors]);

    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawWarehouses: unknown = warehousesRes?.data?.data;
    const warehouses = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : (rawWarehouses as { rows?: { id: string; name: string }[] } | undefined)?.rows || [];
    const warehouseNameById = useMemo(() => {
        const map: Record<string, string> = {};
        (warehouses as { id: string; name?: string }[]).forEach((w) => {
            if (w.id) map[w.id] = w.name || w.id;
        });
        return map;
    }, [warehouses]);

    const safesRes = useGetSafes({ limit: 1000, offset: 0 });
    const safes: SafeDetails[] = safesRes?.data?.data?.rows || [];
    const activeSafes = safes.filter((s) => s.status === 'ACTIVE');
    const safeLabelById = useMemo(() => {
        const map: Record<string, string> = {};
        safes.forEach((s) => {
            if (s.id) map[s.id] = s.code ? `${s.code} - ${s.name}` : s.name;
        });
        return map;
    }, [safes]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<CashOfficeConfiguration | null>(null);
    const [form, setForm] = useState<ConfigForm>(emptyForm);

    const createMut = useCreateCashOfficeConfiguration();
    const updateMut = useUpdateCashOfficeConfiguration();
    const statusMut = useChangeCashOfficeConfigurationStatus();

    const scopeOptions = [
        { label: isDebtorUser ? 'My Store' : 'Store', value: 'DEBTOR' },
        ...(isDebtorUser ? [] : [{ label: 'Warehouse / DC', value: 'WAREHOUSE' }]),
        ...(isDebtorUser || isWarehouseUser ? [] : [{ label: 'Company (Central / Head Office)', value: 'COMPANY' }]),
    ];

    const openCreate = () => {
        setEditing(null);
        setForm({
            ...emptyForm,
            scope: isDebtorUser ? 'DEBTOR' : isWarehouseUser ? 'WAREHOUSE' : 'COMPANY',
            companyDebtorId: isDebtorUser ? myDebtorId : '',
            companyWarehouseId: isWarehouseUser ? myWarehouseId : '',
        });
        setFormOpen(true);
    };

    const openEdit = (row: CashOfficeConfiguration) => {
        setEditing(row);
        setForm({
            code: row.code || '',
            name: row.name || '',
            scope: row.companyDebtorId ? 'DEBTOR' : row.companyWarehouseId ? 'WAREHOUSE' : 'COMPANY',
            companyDebtorId: row.companyDebtorId || myDebtorId,
            companyWarehouseId: row.companyWarehouseId || myWarehouseId,
            safeId: row.safeId || '',
            cashThresholdAmount: String(row.cashThresholdAmount ?? 0),
            invoicePaymentThresholdAmount: String(row.invoicePaymentThresholdAmount ?? 500),
            autoHandoverEnabled: !!row.autoHandoverEnabled,
            manualHandoverEnabled: !!row.manualHandoverEnabled,
            varianceApprovalLimit: String(row.varianceApprovalLimit ?? 0),
            receiptPrefix: row.receiptPrefix || '',
            pendingEscalationMinutes: String(row.pendingEscalationMinutes ?? 30),
        });
        setFormOpen(true);
    };

    const handleSave = () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast.error('Code and name are required');
            return;
        }
        const companyDebtorId = form.scope === 'DEBTOR' ? form.companyDebtorId || myDebtorId || null : null;
        const companyWarehouseId = form.scope === 'WAREHOUSE' ? form.companyWarehouseId || myWarehouseId || null : null;

        const payload: CashOfficeConfigurationInput = {
            code: form.code.trim(),
            name: form.name.trim(),
            companyDebtorId,
            companyWarehouseId,
            safeId: form.safeId.trim() || null,
            cashThresholdAmount: Number(form.cashThresholdAmount) || 0,
            invoicePaymentThresholdAmount: Number(form.invoicePaymentThresholdAmount) || 500,
            autoHandoverEnabled: form.autoHandoverEnabled,
            manualHandoverEnabled: form.manualHandoverEnabled,
            varianceApprovalLimit: Number(form.varianceApprovalLimit) || 0,
            receiptPrefix: form.receiptPrefix.trim() || undefined,
            pendingEscalationMinutes: Number(form.pendingEscalationMinutes) || 30,
        };

        const onSuccess = (data: { success: boolean; message: string }) => {
            if (data?.success === false) {
                toast.error(data?.message || 'Save failed');
                return;
            }
            toast.success(editing ? 'Cash Office updated' : 'Cash Office created');
            setFormOpen(false);
        };
        const onError = (error: unknown) => {
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        };

        if (editing?.id) {
            updateMut.mutate({ id: editing.id, ...payload }, { onSuccess, onError });
        } else {
            createMut.mutate(payload, { onSuccess, onError });
        }
    };

    const toggleStatus = (row: CashOfficeConfiguration) => {
        const next = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        statusMut.mutate(
            { id: row.id, status: next },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Failed to change status');
                        return;
                    }
                    toast.success(`Cash Office ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const columns: ColumnDef<CashOfficeConfiguration>[] = [
        {
            accessorKey: 'code',
            header: 'Code',
            cell: ({ row }) => <div className="font-semibold">{row.original.code || '—'}</div>,
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <div>{row.original.name || '—'}</div>,
        },
        {
            accessorKey: 'scope',
            header: 'Scope',
            cell: ({ row }) => {
                const r = row.original;
                if (r.companyDebtorId)
                    return (
                        <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-gray-500" /> {debtorNameById[r.companyDebtorId] || 'Store'}
                        </div>
                    );
                if (r.companyWarehouseId)
                    return (
                        <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-gray-500" /> {warehouseNameById[r.companyWarehouseId] || 'Warehouse'}
                        </div>
                    );
                return (
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-gray-500" /> Company
                    </div>
                );
            },
        },
        {
            accessorKey: 'safeId',
            header: 'Safe',
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-gray-500" />{' '}
                    {row.original.safeId ? safeLabelById[row.original.safeId] || row.original.safeId : '—'}
                </div>
            ),
        },
        {
            accessorKey: 'cashThresholdAmount',
            header: 'Cash Threshold',
            cell: ({ row }) => <div>{formatMoney(row.original.cashThresholdAmount || 0)}</div>,
        },
        {
            accessorKey: 'invoicePaymentThresholdAmount',
            header: 'Payment Threshold',
            cell: ({ row }) => <div>{formatMoney(row.original.invoicePaymentThresholdAmount ?? 500)}</div>,
        },
        {
            accessorKey: 'varianceApprovalLimit',
            header: 'Variance Limit',
            cell: ({ row }) => <div>{formatMoney(row.original.varianceApprovalLimit || 0)}</div>,
        },
        {
            accessorKey: 'autoHandoverEnabled',
            header: 'Handover',
            cell: ({ row }) => {
                const auto = row.original.autoHandoverEnabled;
                const manual = row.original.manualHandoverEnabled;
                return <div>{auto ? 'Auto + Manual' : manual ? 'Manual only' : 'Disabled'}</div>;
            },
        },
        {
            accessorKey: 'receiptPrefix',
            header: 'Receipt Prefix',
            cell: ({ row }) => <div>{row.original.receiptPrefix || '—'}</div>,
        },
        {
            accessorKey: 'pendingEscalationMinutes',
            header: 'Escalation (min)',
            cell: ({ row }) => <div>{row.original.pendingEscalationMinutes ?? '—'}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <CashOfficeStatusBadge status={row.original.status || 'ACTIVE'} />,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title={row.original.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleStatus(row.original)}
                    >
                        <Power className={`h-4 w-4 ${row.original.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}`} />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Search by code or name..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All statuses"
                                selectedValue={filters.status}
                                options={[
                                    { label: 'All statuses', value: '' },
                                    { label: 'Active', value: 'ACTIVE' },
                                    { label: 'Inactive', value: 'INACTIVE' },
                                ]}
                                onSelect={(val) => handleFilters({ ...filters, status: String(val || '') })}
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={() => clearFilters()}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
                            <Plus className="mr-1 h-4 w-4" /> New Cash Office
                        </Button>
                    </div>
                    <div className="text-lg font-bold">Cash Office Configuration</div>
                </DataTable>
            </div>

            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Cash Office' : 'New Cash Office'}</DialogTitle>
                        <DialogDescription>Set up the cash office scope, safe, thresholds and handover rules.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Code</Label>
                                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CO-STORE-01" />
                            </div>
                            <div>
                                <Label>Name</Label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store 01 Cash Office" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Scope</Label>
                                <SelectPopover
                                    title="Scope"
                                    onlyTitle="Select scope"
                                    selectedValue={form.scope}
                                    options={scopeOptions}
                                    onSelect={(val) => setForm({ ...form, scope: String(val || 'COMPANY') })}
                                />
                            </div>
                            <div>
                                <Label>{form.scope === 'DEBTOR' ? 'Store' : form.scope === 'WAREHOUSE' ? 'Warehouse' : 'Company Scope'}</Label>
                                {form.scope === 'DEBTOR' ? (
                                    <SelectPopover
                                        title="Store"
                                        onlyTitle="Select store"
                                        selectedValue={form.companyDebtorId}
                                        options={[
                                            { label: 'Select store', value: '' },
                                            ...(debtors as { id: string; name?: string; accountNumber?: string }[]).map((d) => ({
                                                label: `${d.name || ''} (${d.accountNumber || ''})`,
                                                value: d.id,
                                            })),
                                        ]}
                                        onSelect={(val) => setForm({ ...form, companyDebtorId: String(val || '') })}
                                    />
                                ) : form.scope === 'WAREHOUSE' ? (
                                    <SelectPopover
                                        title="Warehouse"
                                        onlyTitle="Select warehouse"
                                        selectedValue={form.companyWarehouseId}
                                        options={[
                                            { label: 'Select warehouse', value: '' },
                                            ...(warehouses as { id: string; name?: string }[]).map((w) => ({
                                                label: w.name || w.id,
                                                value: w.id,
                                            })),
                                        ]}
                                        onSelect={(val) => setForm({ ...form, companyWarehouseId: String(val || '') })}
                                    />
                                ) : (
                                    <div className="flex h-10 items-center rounded-md border border-dashed px-3 text-sm text-muted-foreground">
                                        Company (Central / Head Office)
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label>Safe</Label>
                                <SelectPopover
                                    title="Safe"
                                    onlyTitle="Select safe"
                                    selectedValue={form.safeId}
                                    options={[
                                        { label: 'Select safe', value: '' },
                                        ...(activeSafes.length
                                            ? activeSafes.map((s) => ({
                                                  label: s.code ? `${s.code} - ${s.name}` : s.name,
                                                  value: s.id,
                                              }))
                                            : safes.map((s) => ({ label: `${s.code} - ${s.name}`, value: s.id }))),
                                    ]}
                                    onSelect={(val) => setForm({ ...form, safeId: String(val || '') })}
                                />
                                {!safesRes.isLoading && safes.length === 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        No safes found. Create safes under Company &gt; Safes.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Cash Threshold Amo</Label>
                                <Input
                                    type="number"
                                    value={form.cashThresholdAmount}
                                    onChange={(e) => setForm({ ...form, cashThresholdAmount: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Variance Approval Limit</Label>
                                <Input
                                    type="number"
                                    value={form.varianceApprovalLimit}
                                    onChange={(e) => setForm({ ...form, varianceApprovalLimit: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Receipt Prefix</Label>
                                <Input
                                    value={form.receiptPrefix}
                                    onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                                    placeholder="CO01"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Invoice Payment Threshold</Label>
                                <Input
                                    type="number"
                                    value={form.invoicePaymentThresholdAmount}
                                    onChange={(e) => setForm({ ...form, invoicePaymentThresholdAmount: e.target.value })}
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Invoice amounts above this threshold must be collected at the Cash Office.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Escalation (minutes)</Label>
                                <Input
                                    type="number"
                                    value={form.pendingEscalationMinutes}
                                    onChange={(e) => setForm({ ...form, pendingEscalationMinutes: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2 pt-6">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.autoHandoverEnabled}
                                        onChange={(e) => setForm({ ...form, autoHandoverEnabled: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    Auto handover
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.manualHandoverEnabled}
                                        onChange={(e) => setForm({ ...form, manualHandoverEnabled: e.target.checked })}
                                        className="h-4 w-4"
                                    />
                                    Manual handover
                                </label>
                            </div>
                            <div className="flex items-end pt-6">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Box className="h-4 w-4" /> Safe selected from company safes
                                </div>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700" disabled={createMut.isPending || updateMut.isPending} onClick={handleSave}>
                            {createMut.isPending || updateMut.isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default CashOfficeConfigurations;