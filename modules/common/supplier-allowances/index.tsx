import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import type { ColumnDef } from '@tanstack/react-table';
import { useCreditorList } from '@/api-queries/creditor';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    SUPPLIER_ALLOWANCE_TYPES,
    useGetSupplierAllowanceSummary,
    useGetSupplierAllowances,
    useRemoveSupplierAllowance,
    type SupplierAllowanceDetails,
} from '@/api-queries/goods-receiving/supplier-allowances';
import { useApprovalAction } from '@/hooks/use-approval-action';
import AllowanceForm from './allowance-form';
import AllowanceDetail from './allowance-detail';

const initialFilters = {
    search: '',
    companyCreditorId: '',
    allowanceType: '',
    activeOn: '',
    status: '',
};

const SupplierAllowances = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const approval = useApprovalAction();
    const removeMutation = useRemoveSupplierAllowance();
    const creditors = useCreditorList({ limit: 500 })?.data?.data?.rows || [];

    const [formOpen, setFormOpen] = useState(false);
    const [editData, setEditData] = useState<SupplierAllowanceDetails | null>(null);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selected, setSelected] = useState<SupplierAllowanceDetails | null>(null);

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const query = useGetSupplierAllowances({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters.companyCreditorId ? { companyCreditorId: appliedFilters.companyCreditorId } : {}),
        ...(appliedFilters.allowanceType ? { allowanceType: appliedFilters.allowanceType } : {}),
        ...(appliedFilters.activeOn ? { activeOn: appliedFilters.activeOn } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
    });

    const summaryQuery = useGetSupplierAllowanceSummary({
        ...(appliedFilters.companyCreditorId ? { companyCreditorId: appliedFilters.companyCreditorId } : {}),
        ...(appliedFilters.allowanceType ? { allowanceType: appliedFilters.allowanceType } : {}),
    });

    const rows = query.data?.data?.rows || [];
    const totalRowCount = query.data?.data?.count || 0;
    const summary = summaryQuery.data?.data;
    const fmt = (value?: number | null) => `${currencySymbol}${Number(value ?? 0).toFixed(2)}`;

    const handleDelete = async () => {
        if (!selected) return;
        await approval.run(async (approvalToken) => {
            const response = await removeMutation.mutateAsync({
                id: selected.id,
                ...(approvalToken ? { approvalToken } : {}),
            });
            if (response?.success === false) {
                toast.error(response.message || 'Supplier allowance could not be deactivated');
                return;
            }
            toast.success('Supplier allowance deactivated');
            setDeleteOpen(false);
            setSelected(null);
            void query.refetch();
            void summaryQuery.refetch();
        }, 'Deactivate Supplier Allowance');
    };

    const columns: ColumnDef<SupplierAllowanceDetails>[] = [
        {
            id: 'allowance',
            header: 'Allowance',
            cell: ({ row }) => (
                <div>
                    <div className="font-medium">{row.original.name}</div>
                    <div className="text-muted-foreground font-mono text-xs">
                        {row.original.allowanceCode}
                    </div>
                </div>
            ),
        },
        {
            id: 'supplier',
            header: 'Supplier',
            cell: ({ row }) => row.original.CompanyCreditor?.name || row.original.companyCreditorId || '—',
        },
        {
            id: 'scope',
            header: 'Scope',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{row.original.CompanyStockDetail?.description || 'All stock'}</div>
                    <div className="text-muted-foreground">
                        {row.original.categoryId
                            ? 'Category scoped'
                            : row.original.companyWarehouseId
                              ? 'Warehouse scoped'
                              : row.original.companyDebtorId
                                ? 'Store scoped'
                                : 'Supplier wide'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'allowanceType',
            header: 'Type',
            cell: ({ row }) => <Badge variant="outline">{row.original.allowanceType}</Badge>,
        },
        {
            id: 'basis',
            header: 'Basis / Rate',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{row.original.basis?.replace(/_/g, ' ')}</div>
                    <div className="font-mono">{row.original.rate}</div>
                </div>
            ),
        },
        {
            id: 'thresholds',
            header: 'Thresholds',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>Qty: {row.original.thresholdQuantity ?? '—'}</div>
                    <div>Value: {fmt(row.original.thresholdValue)}</div>
                </div>
            ),
        },
        {
            id: 'effective',
            header: 'Effective',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>
                        {row.original.effectiveFrom
                            ? moment(row.original.effectiveFrom).format('DD MMM YYYY')
                            : '—'}
                    </div>
                    <div className="text-muted-foreground">
                        to{' '}
                        {row.original.effectiveTo
                            ? moment(row.original.effectiveTo).format('DD MMM YYYY')
                            : '—'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge
                    variant="outline"
                    className={
                        row.original.status === 'INACTIVE'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-emerald-100 text-emerald-800'
                    }
                >
                    {row.original.status || 'ACTIVE'}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="View ledger"
                        onClick={() => setDetailId(row.original.id)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        onClick={() => {
                            setEditData(row.original);
                            setFormOpen(true);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Deactivate"
                        onClick={() => {
                            setSelected(row.original);
                            setDeleteOpen(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="text-base font-semibold">Supplier Allowances</h1>
                        <p className="text-muted-foreground text-xs">
                            Rebates, advertising, settlement and supplier incentives. GRV earned amounts post automatically.
                        </p>
                    </div>
                    <Button
                        className="gap-2"
                        onClick={() => {
                            setEditData(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Allowance
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {[
                        ['Allowances', summary?.totalAllowances],
                        ['Earned', summary?.totalEarned],
                        ['Claimed', summary?.totalClaimed],
                        ['Approved', summary?.totalApproved],
                        ['Outstanding', summary?.outstandingBalance],
                    ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-md border p-2">
                            <div className="text-muted-foreground text-[11px]">{label}</div>
                            <div className="font-mono text-sm font-semibold">
                                {label === 'Allowances' ? value ?? 0 : fmt(value as number | undefined)}
                            </div>
                        </div>
                    ))}
                </div>

                <form
                    className="flex flex-wrap items-end gap-2 rounded-md border p-2"
                    onSubmit={(event) => {
                        event.preventDefault();
                        handleFilters(filters);
                    }}
                >
                    <div className="min-w-[220px] flex-1">
                        <Label className="text-xs">Search</Label>
                        <Input
                            className="mt-1 h-8"
                            value={filters.search}
                            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                            placeholder="Code or name"
                        />
                    </div>
                    <div className="min-w-[200px]">
                        <Label className="text-xs">Supplier</Label>
                        <div className="mt-1">
                            <SelectPopover
                                title="Supplier"
                                onlyTitle="All suppliers"
                                selectedValue={filters.companyCreditorId}
                                options={creditors.map((creditor) => ({
                                    label: creditor.name,
                                    value: creditor.id,
                                }))}
                                onSelect={(value) =>
                                    setFilters({ ...filters, companyCreditorId: String(value || '') })
                                }
                            />
                        </div>
                    </div>
                    <div className="min-w-[160px]">
                        <Label className="text-xs">Type</Label>
                        <div className="mt-1">
                            <SelectPopover
                                title="Type"
                                onlyTitle="All types"
                                selectedValue={filters.allowanceType}
                                options={SUPPLIER_ALLOWANCE_TYPES.map((type) => ({
                                    label: type.replace(/_/g, ' '),
                                    value: type,
                                }))}
                                onSelect={(value) =>
                                    setFilters({ ...filters, allowanceType: String(value || '') })
                                }
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs">Active On</Label>
                        <Input
                            type="date"
                            className="mt-1 h-8"
                            value={filters.activeOn}
                            onChange={(event) => setFilters({ ...filters, activeOn: event.target.value })}
                        />
                    </div>
                    <div className="min-w-[130px]">
                        <Label className="text-xs">Status</Label>
                        <div className="mt-1">
                            <SelectPopover
                                title="Status"
                                onlyTitle="All statuses"
                                selectedValue={filters.status}
                                options={[
                                    { label: 'Active', value: 'ACTIVE' },
                                    { label: 'Inactive', value: 'INACTIVE' },
                                ]}
                                onSelect={(value) => setFilters({ ...filters, status: String(value || '') })}
                            />
                        </div>
                    </div>
                    <FilterActionButtons
                        showClearButton={showClearButton}
                        onApplyFilters={() => handleFilters(filters)}
                        onClearClick={clearFilters}
                    />
                </form>

                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                    getRowId={(row) => row.id}
                />
            </div>

            <AllowanceForm
                open={formOpen}
                onClose={() => {
                    setFormOpen(false);
                    setEditData(null);
                }}
                editData={editData}
                onSaved={() => {
                    void query.refetch();
                    void summaryQuery.refetch();
                }}
            />

            <AllowanceDetail
                allowanceId={detailId}
                onClose={() => setDetailId(null)}
                onChanged={() => {
                    void query.refetch();
                    void summaryQuery.refetch();
                }}
            />

            <DeleteConfirmation
                open={deleteOpen}
                onClose={() => {
                    setDeleteOpen(false);
                    setSelected(null);
                }}
                onConfirm={handleDelete}
                title="Deactivate supplier allowance?"
                description="The allowance will be deactivated and will no longer apply to new GRVs."
            />

            <ApprovalDialog
                open={approval.openApproval}
                onClose={approval.closeApproval}
                approvalRequestId={approval.approval?.approvalRequestId}
                allowedMethods={approval.approval?.allowedMethods}
                actionLabel={approval.approval?.actionLabel}
                approverGroupName={approval.approval?.approverGroupName}
                onApproved={approval.handleApproved}
            />
        </PageLoader>
    );
};

export default SupplierAllowances;
