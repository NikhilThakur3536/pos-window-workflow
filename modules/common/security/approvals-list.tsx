'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetApprovalsList,
    useRejectApproval,
    useCancelApproval,
    APPROVAL_STATUSES,
    type ApprovalRecord,
    type ApprovalListFilterProps,
} from '@/api-queries/security';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Ban, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
    CANCELLED: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
    EXPIRED: { label: 'Expired', className: 'bg-gray-200 text-gray-600' },
};

const ApprovalsList = () => {
    const initialFilters: ApprovalListFilterProps & { fromDate?: string; toDate?: string } = {
        status: [],
        actionCode: '',
        resourceType: '',
        terminalId: '',
        requestedByUserId: '',
        fromDate: '',
        toDate: '',
        search: '',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<ApprovalListFilterProps & { fromDate?: string; toDate?: string }>(initialFilters);

    const query = useGetApprovalsList({
        ...appliedFilters,
        dateFrom: appliedFilters.fromDate,
        dateTo: appliedFilters.toDate,
        ...(appliedFilters.status && appliedFilters.status.length ? { status: appliedFilters.status } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: ApprovalRecord[] = query?.data?.data || [];
    const totalRowCount = rows.length;

    const rejectMutation = useRejectApproval();
    const cancelMutation = useCancelApproval();

    const [rejectTarget, setRejectTarget] = useState<ApprovalRecord | null>(null);
    const [cancelTarget, setCancelTarget] = useState<ApprovalRecord | null>(null);

    const toggleStatus = (status: string) => {
        const current = filters.status || [];
        const next = current.includes(status as ApprovalRecord['status'])
            ? current.filter((s) => s !== (status as ApprovalRecord['status']))
            : [...current, status as ApprovalRecord['status']];
        setFilters({ ...filters, status: next });
    };

    const handleReject = (record: ApprovalRecord) => {
        rejectMutation.mutate(
            { approvalId: record.id, reason: 'Rejected by supervisor' },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Approval rejected');
                        setRejectTarget(null);
                    } else {
                        toast.error(data.message || 'Reject failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleCancel = (record: ApprovalRecord) => {
        cancelMutation.mutate(
            { approvalId: record.id, reason: 'Cancelled' },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Approval cancelled');
                        setCancelTarget(null);
                    } else {
                        toast.error(data.message || 'Cancel failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const columns: ColumnDef<ApprovalRecord>[] = [
        {
            accessorKey: 'requestReference',
            header: 'Reference',
            cell: ({ row }) => <div className="font-semibold">{row.original.requestReference || row.original.id}</div>,
        },
        {
            accessorKey: 'actionCode',
            header: 'Action',
            cell: ({ row }) => (
                <div>
                    <div>{row.original.action?.name || row.original.action?.code || '—'}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                        {row.original.action?.code || row.original.actionId}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const s = STATUS_BADGE[row.original.status] || { label: row.original.status, className: '' };
                return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
            },
        },
        {
            accessorKey: 'requestedByName',
            header: 'Requested By',
            cell: ({ row }) =>
                row.original.requestedByUser
                    ? [row.original.requestedByUser.firstName, row.original.requestedByUser.surname]
                          .filter(Boolean)
                          .join(' ') || row.original.requestedByUser.email || '—'
                    : '—',
        },
        {
            accessorKey: 'approvedByName',
            header: 'Approved By',
            cell: ({ row }) =>
                row.original.approvedByUser
                    ? [row.original.approvedByUser.firstName, row.original.approvedByUser.surname]
                          .filter(Boolean)
                          .join(' ') || row.original.approvedByUser.email || '—'
                    : '—',
        },
        {
            accessorKey: 'authenticationMethod',
            header: 'Auth Method',
            cell: ({ row }) => row.original.authenticationMethod || '—',
        },
        {
            accessorKey: 'authFailedCount',
            header: 'Auth Failures',
            cell: ({ row }) =>
                row.original.authFailedCount ? (
                    <div className="text-center font-semibold text-red-600">{row.original.authFailedCount}</div>
                ) : (
                    <div className="text-center text-muted-foreground">0</div>
                ),
        },
        {
            accessorKey: 'requestedAt',
            header: 'Requested At',
            cell: ({ row }) => (row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '—'),
        },
        {
            accessorKey: 'expiresAt',
            header: 'Expires At',
            cell: ({ row }) => (row.original.expiresAt ? new Date(row.original.expiresAt).toLocaleString() : '—'),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const record = row.original;
                if (record.status !== 'PENDING') return null;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Reject"
                            onClick={() => setRejectTarget(record)}
                        >
                            <XCircle className="h-4 w-4 text-red-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Cancel"
                            onClick={() => setCancelTarget(record)}
                        >
                            <Ban className="h-4 w-4 text-gray-600" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Status</Label>
                                <div className="mt-1 flex flex-wrap gap-2">
                                    {APPROVAL_STATUSES.map((s) => (
                                        <label key={s} className="flex items-center gap-1 text-xs">
                                            <Checkbox
                                                checked={(filters.status || []).includes(s)}
                                                onCheckedChange={() => toggleStatus(s)}
                                            />
                                            {s}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="min-w-[180px]">
                                <Label className="text-xs">Search</Label>
                                <Input
                                    placeholder="Invoice or reason"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div className="min-w-[160px]">
                                <Label className="text-xs">Action Code</Label>
                                <Input
                                    placeholder="e.g. POS_VOID_SALE"
                                    value={filters.actionCode || ''}
                                    onChange={(e) => setFilters({ ...filters, actionCode: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div className="min-w-[160px]">
                                <Label className="text-xs">Resource Type</Label>
                                <Input
                                    placeholder="e.g. SALE"
                                    value={filters.resourceType || ''}
                                    onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div className="min-w-[160px]">
                                <Label className="text-xs">Terminal ID</Label>
                                <Input
                                    placeholder="Terminal id"
                                    value={filters.terminalId || ''}
                                    onChange={(e) => setFilters({ ...filters, terminalId: e.target.value })}
                                    className="mt-1"
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
                        <div className="text-xs text-muted-foreground">Showing {totalRowCount} records</div>
                    </div>
                </DataTable>

                <DeleteConfirmation
                    open={!!rejectTarget}
                    onClose={() => setRejectTarget(null)}
                    title="Reject this approval?"
                    description={rejectTarget ? `Reject ${rejectTarget.requestReference || rejectTarget.id}?` : undefined}
                    onConfirm={() => rejectTarget && handleReject(rejectTarget)}
                />

                <DeleteConfirmation
                    open={!!cancelTarget}
                    onClose={() => setCancelTarget(null)}
                    title="Cancel this approval?"
                    description={cancelTarget ? `Cancel ${cancelTarget.requestReference || cancelTarget.id}?` : undefined}
                    onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
                />
            </div>
        </PageLoader>
    );
};

export default ApprovalsList;
