import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownWideNarrow, Search, Star, Wand2 } from 'lucide-react';
import { DataTable } from '@/components/dynamic-table/data-table';
import { toast } from 'sonner';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetSupplierCostComparison,
    useMutateSupplierPricing,
    SupplierCostComparisonSupplier,
    SupplierCostSource,
} from '@/api-queries/suppliers';
import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useAuthUser } from '@/stores/auth-user.store';

const COST_SOURCE_LABELS: Record<SupplierCostSource, string> = {
    DEAL: 'Active Deal',
    CURRENT_COST: 'Current Cost',
    LAST_PURCHASE: 'Last Purchase',
    NONE: 'No Cost',
};

const COST_SOURCE_BADGE: Record<SupplierCostSource, string> = {
    DEAL: 'bg-emerald-100 text-emerald-800',
    CURRENT_COST: 'bg-sky-100 text-sky-800',
    LAST_PURCHASE: 'bg-violet-100 text-violet-800',
    NONE: 'bg-gray-100 text-gray-600',
};

const CostSourceBadge = ({ source }: { source?: SupplierCostSource | null }) => {
    const key = (source || 'NONE') as SupplierCostSource;
    return (
        <Badge variant="outline" className={COST_SOURCE_BADGE[key]}>
            {COST_SOURCE_LABELS[key]}
        </Badge>
    );
};

