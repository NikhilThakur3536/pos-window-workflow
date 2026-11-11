'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetEftNotifications,
    useResolveEftNotification,
    EFT_NOTIFICATION_STATUSES,
    type EftNotificationRecord,
    type EftNotificationStatus,
} from '@/api-queries/eft-notifications';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import SelectPopover from '@/components/select-popover';
import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
};

interface ResolveTarget {
    record: EftNotificationRecord;
    status: 'APPROVED' | 'REJECTED';
}

interface EftResolveDialogProps {
    open: boolean;
    target: ResolveTarget | null;
    onClose: () => void;
    onConfirm: (remarks: string) => void;
    isPending: boolean;
}

const EftResolveDialog = ({ open, target, onClose, onConfirm, isPending }: EftResolveDialogProps) => {
    const [remarks, setRemarks] = useState('');

    const handleClose = () => {
        setRemarks('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-0">
                    <DialogTitle>
                        {target?.status === 'APPROVED' ? 'Approve' : 'Reject'} EFT Notification
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {target
                            ? `${target.status === 'APPROVED' ? 'Approve' : 'Reject'} ${target.record.reference || target.record.notificationId || target.record.id}?`
                            : undefined}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label className="text-xs">Remarks</Label>
                    <Input
                        placeholder="Add remarks (optional)"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant={target?.status === 'APPROVED' ? 'default' : 'destructive'}
                        disabled={isPending}
                        onClick={() => onConfirm(remarks.trim())}
                    >
                        {target?.status === 'APPROVED' ? 'Approve' : 'Reject'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EftNotifications = () => {
    const initialFilters: {
        status: string;
        search: string;
        terminalId: string;
        fromDate?: string;
        toDate?: string;
    } = {
        status: '',
        search: '',
        terminalId: '',
        fromDate: '',
        toDate: '',
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
    } = useTableFilters(initialFilters);

    const query = useGetEftNotifications({
        ...(appliedFilters.status ? { status: appliedFilters.status as EftNotificationStatus } : {}),
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters.terminalId ? { terminalId: appliedFilters.terminalId } : {}),
        dateFrom: appliedFilters.fromDate,
        dateTo: appliedFilters.toDate,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: EftNotificationRecord[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const resolveMutation = useResolveEftNotification();
    const [resolveTarget, setResolveTarget] = useState<ResolveTarget | null>(null);

    const handleResolve = (remarks: string) => {
        if (!resolveTarget) return;
        const { record, status } = resolveTarget;
        resolveMutation.mutate(
            { id: record.id, status, ...(remarks ? { remarks } : {}) },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success(`EFT notification ${status === 'APPROVED' ? 'approved' : 'rejected'}`);
                        setResolveTarget(null);
                    } else {
                        toast.error(data.message || 'Resolve failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const columns: ColumnDef<EftNotificationRecord>[] = [
        {
            accessorKey: 'reference',
            header: 'Reference',
            cell: ({ row }) => (
                <div className="font-semibold">
                    {row.original.reference || row.original.invoiceNumber || row.original.notificationId || '—'}
                </div>
            ),
        },
        {
            accessorKey: 'amount',
            header: 'Amount',
            cell: ({ row }) => {
                const amount = row.original.amount;
                const currency = row.original.currency || '';
                return amount != null ? (
                    <div className="font-mono tabular-nums">
                        {currency ? `${currency} ` : ''}
                        {Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                ) : (
                    '—'
                );
            },
        },
        {
            accessorKey: 'cardType',
            header: 'Card Type',
            cell: ({ row }) => row.original.cardType || row.original.paymentMethod || '—',
        },
        {
            accessorKey: 'cashierName',
            header: 'Cashier',
            cell: ({ row }) => row.original.cashierName || '—',
        },
        {
            accessorKey: 'terminalName',
            header: 'Terminal',
            cell: ({ row }) => row.original.terminalName || row.original.terminalId || '—',
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
            accessorKey: 'remarks',
            header: 'Remarks',
            cell: ({ row }) => row.original.remarks || '—',
        },
        {
            accessorKey: 'processedAt',
            header: 'Processed At',
            cell: ({ row }) =>
                row.original.processedAt || row.original.createdAt
                    ? new Date(row.original.processedAt || row.original.createdAt || '').toLocaleString()
                    : '—',
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
                            title="Approve"
                            onClick={() => setResolveTarget({ record, status: 'APPROVED' })}
                        >
                            <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Reject"
                            onClick={() => setResolveTarget({ record, status: 'REJECTED' })}
                        >
                            <X className="h-4 w-4 text-red-600" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const statusOptions = [{ label: 'All Statuses', value: '' }, ...EFT_NOTIFICATION_STATUSES.map((s) => ({ label: s, value: s }))];

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
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Status"
                                        onlyTitle="All Statuses"
                                        selectedValue={filters.status || ''}
                                        options={statusOptions}
                                        onSelect={(value) => setFilters({ ...filters, status: String(value || '') })}
                                    />
                                </div>
                            </div>

                            <div className="min-w-[180px]">
                                <Label className="text-xs">Search</Label>
                                <Input
                                    placeholder="Reference or invoice"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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

                <EftResolveDialog
                    open={!!resolveTarget}
                    target={resolveTarget}
                    onClose={() => setResolveTarget(null)}
                    onConfirm={handleResolve}
                    isPending={resolveMutation.isPending}
                />
            </div>
        </PageLoader>
    );
};

export default EftNotifications;
