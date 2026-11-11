'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import TableDateFilter from '@/components/table/table-date-filter';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    ApprovalStatusBadge,
    approvalActionName,
    approvalDocumentLabel,
    approvalEffectiveStatus,
    approvalRequester,
    approvalUserName,
    formatApprovalDate,
} from '@/components/approval/approval-status';
import { useGetHistoryList, type ApprovalRecord } from '@/api-queries/security';
import { Eye } from 'lucide-react';
import RequestDetailsDialog from './request-details-dialog';

interface HistoryFilters {
    search: string;
    actionCode: string;
    decision: string;
    includeExpired: boolean;
    fromDate: string;
    toDate: string;
}

const INITIAL_FILTERS: HistoryFilters = {
    search: '',
    actionCode: '',
    decision: 'ALL',
    includeExpired: false,
    fromDate: '',
    toDate: '',
};

const SupervisorHistory = () => {
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<HistoryFilters>(INITIAL_FILTERS, 20);

    const query = useGetHistoryList({
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters.actionCode ? { actionCode: appliedFilters.actionCode } : {}),
        ...(appliedFilters.decision !== 'ALL' ? { decision: appliedFilters.decision as 'APPROVED' | 'REJECTED' } : {}),
        ...(appliedFilters.includeExpired ? { includeExpired: true } : {}),
        ...(appliedFilters.fromDate ? { decidedFrom: appliedFilters.fromDate } : {}),
        ...(appliedFilters.toDate ? { decidedTo: appliedFilters.toDate } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: ApprovalRecord[] = query.data?.data?.rows || [];
    const totalRowCount = query.data?.data?.count || 0;
    const [selectedRow, setSelectedRow] = useState<ApprovalRecord | null>(null);

    const columns = useMemo<ColumnDef<ApprovalRecord>[]>(
        () => [
            {
                accessorKey: 'action',
                header: 'Action',
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <div className="truncate font-medium">{approvalActionName(row.original)}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">
                            {row.original.action?.code || row.original.actionCode || '—'}
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'requestedByUser',
                header: 'Requester',
                cell: ({ row }) => approvalUserName(approvalRequester(row.original)),
            },
            {
                accessorKey: 'requestReference',
                header: 'Document',
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <div className="truncate font-mono text-xs">{approvalDocumentLabel(row.original)}</div>
                        {row.original.resourceType ? (
                            <div className="text-[11px] text-muted-foreground">{row.original.resourceType}</div>
                        ) : null}
                    </div>
                ),
            },
            {
                accessorKey: 'decision',
                header: 'Decision',
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <ApprovalStatusBadge status={row.original.decision || approvalEffectiveStatus(row.original)} />
                        {row.original.decisionReason ? (
                            <div className="max-w-[220px] truncate text-[11px] text-muted-foreground">
                                {row.original.decisionReason}
                            </div>
                        ) : null}
                    </div>
                ),
            },
            {
                accessorKey: 'effectiveStatus',
                header: 'Current status',
                cell: ({ row }) => <ApprovalStatusBadge status={approvalEffectiveStatus(row.original)} />,
            },
            {
                accessorKey: 'decidedAt',
                header: 'Decided',
                cell: ({ row }) => <span className="text-xs">{formatApprovalDate(row.original.decidedAt)}</span>,
            },
            {
                id: 'actions',
                header: () => <div className="text-right">Actions</div>,
                cell: ({ row }) => (
                    <div className="text-right">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedRow(row.original)}
                        >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                        </Button>
                    </div>
                ),
            },
        ],
        [],
    );

    return (
        <PageLoader isLoading={query.isLoading && !query.data}>
            <div className="space-y-4 px-2 py-2">
                <div>
                    <h1 className="text-xl font-semibold">My Approval History</h1>
                    <p className="text-xs text-muted-foreground">
                        Requests you approved or rejected. Approved requests remain here after they are consumed or expire.
                    </p>
                </div>

                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                    emptyMessage="No approval history matches the filters."
                >
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px]">
                                <Label className="text-xs">Search</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="Reference, document or reason"
                                    value={filters.search}
                                    onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                                />
                            </div>
                            <div className="min-w-[180px]">
                                <Label className="text-xs">Action code</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="e.g. POS_VOID_SALE"
                                    value={filters.actionCode}
                                    onChange={(event) => setFilters({ ...filters, actionCode: event.target.value })}
                                />
                            </div>
                            <div className="min-w-[160px]">
                                <Label className="text-xs">Decision</Label>
                                <Select
                                    value={filters.decision}
                                    onValueChange={(value) => setFilters({ ...filters, decision: value })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All decisions</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="REJECTED">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <label className="flex h-9 items-center gap-2 text-xs">
                                <Checkbox
                                    checked={filters.includeExpired}
                                    onCheckedChange={(checked) =>
                                        setFilters({ ...filters, includeExpired: checked === true })
                                    }
                                />
                                Include expired without decision
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <TableDateFilter filters={filters} setFilters={setFilters} />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground">Showing {totalRowCount} decisions</div>
                    </div>
                </DataTable>

                <RequestDetailsDialog
                    open={!!selectedRow}
                    onClose={() => setSelectedRow(null)}
                    request={selectedRow}
                    mode="history"
                />
            </div>
        </PageLoader>
    );
};

export default SupervisorHistory;
