'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import { DataTable } from '@/components/dynamic-table/data-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Pencil, Plus, Save } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import {
    useGetSecurityActions,
    useCreateApprovalRouting,
    useUpdateApprovalRouting,
    useGetApprovalRoutingList,
    type ApprovalRouting,
} from '@/api-queries/security';
import { useGetUserGroups } from '@/api-queries/user-groups';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';

type ScopeType = 'COMPANY' | 'STORE' | 'WAREHOUSE';

const SCOPE_OPTIONS: { label: string; value: ScopeType }[] = [
    { label: 'Company', value: 'COMPANY' },
    { label: 'Store', value: 'STORE' },
    { label: 'Warehouse', value: 'WAREHOUSE' },
];

const STATUS_OPTIONS = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
];

const ApprovalGroupMapping = () => {
    const [actionId, setActionId] = useState('');
    const [scopeType, setScopeType] = useState<ScopeType>('COMPANY');
    const [groupId, setGroupId] = useState('');
    const [companyDebtorId, setCompanyDebtorId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    // Non-null while the dialog is editing an existing mapping instead of creating one.
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const actionsQuery = useGetSecurityActions();
    const actionOptions = (actionsQuery?.data?.data || [])
        .filter((action) => !!action?.id)
        .map((action) => ({ label: `${action.code} — ${action.name}`, value: action.id }));

    const groupsQuery = useGetUserGroups({ limit: 200, offset: 0 });
    const groupOptions = (groupsQuery?.data?.data || []).map((group) => ({
        label: `${group.groupCode ? group.groupCode + ' — ' : ''}${group.name}`,
        value: group.id,
    }));

    const storesQuery = useDebtorList({ limit: 200, offset: 0, companyDebtorType: 'COMPANY_OWNED' });
    const storeOptions = (storesQuery?.data?.data?.rows || []).map((store) => ({
        label: `${store.name} (${store.accountNumber})`,
        value: store.id,
    }));

    const warehousesQuery = useGetWarehouses({ limit: 200, offset: 0 });
    const warehouseOptions = (warehousesQuery?.data?.data?.rows || []).map((warehouse) => ({
        label: warehouse.name,
        value: warehouse.id,
    }));

    const initialFilters = { status: 'ACTIVE' };
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const listQuery = useGetApprovalRoutingList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
    });
    const rows: ApprovalRouting[] = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const createMutation = useCreateApprovalRouting();
    const updateMutation = useUpdateApprovalRouting();

    const resetForm = () => {
        setEditingId(null);
        setActionId('');
        setScopeType('COMPANY');
        setGroupId('');
        setCompanyDebtorId('');
        setWarehouseId('');
        setStatus('ACTIVE');
    };

    const openAdd = () => {
        resetForm();
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        resetForm();
    };

    // The update endpoint only accepts groupId and status, so action and scope
    // are carried over as read-only values while editing.
    const openEdit = (row: ApprovalRouting) => {
        setEditingId(row.id || null);
        setActionId(row.actionId || '');
        setScopeType(row.scopeType || 'COMPANY');
        setGroupId(row.groupId || '');
        setCompanyDebtorId(row.companyDebtorId || '');
        setWarehouseId(row.warehouseId || '');
        setStatus(row.status || 'ACTIVE');
        setIsFormOpen(true);
    };

    const handleError = (error: unknown) => {
        // @ts-ignore
        toast.error(error?.response?.data?.message || 'Internal Server Error!');
    };

    const handleSave = () => {
        if (editingId) {
            if (!groupId) {
                toast.error('Select an approval group');
                return;
            }
            updateMutation.mutate(
                { id: editingId, groupId, status },
                {
                    onSuccess: (response) => {
                        if (response.success) {
                            toast.success('Approval group mapping updated');
                            closeForm();
                            listQuery.refetch();
                        } else {
                            toast.error(response.message || 'Update failed');
                        }
                    },
                    onError: handleError,
                },
            );
            return;
        }

        if (!actionId) {
            toast.error('Select a security action');
            return;
        }
        if (!groupId) {
            toast.error('Select an approval group');
            return;
        }
        if (scopeType === 'STORE' && !companyDebtorId) {
            toast.error('Select a store');
            return;
        }
        if (scopeType === 'WAREHOUSE' && !warehouseId) {
            toast.error('Select a warehouse');
            return;
        }

        createMutation.mutate(
            {
                actionId,
                scopeType,
                ...(scopeType === 'STORE' ? { companyDebtorId } : {}),
                ...(scopeType === 'WAREHOUSE' ? { warehouseId } : {}),
                groupId,
                status,
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success('Approval group mapping saved');
                        closeForm();
                        listQuery.refetch();
                    } else {
                        toast.error(response.message || 'Save failed');
                    }
                },
                onError: handleError,
            },
        );
    };

    const columns: ColumnDef<ApprovalRouting>[] = [
        {
            accessorKey: 'actionName',
            header: 'Action',
            cell: ({ row }) => <div>{row.original.action?.name || row.original.actionCode || '—'}</div>,
        },
        {
            accessorKey: 'scopeType',
            header: 'Scope',
            cell: ({ row }) => (
                <div>{SCOPE_OPTIONS.find((o) => o.value === row.original.scopeType)?.label || row.original.action?.name|| '—'}</div>
            ),
        },
        {
            accessorKey: 'groupName',
            header: 'Approval Group',
            cell: ({ row }) => <div>{row.original.groupName || row.original.group?.name || '—'}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <div>{row.original.status || '—'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        disabled={!row.original.id}
                        onClick={() => openEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={actionsQuery.isLoading || groupsQuery.isLoading || listQuery.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <SelectPopover
                            title="Status"
                            onlyTitle="All statuses"
                            selectedValue={filters.status}
                            options={[{ label: 'All statuses', value: '' }, ...STATUS_OPTIONS]}
                            onSelect={(value) => handleFilters({ ...filters, status: String(value || '') })}
                        />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={() => clearFilters()}
                            showClearButton={showClearButton}
                        />
                        <div className="ml-auto">
                            <Button onClick={openAdd} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Mapping
                            </Button>
                        </div>
                    </div>
                    <div className="text-lg font-bold">Approval Group Mappings</div>
                </DataTable>
            </div>

            <Dialog
                open={isFormOpen}
                onOpenChange={(open) => {
                    if (!open) closeForm();
                }}
            >
                <DialogContent className="sm:max-w-[640px]">
                    <DialogHeader>
                        <DialogTitle className="font-semibold">
                            {editingId ? 'Edit Mapping' : 'New Mapping'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Map a security action to an approval group for a company, store or warehouse. When no store or
                            warehouse mapping exists the company mapping is used as fallback.
                        </p>

                        {editingId && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                                <p className="text-xs text-blue-800">
                                    Only the approval group and status can be changed on an existing mapping.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <div className="mb-1 text-sm font-medium">Security Action</div>
                                <SelectPopover
                                    title="Security Action"
                                    onlyTitle="Select action"
                                    selectedValue={actionId}
                                    options={actionOptions}
                                    disabled={!!editingId}
                                    onSelect={(value) => setActionId(String(value || ''))}
                                />
                            </div>
                            <div>
                                <div className="mb-1 text-sm font-medium">Scope</div>
                                <SelectPopover
                                    title="Scope"
                                    onlyTitle="Select scope"
                                    selectedValue={scopeType}
                                    options={SCOPE_OPTIONS}
                                    disabled={!!editingId}
                                    onSelect={(value) => setScopeType((value as ScopeType) || 'COMPANY')}
                                />
                            </div>
                            <div>
                                <div className="mb-1 text-sm font-medium">Approval Group</div>
                                <SelectPopover
                                    title="Approval Group"
                                    onlyTitle="Select approval group"
                                    selectedValue={groupId}
                                    options={groupOptions}
                                    onSelect={(value) => setGroupId(String(value || ''))}
                                />
                            </div>
                            {scopeType === 'STORE' && (
                                <div>
                                    <div className="mb-1 text-sm font-medium">Store</div>
                                    <SelectPopover
                                        title="Store"
                                        onlyTitle="Select store"
                                        selectedValue={companyDebtorId}
                                        options={storeOptions}
                                        disabled={!!editingId}
                                        onSelect={(value) => setCompanyDebtorId(String(value || ''))}
                                    />
                                </div>
                            )}
                            {scopeType === 'WAREHOUSE' && (
                                <div>
                                    <div className="mb-1 text-sm font-medium">Warehouse</div>
                                    <SelectPopover
                                        title="Warehouse"
                                        onlyTitle="Select warehouse"
                                        selectedValue={warehouseId}
                                        options={warehouseOptions}
                                        disabled={!!editingId}
                                        onSelect={(value) => setWarehouseId(String(value || ''))}
                                    />
                                </div>
                            )}
                            <div>
                                <div className="mb-1 text-sm font-medium">Status</div>
                                <SelectPopover
                                    title="Status"
                                    onlyTitle="Select status"
                                    selectedValue={status}
                                    options={STATUS_OPTIONS}
                                    onSelect={(value) => setStatus((value as 'ACTIVE' | 'INACTIVE') || 'ACTIVE')}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={closeForm}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                                disabled={createMutation.isPending || updateMutation.isPending}
                                onClick={handleSave}
                            >
                                <Save className="mr-1 h-4 w-4" />
                                {editingId ? 'Update Mapping' : 'Save Mapping'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default ApprovalGroupMapping;