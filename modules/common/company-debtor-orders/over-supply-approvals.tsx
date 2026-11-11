import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Check, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import {
    OverSupplyApprovalRecord,
    OverSupplyDecision,
    OverSupplyRequestType,
    OverSupplyStatus,
    useDecideOverSupplyApproval,
    useGetPendingOverSupplyApprovals,
} from '@/api-queries/over-supply-approval';
import moment from 'moment';

const STATUS_BADGE_CLASS: Record<OverSupplyStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-700',
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
    STORE_ORDER_ALLOCATION: 'Store Order Allocation',
    STOCK_TRANSFER: 'Stock Transfer',
};

const OverSupplyApprovalsScreen: React.FC = () => {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [rejectTarget, setRejectTarget] = useState<OverSupplyApprovalRecord | null>(null);
    const [rejectNote, setRejectNote] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const initialFilters = { status: 'PENDING', requestType: '' };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const status = (appliedFilters?.status || 'PENDING') as OverSupplyStatus;

    const listQuery = useGetPendingOverSupplyApprovals({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        status,
        ...(appliedFilters?.requestType ? { requestType: appliedFilters.requestType as OverSupplyRequestType } : {}),
    });

    const decideMutation = useDecideOverSupplyApproval();

    const approvals = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const handleDecision = (approval: OverSupplyApprovalRecord, decision: OverSupplyDecision, note: string) => {
        if (!approval.id) return;
        setProcessingId(approval.id);
        decideMutation.mutate(
            { approvalRequestId: approval.id, decision, ...(note ? { note } : {}) },
            {
                onSuccess: (response) => {
                    if (!response.success) {
                        toast.error(response.message || 'Failed to record approval decision');
                        return;
                    }
                    if (decision === 'REJECTED') {
                        toast.success('Over-supply request rejected');
                        return;
                    }
                    const autoExecuted = response.data?.autoExecuted;
                    const autoExecutionError = response.data?.autoExecutionError;
                    if (autoExecuted === true) {
                        toast.success('Approved. The allocation was executed automatically.');
                    } else if (autoExecutionError) {
                        toast.error(autoExecutionError);
                    } else {
                        toast.success('Approved. The allocation will need to be re-run by the requester.');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
                onSettled: () => setProcessingId(null),
            },
        );
    };

    const submitRejection = () => {
        if (!rejectTarget?.id || !rejectNote.trim()) return;
        handleDecision(rejectTarget, 'REJECTED', rejectNote.trim());
        setRejectTarget(null);
        setRejectNote('');
    };

    const columns: ColumnDef<OverSupplyApprovalRecord>[] = [
        {
            id: 'order',
            header: 'Order / Product',
            cell: ({ row }) => {
                const record = row.original;
                const stock = record.companyStockDetail;
                return (
                    <div className="space-y-0.5">
                        <div className="font-medium">{record.salesOrderNumber || '—'}</div>
                        <div className="text-muted-foreground text-xs">
                            {stock?.description || '—'}
                            {stock?.itemCode ? ` · ${stock.itemCode}` : ''}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'quantities',
            header: 'Ordered / Requested',
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <div className="space-y-0.5 font-mono text-xs tabular-nums">
                        <div>{record.orderedQuantity ?? '—'} ordered</div>
                        <div className="font-semibold text-amber-700">{record.requestedQuantity ?? '—'} requested</div>
                        {record.availableQuantity != null && (
                            <div className="text-muted-foreground">{record.availableQuantity} available</div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'requestType',
            header: 'Source',
            cell: ({ row }) => {
                const type = row.original.requestType;
                return (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700">
                        {type ? (REQUEST_TYPE_LABELS[type] ?? type) : '—'}
                    </Badge>
                );
            },
        },
        {
            id: 'reason',
            header: 'Override Reason',
            cell: ({ row }) => (
                <div className="max-w-[260px] text-xs">{row.original.overrideReason || row.original.note || '—'}</div>
            ),
        },
        {
            id: 'requester',
            header: 'Requested By',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{row.original.requestedByName || row.original.requesterName || '—'}</div>
                    <div className="text-muted-foreground">
                        {row.original.requestedAt ? moment(row.original.requestedAt).format('DD MMM, YY HH:mm') : ''}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const recordStatus = (row.original.status || 'PENDING') as OverSupplyStatus;
                return (
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[recordStatus] ?? ''}>
                        {recordStatus}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const record = row.original;
                const isPendingDecision = (record.status || 'PENDING') === 'PENDING';
                if (!isPendingDecision) {
                    return (
                        <div className="text-muted-foreground text-center text-xs">{record.decisionNote || '—'}</div>
                    );
                }
                const busy = processingId === record.id && decideMutation.isPending;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-emerald-700"
                            disabled={busy}
                            onClick={() => handleDecision(record, 'APPROVED', '')}
                        >
                            {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Check className="h-3.5 w-3.5" />
                            )}
                            Approve
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs text-red-700"
                            disabled={busy}
                            onClick={() => {
                                setRejectNote('');
                                setRejectTarget(record);
                            }}
                        >
                            <X className="h-3.5 w-3.5" />
                            Reject
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="text-base font-semibold">Over-supply Approvals</h1>
                        <p className="text-muted-foreground text-xs">
                            Approve or reject warehouse allocations that exceed the quantity ordered by the store.
                            Approving with auto-execution replays the original allocation; otherwise the requester must
                            allocate again.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        disabled={listQuery.isFetching}
                        onClick={() => listQuery.refetch()}
                    >
                        <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Requests Shown</p>
                            <p className="font-mono text-lg font-semibold tabular-nums">{totalRowCount}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Current Filter</p>
                            <p className="text-lg font-semibold">{status}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">On This Page</p>
                            <p className="font-mono text-lg font-semibold tabular-nums">{approvals.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Pending Decisions</p>
                            <p className="font-mono text-lg font-semibold text-amber-700 tabular-nums">
                                {status === 'PENDING' ? totalRowCount : '—'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <DataTable
                    query={listQuery}
                    data={approvals}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[180px]">
                            <Label className="text-xs">Status</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Status"
                                    onlyTitle="Pending"
                                    selectedValue={filters.status || ''}
                                    options={[
                                        { label: 'Pending', value: 'PENDING' },
                                        { label: 'Approved', value: 'APPROVED' },
                                        { label: 'Rejected', value: 'REJECTED' },
                                    ]}
                                    onSelect={(value) => setFilters({ ...filters, status: String(value || 'PENDING') })}
                                />
                            </div>
                        </div>
                        <div className="min-w-[180px]">
                            <Label className="text-xs">Source</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Source"
                                    onlyTitle="All Sources"
                                    selectedValue={filters.requestType || ''}
                                    options={[
                                        { label: 'All Sources', value: '' },
                                        { label: 'Store Order Allocation', value: 'STORE_ORDER_ALLOCATION' },
                                        { label: 'Stock Transfer', value: 'STOCK_TRANSFER' },
                                    ]}
                                    onSelect={(value) => setFilters({ ...filters, requestType: String(value || '') })}
                                />
                            </div>
                        </div>
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                        <div className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Only supervisors with the over-supply override permission can decide.
                        </div>
                    </div>
                </DataTable>
            </div>

            <Dialog
                open={!!rejectTarget}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setRejectTarget(null);
                        setRejectNote('');
                    }
                }}
            >
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle>Reject Over-supply Request</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this request. The order stays unchanged and the requester
                            will need to allocate again.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1 text-sm font-medium">
                            Note <MandatoryField />
                        </Label>
                        <Textarea
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            placeholder="Enter a reason for rejecting this request"
                            rows={3}
                        />
                    </div>

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setRejectTarget(null);
                                setRejectNote('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={!rejectNote.trim() || decideMutation.isPending}
                            onClick={submitRejection}
                        >
                            Reject Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default OverSupplyApprovalsScreen;
