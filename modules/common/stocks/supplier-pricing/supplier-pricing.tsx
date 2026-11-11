import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Star } from 'lucide-react';
import { DataTable } from '@/components/dynamic-table/data-table';
import { toast } from 'sonner';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import SupplierPricingForm from './supplier-pricing-form';
import {
    useGetSupplierPricingList,
    useMutateSupplierPricing,
    SupplierPricingRecord,
    supplierPricingCost,
    supplierPricingIsPrimary,
} from '@/api-queries/suppliers';
import { useCreditorList } from '@/api-queries/creditor';
import { useAuthUser } from '@/stores/auth-user.store';
import type { CompanyCreditor } from '@/types';

const SupplierPricingScreen: React.FC = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const activeUser = useAuthUser((state) => state.user);

    const [selectedItem, setSelectedItem] = useState<SupplierPricingRecord | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const initialFilters = { search: '', companyCreditorId: '' };

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const query = useGetSupplierPricingList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters.companyCreditorId } : {}),
        ...(activeUser?.companyDebtorId ? { companyDebtorId: activeUser.companyDebtorId } : {}),
        ...(activeUser?.warehouseId ? { companyWarehouseId: activeUser.warehouseId } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const mutate = useMutateSupplierPricing();
    const creditors = useCreditorList({ limit: 500 })?.data?.data?.rows;

    const columns: ColumnDef<SupplierPricingRecord>[] = [
        {
            accessorKey: 'CompanyStockDetail.description',
            header: 'Product',
            cell: ({ row }) => {
                const detail = row.original.CompanyStockDetail;
                return (
                    <div className="space-y-0.5">
                        <div className="font-medium">{detail?.description || '—'}</div>
                        <div className="text-xs text-muted-foreground">{detail?.itemCode || ''}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'CompanyCreditor.name',
            header: 'Supplier',
            cell: ({ row }) => {
                const creditor = row.original.CompanyCreditor;
                return (
                    <div className="space-y-0.5">
                        <div className="font-medium">{creditor?.name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{creditor?.accountNumber || ''}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'currentCost',
            header: 'Current Cost',
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">
                    {currencySymbol} {Number(supplierPricingCost(row.original)).toFixed(2)}
                </span>
            ),
        },
        {
            accessorKey: 'isPrimarySupplier',
            header: 'Primary',
            cell: ({ row }) =>
                supplierPricingIsPrimary(row.original) ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800">
                        <Star className="mr-1 h-3 w-3" /> Primary
                    </Badge>
                ) : (
                    '—'
                ),
        },
        {
            accessorKey: 'supplierItemCode',
            header: 'Supplier Item Code',
            cell: ({ row }) => <span className="text-xs">{row.original.supplierItemCode || '—'}</span>,
        },
        {
            accessorKey: 'leadTimeDays',
            header: 'Lead / Cycle',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>Lead: {row.original.leadTimeDays != null ? `${row.original.leadTimeDays} days` : '—'}</div>
                    <div>Cycle: {row.original.deliveryCycle ? row.original.deliveryCycle.replace(/_/g, ' ') : '—'}</div>
                </div>
            ),
        },
        {
            accessorKey: 'minimumOrderQuantity',
            header: 'Min Order Qty',
            cell: ({ row }) => <span className="text-xs">{row.original.minimumOrderQuantity ?? '—'}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <Badge variant="outline" className={row.original.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}>
                    {row.original.status}
                </Badge>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    {!supplierPricingIsPrimary(row.original) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Set as primary"
                            onClick={() => handleSetPrimary(row.original)}
                        >
                            <Star className="h-4 w-4 text-amber-600" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        onClick={() => {
                            setSelectedItem(row.original);
                            setIsFormOpen(true);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Delete"
                        onClick={() => {
                            setSelectedItem(row.original);
                            setIsDeleteOpen(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleSetPrimary = (item: SupplierPricingRecord) => {
        // MANUAL mode requires the supplier-item id so the API can flip exactly one primary per SKU + scope.
        const companyStockItemSupplierId = item.companyStockItemSupplierId || item.id;
        mutate.mutate(
            {
                action: 'setPrimary',
                data: {
                    companyStockDetailId: item.companyStockDetailId,
                    mode: 'MANUAL',
                    companyStockItemSupplierId,
                    reason: 'Set as primary from supplier pricing list',
                },
            },
            {
                onSuccess: (data) => {
                    if (data.success) toast.success('Primary supplier pricing updated');
                    else toast.error(data.message || 'Failed to set primary');
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const handleDelete = () => {
        if (!selectedItem?.id) return;
        mutate.mutate(
            { action: 'delete', data: { id: selectedItem.id } },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Supplier pricing deleted successfully');
                        setSelectedItem(null);
                        setIsDeleteOpen(false);
                    } else {
                        toast.error(data.message || 'Failed to delete supplier pricing');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={data?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-end gap-2">
                            <div className="min-w-[220px]">
                                <Label className="text-xs">Search</Label>
                                <Input
                                    placeholder="Product / item code"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Supplier</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Supplier"
                                        onlyTitle="All Suppliers"
                                        selectedValue={filters.companyCreditorId || ''}
                                        options={[
                                            { label: 'All Suppliers', value: '' },
                                            ...(creditors || []).map((data: CompanyCreditor) => ({
                                                label: `${data.name} (${data.accountNumber})`,
                                                value: data.id,
                                            })),
                                        ]}
                                        onSelect={(value) =>
                                            setFilters({ ...filters, companyCreditorId: String(value || '') })
                                        }
                                    />
                                </div>
                            </div>
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => {
                                    setSelectedItem(null);
                                    setIsFormOpen(true);
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Supplier Pricing
                            </Button>
                        </div>
                    </div>
                </DataTable>

                {isFormOpen && (
                    <SupplierPricingForm
                        open={isFormOpen}
                        onClose={() => {
                            setIsFormOpen(false);
                            setSelectedItem(null);
                        }}
                        editData={selectedItem}
                        key={selectedItem?.id || ''}
                    />
                )}

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={
                        selectedItem
                            ? `Are you sure you want to delete supplier pricing for ${selectedItem.CompanyStockDetail?.description || 'this product'}?`
                            : 'Are you sure you want to delete this supplier pricing?'
                    }
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default SupplierPricingScreen;