const SupplierCostComparisonScreen: React.FC = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const activeUser = useAuthUser((state) => state.user);

    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [selectedStock, setSelectedStock] = useState<StockDetails | null>(null);

    const companyDebtorId = activeUser?.companyDebtorId || undefined;
    const companyWarehouseId = activeUser?.warehouseId || undefined;

    const productsQuery = useCompanyStockDetailsList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedSearch ? { search: appliedSearch } : {}),
    });

    const compareQuery = useGetSupplierCostComparison(
        selectedStock?.id
            ? {
                  companyStockDetailId: selectedStock.id,
                  ...(companyDebtorId ? { companyDebtorId } : {}),
                  ...(companyWarehouseId ? { companyWarehouseId } : {}),
              }
            : null,
    );
    // Only fire the compare request once a product has been selected.
    const isCompareEnabled = !!selectedStock?.id;

    const mutate = useMutateSupplierPricing();

    const productColumns: ColumnDef<StockDetails>[] = useMemo(
        () => [
            {
                accessorKey: 'description',
                header: 'Product',
                cell: ({ row }) => (
                    <div className="space-y-0.5">
                        <div className="font-medium">{row.original.description || '—'}</div>
                        <div className="text-xs text-muted-foreground">{row.original.itemCode || ''}</div>
                    </div>
                ),
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                cell: ({ row }) => (
                    <div className="flex items-center justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setSelectedStock(row.original)}
                        >
                            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                            Compare Costs
                        </Button>
                    </div>
                ),
            },
        ],
        [],
    );

    const comparison = compareQuery?.data?.data;
    // Prefer the per-SKU supplier list; fall back to the first row of the legacy paginated shape.
    const suppliers: SupplierCostComparisonSupplier[] = comparison?.suppliers || comparison?.rows?.[0]?.suppliers || [];

    const handleSetPrimary = (supplier: SupplierCostComparisonSupplier) => {
        if (!selectedStock?.id) return;
        const companyStockItemSupplierId = supplier.companyStockItemSupplierId;
        if (!companyStockItemSupplierId) {
            toast.error('This supplier record is missing its supplier item reference');
            return;
        }
        mutate.mutate(
            {
                action: 'setPrimary',
                data: {
                    companyStockDetailId: selectedStock.id,
                    mode: 'MANUAL',
                    companyStockItemSupplierId,
                    reason: `Set as primary for ${selectedStock.description || 'product'}`,
                },
            },
            {
                onSuccess: (data) => {
                    if (data.success) toast.success('Primary supplier updated');
                    else toast.error(data.message || 'Failed to set primary');
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const handleApplyRecommended = () => {
        if (!selectedStock?.id) return;
        mutate.mutate(
            {
                action: 'setPrimary',
                data: {
                    companyStockDetailId: selectedStock.id,
                    mode: 'AUTO',
                    ...(companyDebtorId ? { companyDebtorId } : {}),
                    ...(companyWarehouseId ? { companyWarehouseId } : {}),
                },
            },
            {
                onSuccess: (data) => {
                    if (data.success) toast.success('Recommended supplier applied as primary');
                    else toast.error(data.message || 'Failed to apply recommended supplier');
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const supplierColumns: ColumnDef<SupplierCostComparisonSupplier>[] = useMemo(
        () => [
            {
                accessorKey: 'supplierName',
                header: 'Supplier',
                cell: ({ row }) => (
                    <div className="space-y-0.5">
                        <div className="font-medium">{row.original.supplierName || row.original.accountNumber || '—'}</div>
                        {row.original.supplierItemCode && (
                            <div className="text-xs text-muted-foreground">{row.original.supplierItemCode}</div>
                        )}
                    </div>
                ),
            },
            {
                accessorKey: 'currentCost',
                header: 'Cost',
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {currencySymbol} {Number(row.original.currentCost ?? row.original.unitCost ?? 0).toFixed(2)}
                    </span>
                ),
            },
            {
                accessorKey: 'costSource',
                header: 'Cost Source',
                cell: ({ row }) => <CostSourceBadge source={row.original.costSource} />,
            },
            {
                accessorKey: 'dealSaving',
                header: 'Deal Saving',
                cell: ({ row }) =>
                    row.original.dealSaving != null ? (
                        <div className="text-xs">
                            <div className="font-mono text-emerald-700">
                                {currencySymbol} {Number(row.original.dealSaving).toFixed(2)}
                            </div>
                            {row.original.dealSavingPercentage != null && (
                                <div className="text-muted-foreground">
                                    {Number(row.original.dealSavingPercentage).toFixed(2)}%
                                </div>
                            )}
                        </div>
                    ) : (
                        '—'
                    ),
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
                accessorKey: 'lastPurchasePrice',
                header: 'Last Purchase',
                cell: ({ row }) =>
                    row.original.lastPurchasePrice != null ? (
                        <span className="font-mono tabular-nums text-xs">
                            {currencySymbol} {Number(row.original.lastPurchasePrice).toFixed(2)}
                        </span>
                    ) : (
                        '—'
                    ),
            },
            {
                id: 'status',
                header: 'Status',
                cell: ({ row }) => {
                    const isPrimary = !!row.original.isPrimarySupplier || !!row.original.primary;
                    const isRecommended = !!row.original.recommended;
                    if (!isPrimary && !isRecommended) return '—';
                    return (
                        <div className="flex flex-wrap items-center gap-1">
                            {isPrimary && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                    <Star className="mr-1 h-3 w-3" /> Primary
                                </Badge>
                            )}
                            {isRecommended && (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                                    Recommended
                                </Badge>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                cell: ({ row }) => {
                    const isPrimary = !!row.original.isPrimarySupplier || !!row.original.primary;
                    return (
                        <div className="flex items-center justify-center">
                            {!isPrimary && (
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
                        </div>
                    );
                },
            },
        ],
        [currencySymbol, mutate],
    );

    const handleSearch = () => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        setAppliedSearch(search.trim());
        setSelectedStock(null);
    };

    return (
        <PageLoader isLoading={productsQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex items-end gap-2">
                    <div className="min-w-[280px]">
                        <Label className="text-xs">Product Search</Label>
                        <Input
                            placeholder="Search by item code or description to compare suppliers"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="mt-1"
                        />
                    </div>
                    <Button onClick={handleSearch} className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        Search
                    </Button>
                </div>

                <DataTable
                    query={productsQuery}
                    data={productsQuery?.data?.data?.rows || []}
                    columns={productColumns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={productsQuery?.data?.data?.count || 0}
                />

                {isCompareEnabled && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold">Cost Comparison</h2>
                                <p className="text-xs text-muted-foreground">
                                    {selectedStock?.description} {selectedStock?.itemCode ? `(${selectedStock.itemCode})` : ''}
                                </p>
                            </div>
                            <Button
                                onClick={handleApplyRecommended}
                                disabled={mutate.isPending || !comparison?.recommendedPrimarySupplier}
                                className="flex items-center gap-2"
                            >
                                <Wand2 className="h-4 w-4" />
                                Apply Recommended
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <Card>
                                <CardContent className="space-y-1 p-4">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Effective Cost</p>
                                    <p className="font-mono text-lg font-semibold tabular-nums">
                                        {comparison?.effectiveCost != null
                                            ? `${currencySymbol} ${Number(comparison.effectiveCost).toFixed(2)}`
                                            : '—'}
                                    </p>
                                    <CostSourceBadge source={comparison?.costSource} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-1 p-4">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Primary</p>
                                    <p className="text-sm font-semibold">
                                        {comparison?.currentPrimarySupplier?.supplierName ||
                                            comparison?.currentPrimarySupplier?.accountNumber ||
                                            'None set'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-1 p-4">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                                        Recommended Primary
                                    </p>
                                    <p className="text-sm font-semibold">
                                        {comparison?.recommendedPrimarySupplier?.supplierName ||
                                            comparison?.recommendedPrimarySupplier?.accountNumber ||
                                            'None'}
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="space-y-1 p-4">
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Deal Saving</p>
                                    <p className="font-mono text-lg font-semibold tabular-nums text-emerald-700">
                                        {comparison?.dealSaving != null
                                            ? `${currencySymbol} ${Number(comparison.dealSaving).toFixed(2)}`
                                            : '—'}
                                    </p>
                                    {comparison?.dealSavingPercentage != null && (
                                        <p className="text-xs text-muted-foreground">
                                            {Number(comparison.dealSavingPercentage).toFixed(2)}% off
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <DataTable query={compareQuery} data={suppliers} columns={supplierColumns} totalRowCount={0} />
                    </div>
                )}
            </div>
        </PageLoader>
    );
};

export default SupplierCostComparisonScreen;
