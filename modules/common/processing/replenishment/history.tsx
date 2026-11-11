import { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Check, Loader2, ShoppingCart, X } from 'lucide-react';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { apiUrls } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useCreateMultiSupplierPurchaseOrder, useCreatePurchaseOrder } from '@/api-queries/purchase-orders';
import {
    type ReplenishmentAdjustmentInput,
    type ReplenishmentConversionGroup,
    type ReplenishmentRun,
    type ReplenishmentRunItem,
    type ReplenishmentPolicy,
    REPLENISHMENT_RUN_STATUSES,
    getReplenishmentConversionGroups,
    getReplenishmentRunItems,
    getReplenishmentRunStatus,
    getReplenishmentRuns,
    useApproveReplenishmentRun,
    useGetReplenishmentRun,
    useGetReplenishmentRuns,
    useReplenishmentConversion,
} from '@/api-queries/replenishment';
import { ReplenishmentTabs, PolicySummary, RunStatusBadge } from './components';
import { getLoginScope, scopeLocations } from './scope';

const apiMessage = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as Error)?.message ||
    'Something went wrong';

const num = (v?: number | string | null) => (v === null || v === undefined || v === '' ? '—' : v);

const ReplenishmentHistoryScreen = () => {
    const userGroupPermissions = useUsersPermissions();
    const user = useAuthUser((state) => state.user);
    const queryClient = useQueryClient();

    const canApprove = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.APPROVAL.code,
        [SYSTEM_PERMISSIONS.CREATE],
    );
    const canConvert = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.CONVERSION.code,
        [SYSTEM_PERMISSIONS.CREATE],
    );

    const loginScope = useMemo(() => getLoginScope(user), [user]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Store / warehouse logins only ever see their own runs; company users see company-wide.
    const listProps = useMemo(
        () => ({
            ...(loginScope.fixed ? scopeLocations(loginScope.fixed) : {}),
            ...(statusFilter ? { runStatus: statusFilter } : {}),
            ...(fromDate ? { fromDate } : {}),
            ...(toDate ? { toDate } : {}),
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
        }),
        [loginScope, statusFilter, fromDate, toDate, pagination.pageSize, pagination.pageIndex],
    );

    const runsQuery = useGetReplenishmentRuns(listProps);
    const runs = useMemo(() => getReplenishmentRuns(runsQuery.data), [runsQuery.data]);
    const totalCount = runsQuery.data?.data?.count ?? runs.length;

    const detailQuery = useGetReplenishmentRun(selectedRunId);
    const run = detailQuery.data?.data || null;
    const items = useMemo(() => getReplenishmentRunItems(run), [run]);
    const status = getReplenishmentRunStatus(run);

    const scopeLabelOf = (type?: string) =>
        ({ COMPANY: 'Company', STORE_GROUP: 'Store Group', STORE: 'Store', WAREHOUSE: 'Warehouse / DC' } as Record<
            string,
            string
        >)[type || ''] || type || '—';
    const sourceScope = run
        ? run.scopeType ||
          (run.warehouseId ? 'WAREHOUSE' : run.companyDebtorGroupId ? 'STORE_GROUP' : run.companyDebtorId ? 'STORE' : 'COMPANY')
        : 'COMPANY';
    const sourceLocation = run?.warehouseId || run?.companyDebtorGroupId || run?.companyDebtorId || 'Company-wide';

    useEffect(() => {
        if (!runs.length) return;
        if (!selectedRunId || !runs.some((r) => r.id === selectedRunId)) {
            setSelectedRunId(runs[0].id);
        }
    }, [runs, selectedRunId]);

    const invalidateRun = () =>
        queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishment)] });

    // --------------------------------------- Approve / reject ---------------------------------------

    const approveRun = useApproveReplenishmentRun();
    const [decisionOpen, setDecisionOpen] = useState(false);
    const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
    const [reason, setReason] = useState('');
    const [adjustments, setAdjustments] = useState<Record<string, { qty: string; reason: string }>>({});

    const openDecision = (next: 'APPROVED' | 'REJECTED') => {
        setDecision(next);
        setReason('');
        setAdjustments({});
        setDecisionOpen(true);
    };

    const setAdj = (key: string, patch: Partial<{ qty: string; reason: string }>) =>
        setAdjustments((prev) => {
            const base = prev[key] || { qty: '', reason: '' };
            return { ...prev, [key]: { ...base, ...patch } };
        });

    const submitDecision = () => {
        if (!run) return;
        const trimmed = reason.trim();
        if (!trimmed) {
            toast.error('A reason is required to approve or reject a run');
            return;
        }

        const payloadAdjustments: ReplenishmentAdjustmentInput[] = [];
        if (decision === 'APPROVED') {
            for (const item of items) {
                const key = item.id || item.companyStockDetailId || '';
                const edit = key ? adjustments[key] : undefined;
                if (!edit || edit.qty.trim() === '') continue;
                const qty = Math.round(Number(edit.qty));
                if (!Number.isFinite(qty) || qty < 0) {
                    toast.error(`Invalid approved quantity for ${item.skuCode || key}`);
                    return;
                }
                const recommended = Math.round(item.recommendedQuantity ?? 0);
                if (qty !== recommended) {
                    if (!edit.reason.trim()) {
                        toast.error(`A reason is required when the quantity changes for ${item.skuCode || key}`);
                        return;
                    }
                    payloadAdjustments.push({ id: key, approvedQuantity: qty, reason: edit.reason.trim() });
                }
            }
        }

        approveRun.mutate(
            {
                id: run.id,
                decision,
                reason: trimmed,
                ...(payloadAdjustments.length ? { adjustments: payloadAdjustments } : {}),
            },
            {
                onSuccess: (res) => {
                    if (res?.success === false) {
                        toast.error(res.message || 'Failed to update the run');
                        return;
                    }
                    toast.success(decision === 'APPROVED' ? 'Run approved' : 'Run rejected');
                    setDecisionOpen(false);
                    invalidateRun();
                },
                onError: (error: unknown) => toast.error(apiMessage(error)),
            },
        );
    };

    // --------------------------------------- Conversion → PO ---------------------------------------

    const conversion = useReplenishmentConversion();
    const createMulti = useCreateMultiSupplierPurchaseOrder();
    const createSingle = useCreatePurchaseOrder();
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];

    const [convertOpen, setConvertOpen] = useState(false);
    const [groups, setGroups] = useState<ReplenishmentConversionGroup[] | null>(null);
    const [etaDate, setEtaDate] = useState('');
    const [convertNotes, setConvertNotes] = useState('');
    const [singleWarehouse, setSingleWarehouse] = useState('');
    const [deliveryCycle, setDeliveryCycle] = useState('');

    const [poCreated, setPoCreated] = useState(false);

    const openConvert = () => {
        if (!run) return;
        setEtaDate('');
        setConvertNotes('');
        setDeliveryCycle('');
        setSingleWarehouse(run.warehouseId || '');
        setGroups(null);
        setPoCreated(false);
        setConvertOpen(true);
        // Phase 1: fetch the supplier groups WITHOUT marking the run converted.
        conversion.mutate(
            { id: run.id, markConverted: false },
            {
                onSuccess: (res) => {
                    const next = getReplenishmentConversionGroups(res);
                    if (!next.length) {
                        toast.error(res?.message || 'There is nothing to convert in this run');
                        setConvertOpen(false);
                        return;
                    }
                    setGroups(next);
                },
                onError: (error: unknown) => {
                    toast.error(apiMessage(error));
                    setConvertOpen(false);
                },
            },
        );
    };

    const mapGroup = (group: ReplenishmentConversionGroup) => ({
        companyCreditorId: group.companyCreditorId || '',
        supplierName: group.supplierName,
        items: (group.items || []).map((it) => ({
            companyStockDetailId: it.companyStockDetailId || '',
            skuCode: it.skuCode,
            description: it.description,
            // Use approved quantity when present, otherwise the recommendation.
            orderedQuantity: Math.round(
                Number(it.approvedQuantity ?? it.orderedQuantity ?? it.recommendedQuantity ?? 0),
            ),
            agreedUnitCost: Number(it.agreedUnitCost ?? 0),
        })),
    });

    // Phase 2: only after every PO draft was created successfully do we lock the run.
    const finalizeConvert = () => {
        if (!run) return;
        conversion.mutate(
            { id: run.id, markConverted: true },
            {
                onSuccess: (res) => {
                    if (res?.success === false) {
                        toast.error(
                            res.message ||
                                'Purchase orders were created but the run could not be marked converted. Retry.',
                        );
                        return;
                    }
                    toast.success('Run marked as CONVERTED');
                    setConvertOpen(false);
                    invalidateRun();
                },
                onError: (error: unknown) =>
                    toast.error(
                        apiMessage(error) ||
                            'Purchase orders were created but the run could not be marked converted. Retry.',
                    ),
            },
        );
    };

    const onPoSuccess = (res: { success?: boolean; message?: string }) => {
        if (res?.success === false) {
            // Do NOT mark the run converted when PO creation fails.
            toast.error(res.message || 'Failed to create the purchase order');
            return;
        }
        toast.success(res?.message || 'Purchase order created from this run');
        setPoCreated(true);
        finalizeConvert();
    };

    const submitConvert = () => {
        if (poCreated) {
            finalizeConvert();
            return;
        }
        if (!groups?.length) return;
        if (!etaDate) {
            toast.error('Select the expected delivery date');
            return;
        }

        const mapped = groups.map(mapGroup);
        for (const group of mapped) {
            if (!group.companyCreditorId) {
                toast.error('The conversion payload is missing a supplier');
                return;
            }
            if (!group.items.length) {
                toast.error(`No orderable lines for ${group.supplierName || 'a supplier'}`);
                return;
            }
            for (const item of group.items) {
                if (!item.companyStockDetailId) {
                    toast.error(`Missing stock item for ${item.skuCode || 'a line'} — reload and try again`);
                    return;
                }
                if (!Number.isFinite(item.orderedQuantity) || item.orderedQuantity < 1) {
                    toast.error(`Invalid order quantity for ${item.skuCode || 'a line'}`);
                    return;
                }
            }
        }

        if (mapped.length >= 2) {
            createMulti.mutate(
                {
                    expectedDeliveryDate: etaDate,
                    notes: convertNotes.trim() ? convertNotes.trim() : undefined,
                    suppliers: mapped.map((g) => ({ companyCreditorId: g.companyCreditorId, items: g.items })),
                },
                {
                    onSuccess: onPoSuccess,
                    onError: (error: unknown) => toast.error(apiMessage(error)),
                },
            );
            return;
        }

        const warehouseId = run?.warehouseId || singleWarehouse;
        if (!warehouseId) {
            toast.error('Select a warehouse for the purchase order');
            return;
        }
        if (!deliveryCycle.trim()) {
            toast.error('Enter the delivery cycle');
            return;
        }
        createSingle.mutate(
            {
                companyCreditorId: mapped[0].companyCreditorId,
                warehouseId,
                expectedDeliveryDate: etaDate,
                deliveryCycle: deliveryCycle.trim(),
                timezone: moment.tz.guess(),
                notes: convertNotes.trim() ? convertNotes.trim() : undefined,
                items: mapped[0].items,
            },
            {
                onSuccess: onPoSuccess,
                onError: (error: unknown) => toast.error(apiMessage(error)),
            },
        );
    };

    // --------------------------------------- Views ---------------------------------------

    const runColumns: ColumnDef<ReplenishmentRun>[] = [
        {
            id: 'runNumber',
            header: 'Run',
            cell: ({ row }) => (
                <div className="font-medium">{row.original.runNumber || row.original.id.slice(0, 8)}</div>
            ),
        },
        { id: 'asOfDate', header: 'Calculation Date', cell: ({ row }) => row.original.asOfDate || '—' },
        { id: 'status', header: 'Status', cell: ({ row }) => <RunStatusBadge status={getReplenishmentRunStatus(row.original)} /> },
        {
            id: 'createdAt',
            header: 'Saved',
            cell: ({ row }) =>
                row.original.createdAt ? moment(row.original.createdAt).format('DD MMM YY, HH:mm') : '—',
        },
        {
            id: 'notes',
            header: 'Notes',
            cell: ({ row }) => (
                <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.original.notes || ''}>
                    {row.original.notes || '—'}
                </div>
            ),
        },
    ];

    const itemColumns: ColumnDef<ReplenishmentRunItem>[] = [
        {
            id: 'product',
            header: 'Product',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="font-medium">{row.original.description || '—'}</div>
                    <div className="text-xs text-muted-foreground">{row.original.skuCode || ''}</div>
                </div>
            ),
        },
        { id: 'dailySales', header: 'Daily Sales', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.dailySalesRate)}</span> },
        { id: 'available', header: 'Available', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.availableStock)}</span> },
        { id: 'stockPosition', header: 'Stock Position', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.stockPosition)}</span> },
        { id: 'target', header: 'Target Stock', cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.seasonalTargetQuantity ?? row.original.targetQuantity)}</span> },
        {
            id: 'recommended',
            header: 'Recommended Qty',
            cell: ({ row }) => <span className="font-mono font-semibold tabular-nums">{num(row.original.recommendedQuantity)}</span>,
        },
        {
            id: 'approved',
            header: 'Approved Qty',
            cell: ({ row }) => <span className="font-mono tabular-nums">{num(row.original.approvedQuantity)}</span>,
        },
        {
            id: 'reorder',
            header: 'Reorder',
            cell: ({ row }) =>
                row.original.reorderTriggered ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">Yes</span>
                ) : (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">No</span>
                ),
        },
    ];

    const isPendingDecision = approveRun.isPending;
    const isPendingConvert = conversion.isPending || createMulti.isPending || createSingle.isPending;

    return (
        <PageLoader isLoading={runsQuery.isLoading || detailQuery.isLoading}>
            <div className="space-y-3">
                <ReplenishmentTabs active="history" />

                <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">Run Status</Label>
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPagination((p) => ({ ...p, pageIndex: 0 }));
                            }}
                            className="mt-1 h-8 w-[150px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                        >
                            <option value="">All</option>
                            {REPLENISHMENT_RUN_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">From</Label>
                        <Input
                            type="date"
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setPagination((p) => ({ ...p, pageIndex: 0 }));
                            }}
                            className="mt-1 h-8 w-[150px]"
                        />
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">To</Label>
                        <Input
                            type="date"
                            value={toDate}
                            onChange={(e) => {
                                setToDate(e.target.value);
                                setPagination((p) => ({ ...p, pageIndex: 0 }));
                            }}
                            className="mt-1 h-8 w-[150px]"
                        />
                    </div>
                </div>

                <DataTable
                    query={runsQuery}
                    data={runs}
                    columns={runColumns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalCount}
                    getRowId={(row) => row.id}
                    rowClassName={(row) => (row.id === selectedRunId ? 'bg-blue-50' : '')}
                    onRowClick={(row) => setSelectedRunId(row.original.id)}
                />

                {!run && runs.length > 0 && (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Select a saved run to review its lines and act on it.
                    </div>
                )}

                {run && (
                    <div className="rounded-md border">
                        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/30 px-3 py-2">
                            <RunStatusBadge status={status} />
                            <span className="text-sm font-semibold">
                                {run.runNumber || run.id.slice(0, 8)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Calculation date: {run.asOfDate || '—'}
                                {run.createdAt ? ` · Saved ${moment(run.createdAt).format('DD MMM YY, HH:mm')}` : ''}
                                {run.createdBy ? ` · by ${run.createdBy}` : ''}
                            </span>
                            {run.notes && <span className="text-xs text-muted-foreground">“{run.notes}”</span>}
                            {status === 'REJECTED' && run.rejectionReason && (
                                <span className="text-xs text-red-600">Reason: {run.rejectionReason}</span>
                            )}

                            <div className="ml-auto flex items-center gap-2">
                                {status === 'PROPOSED' && canApprove && (
                                    <>
                                        <Button size="sm" className="flex items-center gap-1" onClick={() => openDecision('APPROVED')}>
                                            <Check className="h-3.5 w-3.5" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="flex items-center gap-1"
                                            onClick={() => openDecision('REJECTED')}
                                        >
                                            <X className="h-3.5 w-3.5" /> Reject
                                        </Button>
                                    </>
                                )}
                                {status === 'APPROVED' && canConvert && (
                                    <Button size="sm" className="flex items-center gap-1" onClick={openConvert}>
                                        <ShoppingCart className="h-3.5 w-3.5" /> Create PO Draft
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-3 border-b px-3 py-2 text-xs sm:grid-cols-2">
                            <div className="space-y-1">
                                <div>
                                    <span className="text-muted-foreground">Source scope: </span>
                                    {scopeLabelOf(sourceScope)}
                                    {sourceScope !== 'COMPANY' ? ` · ${sourceLocation}` : ''}
                                </div>
                                {run.policy ? (
                                    <PolicySummary policy={run.policy as ReplenishmentPolicy} />
                                ) : (
                                    <div className="text-muted-foreground">No policy snapshot on this run.</div>
                                )}
                            </div>
                            <div className="space-y-1">
                                {run.approvalReason && (
                                    <div>
                                        <span className="text-muted-foreground">Approval reason: </span>
                                        {run.approvalReason}
                                    </div>
                                )}
                                {status === 'REJECTED' && run.rejectionReason && (
                                    <div className="text-red-600">Rejection reason: {run.rejectionReason}</div>
                                )}
                                {run.approvedBy && (
                                    <div>
                                        <span className="text-muted-foreground">Approved by: </span>
                                        {run.approvedBy}
                                        {run.approvedAt ? ` · ${moment(run.approvedAt).format('DD MMM YY, HH:mm')}` : ''}
                                    </div>
                                )}
                                {run.convertedBy && (
                                    <div>
                                        <span className="text-muted-foreground">Converted by: </span>
                                        {run.convertedBy}
                                        {run.convertedAt ? ` · ${moment(run.convertedAt).format('DD MMM YY, HH:mm')}` : ''}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-3">
                            <DataTable
                                query={detailQuery}
                                data={items}
                                columns={itemColumns}
                                totalRowCount={items.length}
                                getRowId={(row, index) => row.id || row.companyStockDetailId || String(index)}
                            />
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>
                            {decision === 'APPROVED' ? 'Approve replenishment run' : 'Reject replenishment run'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[60vh] space-y-3 overflow-auto">
                        <div>
                            <Label className="text-xs">
                                Reason {decision === 'APPROVED' ? '(approval reason is mandatory)' : '(rejection reason is mandatory)'}
                            </Label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={2}
                                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none"
                                placeholder={
                                    decision === 'APPROVED'
                                        ? 'Why is this run being approved?'
                                        : 'Why is this run being rejected?'
                                }
                            />
                        </div>

                        {decision === 'APPROVED' && items.length > 0 && (
                            <div className="rounded-md border">
                                <div className="border-b bg-muted/40 px-2 py-1.5 text-xs font-semibold">
                                    Adjust approved quantities (a reason is required whenever you change a quantity)
                                </div>
                                <div className="max-h-[40vh] overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                                            <tr>
                                                <th className="px-2 py-1.5 font-medium">Product</th>
                                                <th className="px-2 py-1.5 font-medium">Recommended</th>
                                                <th className="px-2 py-1.5 font-medium">Approved</th>
                                                <th className="px-2 py-1.5 font-medium">Change reason</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => {
                                                const key = item.id || item.companyStockDetailId || String(index);
                                                const edit = adjustments[key] || { qty: '', reason: '' };
                                                return (
                                                    <tr key={key} className="border-t">
                                                        <td className="px-2 py-1.5">
                                                            <div>{item.description || '—'}</div>
                                                            <div className="text-muted-foreground">{item.skuCode || ''}</div>
                                                        </td>
                                                        <td className="px-2 py-1.5 font-mono tabular-nums">
                                                            {num(item.recommendedQuantity)}
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <Input
                                                                type="number"
                                                                value={edit.qty}
                                                                onChange={(e) => setAdj(key, { qty: e.target.value })}
                                                                placeholder={String(item.recommendedQuantity ?? '')}
                                                                className="h-7 w-24 text-xs"
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <Input
                                                                value={edit.reason}
                                                                onChange={(e) => setAdj(key, { reason: e.target.value })}
                                                                placeholder="Required when changed"
                                                                className="h-7 text-xs"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDecisionOpen(false)}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={submitDecision} disabled={isPendingDecision}>
                            {isPendingDecision && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            {decision === 'APPROVED' ? 'Approve Run' : 'Reject Run'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
                <DialogContent className="sm:max-w-[720px]">
                    <DialogHeader>
                        <DialogTitle>Convert run to purchase order</DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[60vh] space-y-3 overflow-auto">
                        {conversion.isPending && !groups && (
                            <div className="flex items-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Building the conversion payload…
                            </div>
                        )}

                        {groups && (
                            <>
                                <div className="rounded-md border bg-muted/20 p-2 text-xs">
                                    <div className="font-semibold">
                                        {groups.length} supplier{groups.length === 1 ? '' : 's'} will be ordered from
                                    </div>
                                    <ul className="mt-1 space-y-0.5">
                                        {groups.map((g, i) => (
                                            <li key={g.companyCreditorId || i}>
                                                {g.supplierName || g.companyCreditorId} — {(g.items || []).length} line
                                                {(g.items || []).length === 1 ? '' : 's'},{' '}
                                                {(g.items || []).reduce(
                                                    (sum, it) => sum + Number(it.approvedQuantity ?? it.orderedQuantity ?? 0),
                                                    0,
                                                )}{' '}
                                                units
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Expected Delivery Date</Label>
                                        <Input
                                            type="date"
                                            value={etaDate}
                                            onChange={(e) => setEtaDate(e.target.value)}
                                            className="mt-1 h-8"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Notes</Label>
                                        <Input
                                            value={convertNotes}
                                            onChange={(e) => setConvertNotes(e.target.value)}
                                            placeholder="Optional"
                                            className="mt-1 h-8"
                                        />
                                    </div>

                                    {groups.length === 1 && !run?.warehouseId && (
                                        <div>
                                            <Label className="text-xs">Warehouse</Label>
                                            <SelectPopover
                                                title="Warehouse"
                                                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
                                                selectedValue={singleWarehouse || null}
                                                onSelect={(v) => setSingleWarehouse(v || '')}
                                                selectClass="h-8 text-sm"
                                                wrapperClass="mt-1"
                                            />
                                        </div>
                                    )}

                                    {groups.length === 1 && (
                                        <div>
                                            <Label className="text-xs">Delivery Cycle</Label>
                                            <Input
                                                value={deliveryCycle}
                                                onChange={(e) => setDeliveryCycle(e.target.value)}
                                                placeholder="e.g. Weekly"
                                                className="mt-1 h-8"
                                            />
                                        </div>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    {groups.length >= 2
                                        ? 'A group purchase order will be created: one PO per supplier, bound by a shared group id.'
                                        : 'A single purchase order will be created for this supplier.'}
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setConvertOpen(false)} disabled={isPendingConvert}>
                            Cancel
                        </Button>
                        <Button size="sm" onClick={submitConvert} disabled={!groups || isPendingConvert}>
                            {isPendingConvert && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                            <ShoppingCart className="mr-1 h-3.5 w-3.5" />{' '}
                            {poCreated ? 'Finalize Conversion' : 'Create Purchase Order'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default ReplenishmentHistoryScreen;
