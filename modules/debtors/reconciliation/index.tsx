'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import { useDebtorList } from '@/api-queries/debtor';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import {
    useGetReconciliationSummary,
    useGetReconciliationUnmatched,
    toReconciliationRows,
    useGetReconciliationMismatches,
    useGetReconciliationEligible,
    toEligibleInvoices,
    usePostReconciliation,
    useGetReconciliationBatch,
    useReverseReconciliation,
    ReconciliationSourceRow,
    ReconciliationMismatchRow,
    ReconciliationEligibleInvoice,
    ReconciliationSourceType,
    ReconciliationDebtorRef,
    ReconciliationBatch,
} from '@/api-queries/debtor-reconciliation';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import {
    ArrowRightLeft,
    CheckCircle2,
    Eye,
    FileWarning,
    Landmark,
    RotateCcw,
    Wallet,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { generateUUIDForData } from '@/utils/helpers';

interface ReconciliationModuleProps {
    moduleCode: string;
}

interface DebtorLikeRow {
    debtorName?: string;
    accountNumber?: string;
    debtor?: ReconciliationDebtorRef | null;
}

// Never show N/A while the backend still gives us a nested debtor object.
const DebtorCell = ({ row }: { row: DebtorLikeRow }) => {
    const name = row.debtorName || row.debtor?.name || '';
    const account = row.accountNumber || row.debtor?.accountNumber || '';
    if (!name && !account) return <div>N/A</div>;
    if (!name) return <div>{account}</div>;
    return (
        <div>
            {name} {account ? <span className="text-muted-foreground">({account})</span> : null}
        </div>
    );
};

const ReconciliationModule = ({ moduleCode }: ReconciliationModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    // Filters
    const [companyDebtorId, setCompanyDebtorId] = useState<string | null>(null);
    const [dateFrom, setDateFrom] = useState(() => moment().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
    const [applied, setApplied] = useState(false);

    const { pagination, setPagination } = useTableFilters({});

    // Allocation flow
    const [allocateTarget, setAllocateTarget] = useState<ReconciliationSourceRow | null>(null);
    const [allocationMap, setAllocationMap] = useState<Record<string, string>>({});
    const [allocationDate, setAllocationDate] = useState(() => moment().format('YYYY-MM-DD'));

    // Session batches (no list endpoint for reconciliation batches)
    const [sessionBatches, setSessionBatches] = useState<ReconciliationBatch[]>([]);
    const [detailId, setDetailId] = useState<string | null>(null);
    const [reverseTarget, setReverseTarget] = useState<ReconciliationBatch | null>(null);
    const [reverseReason, setReverseReason] = useState('');

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const reconcileMut = usePostReconciliation();
    const reverseMut = useReverseReconciliation();

    const filterPayload = useMemo(
        () => ({
            ...(companyDebtorId ? { companyDebtorId } : {}),
            dateFrom: applied ? dateFrom : undefined,
            dateTo: applied ? dateTo : undefined,
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
        }),
        [companyDebtorId, dateFrom, dateTo, applied, pagination.pageIndex, pagination.pageSize],
    );

    // Summary, unmatched and mismatches must always be read with the same
    // dateFrom / dateTo so the cards, tabs and tables describe one period.
    const summaryQuery = useGetReconciliationSummary(filterPayload);
    const unmatchedQuery = useGetReconciliationUnmatched(filterPayload);
    const mismatchQuery = useGetReconciliationMismatches(filterPayload);

    const unmatchedRows = useMemo(() => toReconciliationRows(unmatchedQuery.data?.data), [unmatchedQuery.data]);
    const mismatchRows = useMemo(
        () => toReconciliationRows(mismatchQuery.data?.data) as unknown as ReconciliationMismatchRow[],
        [mismatchQuery.data],
    );

    // Eligible invoices come from /debtorReconciliation/eligible {sourceType, sourceId}.
    const eligibleQuery = useGetReconciliationEligible(
        allocateTarget
            ? {
                  sourceType: allocateTarget.sourceType || 'RECEIPT',
                  sourceId: allocateTarget.sourceId || allocateTarget.id || '',
              }
            : null,
    );
    const eligibleInvoices = useMemo(
        () => toEligibleInvoices(eligibleQuery.data?.data),
        [eligibleQuery.data],
    );

    const debtorList = useDebtorList({})?.data?.data?.rows || [];

    const summary = summaryQuery.data?.data || {};
    const detailQuery = useGetReconciliationBatch(detailId);
    const batchDetail = detailQuery.data?.data;

    const sourceUnallocated = allocateTarget?.unallocatedAmount || 0;
    const totalAllocated = useMemo(
        () =>
            eligibleInvoices.reduce((sum, invoice) => {
                const id = invoice.debtorInvoicingOrderId || invoice.id;
                return sum + (id ? Number(allocationMap[id] || 0) : 0);
            }, 0),
        [eligibleInvoices, allocationMap],
    );
    const isOverAllocated = totalAllocated > sourceUnallocated;

    const setInvoiceAmount = (invoiceId: string, value: string) => {
        setAllocationMap((prev) => {
            const next = { ...prev };
            if (value === '' || value === null || value === undefined) delete next[invoiceId];
            else next[invoiceId] = value;
            return next;
        });
    };

    const allocationMapRef = useRef(allocationMap);
    allocationMapRef.current = allocationMap;
    const setInvoiceAmountRef = useRef(setInvoiceAmount);
    setInvoiceAmountRef.current = setInvoiceAmount;

    const allocationAmountCell: ColumnDef<ReconciliationEligibleInvoice>['cell'] = useCallback(
        ({ row }: { row: { original: ReconciliationEligibleInvoice } }) => {
            const invoiceId = row.original.debtorInvoicingOrderId || row.original.id;
            if (!invoiceId) return <div>-</div>;
            const outstanding = Number(row.original.outstandingAmount || 0);
            return (
                <Input
                    type="number"
                    min={0}
                    max={outstanding}
                    step="0.01"
                    className="h-8 w-32 text-xs"
                    placeholder="0.00"
                    value={allocationMapRef.current[invoiceId] || ''}
                    onChange={(e) => setInvoiceAmountRef.current(invoiceId, e.target.value)}
                />
            );
        },
        [],
    );

    const applyFilters = () => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        setApplied(true);
    };

    const clearFilters = () => {
        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
        setCompanyDebtorId(null);
        setDateFrom(moment().startOf('month').format('YYYY-MM-DD'));
        setDateTo(moment().format('YYYY-MM-DD'));
        setApplied(false);
    };

    const refreshAll = () => {
        summaryQuery.refetch();
        unmatchedQuery.refetch();
        mismatchQuery.refetch();
        eligibleQuery.refetch();
    };

    const reconcilePayload = (approvalToken?: string) => {
        const target = allocateTarget;
        if (!target) return null;
        const allocations = eligibleInvoices
            .filter((invoice) => {
                const id = invoice.debtorInvoicingOrderId || invoice.id;
                return !!id && Number(allocationMap[id] || 0) > 0;
            })
            .map((invoice) => ({
                debtorInvoicingOrderId: (invoice.debtorInvoicingOrderId || invoice.id) as string,
                allocatedAmount: Number(
                    allocationMap[invoice.debtorInvoicingOrderId || (invoice.id as string)] || 0,
                ),
            }));
        return {
            sourceType: (target.sourceType || 'RECEIPT') as ReconciliationSourceType,
            sourceId: target.sourceId || target.id || '',
            clientDocumentId: generateUUIDForData(),
            allocationDate,
            allocations,
            ...(approvalToken ? { approvalToken } : {}),
        };
    };

    const handleReconcileConfirm = () => {
        const payload = reconcilePayload();
        if (!payload || payload.allocations.length === 0) return;
        reconcileMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Reconciliation posted');
                    if (data.data) setSessionBatches((prev) => [data.data as ReconciliationBatch, ...prev]);
                    setAllocateTarget(null);
                    setAllocationMap({});
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Reconciliation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Post Reconciliation'),
        });
    };

    const runReconcile = (approvalToken: string) => {
        const payload = reconcilePayload(approvalToken);
        if (!payload || payload.allocations.length === 0) return;
        reconcileMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Reconciliation posted');
                    if (data.data) setSessionBatches((prev) => [data.data as ReconciliationBatch, ...prev]);
                    setAllocateTarget(null);
                    setAllocationMap({});
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Reconciliation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Post Reconciliation'),
        });
    };

    const handleReverseConfirm = () => {
        if (!reverseTarget) return;
        const batchId = reverseTarget.allocationBatchId || reverseTarget.id;
        if (!batchId) return;
        reverseMut.mutate(
            {
                allocationBatchId: batchId,
                reason: reverseReason.trim() || undefined,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Reconciliation reversed');
                        setSessionBatches((prev) => prev.filter((b) => (b.allocationBatchId || b.id) !== batchId));
                        setReverseTarget(null);
                        setReverseReason('');
                        refreshAll();
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Reconciliation'),
            },
        );
    };

    const runReverse = (approvalToken: string) => {
        if (!reverseTarget) return;
        const batchId = reverseTarget.allocationBatchId || reverseTarget.id;
        if (!batchId) return;
        reverseMut.mutate(
            {
                allocationBatchId: batchId,
                reason: reverseReason.trim() || undefined,
                approvalToken,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Reconciliation reversed');
                        setSessionBatches((prev) => prev.filter((b) => (b.allocationBatchId || b.id) !== batchId));
                        setReverseTarget(null);
                        setReverseReason('');
                        refreshAll();
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Reconciliation'),
            },
        );
    };

    const handleApproval = (error: unknown, actionLabel: string) => {
        const info = isApprovalRequiredError(error);
        if (info) {
            setApproval({ ...info, actionLabel });
        } else {
            // @ts-ignore
            toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
        }
    };

    const summaryCards = [
        {
            label: 'Matched',
            count: summary.matchedCount ?? 0,
            amount: summary.matchedAmount ?? 0,
            className: 'border-green-200 bg-green-50 text-green-700',
        },
        {
            label: 'Unallocated',
            count: summary.unallocatedCount ?? 0,
            amount: summary.unallocatedAmount ?? 0,
            className: 'border-amber-200 bg-amber-50 text-amber-700',
        },
        {
            label: 'Mismatches',
            count: summary.mismatchCount ?? 0,
            amount: summary.mismatchAmount ?? 0,
            className: 'border-red-200 bg-red-50 text-red-700',
        },
    ];

    const unmatchedColumns: ColumnDef<ReconciliationSourceRow>[] = [
        {
            accessorKey: 'sourceType',
            header: (data) => <TableHeaderToggle {...data}>Source</TableHeaderToggle>,
            cell: ({ row }) => {
                const isReceipt = row.original.sourceType !== 'CREDIT_NOTE';
                return (
                    <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            isReceipt ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}
                    >
                        {isReceipt ? 'RECEIPT' : 'CREDIT NOTE'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'referenceNumber',
            header: (data) => <TableHeaderToggle {...data}>Number</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-medium">
                    {row.original.referenceNumber || row.original.sourceNumber || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'sourceDate',
            header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('sourceDate') ? (
                    <div>{moment(String(row.getValue('sourceDate'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'debtorName',
            header: (data) => <TableHeaderToggle {...data}>Debtor</TableHeaderToggle>,
            cell: ({ row }) => <DebtorCell row={row.original} />,
        },
        {
            id: 'tenderBreakdown',
            header: () => <div>Tender</div>,
            cell: ({ row }) => {
                const breakdown = row.original.tenderBreakdown;
                if (!Array.isArray(breakdown) || !breakdown.length)
                    return <div className="text-muted-foreground text-xs">No tender recorded</div>;
                return (
                    <div className="space-y-0.5 text-xs">
                        {breakdown.map((tender, idx) => {
                            const label = tender.tenderType || tender.tender || tender.type || tender.name || 'Tender';
                            return (
                                <div key={idx} className="flex justify-between gap-3">
                                    <span>
                                        {label}
                                        {typeof tender.count === 'number' && tender.count > 1
                                            ? ` x${tender.count}`
                                            : ''}
                                    </span>
                                    <span className="font-medium">
                                        {currencySymbol} {Number(tender.amount || 0).toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                );
            },
        },
        {
            accessorKey: 'amount',
            header: (data) => <TableHeaderToggle {...data}>Amount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {Number(row.original.amount || 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'unallocatedAmount',
            header: (data) => <TableHeaderToggle {...data}>Unallocated</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-semibold text-red-700">
                    {currencySymbol} {Number(row.original.unallocatedAmount || 0).toFixed(2)}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div>Actions</div>,
            cell: ({ row }) => (
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => {
                        setAllocateTarget(row.original);
                        setAllocationMap({});
                    }}
                >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Allocate
                </Button>
            ),
        },
    ];

    const mismatchColumns: ColumnDef<ReconciliationMismatchRow>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice</TableHeaderToggle>,
        },
        {
            accessorKey: 'invoiceDate',
            header: (data) => <TableHeaderToggle {...data}>Invoice Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('invoiceDate') ? (
                    <div>{moment(String(row.getValue('invoiceDate'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'debtorName',
            header: (data) => <TableHeaderToggle {...data}>Debtor</TableHeaderToggle>,
            cell: ({ row }) => <DebtorCell row={row.original} />,
        },
        {
            accessorKey: 'sourceNumber',
            header: (data) => <TableHeaderToggle {...data}>Source</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.sourceType === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 'RECEIPT'} -{' '}
                    {row.original.sourceNumber || row.original.sourceId || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'invoiceOutstandingAmount',
            header: (data) => <TableHeaderToggle {...data}>Outstanding</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.original.invoiceOutstandingAmount || 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'allocatedAmount',
            header: (data) => <TableHeaderToggle {...data}>Allocated</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.original.allocatedAmount || 0).toFixed(2)}</div>
            ),
        },
        {
            accessorKey: 'varianceAmount',
            header: (data) => <TableHeaderToggle {...data}>Variance</TableHeaderToggle>,
            cell: ({ row }) => {
                const variance = Number(row.original.varianceAmount || 0);
                return (
                    <div className={`font-semibold ${variance < 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {currencySymbol} {variance.toFixed(2)}
                    </div>
                );
            },
        },
    ];

    const eligibleColumns: ColumnDef<ReconciliationEligibleInvoice>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice No</TableHeaderToggle>,
        },
        {
            accessorKey: 'invoiceDate',
            header: (data) => <TableHeaderToggle {...data}>Invoice Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('invoiceDate') ? (
                    <div>{moment(String(row.getValue('invoiceDate'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'debtorName',
            header: (data) => <TableHeaderToggle {...data}>Debtor</TableHeaderToggle>,
            cell: ({ row }) => <DebtorCell row={row.original} />,
        },
        {
            accessorKey: 'outstandingAmount',
            header: (data) => <TableHeaderToggle {...data}>Outstanding</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="font-semibold text-red-700">
                    {currencySymbol} {Number(row.original.outstandingAmount || 0).toFixed(2)}
                </div>
            ),
        },
        {
            id: 'allocatedAmount',
            header: () => <div>Allocation Amount</div>,
            cell: allocationAmountCell,
        },
    ];

    return (
        <PageLoader isLoading={summaryQuery.isLoading && !!applied}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Debtor Payment Reconciliation</div>
                <p className="text-xs text-muted-foreground">
                    Compare receipts / credit notes with allocations and invoice balances.
                </p>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[240px]">
                        <Label className="text-xs">Debtor</Label>
                        <SelectPopover
                            title="debtor"
                            selectedValue={companyDebtorId}
                            options={debtorList.map((debtor) => ({
                                value: debtor.id,
                                label: `${debtor.name} (${debtor.accountNumber})`,
                            }))}
                            onSelect={(val) => setCompanyDebtorId(val || null)}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Date From</Label>
                        <Input
                            type="date"
                            className="h-9 w-40 text-xs"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Date To</Label>
                        <Input
                            type="date"
                            className="h-9 w-40 text-xs"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={applyFilters}>
                            Apply
                        </Button>
                        <Button size="sm" variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {summaryCards.map((card) => (
                        <Card key={card.label} className={card.className}>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">{card.label}</div>
                                        <div className="text-xs opacity-70">{card.count} record(s)</div>
                                    </div>
                                    <div className="text-lg font-bold">
                                        {currencySymbol} {Number(card.amount).toFixed(2)}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Unmatched / mismatches */}
                <Tabs defaultValue="unmatched">
                    <TabsList>
                        <TabsTrigger value="unmatched">
                            <Wallet className="mr-1 h-4 w-4" /> Unmatched (
                            {unmatchedQuery.data?.data?.count ?? unmatchedRows.length})
                        </TabsTrigger>
                        <TabsTrigger value="mismatches">
                            <FileWarning className="mr-1 h-4 w-4" /> Mismatches (
                            {mismatchQuery.data?.data?.count ?? mismatchRows.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="unmatched" className="space-y-2">
                        <DataTable
                            query={unmatchedQuery}
                            data={unmatchedRows}
                            columns={unmatchedColumns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={unmatchedQuery.data?.data?.count ?? unmatchedRows.length}
                        />
                    </TabsContent>

                    <TabsContent value="mismatches" className="space-y-2">
                        <DataTable
                            query={mismatchQuery}
                            data={mismatchRows}
                            columns={mismatchColumns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={mismatchQuery.data?.data?.count ?? mismatchRows.length}
                        />
                    </TabsContent>
                </Tabs>

                {/* Session batches */}
                {/* pen */}
            </div>

            {/* Allocation dialog */}
            <Dialog open={!!allocateTarget} onOpenChange={(o) => !o && setAllocateTarget(null)}>
                <DialogContent className="sm:max-w-[760px]">
                    <DialogHeader>
                        <DialogTitle>Allocate {allocateTarget?.sourceType === 'CREDIT_NOTE' ? 'Credit Note' : 'Receipt'}</DialogTitle>
                        <DialogDescription>
                            {allocateTarget?.referenceNumber || allocateTarget?.sourceNumber || ''} -{' '}
                            {allocateTarget?.debtorName || ''} | Unallocated:{' '}
                            {currencySymbol} {sourceUnallocated.toFixed(2)} | Total to allocate:{' '}
                            <span className={`font-semibold ${isOverAllocated ? 'text-red-600' : 'text-green-700'}`}>
                                {currencySymbol} {totalAllocated.toFixed(2)}
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[50vh] space-y-3 overflow-auto">
                        {eligibleInvoices.length ? (
                            <DataTable
                                query={eligibleQuery}
                                data={eligibleInvoices}
                                columns={eligibleColumns}
                                totalRowCount={eligibleInvoices.length}
                            />
                        ) : (
                            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                                {eligibleQuery.isLoading
                                    ? 'Fetching eligible invoices...'
                                    : 'No eligible invoices for this source.'}
                            </div>
                        )}

                        {isOverAllocated ? (
                            <div className="text-xs font-medium text-red-600">
                                Total allocation exceeds the source unallocated amount ({currencySymbol}{' '}
                                {sourceUnallocated.toFixed(2)}).
                            </div>
                        ) : null}
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAllocateTarget(null)}>
                            Cancel
                        </Button>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs">Date</Label>
                            <Input
                                type="date"
                                className="h-8 w-40 text-xs"
                                value={allocationDate}
                                onChange={(e) => setAllocationDate(e.target.value)}
                            />
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={totalAllocated <= 0 || isOverAllocated || reconcileMut.isPending}
                            onClick={handleReconcileConfirm}
                        >
                            <ArrowRightLeft className="mr-1 h-4 w-4" />
                            {reconcileMut.isPending ? 'Posting...' : 'Post Reconciliation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch detail */}
            <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Reconciliation Batch</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-muted-foreground">Batch Id</Label>
                                    <div className="font-mono text-xs">
                                        {batchDetail?.allocationBatchId || batchDetail?.id || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Source</Label>
                                    <div>
                                        {batchDetail?.sourceType === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 'RECEIPT'} -{' '}
                                        {batchDetail?.sourceNumber || batchDetail?.sourceId || 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Date</Label>
                                    <div>
                                        {batchDetail?.allocationDate
                                            ? moment(batchDetail.allocationDate).format('DD/MM/YYYY')
                                            : 'N/A'}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-muted-foreground">Total Allocated</Label>
                                    <div className="font-semibold">
                                        {currencySymbol} {Number(batchDetail?.totalAllocated || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            {batchDetail?.reversalReason ? (
                                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs">
                                    <Label className="text-xs text-red-600">Reversal Reason</Label>
                                    <div>{batchDetail.reversalReason}</div>
                                </div>
                            ) : null}
                            {batchDetail?.items?.length ? (
                                <div className="space-y-1 border-t pt-2">
                                    <div className="font-semibold">Allocations ({batchDetail.items.length})</div>
                                    {batchDetail.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex justify-between border-b py-1 text-xs last:border-0"
                                        >
                                            <span>{item.debtorInvoicingOrderId || `Invoice ${idx + 1}`}</span>
                                            <span className="font-medium">
                                                {currencySymbol} {Number(item.allocatedAmount || 0).toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailId(null)}>
                            Close
                        </Button>
                        {batchDetail && !batchDetail.reversedAt ? (
                            <Button
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    setReverseTarget({ ...batchDetail, allocationBatchId: batchDetail.allocationBatchId || batchDetail.id });
                                    setDetailId(null);
                                }}
                            >
                                <RotateCcw className="h-4 w-4" /> Reverse
                            </Button>
                        ) : null}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reverse confirmation */}
            <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Reverse Reconciliation</DialogTitle>
                        <DialogDescription>
                            Reversing batch {reverseTarget?.allocationNumber || reverseTarget?.allocationBatchId || ''}{' '}
                            will restore the source unallocated amount and the invoice outstanding balances.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Reversal Reason</Label>
                            <Input
                                className="h-8 text-xs"
                                value={reverseReason}
                                onChange={(e) => setReverseReason(e.target.value)}
                                placeholder="Incorrect payment selected"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReverseTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700"
                            disabled={reverseMut.isPending}
                            onClick={handleReverseConfirm}
                        >
                            {reverseMut.isPending ? 'Reversing...' : 'Confirm Reverse'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approval */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={(token) => {
                    if (approval?.actionLabel === 'Reverse Reconciliation') runReverse(token);
                    else runReconcile(token);
                }}
            />
        </PageLoader>
    );
};

export default ReconciliationModule;