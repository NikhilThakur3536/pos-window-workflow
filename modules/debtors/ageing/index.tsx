'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    useGetDebtorAgeing,
    toAgeingBuckets,
    toAgeingInvoices,
    toAgeingUnallocated,
    AgeingInvoice,
    AgeingBucketKey,
    toEligibleInvoices,
    useGetReconciliationEligible,
    useGetReconciliationUnmatched,
    toReconciliationRows,
    usePostReconciliation,
    useGetReconciliationBatch,
    useReverseReconciliation,
    ReconciliationSourceRow,
    ReconciliationEligibleInvoice,
    ReconciliationSourceType,
    ReconciliationBatch,
} from '@/api-queries/debtor-reconciliation';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import {
    ArrowRightLeft,
    CreditCard,
    Eye,
    RotateCcw,
    Wallet,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { generateUUIDForData } from '@/utils/helpers';

interface AgeingModuleProps {
    moduleCode: string;
}

const AgeingModule = ({ moduleCode }: AgeingModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    // Filters
    const [companyDebtorId, setCompanyDebtorId] = useState<string | null>(null);
    const [asOfDate, setAsOfDate] = useState(() => moment().format('YYYY-MM-DD'));
    const [selectedBucket, setSelectedBucket] = useState<AgeingBucketKey | null>(null);

    const { pagination: sourcePagination, setPagination: setSourcePagination } = useTableFilters({});
    const { pagination: invoicePagination, setPagination: setInvoicePagination } = useTableFilters({});

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

    const ageingInput = useMemo(
        () =>
            companyDebtorId
                ? {
                      companyDebtorId,
                      asOfDate,
                      dateFrom: moment(asOfDate).subtract(180, 'days').format('YYYY-MM-DD'),
                      dateTo: asOfDate,
                  }
                : null,
        [companyDebtorId, asOfDate],
    );

    const ageingQuery = useGetDebtorAgeing(ageingInput);
    const ageingData = ageingQuery.data?.data;
    const buckets = useMemo(() => toAgeingBuckets(ageingData), [ageingData]);
    const invoices = useMemo(() => toAgeingInvoices(ageingData, asOfDate), [ageingData, asOfDate]);
    const unallocated = useMemo(() => toAgeingUnallocated(ageingData), [ageingData]);
    const bucketInvoices = useMemo(
        () => (selectedBucket ? invoices.filter((inv) => inv.bucket === selectedBucket) : invoices),
        [invoices, selectedBucket],
    );
    const bucketInvoiceCount = useMemo(
        () =>
            buckets.reduce<Record<string, number>>((acc, bucket) => {
                acc[bucket.key] = invoices.filter((inv) => inv.bucket === bucket.key).length;
                return acc;
            }, {}),
        [buckets, invoices],
    );

    // Client-side pagination over the ageing invoice list (the ageing endpoint
    // returns the full statement in one call).
    const pageInvoices = useMemo(() => {
        const start = invoicePagination.pageIndex * invoicePagination.pageSize;
        return bucketInvoices.slice(start, start + invoicePagination.pageSize);
    }, [bucketInvoices, invoicePagination.pageIndex, invoicePagination.pageSize]);

    useEffect(() => {
        if (invoicePagination.pageIndex === 0) return;
        setInvoicePagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, [selectedBucket, companyDebtorId, setInvoicePagination]);

    useEffect(() => {
        if (sourcePagination.pageIndex === 0) return;
        setSourcePagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, [companyDebtorId, setSourcePagination]);

    const debtorList = useDebtorList({})?.data?.data?.rows || [];

    const sourceFilters = useMemo(
        () =>
            companyDebtorId
                ? {
                      companyDebtorId,
                      dateFrom: moment(asOfDate).subtract(365, 'days').format('YYYY-MM-DD'),
                      dateTo: asOfDate,
                      limit: sourcePagination.pageSize,
                      offset: sourcePagination.pageIndex * sourcePagination.pageSize,
                  }
                : {},
        [companyDebtorId, asOfDate, sourcePagination.pageIndex, sourcePagination.pageSize],
    );
    const unmatchedQuery = useGetReconciliationUnmatched(companyDebtorId ? sourceFilters : null);
    const sourceRows = useMemo(() => toReconciliationRows(unmatchedQuery.data?.data), [unmatchedQuery.data]);

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

    // FE rule: total allocation cannot exceed the invoice outstanding amount.
    const exceedsInvoiceOutstanding = useMemo(
        () =>
            eligibleInvoices.some((invoice) => {
                const id = invoice.debtorInvoicingOrderId || invoice.id;
                if (!id) return false;
                return Number(allocationMap[id] || 0) > Number(invoice.outstandingAmount || 0);
            }),
        [eligibleInvoices, allocationMap],
    );

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

    const allocationAmountCell = useCallback(
        ({ row }: { row: Row<ReconciliationEligibleInvoice> }) => {
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

    const detailQuery = useGetReconciliationBatch(detailId);
    const batchDetail = detailQuery.data?.data;

    const refreshAll = () => {
        ageingQuery.refetch();
        unmatchedQuery.refetch();
        eligibleQuery.refetch();
    };

    const reconcilePayload = (approvalToken?: string) => {
        if (!allocateTarget) return null;
        const allocations = eligibleInvoices
            .filter((invoice) => {
                const id = invoice.debtorInvoicingOrderId || invoice.id;
                return id && Number(allocationMap[id] || 0) > 0;
            })
            .map((invoice) => ({
                debtorInvoicingOrderId: invoice.debtorInvoicingOrderId || (invoice.id as string),
                allocatedAmount: Number(allocationMap[invoice.debtorInvoicingOrderId || (invoice.id as string)] || 0),
            }));
        return {
            sourceType: (allocateTarget.sourceType || 'RECEIPT') as ReconciliationSourceType,
            sourceId: allocateTarget.sourceId || allocateTarget.id || '',
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
                    toast.success('Credit allocation posted');
                    if (data.data) setSessionBatches((prev) => [data.data as ReconciliationBatch, ...prev]);
                    setAllocateTarget(null);
                    setAllocationMap({});
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Allocation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Post Credit Allocation'),
        });
    };

    const runReconcile = (approvalToken: string) => {
        const payload = reconcilePayload(approvalToken);
        if (!payload || payload.allocations.length === 0) return;
        reconcileMut.mutate(payload, {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Credit allocation posted');
                    if (data.data) setSessionBatches((prev) => [data.data as ReconciliationBatch, ...prev]);
                    setAllocateTarget(null);
                    setAllocationMap({});
                    refreshAll();
                } else {
                    toast.error(data?.message || 'Allocation failed');
                }
            },
            onError: (error) => handleApproval(error, 'Post Credit Allocation'),
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
                        toast.success('Allocation reversed');
                        setSessionBatches((prev) => prev.filter((b) => (b.allocationBatchId || b.id) !== batchId));
                        setReverseTarget(null);
                        setReverseReason('');
                        refreshAll();
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Allocation'),
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
                        toast.success('Allocation reversed');
                        setSessionBatches((prev) => prev.filter((b) => (b.allocationBatchId || b.id) !== batchId));
                        setReverseTarget(null);
                        setReverseReason('');
                        refreshAll();
                    } else {
                        toast.error(data?.message || 'Reverse failed');
                    }
                },
                onError: (error) => handleApproval(error, 'Reverse Allocation'),
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

    const invoiceColumns: ColumnDef<AgeingInvoice>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice No</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.original.invoiceNumber || 'N/A'}</div>,
        },
        {
            accessorKey: 'invoiceDate',
            header: (data) => <TableHeaderToggle {...data}>Invoice Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.original.invoiceDate ? (
                    <div>{moment(String(row.original.invoiceDate)).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'bucketLabel',
            header: (data) => <TableHeaderToggle {...data}>Ageing Bucket</TableHeaderToggle>,
            cell: ({ row }) => {
                const label = row.original.bucketLabel || 'N/A';
                return (
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
                        {label}
                    </span>
                );
            },
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
    ];

    const sourceColumns: ColumnDef<ReconciliationSourceRow>[] = [
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
                <div className="font-medium">{row.original.referenceNumber || row.original.sourceNumber || 'N/A'}</div>
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
            accessorKey: 'amount',
            header: (data) => <TableHeaderToggle {...data}>Amount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.original.amount || 0).toFixed(2)}</div>
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
            cell: ({ row }) => (
                <div>
                    {row.original.debtorName || 'N/A'}{' '}
                    {row.original.accountNumber ? (
                        <span className="text-muted-foreground">({row.original.accountNumber})</span>
                    ) : null}
                </div>
            ),
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

    const totalBucket = buckets.reduce((sum, bucket) => sum + Number(bucket.amount || 0), 0);

    return (
        <PageLoader isLoading={ageingQuery.isLoading && !!companyDebtorId}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Invoice Ageing & Credit Allocation</div>
                <p className="text-xs text-muted-foreground">
                    Aging of debtor invoices with credit allocation driven by credit notes or receipts.
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
                            onSelect={(val) => {
                                setSelectedBucket(null);
                                setCompanyDebtorId(val || null);
                            }}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">As Of Date</Label>
                        <Input
                            type="date"
                            className="h-9 w-40 text-xs"
                            value={asOfDate}
                            onChange={(e) => setAsOfDate(e.target.value)}
                        />
                    </div>
                </div>

                {!companyDebtorId ? (
                    <Card>
                        <CardContent className="p-6 text-center text-sm text-muted-foreground">
                            Select a debtor to view invoice ageing.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Bucket cards */}
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            {buckets.map((bucket, idx) => (
                                <Card
                                    key={bucket.key || idx}
                                    className={`cursor-pointer transition-shadow ${
                                        selectedBucket === bucket.key ? 'ring-2 ring-blue-500 shadow-md' : ''
                                    } ${idx === 0 ? 'border-green-200 bg-green-50' : idx >= 4 ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}
                                    onClick={() => setSelectedBucket((prev) => (prev === bucket.key ? null : bucket.key))}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-stone-700">{bucket.label}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {Number(bucketInvoiceCount[bucket.key] || 0)} invoice(s)
                                                </div>
                                            </div>
                                            <div className="text-lg font-bold text-stone-800">
                                                {currencySymbol} {Number(bucket.amount || 0).toFixed(2)}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            <Card
                                className={`cursor-pointer transition-shadow ${
                                    selectedBucket === null ? 'ring-2 ring-blue-500 shadow-md' : ''
                                } border-blue-200 bg-blue-50`}
                                onClick={() => setSelectedBucket(null)}
                            >
                                <CardContent className="p-4">
                                    <div className="text-sm font-semibold text-stone-700">Total Outstanding</div>
                                    <div className="text-sm text-muted-foreground">
                                        {selectedBucket === null ? 'All buckets selected' : 'Click to show all'}
                                    </div>
                                    <div className="text-lg font-bold text-stone-800">
                                        {currencySymbol} {totalBucket.toFixed(2)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Unallocated summary */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Card className="border-blue-100 bg-blue-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-blue-600" />
                                            <div>
                                                <div className="text-sm font-semibold">Unallocated Receipts</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {Number(unallocated?.receiptCount || 0)} receipt(s)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-blue-700">
                                            {currencySymbol} {Number(unallocated?.receiptAmount || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-purple-100 bg-purple-50/50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="h-4 w-4 text-purple-600" />
                                            <div>
                                                <div className="text-sm font-semibold">Unallocated Credit Notes</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {Number(unallocated?.creditNoteCount || 0)} credit note(s)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold text-purple-700">
                                            {currencySymbol} {Number(unallocated?.creditNoteAmount || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sources and invoices side by side */}
                        <div className="grid min-w-0 grid-cols-2 items-start gap-4">
                            {/* Left: Unallocated sources */}
                            <div className="space-y-2">
                                <div className="text-sm font-semibold">
                                    Unallocated Sources
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        Credit notes and receipts available for invoice allocation.
                                    </span>
                                </div>
                                <DataTable
                                    query={unmatchedQuery}
                                    data={sourceRows}
                                    columns={sourceColumns}
                                    pagination={sourcePagination}
                                    setPagination={setSourcePagination}
                                    totalRowCount={unmatchedQuery.data?.data?.count ?? sourceRows.length}
                                />
                            </div>

                            {/* Right: Invoices by bucket */}
                            <div className="space-y-2">
                                <div className="text-sm font-semibold">
                                    {selectedBucket
                                        ? `Invoices — ${buckets.find((b) => b.key === selectedBucket)?.label || selectedBucket}`
                                        : 'Invoices (all buckets)'}
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {bucketInvoices.length} outstanding invoice(s)
                                    </span>
                                </div>
                                <DataTable
                                    query={ageingQuery}
                                    data={pageInvoices}
                                    columns={invoiceColumns}
                                    pagination={invoicePagination}
                                    setPagination={setInvoicePagination}
                                    totalRowCount={bucketInvoices.length}
                                />
                            </div>
                        </div>

                        {/* Session batches */}
                        <div className="text-sm font-semibold">
                            Credit Allocation Batches (this session)
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                                No list endpoint exists for reconciliation batches; batches are tracked in the current
                                session for reversal.
                            </span>
                        </div>
                        {sessionBatches.length ? (
                            <Card>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Batch No</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead className="text-right">Total Allocated</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sessionBatches.map((batch) => (
                                                <TableRow key={batch.allocationBatchId || batch.id || Math.random()}>
                                                    <TableCell className="font-medium">
                                                        {batch.allocationNumber ||
                                                            batch.allocationBatchId ||
                                                            batch.id ||
                                                            'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        {batch.sourceType === 'CREDIT_NOTE' ? 'CREDIT NOTE' : 'RECEIPT'}{' '}
                                                        - {batch.sourceNumber || batch.sourceId || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {currencySymbol} {Number(batch.totalAllocated || 0).toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {batch.allocationDate
                                                            ? moment(String(batch.allocationDate)).format('DD/MM/YYYY')
                                                            : 'N/A'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1"
                                                                onClick={() =>
                                                                    setDetailId(
                                                                        batch.allocationBatchId || batch.id || null,
                                                                    )
                                                                }
                                                            >
                                                                <Eye className="h-3.5 w-3.5" /> View
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="flex items-center gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => {
                                                                    setReverseTarget(batch);
                                                                    setReverseReason('');
                                                                }}
                                                            >
                                                                <RotateCcw className="h-3.5 w-3.5" /> Reverse
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                    No allocation batches posted in this session.
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Allocation dialog */}
            <Dialog open={!!allocateTarget} onOpenChange={(o) => !o && setAllocateTarget(null)}>
                <DialogContent className="sm:max-w-[760px]">
                    <DialogHeader>
                        <DialogTitle>
                            Allocate {allocateTarget?.sourceType === 'CREDIT_NOTE' ? 'Credit Note' : 'Receipt'}
                        </DialogTitle>
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
                        {exceedsInvoiceOutstanding ? (
                            <div className="text-xs font-medium text-red-600">
                                An allocation amount exceeds the outstanding balance of its invoice.
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
                            disabled={
                                totalAllocated <= 0 || isOverAllocated || exceedsInvoiceOutstanding || reconcileMut.isPending
                            }
                            onClick={handleReconcileConfirm}
                        >
                            <ArrowRightLeft className="mr-1 h-4 w-4" />
                            {reconcileMut.isPending ? 'Posting...' : 'Post Allocation'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch detail */}
            <Dialog open={!!detailId} onOpenChange={(o) => !o && setDetailId(null)}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Allocation Batch</DialogTitle>
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
                                    setReverseTarget({
                                        ...batchDetail,
                                        allocationBatchId: batchDetail.allocationBatchId || batchDetail.id,
                                    });
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
                        <DialogTitle>Reverse Allocation</DialogTitle>
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
                                placeholder="Incorrect credit allocated"
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
                    if (approval?.actionLabel === 'Reverse Allocation') runReverse(token);
                    else runReconcile(token);
                }}
            />
        </PageLoader>
    );
};

export default AgeingModule;