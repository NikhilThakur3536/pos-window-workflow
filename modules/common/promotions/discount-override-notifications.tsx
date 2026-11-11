'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetDiscountOverrideNotifications,
    useGetDiscountOverrideNotificationsSummary,
    useMarkDiscountOverrideNotificationRead,
    useAcknowledgeDiscountOverrideNotification,
    DISCOUNT_OVERRIDE_NOTIFICATION_STATES,
    DISCOUNT_OVERRIDE_ACTION_CODES,
    DISCOUNT_OVERRIDE_SOURCE_TYPES,
    type DiscountOverrideNotificationRecord,
    type DiscountOverrideNotificationState,
    type DiscountOverrideActionCode,
    type DiscountOverrideSourceType,
} from '@/api-queries/security';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import SelectPopover from '@/components/select-popover';
import { toast } from 'sonner';
import { Check, Eye, Inbox } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const STATE_BADGE: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    READ: { label: 'Read', className: 'bg-blue-100 text-blue-800' },
    ACKNOWLEDGED: { label: 'Acknowledged', className: 'bg-emerald-100 text-emerald-800' },
    RESOLVED: { label: 'Resolved', className: 'bg-gray-100 text-gray-700' },
};

const ACCOUNT_SALE_ACTION_LABEL: Record<string, string> = {
    POS_DISCOUNT_OVERRIDE: 'POS Discount Override',
    ACCOUNT_SALE_DISCOUNT_OVERRIDE: 'Account Sale Discount Override',
};

