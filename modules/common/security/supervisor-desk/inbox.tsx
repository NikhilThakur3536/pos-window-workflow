'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import TableDateFilter from '@/components/table/table-date-filter';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import {
    ApprovalCountdown,
    ApprovalStatusBadge,
    approvalActionName,
    approvalDocumentLabel,
    approvalEffectiveStatus,
    approvalRequester,
    approvalUserName,
    formatApprovalDate,
} from '@/components/approval/approval-status';
import {
    useGetInbox,
    useGetInboxList,
    useGetInboxSummary,
    type ApprovalRecord,
} from '@/api-queries/security';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { Eye, RefreshCw } from 'lucide-react';
import RequestDetailsDialog from './request-details-dialog';
import ApproveRequestDialog from './approve-request-dialog';
import RejectRequestDialog from './reject-request-dialog';

interface InboxFilters {
    search: string;
    actionCode: string;
    resourceType: string;
    companyDebtorId: string;
    warehouseId: string;
    fromDate: string;
    toDate: string;
}

const INITIAL_FILTERS: InboxFilters = {
    search: '',
    actionCode: '',
    resourceType: '',
    companyDebtorId: '',
    warehouseId: '',
    fromDate: '',
    toDate: '',
};

const SupervisorInbox = () => {
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<InboxFilters>(INITIAL_FILTERS, 20);

    const debtors = useDebtorList({ limit: 1000, offset: 0 })?.data?.data?.rows || [];
    const rawWarehouses = useGetWarehouses({ limit: 1000, offset: 0 })?.data?.data as
        | WarehouseDetails[]
        | { count?: number; rows?: WarehouseDetails[] }
        | undefined;
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    const summaryQuery = useGetInboxSummary({});
    const listQuery = useGetInboxList({
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters.actionCode ? { actionCode: appliedFilters.actionCode } : {}),
        ...(appliedFilters.resourceType ? { resourceType: appliedFilters.resourceType } : {}),
        ...(appliedFilters.companyDebtorId ? { companyDebtorId: appliedFilters.companyDebtorId } : {}),
        ...(appliedFilters.warehouseId ? { warehouseId: appliedFilters.warehouseId } : {}),
        ...(appliedFilters.fromDate ? { dateFrom: appliedFilters.fromDate } : {}),
        ...(appliedFilters.toDate ? { dateTo: appliedFilters.toDate } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: ApprovalRecord[] = listQuery.data?.data?.rows || [];
    const totalRowCount = listQuery.data?.data?.count || 0;
    const pendingCount = summaryQuery.data?.data?.pendingCount ?? listQuery.data?.data?.pendingCount ?? 0;
    const oldestPending = summaryQuery.data?.data?.oldestPending;

    const [selectedRow, setSelectedRow] = useState<ApprovalRecord | null>(null);
    const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);

    const detailQuery = useGetInbox(selectedRow?.id || '', selectedRow?.companyDebtorId);
    const detail = detailQuery.data?.data || selectedRow;
    const detailError =
        detailQuery.isError
            ? // @ts-ignore
              detailQuery.error?.response?.data?.message || 'This request is no longer available in your scope.'
            : null;

    const actionsDisabled = !detail || !detail.canDecide || approvalEffectiveStatus(detail) !== 'PENDING';

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
                accessorKey: 'scope',
                header: 'Scope',
                cell: ({ row }) => (
                    <div className="space-y-0.5 text-xs">
                        {row.original.companyStoreId ? <div>Store {row.original.companyStoreId}</div> : null}
                        {row.original.warehouseId ? <div>Warehouse {row.original.warehouseId}</div> : null}
                        {row.original.companyDebtorId ? <div>Debtor {row.original.companyDebtorId}</div> : null}
                        {!row.original.companyStoreId && !row.original.warehouseId && !row.original.companyDebtorId
                            ? '—'
                            : null}
                    </div>
                ),
            },
            {
                accessorKey: 'expiresAt',
                header: 'Time left',
                cell: ({ row }) => (
                    <ApprovalCountdown
                        expiresAt={row.original.expiresAt}
                        fallbackSeconds={row.original.secondsRemaining}
                    />
                ),
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <ApprovalStatusBadge status={approvalEffectiveStatus(row.original)} />
                        {row.original.stage ? (
                            <div className="text-[11px] text-muted-foreground">
                                {String(row.original.stage).replace(/_/g, ' ')}
                            </div>
                        ) : null}
                    </div>
                ),
            },
            {
                accessorKey: 'createdAt',
                header: 'Requested',
                cell: ({ row }) => <span className="text-xs">{formatApprovalDate(row.original.createdAt)}</span>,
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
                            onClick={() => {
                                setDecision(null);
                                setSelectedRow(row.original);
                            }}
                        >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            Review
                        </Button>
                    </div>
                ),
            },
        ],
        [],
    );

    return (
        <PageLoader isLoading={listQuery.isLoading && !listQuery.data}>
            <div className="space-y-4 px-2 py-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-semibold">Pending Requests</h1>
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                {pendingCount} pending
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Requests routed to your approval group that you are allowed to decide.
                            {oldestPending ? ` Oldest: ${formatApprovalDate(oldestPending)}.` : ''}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            summaryQuery.refetch();
                            listQuery.refetch();
                        }}
                        disabled={listQuery.isFetching}
                    >
                        <RefreshCw className={`mr-1 h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                    emptyMessage="No pending approval requests match the filters."
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
                                    placeholder="e.g. POS_DISCOUNT_OVERRIDE"
                                    value={filters.actionCode}
                                    onChange={(event) => setFilters({ ...filters, actionCode: event.target.value })}
                                />
                            </div>
                            <div className="min-w-[160px]">
                                <Label className="text-xs">Resource type</Label>
                                <Input
                                    className="mt-1"
                                    placeholder="e.g. SALE"
                                    value={filters.resourceType}
                                    onChange={(event) => setFilters({ ...filters, resourceType: event.target.value })}
                                />
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Company debtor</Label>
                                <SelectPopover
                                    title="debtor (store)"
                                    selectedValue={filters.companyDebtorId}
                                    options={debtors.map((debtor) => ({
                                        value: debtor.id,
                                        label: `${debtor.name} (${debtor.accountNumber})`,
                                    }))}
                                    onSelect={(value) =>
                                        setFilters({ ...filters, companyDebtorId: String(value || '') })
                                    }
                                    wrapperClass="mt-1 min-w-[200px]"
                                />
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Warehouse</Label>
                                <SelectPopover
                                    title="warehouse"
                                    selectedValue={filters.warehouseId}
                                    options={warehouses.map((warehouse) => ({
                                        value: warehouse.id,
                                        label: warehouse.warehouse || warehouse.name || warehouse.id,
                                    }))}
                                    onSelect={(value) =>
                                        setFilters({ ...filters, warehouseId: String(value || '') })
                                    }
                                    wrapperClass="mt-1 min-w-[200px]"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <TableDateFilter filters={filters} setFilters={setFilters} />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground">Showing {totalRowCount} matching requests</div>
                    </div>
                </DataTable>

                <RequestDetailsDialog
                    open={!!selectedRow}
                    onClose={() => {
                        setSelectedRow(null);
                        setDecision(null);
                    }}
                    request={detail || null}
                    loading={detailQuery.isLoading && !detail}
                    error={detailError}
                    mode="inbox"
                    onApprove={() => setDecision('approve')}
                    onReject={() => setDecision('reject')}
                />

                {selectedRow ? (
                    <>
                        <ApproveRequestDialog
                            open={decision === 'approve' && !actionsDisabled}
                            onClose={() => setDecision(null)}
                            approvalId={selectedRow.id}
                            actionLabel={approvalActionName(detail)}
                            requesterName={approvalUserName(approvalRequester(detail))}
                            allowedMethods={detail?.allowedAuthMethods}
                            onApproved={() => {
                                setDecision(null);
                                setSelectedRow(null);
                            }}
                        />
                        <RejectRequestDialog
                            open={decision === 'reject' && !actionsDisabled}
                            onClose={() => setDecision(null)}
                            approvalId={selectedRow.id}
                            actionLabel={approvalActionName(detail)}
                            requesterName={approvalUserName(approvalRequester(detail))}
                            onRejected={() => {
                                setDecision(null);
                                setSelectedRow(null);
                            }}
                        />
                    </>
                ) : null}
            </div>
        </PageLoader>
    );
};

export default SupervisorInbox;
