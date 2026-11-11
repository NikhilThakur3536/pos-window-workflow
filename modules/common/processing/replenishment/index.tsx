import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Search, Sparkles, X } from 'lucide-react';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useAuthUser } from '@/stores/auth-user.store';
import { type StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { generateUUIDForData } from '@/utils/helpers';
import {
    type ReplenishmentRecommendLine,
    useGetReplenishmentRecommend,
    useResolveReplenishmentPolicy,
    useSaveReplenishmentRun,
    useGetReplenishmentRun,
    getReplenishmentRecommendRows,
    getReplenishmentConsolidatedRows,
    getReplenishmentRecommendPolicy,
    getEffectiveReplenishmentPolicy,
    getReplenishmentRunStatus,
} from '@/api-queries/replenishment';
import { PolicySummary, ReplenishmentTabs, RunStatusBadge, ScopeSelector } from './components';
import {
    type ReplenishmentScope,
    buildRecommendProps,
    buildResolveProps,
    canResolvePolicy,
    getLoginScope,
    scopeLocations,
} from './scope';

const today = () => new Date().toISOString().slice(0, 10);
const num = (v?: number | string | null) => (v === null || v === undefined || v === '' ? '—' : v);

const apiMessage = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as Error)?.message ||
    'Something went wrong';

const AppliedFlag = ({ on, label, className = 'bg-blue-100 text-blue-700' }: { on?: boolean; label: string; className?: string }) =>
    on ? <span className={`rounded px-1 text-[10px] font-medium ${className}`}>{label}</span> : null;

