'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { toast } from 'sonner';
import { Plus, Eye, ClipboardCheck, Handshake, CheckCircle2, XCircle, Loader2, SendHorizonal } from 'lucide-react';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import type { ColumnDef } from '@tanstack/react-table';
import {
    useGetInvoiceCheckList,
    useApproveInvoiceCheck,
    usePostInvoiceCheck,
    useCancelInvoiceCheck,
    type InvoiceCheckingSession,
    type InvoiceCheckStatus,
    INVOICE_CHECK_DIRECTIONS,
    INVOICE_CHECK_STATUSES,
} from '@/api-queries/invoice-checking';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import OpenInvoiceCheckDialog from './open-check-dialog';
import RecordCheckDialog from './record-check-dialog';
import ResolveCheckDialog from './resolve-check-dialog';
import ViewCheckDialog from './view-check-dialog';

const MODULE_CODE = SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.code;

const STATUS_VARIANTS: Record<string, string> = {
    OPEN: 'bg-emerald-100 text-emerald-800',
    CHECKING: 'bg-blue-100 text-blue-800',
    REVIEW: 'bg-violet-100 text-violet-800',
    APPROVED: 'bg-cyan-100 text-cyan-800',
    CANCELLED: 'bg-red-100 text-red-800',
};

type LifecycleType = 'approve' | 'post' | 'cancel';