const AcknowledgeDialog = ({
    open,
    record,
    onClose,
    onConfirm,
    isPending,
}: {
    open: boolean;
    record: DiscountOverrideNotificationRecord | null;
    onClose: () => void;
    onConfirm: (note: string) => void;
    isPending: boolean;
}) => {
    const [note, setNote] = useState('');

    const handleClose = () => {
        setNote('');
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="gap-0">
                    <DialogTitle>Acknowledge Discount Override</DialogTitle>
                    <DialogDescription className="text-xs">
                        {record?.orderNumber || record?.invoiceNumber || record?.notificationId || record?.id
                            ? `Acknowledge ${record.orderNumber || record.invoiceNumber || record.notificationId || record.id}?`
                            : 'Acknowledge this discount override notification?'}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <Label className="text-xs">Note</Label>
                    <Input
                        placeholder="Add a note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button disabled={isPending} onClick={() => onConfirm(note.trim())}>
                        Acknowledge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const DiscountOverrideNotifications = () => {
    const initialFilters: {
        notificationState: string;
        actionCode: string;
        sourceType: string;
        companyDebtorId: string;
        fromDate?: string;
        toDate?: string;
    } = {
        notificationState: '',
        actionCode: '',
        sourceType: '',
        companyDebtorId: '',
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

    const query = useGetDiscountOverrideNotifications({
        ...(appliedFilters.notificationState
            ? { notificationState: appliedFilters.notificationState as DiscountOverrideNotificationState }
            : {}),
        ...(appliedFilters.actionCode
            ? { actionCode: appliedFilters.actionCode as DiscountOverrideActionCode }
            : {}),
        ...(appliedFilters.sourceType
            ? { sourceType: appliedFilters.sourceType as DiscountOverrideSourceType }
            : {}),
        ...(appliedFilters.companyDebtorId ? { companyDebtorId: appliedFilters.companyDebtorId } : {}),
        dateFrom: appliedFilters.fromDate,
        dateTo: appliedFilters.toDate,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const summaryQuery = useGetDiscountOverrideNotificationsSummary();

    const rows: DiscountOverrideNotificationRecord[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;
    const summary = summaryQuery?.data?.data;

    const readMutation = useMarkDiscountOverrideNotificationRead();
    const acknowledgeMutation = useAcknowledgeDiscountOverrideNotification();
    const [acknowledgeTarget, setAcknowledgeTarget] = useState<DiscountOverrideNotificationRecord | null>(null);

    const handleMarkRead = (id: string) => {
        readMutation.mutate(id, {
            onSuccess: (data) => {
                if (data.success) toast.success('Notification marked as read');
                else toast.error(data.message || 'Failed to mark as read');
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const handleAcknowledge = (note: string) => {
        if (!acknowledgeTarget) return;
        acknowledgeMutation.mutate(
            { id: acknowledgeTarget.id, ...(note ? { note } : {}) },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Discount override acknowledged');
                        setAcknowledgeTarget(null);
                    } else {
                        toast.error(data.message || 'Acknowledge failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const columns: ColumnDef<DiscountOverrideNotificationRecord>[] = [
        {
            accessorKey: 'orderNumber',
            header: 'Reference',
            cell: ({ row }) => (
                <div className="font-semibold">
                    {row.original.orderNumber || row.original.invoiceNumber || row.original.notificationId || '—'}
                </div>
            ),
        },
        {
            accessorKey: 'actionCode',
            header: 'Action',
            cell: ({ row }) =>
                row.original.actionCode ? (
                    <Badge variant="outline" className="bg-violet-100 text-violet-800">
                        {ACCOUNT_SALE_ACTION_LABEL[row.original.actionCode] || row.original.actionCode.replace(/_/g, ' ')}
                    </Badge>
                ) : (
                    '—'
                ),
        },
        {
            accessorKey: 'sourceType',
            header: 'Source',
            cell: ({ row }) => (row.original.sourceType ? row.original.sourceType.replace(/_/g, ' ') : '—'),
        },
        {
            accessorKey: 'companyDebtorName',
            header: 'Debtor',
            cell: ({ row }) => row.original.companyDebtorName || '—',
        },
        {
            accessorKey: 'discountAmount',
            header: 'Discount',
            cell: ({ row }) => {
                const value = row.original.discountAmount;
                const currency = row.original.currency || '';
                if (value == null) return '—';
                const prefix = row.original.discountPercentage != null ? '' : '';
                return (
                    <span className="font-mono tabular-nums">
                        {currency ? `${currency} ` : ''}
                        {Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {prefix}
                    </span>
                );
            },
        },
        {
            accessorKey: 'requestedByName',
            header: 'Requested By',
            cell: ({ row }) => row.original.requestedByName || '—',
        },
        {
            accessorKey: 'approvedByName',
            header: 'Approved By',
            cell: ({ row }) => row.original.approvedByName || '—',
        },
        {
            accessorKey: 'notificationState',
            header: 'State',
            cell: ({ row }) => {
                const s =
                    STATE_BADGE[row.original.notificationState || ''] || {
                        label: String(row.original.notificationState || '—'),
                        className: '',
                    };
                return (
                    <Badge variant="outline" className={s.className}>
                        {s.label}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Created At',
            cell: ({ row }) =>
                row.original.createdAt ? new Date(row.original.createdAt).toLocaleString() : '—',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const record = row.original;
                const state = record.notificationState;
                return (
                    <div className="flex items-center justify-center gap-1">
                        {state !== 'READ' && state !== 'ACKNOWLEDGED' && state !== 'RESOLVED' ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Mark as read"
                                onClick={() => handleMarkRead(record.id)}
                                disabled={readMutation.isPending}
                            >
                                <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                        ) : null}
                        {state !== 'ACKNOWLEDGED' && state !== 'RESOLVED' ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Acknowledge"
                                onClick={() => setAcknowledgeTarget(record)}
                                disabled={acknowledgeMutation.isPending}
                            >
                                <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                        ) : null}
                    </div>
                );
            },
        },
    ];

    const stateOptions = [
        { label: 'All States', value: '' },
        ...DISCOUNT_OVERRIDE_NOTIFICATION_STATES.map((s) => ({ label: s, value: s })),
    ];
    const actionOptions = [
        { label: 'All Actions', value: '' },
        ...DISCOUNT_OVERRIDE_ACTION_CODES.map((s) => ({ label: ACCOUNT_SALE_ACTION_LABEL[s] || s, value: s })),
    ];
    const sourceOptions = [
        { label: 'All Sources', value: '' },
        ...DISCOUNT_OVERRIDE_SOURCE_TYPES.map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="bg-slate-50">
                        <CardContent className="pt-4">
                            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
                            <div className="mt-1 text-2xl font-bold">{summary?.total ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50">
                        <CardContent className="pt-4">
                            <div className="text-xs uppercase tracking-wide text-amber-700">Pending</div>
                            <div className="mt-1 text-2xl font-bold text-amber-700">{summary?.pending ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-blue-50">
                        <CardContent className="pt-4">
                            <div className="text-xs uppercase tracking-wide text-blue-700">Read</div>
                            <div className="mt-1 text-2xl font-bold text-blue-700">{summary?.read ?? 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50">
                        <CardContent className="pt-4">
                            <div className="text-xs uppercase tracking-wide text-emerald-700">Acknowledged</div>
                            <div className="mt-1 text-2xl font-bold text-emerald-700">{summary?.acknowledged ?? 0}</div>
                        </CardContent>
                    </Card>
                </div>

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
                            <div className="min-w-[180px]">
                                <Label className="text-xs">State</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="State"
                                        onlyTitle="All States"
                                        selectedValue={filters.notificationState || ''}
                                        options={stateOptions}
                                        onSelect={(value) =>
                                            setFilters({ ...filters, notificationState: String(value || '') })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Action</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Action"
                                        onlyTitle="All Actions"
                                        selectedValue={filters.actionCode || ''}
                                        options={actionOptions}
                                        onSelect={(value) =>
                                            setFilters({ ...filters, actionCode: String(value || '') })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="min-w-[180px]">
                                <Label className="text-xs">Source</Label>
                                <div className="mt-1">
                                    <SelectPopover
                                        title="Source"
                                        onlyTitle="All Sources"
                                        selectedValue={filters.sourceType || ''}
                                        options={sourceOptions}
                                        onSelect={(value) =>
                                            setFilters({ ...filters, sourceType: String(value || '') })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="min-w-[200px]">
                                <Label className="text-xs">Debtor Account No</Label>
                                <Input
                                    placeholder="Debtor account number"
                                    value={filters.companyDebtorId || ''}
                                    onChange={(e) => setFilters({ ...filters, companyDebtorId: e.target.value })}
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

                {rows.length === 0 && !query.isLoading && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                        <Inbox className="h-8 w-8" />
                        <p className="text-sm">No discount override notifications found.</p>
                    </div>
                )}

                <AcknowledgeDialog
                    open={!!acknowledgeTarget}
                    record={acknowledgeTarget}
                    onClose={() => setAcknowledgeTarget(null)}
                    onConfirm={handleAcknowledge}
                    isPending={acknowledgeMutation.isPending}
                />
            </div>
        </PageLoader>
    );
};

export default DiscountOverrideNotifications;