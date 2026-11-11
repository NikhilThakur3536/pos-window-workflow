import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Box, Eye, PackageX, Plus, QrCode } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { Input } from '@/components/ui/input';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import {
    candidateAvailable,
    candidateBatchNumber,
    candidateDiscountedPrice,
    candidateDiscountPct,
    candidateExistingAllocation,
    candidateHasStock,
    candidateInventoryId,
    candidateOriginalPrice,
    candidateRuleName,
    candidateStockDetail,
    nstIsActive,
    DispositionCandidate,
    StockDisposition,
    useGetActiveNSTAllocations,
    useGetDispositionCandidates,
} from '@/api-queries/nst';
import NSTForm from './nst-form';
import NSTExistingAllocationsDialog from './nst-existing-allocations-dialog';
import { useDebtorList } from '@/api-queries/debtor';
import { useCompanyStockPricingTypeList } from '@/api-queries/company/stock-pricing-type';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';

// Tabs per the spec: the batch lookup is a fuzzy 30-day window, grouped by kind. Damaged
// stock is a separate manual flow — it is not returned by the candidates endpoint — so the
// Damaged tab shows a "Mark Damaged Stock" action instead of candidate rows.
type CandidateTab = 'NEAR_EXPIRY' | 'EXPIRED' | 'ALL' | 'DAMAGED';
const CANDIDATE_TABS: { value: CandidateTab; label: string }[] = [
    { value: 'NEAR_EXPIRY', label: 'Near Expiry' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'ALL', label: 'All' },
    { value: 'DAMAGED', label: 'Damaged Stock' },
];
const DEFAULT_MAX_DAYS = '30';

interface CandidateFilters {
    search: string;
    tab: CandidateTab;
    // '' = Company/DC stock, otherwise a store id.
    companyDebtorId: string;
    companyStockPricingTypeId: string;
    // Company/DC scope only, and only when no product is chosen.
    warehouseId: string;
    // Company/DC scope only: narrows the lookup to one product.
    companyStockDetailId: string;
    maxDays: string;
}