const ReplenishmentScreen = () => {
    const userGroupPermissions = useUsersPermissions();
    const user = useAuthUser((state) => state.user);

    const canCalculate = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.code,
        [SYSTEM_PERMISSIONS.CREATE],
    );

    const loginScope = useMemo(() => getLoginScope(user), [user]);
    const [scope, setScope] = useState<ReplenishmentScope>(
        loginScope.fixed || { type: loginScope.allowedTypes[0] || 'COMPANY' },
    );
    const [asOfDate, setAsOfDate] = useState(today);
    const [includeZero, setIncludeZero] = useState(false);
    const [selectedSkus, setSelectedSkus] = useState<StockDetails[]>([]);
    const [skuSearch, setSkuSearch] = useState('');
    const [skuOpen, setSkuOpen] = useState(false);
    const [previewArgs, setPreviewArgs] = useState<{
        asOfDate: string;
        limit: number;
        includeZero: boolean;
        companyStockDetailIds: string[];
    } | null>(null);
    const [notes, setNotes] = useState('');
    const [savedRunId, setSavedRunId] = useState<string | null>(null);
    const [expandedSku, setExpandedSku] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    // Kept across a failed save so a retry reuses the same clientDocumentId (backend dedupe).
    const saveDocIdRef = useRef<string | null>(null);

    const skuQuery = useCompanyStockDetailsList({ limit: 20, search: skuSearch });
    const skuResults = (skuQuery.data?.data?.rows || skuQuery.data?.data || []) as StockDetails[];

    const recommendArgs = previewArgs
        ? buildRecommendProps(
              scope,
              previewArgs.asOfDate,
              previewArgs.limit,
              previewArgs.includeZero,
              previewArgs.companyStockDetailIds,
          )
        : null;
    const recommendQuery = useGetReplenishmentRecommend(recommendArgs);

    const resolveProps = canResolvePolicy(scope) ? buildResolveProps(scope, asOfDate) : null;
    const policyQuery = useResolveReplenishmentPolicy(resolveProps);
    const resolvedPolicy = getEffectiveReplenishmentPolicy(policyQuery.data);
    // Once a preview has run, the policy the calculation actually used (policySnapshot) wins.
    const snapshotPolicy = getReplenishmentRecommendPolicy(recommendQuery.data);
    const policy = snapshotPolicy || resolvedPolicy;

    const saveRun = useSaveReplenishmentRun();
    const savedRunQuery = useGetReplenishmentRun(savedRunId);
    const savedRun = savedRunQuery.data?.data;

    const rows = getReplenishmentRecommendRows(recommendQuery.data);
    const consolidated = getReplenishmentConsolidatedRows(recommendQuery.data);
    const lookbackFrom = recommendQuery.data?.data?.lookbackFrom;
    const lookbackTo = recommendQuery.data?.data?.lookbackTo;
    const calculationVersion = recommendQuery.data?.data?.calculationVersion;
    const isGroup = scope.type === 'STORE_GROUP';
    const storeRows = isGroup ? rows : [];
    // Store Group orders from the consolidated grid; individual store rows are shown
    // in the expandable detail and never used to build PO quantities directly.
    const mainRows = isGroup && consolidated.length ? consolidated : rows;

    useEffect(() => {
        if (recommendQuery.isError) {
            const message = apiMessage(recommendQuery.error);
            if (scope.type === 'WAREHOUSE' && message.toLowerCase().includes('warehouse')) {
                setScope({ type: 'WAREHOUSE' });
                toast.error('Warehouse not found. Please select a valid warehouse.');
                return;
            }
            toast.error(message);
        }
    }, [recommendQuery.isError, recommendQuery.error, scope.type]);

    const addSku = (stock: StockDetails) => {
        setSelectedSkus((prev) => (prev.some((s) => s.id === stock.id) ? prev : [...prev, stock]));
        setSkuSearch('');
        setSkuOpen(false);
    };

    const removeSku = (id: string) => setSelectedSkus((prev) => prev.filter((s) => s.id !== id));

    const handlePreview = () => {
        if (!asOfDate) {
            toast.error('Select a calculation date');
            return;
        }
        if (scope.type !== 'COMPANY') {
            const hasLocation =
                (scope.type === 'STORE' && !!scope.companyDebtorId) ||
                (scope.type === 'STORE_GROUP' && !!scope.companyDebtorGroupId) ||
                (scope.type === 'WAREHOUSE' && !!scope.warehouseId);
            if (!hasLocation) {
                toast.error('Select a location before generating recommendations');
                return;
            }
        }
        setSavedRunId(null);
        setExpandedSku(null);
        setPreviewArgs({
            asOfDate,
            limit: 200,
            includeZero,
            companyStockDetailIds: selectedSkus.map((s) => s.id),
        });
    };

    const handleToggleZero = (checked: boolean) => {
        setIncludeZero(!!checked);
        if (previewArgs) setPreviewArgs({ ...previewArgs, includeZero: !!checked });
    };

    const canSave = canCalculate && !!previewArgs && mainRows.length > 0 && !savedRunId && !recommendQuery.isFetching;

    const handleSave = () => {
        if (!previewArgs) {
            toast.error('Generate recommendations before saving');
            return;
        }
        // Fresh clientDocumentId per Save click; the same id is reused only on retry.
        const docId = saveDocIdRef.current || `REPL-${generateUUIDForData()}`;
        saveDocIdRef.current = docId;
        saveRun.mutate(
            {
                ...scopeLocations(scope),
                asOfDate: previewArgs.asOfDate,
                clientDocumentId: docId,
                notes: notes.trim() ? notes.trim() : undefined,
                timezone: moment.tz.guess(),
            },
            {
                onSuccess: (res) => {
                    if (!res?.success) {
                        toast.error(res?.message || 'Failed to save recommendation run');
                        return;
                    }
                    saveDocIdRef.current = null;
                    const id = res.data?.id || res.data?.run?.id;
                    if (id) setSavedRunId(id);
                    toast.success('Recommendation saved');
                    setNotes('');
                },
                onError: (error: unknown) => toast.error(apiMessage(error)),
            },
        );
    };

    const buildColumns = (showLocation: boolean, showStoreBreakdownAction: boolean): ColumnDef<ReplenishmentRecommendLine>[] =>
        [
            ...(showLocation
                ? [
                      {
                          id: 'location',
                          header: 'Store / Warehouse',
                          cell: ({ row }) => (
                              <div className="max-w-[160px] truncate" title={row.original.storeName || row.original.warehouseName || ''}>
                                  {row.original.storeName || row.original.warehouseName || (isGroup ? 'Consolidated' : '—')}
                              </div>
                          ),
                      } as ColumnDef<ReplenishmentRecommendLine>,
                  ]
                : []),
            {
                id: 'product',
                header: 'SKU / Description',
                cell: ({ row }) => (
                    <div className="space-y-0.5">
                        <div className="font-medium">{row.original.description || '—'}</div>
                        <div className="text-xs text-muted-foreground">
                            {row.original.skuCode || row.original.itemCode || ''}
                        </div>
                    </div>
                ),
            },
            { id: 'sold', header: 'Sold Qty', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.soldQuantity ?? row.original.soldQuantityLast30Days)}</span> },
            { id: 'refunded', header: 'Refunded Qty', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.refundedQuantity)}</span> },
            {
                id: 'netSold',
                header: 'Net Sales Qty',
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {num(
                            row.original.netSalesQuantity ??
                                (row.original.soldQuantity != null && row.original.refundedQuantity != null
                                    ? row.original.soldQuantity - row.original.refundedQuantity
                                    : undefined),
                        )}
                    </span>
                ),
            },
            { id: 'daily', header: 'Daily Sales Rate', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.dailySalesRate)}</span> },
            { id: 'weekly', header: 'Weekly Sales Qty', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.weeklySalesQuantity ?? row.original.weeklySalesRate)}</span> },
            { id: 'monthly', header: 'Monthly Sales Qty', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.monthlySalesQuantity ?? row.original.monthlySalesRate)}</span> },
            { id: 'available', header: 'Available', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.availableStock)}</span> },
            { id: 'reserved', header: 'Reserved Demand', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.reservedDemand)}</span> },
            { id: 'incoming', header: 'Incoming', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.incomingStock)}</span> },
            { id: 'position', header: 'Stock Position', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.stockPosition)}</span> },
            { id: 'reorderLevel', header: 'Reorder Level', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.reorderLevel)}</span> },
            { id: 'baseTarget', header: 'Base Target', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.baseTargetQuantity)}</span> },
            { id: 'uplift', header: 'Seasonal Uplift %', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.seasonalUpliftPercent)}</span> },
            { id: 'seasonalTarget', header: 'Seasonal Target', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.seasonalTargetQuantity ?? row.original.targetQuantity)}</span> },
            {
                id: 'rawRecommended',
                header: 'Raw Recommended',
                cell: ({ row }) => (
                    <span className="font-mono tabular-nums">
                        {num(row.original.rawRecommendedQuantity ?? row.original.targetedRecommendedQuantity)}
                    </span>
                ),
            },
            {
                id: 'finalRecommended',
                header: 'Final Recommended',
                cell: ({ row }) => (
                    <span className="font-mono font-semibold tabular-nums">{num(row.original.recommendedQuantity)}</span>
                ),
            },
            { id: 'supplier', header: 'Supplier', cell: ({ row }) => row.original.supplierName || row.original.supplier || '—' },
            { id: 'moq', header: 'MOQ', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.minimumOrderQuantity)}</span> },
            { id: 'multiple', header: 'Order Multiple', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.orderMultiple)}</span> },
            {
                id: 'flags',
                header: 'Flags',
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1">
                        <AppliedFlag on={row.original.reorderTriggered} label="Reorder" className="bg-amber-100 text-amber-800" />
                        <AppliedFlag on={row.original.isSeasonal} label="Seasonal" className="bg-indigo-100 text-indigo-700" />
                        <AppliedFlag on={row.original.appliedMinimumOrderQuantity} label="MOQ" />
                        <AppliedFlag on={row.original.appliedStandardOrderQuantity} label="Std" />
                        <AppliedFlag on={row.original.appliedOrderMultiple} label="Mult" />
                        <AppliedFlag on={row.original.appliedMaximumOrderQuantity} label="Max" />
                    </div>
                ),
            },
            ...(showStoreBreakdownAction
                ? [
                      {
                          id: 'storeBreakdown',
                          header: '',
                          cell: ({ row }) => (
                              <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      const key = row.original.companyStockDetailId || row.original.skuCode || '';
                                      setExpandedSku((prev) => (prev === key ? null : key));
                                  }}
                              >
                                  Stores
                              </Button>
                          ),
                      } as ColumnDef<ReplenishmentRecommendLine>,
                  ]
                : []),
        ] as ColumnDef<ReplenishmentRecommendLine>[];

    const showLocation = scope.type !== 'STORE';
    const columns = useMemo(
        () => buildColumns(showLocation, isGroup),
        [showLocation, isGroup],
    );

    const detailRows = useMemo(() => {
        if (!isGroup || !expandedSku) return [];
        return storeRows.filter(
            (r) => r.companyStockDetailId === expandedSku || r.skuCode === expandedSku || r.itemCode === expandedSku,
        );
    }, [isGroup, expandedSku, storeRows]);

    const showEmptyState = recommendQuery.isSuccess && mainRows.length === 0 && !recommendQuery.isLoading;

    return (
        <PageLoader isLoading={recommendQuery.isLoading || saveRun.isPending}>
            <div className="space-y-3">
                <ReplenishmentTabs active="recommendations" />

                <div className="rounded-md border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-end gap-3">
                        <ScopeSelector
                            value={scope}
                            onChange={setScope}
                            allowedTypes={loginScope.allowedTypes}
                            fixed={loginScope.fixed}
                            disabled={!canCalculate}
                        />

                        <div>
                            <Label className="text-xs text-muted-foreground">As Of Date</Label>
                            <Input
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                disabled={!canCalculate}
                                className="mt-1 h-8 w-[150px]"
                            />
                        </div>

                        <div className="relative">
                            <Label className="text-xs text-muted-foreground">SKU filter (optional)</Label>
                            <div className="mt-1 flex items-center gap-1">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={skuSearch}
                                        onChange={(e) => {
                                            setSkuSearch(e.target.value);
                                            setSkuOpen(true);
                                        }}
                                        onFocus={() => setSkuOpen(true)}
                                        placeholder="Search SKU / item code"
                                        disabled={!canCalculate}
                                        className="h-8 w-[210px] pl-7"
                                    />
                                </div>
                                {selectedSkus.map((s) => (
                                    <span
                                        key={s.id}
                                        className="flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-800"
                                    >
                                        {s.itemCode || s.barcode || s.description || s.id.slice(0, 6)}
                                        <button type="button" onClick={() => removeSku(s.id)} aria-label="Remove SKU">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>

                            {skuOpen && skuSearch.trim().length > 0 && (
                                <div className="absolute z-20 mt-1 max-h-60 w-[320px] overflow-auto rounded-md border bg-popover shadow-md">
                                    {skuQuery.isLoading && (
                                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching…
                                        </div>
                                    )}
                                    {!skuQuery.isLoading && skuResults.length === 0 && (
                                        <div className="px-3 py-2 text-xs text-muted-foreground">No matching SKUs</div>
                                    )}
                                    {skuResults.map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => addSku(s)}
                                            className="flex w-full flex-col items-start px-3 py-1.5 text-left text-xs hover:bg-muted"
                                        >
                                            <span className="font-medium">{s.description || s.itemCode}</span>
                                            <span className="text-muted-foreground">
                                                {s.itemCode || ''} {s.barcode ? `· ${s.barcode}` : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <label className="mb-1.5 flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox checked={includeZero} onCheckedChange={handleToggleZero} disabled={!canCalculate} />
                            Show zero recommendations
                        </label>

                        {canCalculate && (
                            <Button
                                onClick={handlePreview}
                                className="mb-0.5 flex items-center gap-2"
                                size="sm"
                            >
                                {recommendQuery.isFetching ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Generate Recommendations
                            </Button>
                        )}
                    </div>

                    <div className="mt-2 space-y-2">
                        <PolicySummary policy={policy} isLoading={policyQuery.isLoading} />
                        {recommendQuery.isError && scope.type !== 'WAREHOUSE' && (
                            <div className="text-sm text-red-600">{apiMessage(recommendQuery.error)}</div>
                        )}
                    </div>
                </div>

                {savedRun && (
                    <div className="flex flex-wrap items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                        <RunStatusBadge status={getReplenishmentRunStatus(savedRun)} />
                        <span>
                            Saved for {savedRun.asOfDate || asOfDate} — status {getReplenishmentRunStatus(savedRun)}. Further
                            changes must be made from Saved Runs.
                        </span>
                        <Link href="/processing/replenishment/history" className="font-medium text-blue-600 underline">
                            Open Saved Runs
                        </Link>
                    </div>
                )}

                {recommendArgs && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-sm">
                            <span className="font-semibold">Demand &amp; Reorder Recommendations</span>
                            <span className="text-xs text-muted-foreground">
                                As of {recommendArgs.asOfDate}
                                {lookbackFrom && lookbackTo ? ` · Lookback ${lookbackFrom} → ${lookbackTo}` : ''}
                                {calculationVersion ? ` · v${calculationVersion}` : ''}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {mainRows.length} line{mainRows.length === 1 ? '' : 's'}
                                {isGroup && consolidated.length ? ' (consolidated)' : ''}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {canSave ? (
                                <>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Notes (optional)"
                                        className="h-8 w-[220px]"
                                    />
                                    <Button size="sm" onClick={handleSave} className="flex items-center gap-1">
                                        <Save className="h-3.5 w-3.5" /> Save Recommendation Run
                                    </Button>
                                </>
                            ) : savedRunId ? (
                                <span className="text-xs text-muted-foreground">
                                    Saved. Further changes must be made from Saved Runs.
                                </span>
                            ) : null}
                        </div>
                    </div>
                )}

                {!recommendArgs && (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Choose a scope and as-of date, then generate to see sales demand, stock position and the recommended
                        reorder quantity.
                    </div>
                )}

                {recommendArgs && showEmptyState && (
                    <div className="rounded-md border bg-muted/20 p-6 text-center text-sm">
                        No reorder is required for this location.
                    </div>
                )}

                {recommendArgs && mainRows.length > 0 && (
                    <DataTable
                        query={recommendQuery}
                        data={mainRows}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={mainRows.length}
                        getRowId={(row, index) => row.companyStockDetailId || row.skuCode || String(index)}
                        rowClassName={(row) => {
                            const key = row.companyStockDetailId || row.skuCode || '';
                            return isGroup && key && key === expandedSku ? 'bg-blue-50' : '';
                        }}
                        onRowClick={
                            isGroup
                                ? (row) => {
                                      const key = row.original.companyStockDetailId || row.original.skuCode || '';
                                      if (key) setExpandedSku((prev) => (prev === key ? null : key));
                                  }
                                : undefined
                        }
                    />
                )}

                {isGroup && expandedSku && (
                    <div className="rounded-md border">
                        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-sm">
                            <span className="font-semibold">Store breakdown</span>
                            <button type="button" className="text-muted-foreground" onClick={() => setExpandedSku(null)}>
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="p-3">
                            {detailRows.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No individual store rows were returned for this SKU. The consolidated row is the order
                                    quantity.
                                </div>
                            ) : (
                                <table className="w-full text-xs">
                                    <thead className="text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-2 py-1.5 font-medium">Store</th>
                                            <th className="px-2 py-1.5 font-medium">Sold Qty</th>
                                            <th className="px-2 py-1.5 font-medium">Available</th>
                                            <th className="px-2 py-1.5 font-medium">Stock Position</th>
                                            <th className="px-2 py-1.5 font-medium">Recommended Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {detailRows.map((r, i) => (
                                            <tr key={`${r.companyDebtorId || i}`} className="border-t">
                                                <td className="px-2 py-1.5">{r.storeName || r.companyDebtorId || '—'}</td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">{num(r.soldQuantity ?? r.soldQuantityLast30Days)}</td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">{num(r.availableStock)}</td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">{num(r.stockPosition)}</td>
                                                <td className="px-2 py-1.5 font-mono tabular-nums">{num(r.recommendedQuantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PageLoader>
    );
};

export default ReplenishmentScreen;