const InvoiceChecking = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [viewTarget, setViewTarget] = useState<InvoiceCheckingSession | null>(null);
    const [recordTarget, setRecordTarget] = useState<InvoiceCheckingSession | null>(null);
    const [resolveTarget, setResolveTarget] = useState<InvoiceCheckingSession | null>(null);
    const [cancelTarget, setCancelTarget] = useState<InvoiceCheckingSession | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<{ search: string; status: string; direction: string }>({
            search: '',
            status: '',
            direction: '',
        });

    const query = useGetInvoiceCheckList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters?.direction ? { direction: appliedFilters.direction } : {}),
    });

    const rows = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const approveMutation = useApproveInvoiceCheck();
    const postMutation = usePostInvoiceCheck();
    const cancelMutation = useCancelInvoiceCheck();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const pendingLifecycleRef = useRef<{ type: LifecycleType; id: string; reason?: string } | null>(null);

    const canUpdate = () =>
        hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.UPDATE]);
    const canCreate = () =>
        hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.CREATE]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleFilters(filters);
    };

    const lifecycleMutation = (type: LifecycleType) => {
        if (type === 'approve') return approveMutation;
        if (type === 'post') return postMutation;
        return cancelMutation;
    };

    const handleLifecycleSuccess = (type: LifecycleType, data: { success: boolean; message?: string }) => {
        if (data?.success) {
            toast.success(
                type === 'approve'
                    ? 'Invoice check approved'
                    : type === 'post'
                      ? 'Invoice check posted'
                      : 'Invoice check cancelled',
            );
        } else {
            toast.error(data?.message || 'Action failed');
        }
    };

    const runLifecycle = (type: LifecycleType, id: string, reason?: string) => {
        const mutation = lifecycleMutation(type);
        const payload = { id, ...(reason ? { reason } : {}) };
        pendingLifecycleRef.current = { type, id, reason };

        mutation
            .mutateAsync(payload)
            .then((data) => {
                pendingLifecycleRef.current = null;
                handleLifecycleSuccess(type, data);
            })
            .catch((error) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    const label = type === 'approve' ? 'Approve' : type === 'post' ? 'Post' : 'Cancel';
                    setApproval({ ...info, actionLabel: `${label} Invoice Check` });
                } else {
                    pendingLifecycleRef.current = null;
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleApproved = (token: string) => {
        const meta = pendingLifecycleRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        const mutation = lifecycleMutation(meta.type);
        // Reuse the action code the 428 reported so a retry sends the token against the
        // right action key rather than only the header.
        const actionCode = approval?.actionCode;
        mutation
            .mutateAsync({
                id: meta.id,
                ...(meta.reason ? { reason: meta.reason } : {}),
                approvalToken: token,
                ...(actionCode ? { approvalActionCode: actionCode } : {}),
            })
            .then((data) => {
                pendingLifecycleRef.current = null;
                closeApproval();
                handleLifecycleSuccess(meta.type, data);
            })
            .catch((error) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    const label = meta.type === 'approve' ? 'Approve' : meta.type === 'post' ? 'Post' : 'Cancel';
                    setApproval({ ...info, actionLabel: `${label} Invoice Check` });
                } else {
                    closeApproval();
                    pendingLifecycleRef.current = null;
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleCancelSubmit = () => {
        if (!cancelTarget) return;
        runLifecycle('cancel', cancelTarget.id, cancelReason || undefined);
        setCancelTarget(null);
        setCancelReason('');
    };

    const requireUpdate = (action: () => void) => {
        if (canUpdate()) action();
        else setIsPermissionDeniedOpen(true);
    };
    const requireCreate = (action: () => void) => {
        if (canCreate()) action();
        else setIsPermissionDeniedOpen(true);
    };

    const columns: ColumnDef<InvoiceCheckingSession>[] = useMemo(
        () => [
            {
                accessorKey: 'sourceDocumentNumber',
                header: 'Source Document',
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium text-sm">{row.original.sourceDocumentType || '—'}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                            {row.original.sourceDocumentNumber || row.original.sourceDocumentId || row.original.id}
                        </div>
                    </div>
                ),
            },
            {
                accessorKey: 'companyDebtorId',
                header: 'Party',
                cell: ({ row }) => {
                    const name =
                        row.original.companyDebtor?.name ||
                        row.original.companyCreditor?.name ||
                        row.original.companyDebtorId ||
                        row.original.companyCreditorId;
                    return <div className="text-sm">{name || '—'}</div>;
                },
            },
            {
                accessorKey: 'direction',
                header: 'Direction',
                cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.direction || '—'}</Badge>,
            },
            {
                accessorKey: 'discrepancies',
                header: 'Discrepancies',
                cell: ({ row }) => {
                    const count = row.original.discrepancies?.length ?? 0;
                    const openCount = row.original.discrepancies?.filter((d) => d.status === 'OPEN').length ?? 0;
                    return (
                        <div className="text-center">
                            <span className="text-sm">{count}</span>
                            {openCount > 0 && (
                                <span className="ml-1 text-xs text-amber-700">({openCount} open)</span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge variant="outline" className={`text-xs ${STATUS_VARIANTS[row.original.status] || ''}`}>
                        {row.original.status}
                    </Badge>
                ),
            },
            {
                accessorKey: 'checkedByUser',
                header: 'Checked By',
                cell: ({ row }) => {
                    const user = row.original.checkedByUser;
                    const fullName = user ? `${user.firstName ?? ''} ${user.surname ?? ''}`.trim() : null;
                    return (
                        <div>
                            <div className="text-sm">{fullName || '—'}</div>
                            {row.original.startedAt ? (
                                <div className="text-xs text-muted-foreground">
                                    {new Date(row.original.startedAt).toLocaleDateString()}
                                </div>
                            ) : null}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                cell: ({ row }) => {
                    const session = row.original;
                    const status = session.status as InvoiceCheckStatus;
                    return (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View"
                                onClick={() => setViewTarget(session)}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>

                            {status === 'OPEN' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Record check"
                                    onClick={() => requireUpdate(() => {
                                        setRecordTarget(session);
                                        setResolveTarget(null);
                                    })}
                                >
                                    <ClipboardCheck className="h-4 w-4" />
                                </Button>
                            )}

                            {status === 'CHECKING' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Resolve discrepancies"
                                    onClick={() => requireUpdate(() => {
                                        setResolveTarget(session);
                                        setRecordTarget(null);
                                    })}
                                >
                                    <Handshake className="h-4 w-4" />
                                </Button>
                            )}

                            {status === 'REVIEW' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-cyan-700"
                                    title="Approve"
                                    onClick={() => requireUpdate(() => runLifecycle('approve', session.id))}
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                </Button>
                            )}

                            {status === 'CHECKING' || status === 'REVIEW' || status === 'APPROVED' ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-emerald-700"
                                    title="Post check"
                                    onClick={() => requireUpdate(() => runLifecycle('post', session.id))}
                                >
                                    <SendHorizonal className="h-4 w-4" />
                                </Button>
                            ) : null}

                            {status === 'OPEN' || status === 'CHECKING' || status === 'REVIEW' ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    title="Cancel"
                                    onClick={() =>
                                        requireUpdate(() => {
                                            setCancelTarget(session);
                                            setCancelReason('');
                                        })
                                    }
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            ) : null}
                        </div>
                    );
                },
            },
        ],
        [userGroupPermissions],
    );

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Search by document, party, id..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                            <Select
                                value={appliedFilters.status || 'ALL'}
                                onValueChange={(value) =>
                                    handleFilters({ ...filters, status: value === 'ALL' ? '' : value })
                                }
                            >
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All statuses</SelectItem>
                                    {INVOICE_CHECK_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {status.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={appliedFilters.direction || 'ALL'}
                                onValueChange={(value) =>
                                    handleFilters({ ...filters, direction: value === 'ALL' ? '' : value })
                                }
                            >
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue placeholder="Direction" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All directions</SelectItem>
                                    {INVOICE_CHECK_DIRECTIONS.map((direction) => (
                                        <SelectItem key={direction} value={direction}>
                                            {direction}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            className="flex items-center gap-2"
                            onClick={() =>
                                requireCreate(() => {
                                    setCreateOpen(true);
                                })
                            }
                        >
                            <Plus className="h-4 w-4" />
                            Open Invoice Check
                        </Button>
                    </div>
                </DataTable>
            </div>

            <OpenInvoiceCheckDialog open={createOpen} onClose={() => setCreateOpen(false)} />

            {recordTarget && (
                <RecordCheckDialog
                    session={recordTarget}
                    open={!!recordTarget}
                    onClose={() => setRecordTarget(null)}
                />
            )}

            <ResolveCheckDialog session={resolveTarget} open={!!resolveTarget} onClose={() => setResolveTarget(null)} />
            <ViewCheckDialog session={viewTarget} open={!!viewTarget} onClose={() => setViewTarget(null)} />

            <Dialog open={!!cancelTarget} onOpenChange={(next) => { if (!next) { setCancelTarget(null); setCancelReason(''); } }}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Cancel Invoice Check</DialogTitle>
                        <DialogDescription>
                            This will cancel the invoice-checking session. Provide a reason for the audit trail.
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-sm font-medium">Reason</Label>
                        <Input
                            className="mt-1"
                            placeholder="Required reason"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
                            Close
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleCancelSubmit}
                            disabled={!cancelReason.trim() || cancelMutation.isPending}
                        >
                            {cancelMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Cancelling…
                                </>
                            ) : (
                                'Cancel Check'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={handleApproved}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to invoice checking." }}
            />
        </PageLoader>
    );
};

export default InvoiceChecking;