const NSTCandidates = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const currencySymbol = 'R';

    // Login scope decides the stock location. A store user is pinned to their own store; a
    // warehouse/DC user is pinned to company/DC stock at their warehouse; a company user may
    // choose company/DC or any store.
    const userType = useAuthUser((state) => state.user?.userType);
    const userCompanyDebtorId = useAuthUser((state) => state.user?.companyDebtorId);
    const userCompanyDebtor = useAuthUser((state) => state.user?.companyDebtor);
    const userWarehouseId = useAuthUser((state) => state.user?.warehouseId);
    const isStoreUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const makeDefaultFilters = (): CandidateFilters => ({
        search: '',
        // Near Expiry is the sensible first view: it is the flow that now runs on a
        // fixed 30 day window (spec) instead of the old unbounded measurement.
        tab: 'NEAR_EXPIRY',
        companyDebtorId: isStoreUser ? userCompanyDebtorId || '' : '',
        companyStockPricingTypeId: '',
        warehouseId: isWarehouseUser ? userWarehouseId || '' : '',
        companyStockDetailId: '',
        maxDays: DEFAULT_MAX_DAYS,
    });

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [filters, setFilters] = useState<CandidateFilters>(makeDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<CandidateFilters>(filters);
    const [productSearch, setProductSearch] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState<DispositionCandidate | null>(null);
    const [open, setOpen] = useState(false);
    // Batch whose existing allocations the user asked to see.
    const [viewAllocationsFor, setViewAllocationsFor] = useState<DispositionCandidate | null>(null);
    // True when the form was opened on a batch that already has an allocation.
    const [isAllocateMore, setIsAllocateMore] = useState(false);
    // True when the form is the manual "Mark Damaged Stock" flow rather than a candidate.
    const [isDamagedMode, setIsDamagedMode] = useState(false);

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;
    const pricingTypeList = useCompanyStockPricingTypeList({})?.data?.data?.rows;
    const warehouseData: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouseList: WarehouseDetails[] = Array.isArray(warehouseData)
        ? warehouseData
        : warehouseData &&
            typeof warehouseData === 'object' &&
            'rows' in warehouseData &&
            Array.isArray(warehouseData.rows)
          ? warehouseData.rows
          : [];
    const products = useCompanyStockDetailsList({ limit: 50, offset: 0, search: productSearch })?.data?.data?.rows;

    // Omit companyDebtorId for company-level inventory, otherwise scope to the store.
    // The Damaged tab does not use the candidates endpoint, so it falls back to ALL.
    const candidateType: 'NEAR_EXPIRY' | 'EXPIRED' | 'ALL' =
        appliedFilters.tab === 'DAMAGED' ? 'ALL' : appliedFilters.tab;
    // Store scope sends companyDebtorId; company/DC scope may narrow by warehouse and/or
    // product. Warehouse/product are never sent for a store.
    const atCompanyDc = !appliedFilters?.companyDebtorId;
    const query = useGetDispositionCandidates({
        maxDays: Number(appliedFilters.maxDays) || 30,
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters.companyDebtorId } : {}),
        ...(atCompanyDc && appliedFilters?.warehouseId ? { warehouseId: appliedFilters.warehouseId } : {}),
        ...(atCompanyDc && appliedFilters?.companyStockDetailId
            ? { companyStockDetailId: appliedFilters.companyStockDetailId }
            : {}),
        ...(appliedFilters?.companyStockPricingTypeId
            ? { companyStockPricingTypeId: appliedFilters.companyStockPricingTypeId }
            : {}),
        dispositionType: candidateType,
    });

    // Single list call so the action column knows whether the batch is already allocated.
    const activeAllocations = useGetActiveNSTAllocations(appliedFilters?.companyDebtorId || undefined);

    const { data, isLoading } = query;
    const candidates = useMemo(() => data?.data || [], [data?.data]);

    // Batch inventory id -> its ACTIVE allocations, so the row can offer View / Allocate More.
    const allocationsByInventory = useMemo(() => {
        const map = new Map<string, StockDisposition[]>();
        (activeAllocations?.data?.data?.rows || []).forEach((d) => {
            if (!d?.companyStockInventoryId || !nstIsActive(d)) return;
            const list = map.get(d.companyStockInventoryId) || [];
            list.push(d);
            map.set(d.companyStockInventoryId, list);
        });
        return map;
    }, [activeAllocations?.data?.data?.rows]);

    const allocationsForCandidate = useCallback(
        (c: DispositionCandidate): StockDisposition[] => {
            const fromList = allocationsByInventory.get(candidateInventoryId(c)) || [];
            if (fromList.length) return fromList;
            // The candidate row may echo its own allocation; used when the list call is
            // still in flight so the first paint is not a blind "Allocate".
            const echoed = candidateExistingAllocation(c);
            return echoed && nstIsActive(echoed) ? [echoed as StockDisposition] : [];
        },
        [allocationsByInventory],
    );

    // A batch with nothing left to allocate is never actionable, and the candidates
    // endpoint stops returning it once everything is allocated.
    const visibleCandidates = useMemo(() => candidates.filter((c) => candidateHasStock(c)), [candidates]);
    const totalRowCount = visibleCandidates.length;

    const filtered = useMemo(() => {
        let list = visibleCandidates;
        if (appliedFilters?.search) {
            const needle = appliedFilters.search.toLowerCase();
            list = list.filter((c) => {
                const detail = candidateStockDetail(c);
                return (
                    (c.description || detail?.description || '').toLowerCase().includes(needle) ||
                    (c.itemCode || detail?.itemCode || '').toLowerCase().includes(needle) ||
                    candidateBatchNumber(c).toLowerCase().includes(needle)
                );
            });
        }
        return list;
    }, [visibleCandidates, appliedFilters?.search]);

    const columns: ColumnDef<DispositionCandidate>[] = [
        {
            accessorKey: 'stock',
            header: (data) => <TableHeaderToggle {...data}>Product</TableHeaderToggle>,
            cell: ({ row }) => {
                const detail = candidateStockDetail(row.original);
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Box className="!h-4 !w-4" />
                            {row.original.description || detail?.description || 'N/A'}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <QrCode className="!h-3 !w-3" /> {row.original.itemCode || detail?.itemCode || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'expiryDate',
            header: 'Expiry',
            cell: ({ row }) => (
                <div>
                    {row.original.expiryDate ? moment(row.original.expiryDate).format('DD MMM, YY') : 'N/A'}
                    {row.original.remainingDays != null && (
                        <span className="text-muted-foreground ml-1 text-xs">({row.original.remainingDays}d)</span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'batchNumber',
            header: 'Batch',
            cell: ({ row }) => <div>{candidateBatchNumber(row.original) || 'N/A'}</div>,
        },
        {
            accessorKey: 'availableStock',
            header: 'Available',
            cell: ({ row }) => <div className="font-semibold">{candidateAvailable(row.original)}</div>,
        },
        {
            accessorKey: 'rule',
            header: 'Matched Rule',
            cell: ({ row }) => <div>{candidateRuleName(row.original) || 'N/A'}</div>,
        },
        {
            accessorKey: 'discountPercentage',
            header: 'Discount',
            cell: ({ row }) => {
                const pct = candidateDiscountPct(row.original);
                return pct != null && pct > 0 ? (
                    <Badge className="bg-green-100 text-xs text-green-700">{pct}%</Badge>
                ) : (
                    <div className="text-muted-foreground">—</div>
                );
            },
        },
        {
            accessorKey: 'originalPrice',
            header: 'Original Price',
            cell: ({ row }) => {
                const price = candidateOriginalPrice(row.original);
                return price != null && Number(price) > 0 ? (
                    <div>
                        {currencySymbol} {Number(price).toFixed(2)}
                    </div>
                ) : (
                    <div className="text-muted-foreground">—</div>
                );
            },
        },
        {
            accessorKey: 'suggestedUnitPrice',
            header: 'Suggested Price',
            cell: ({ row }) => {
                const price = candidateDiscountedPrice(row.original);
                return price != null ? (
                    <div>
                        {currencySymbol} {Number(price).toFixed(2)}
                    </div>
                ) : (
                    <div className="text-muted-foreground">—</div>
                );
            },
        },
        {
            accessorKey: 'marginPercentage',
            header: 'Margin',
            cell: ({ row }) =>
                row.original.marginPercentage != null ? (
                    <div>{row.original.marginPercentage}%</div>
                ) : (
                    <div className="text-muted-foreground">—</div>
                ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const candidate = row.original;
                const existing = allocationsForCandidate(candidate);

                // Fully allocated batches are not offered at all; the candidates endpoint
                // also drops them once every unit has been allocated.
                if (!candidateHasStock(candidate)) {
                    return <div className="text-muted-foreground text-center text-xs">Fully allocated</div>;
                }

                // The backend refuses to create new allocations on this batch right now
                // (e.g. already approved, awaiting approval, or blocked by policy). Do not
                // offer the action and surface the reason instead.
                if (candidate.canAllocate === false) {
                    return (
                        <div className="flex items-center justify-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex cursor-help items-center rounded-md bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700">
                                            Cannot allocate
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs">
                                        {candidate.allocationBlockedReason || 'This batch can no longer be allocated.'}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    );
                }

                const canCreate = hasPermission(
                    userGroupPermissions,
                    SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code,
                    [SYSTEM_PERMISSIONS.CREATE],
                );
                const openForm = () => {
                    setSelectedCandidate(candidate);
                    setOpen(true);
                };

                return (
                    <div className="flex items-center justify-center gap-1">
                        {existing.length > 0 ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => setViewAllocationsFor(candidate)}
                                >
                                    <Eye className="h-3 w-3" /> View NST
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                        if (canCreate) {
                                            setIsAllocateMore(true);
                                            openForm();
                                        } else {
                                            setIsPermissionDeniedOpen(true);
                                        }
                                    }}
                                >
                                    <Plus className="h-3 w-3" /> Allocate More
                                </Button>
                            </>
                        ) : (
                            <Button
                                size="sm"
                                className="flex h-7 items-center gap-1 text-xs"
                                onClick={() => {
                                    if (canCreate) {
                                        setIsAllocateMore(false);
                                        openForm();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                            >
                                <Plus className="h-3 w-3" /> Allocate
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];

    // Company/DC first (the default), then every company-owned store. A store user only
    // ever sees their own store.
    const locationOptions = useMemo(() => {
        if (isStoreUser) {
            const store = (debtors || []).find((d) => d?.id === userCompanyDebtorId);
            const label = store
                ? `${store.name} (${store.accountNumber})`
                : userCompanyDebtor?.name || 'My Store';
            return [{ value: userCompanyDebtorId || '', label }];
        }
        return [
            { value: '', label: 'Company / DC' },
            ...(debtors || []).map((d) => ({ value: d.id, label: d.name })),
        ];
    }, [debtors, isStoreUser, userCompanyDebtorId, userCompanyDebtor]);

    // Location / warehouse / product / pricing changes reload straight away and drop any
    // candidate that was picked under the previous scope.
    const applyNow = (next: CandidateFilters) => {
        setFilters(next);
        setAppliedFilters(next);
        setSelectedCandidate(null);
    };

    const onLocationChange = (value: string) => {
        // A store has no warehouse dimension, so clear it when switching to a store.
        applyNow({ ...filters, companyDebtorId: value || '', ...(value ? { warehouseId: '' } : {}) });
    };

    const onWarehouseChange = (value: string) => applyNow({ ...filters, warehouseId: value || '' });

    const onProductChange = (value: string) => applyNow({ ...filters, companyStockDetailId: value || '' });

    const applyFilters = () => {
        setAppliedFilters(filters);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };
    const clearFilters = () => {
        const cleared = makeDefaultFilters();
        setFilters(cleared);
        setAppliedFilters(cleared);
        setProductSearch('');
        setSelectedCandidate(null);
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const canCreate = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code,
        [SYSTEM_PERMISSIONS.CREATE],
    );

    const openDamagedForm = () => {
        if (!canCreate) {
            setIsPermissionDeniedOpen(true);
            return;
        }
        setIsDamagedMode(true);
        setSelectedCandidate(null);
        setIsAllocateMore(false);
        setOpen(true);
    };

    const tabsBar = (
        <div className="bg-background flex items-center gap-1 rounded-lg border p-0.5">
            {CANDIDATE_TABS.map((t) => (
                <Button
                    key={t.value}
                    type="button"
                    size="sm"
                    variant={filters.tab === t.value ? 'default' : 'ghost'}
                    className="h-6 px-3 text-xs"
                    onClick={() => {
                        // Apply the tab straight away and keep every other filter intact, so
                        // flipping to Damaged (and back) never drops the search/store/max-days
                        // selection or leaves the list stuck off-screen.
                        applyNow({ ...filters, tab: t.value });
                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                    }}
                >
                    {t.label}
                </Button>
            ))}
        </div>
    );

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="text-lg font-bold">Discounted Stock</div>

                {appliedFilters.tab === 'DAMAGED' ? (
                    <div className="space-y-3">
                        {tabsBar}
                        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-10 text-center">
                            <PackageX className="h-8 w-8 text-red-500" />
                            <div className="text-sm font-medium">Damaged Stock</div>
                            <p className="text-muted-foreground max-w-md text-xs">
                                Damaged stock is not generated from near-expiry candidates. Select the product/batch,
                                enter the damaged quantity and a reason, attach photos if needed, then create the
                                discounted allocation.
                            </p>
                            <Button onClick={openDamagedForm} className="flex items-center gap-1">
                                <Plus className="h-4 w-4" /> Mark Damaged Stock
                            </Button>
                        </div>
                    </div>
                ) : (
                    <DataTable
                        query={query}
                        data={filtered}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                        // Only explain the pricing-type scope when the endpoint itself
                        // returned nothing (an empty search still reads as "No results.").
                        emptyMessage={
                            visibleCandidates.length === 0 ? 'No NST items available for this pricing type.' : undefined
                        }
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                {/* Kind tabs: near-expiry / expired / both (30 day window). */}
                                {tabsBar}
                                <Input
                                    placeholder="Search product..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="!max-w-sm"
                                />
                                <SelectPopover
                                    title="stock location"
                                    onlyTitle="Company / DC"
                                    selectedValue={filters.companyDebtorId || null}
                                    options={locationOptions}
                                    onSelect={(v) => onLocationChange(v || '')}
                                    disabled={isStoreUser || isWarehouseUser}
                                    selectClass="!max-w-[220px]"
                                />
                                {!isStoreUser && !filters.companyDebtorId ? (
                                    <SelectPopover
                                        title="warehouse"
                                        selectedValue={filters.warehouseId || null}
                                        options={warehouseList.map((w) => ({
                                            value: w.id,
                                            label: w.warehouse || w.name || w.description,
                                        }))}
                                        onSelect={(v) => onWarehouseChange(v || '')}
                                        disabled={isWarehouseUser}
                                        selectClass="!max-w-[200px]"
                                    />
                                ) : null}
                                {!isStoreUser && !filters.companyDebtorId ? (
                                    <SelectPopover
                                        title="product"
                                        selectedValue={filters.companyStockDetailId || null}
                                        options={(products || []).map((p) => ({
                                            value: p.id,
                                            label: `${p.description} (${p.itemCode})`,
                                        }))}
                                        onSelect={(v) => onProductChange(v || '')}
                                        onSearch={setProductSearch}
                                        selectClass="!max-w-[220px]"
                                    />
                                ) : null}
                                <SelectPopover
                                    title="pricing type"
                                    selectedValue={filters.companyStockPricingTypeId || null}
                                    options={(pricingTypeList || []).map((p) => ({
                                        value: p.id,
                                        label: p.name || p.code || p.id,
                                    }))}
                                    // Apply straight away (like the kind tabs) so the candidates
                                    // reload for the chosen price list without a second click.
                                    onSelect={(v) => applyNow({ ...filters, companyStockPricingTypeId: v || '' })}
                                />
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Max days"
                                    value={filters.maxDays}
                                    onChange={(e) => setFilters({ ...filters, maxDays: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="!max-w-28"
                                />
                                <FilterActionButtons
                                    onApplyFilters={applyFilters}
                                    onClearClick={clearFilters}
                                    showClearButton={
                                        !!appliedFilters.search ||
                                        appliedFilters.tab !== 'NEAR_EXPIRY' ||
                                        (!isStoreUser && !!appliedFilters.companyDebtorId) ||
                                        !!appliedFilters.companyStockPricingTypeId ||
                                        (!isWarehouseUser && !!appliedFilters.warehouseId) ||
                                        !!appliedFilters.companyStockDetailId ||
                                        appliedFilters.maxDays !== DEFAULT_MAX_DAYS
                                    }
                                />
                            </div>
                        </div>
                    </DataTable>
                )}
            </div>

            {open && (
                <NSTForm
                    open={open}
                    onClose={() => {
                        setOpen(false);
                        setSelectedCandidate(null);
                        setIsAllocateMore(false);
                        setIsDamagedMode(false);
                    }}
                    // Re-read the recommendations and the active allocations so a batch
                    // that is now fully allocated disappears instead of offering Allocate.
                    onCompleted={() => {
                        query.refetch();
                        activeAllocations.refetch();
                    }}
                    companyDebtorId={appliedFilters.companyDebtorId || undefined}
                    preselectedCandidate={selectedCandidate}
                    candidateMode={!isDamagedMode}
                    allocateMore={isAllocateMore}
                    presetDispositionType={isDamagedMode ? 'DAMAGED' : undefined}
                    // Hand the already-loaded rows to the dialog so the selected product's
                    // rule/pricing resolve immediately from this list.
                    candidates={candidates}
                />
            )}

            <NSTExistingAllocationsDialog
                open={!!viewAllocationsFor}
                candidate={viewAllocationsFor}
                allocations={viewAllocationsFor ? allocationsForCandidate(viewAllocationsFor) : []}
                onClose={() => setViewAllocationsFor(null)}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to create NST allocations." }}
            />
        </PageLoader>
    );
};

export default NSTCandidates;
