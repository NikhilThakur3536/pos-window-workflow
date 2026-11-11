'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { toast } from 'sonner';
import { Eye, Plus, Send, Check, X, Trash2, Pencil, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    useGetProductPublicationList,
    useCreateProductPublication,
    useSubmitProductPublication,
    useDecideProductPublication,
    useUpdateProductPublication,
    useDeleteProductPublication,
    PUBLICATION_SCOPE_TYPES,
    PUBLICATION_APPROVAL_STATUSES,
    type ProductPublicationRecord,
    type PublicationUserRef,
    type PublicationApprovalStatus,
    type CreateProductPublicationInput,
    type UpdateProductPublicationInput,
} from '@/api-queries/product-publication';
import { useCompanyStockDetailsList, type StockDetails } from '@/api-queries/company/stock-details';
import { useDebtorList } from '@/api-queries/debtor';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
    PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-amber-100 text-amber-800' },
    APPROVED: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800' },
    REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
};

const ProductPublication = () => {
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<{ approvalStatus: string }>({ approvalStatus: '' });

    const query = useGetProductPublicationList({
        ...(appliedFilters?.approvalStatus ? { approvalStatus: appliedFilters.approvalStatus as PublicationApprovalStatus } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: ProductPublicationRecord[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const [createOpen, setCreateOpen] = useState(false);
    const [detailTarget, setDetailTarget] = useState<ProductPublicationRecord | null>(null);
    const [decideTarget, setDecideTarget] = useState<ProductPublicationRecord | null>(null);
    const [decideDecision, setDecideDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [decideNote, setDecideNote] = useState('');
    const [editTarget, setEditTarget] = useState<ProductPublicationRecord | null>(null);
    const [editReason, setEditReason] = useState('');

    const createMutation = useCreateProductPublication();
    const submitMutation = useSubmitProductPublication();
    const decideMutation = useDecideProductPublication();
    const updateMutation = useUpdateProductPublication();
    const deleteMutation = useDeleteProductPublication();

    const runMutation = <T,>(
        mutation: { mutateAsync: (data: T) => Promise<{ success?: boolean; message?: string }> },
        payload: T,
        successMessage: string,
    ) => {
        mutation
            .mutateAsync(payload)
            .then((data) => {
                if (data?.success) toast.success(successMessage);
                else toast.error(data?.message || 'Action failed');
                if (decideTarget) {
                    setDecideTarget(null);
                    setDecideNote('');
                }
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const handleDelete = (record: ProductPublicationRecord) => {
        if (!window.confirm(`Delete publication for ${record.product?.description || record.companyStockDetailId}?`)) return;
        runMutation(deleteMutation, { id: record.id }, 'Publication deleted');
    };

    const columns: ColumnDef<ProductPublicationRecord>[] = [
        {
            accessorKey: 'companyStockDetailId',
            header: 'Product',
            cell: ({ row }) => {
                const r = row.original;
                const code = r.product?.itemCode || r.companyStockDetailId;
                const desc = r.product?.description || '';
                return (
                    <div>
                        <div className="font-medium text-sm">{desc || code || '—'}</div>
                        {code ? <div className="font-mono text-xs text-muted-foreground">{code}</div> : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'scopeType',
            header: 'Scope',
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <div>
                        <Badge variant="outline" className="text-xs">{r.scopeType || '—'}</Badge>
                        {r.scopeType === 'STORE' && r.store?.name ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                                {r.store.name}
                                {r.store.accountNumber ? ` (${r.store.accountNumber})` : ''}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'requestedIsSaleable',
            header: 'Saleable',
            cell: ({ row }) =>
                row.original.requestedIsSaleable ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Yes</Badge>
                ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-700">No</Badge>
                ),
        },
        {
            accessorKey: 'requestedIsOrderable',
            header: 'Orderable',
            cell: ({ row }) =>
                row.original.requestedIsOrderable ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Yes</Badge>
                ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-700">No</Badge>
                ),
        },
        {
            accessorKey: 'approvalStatus',
            header: 'Status',
            cell: ({ row }) => {
                const s = STATUS_BADGE[row.original.approvalStatus || ''] || {
                    label: row.original.approvalStatus || '—',
                    className: '',
                };
                return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
            },
        },
        {
            accessorKey: 'reason',
            header: 'Reason',
            cell: ({ row }) => <div className="max-w-[180px] truncate text-sm">{row.original.reason || '—'}</div>,
        },
        {
            accessorKey: 'requestedByUser',
            header: 'Requested By',
            cell: ({ row }) => {
                const u = row.original.requestedByUser;
                const name = u ? `${u.firstName ?? ''} ${u.surname ?? ''}`.trim() : null;
                return <div className="text-sm">{name || row.original.requestedBy || '—'}</div>;
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const record = row.original;
                const status = record.approvalStatus;
                return (
                    <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View" onClick={() => setDetailTarget(record)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        {status === 'DRAFT' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Submit for approval"
                                onClick={() => runMutation(submitMutation, { id: record.id }, 'Publication submitted for approval')}
                            >
                                <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                        )}
                        {status === 'PENDING_APPROVAL' && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Approve"
                                    onClick={() => {
                                        setDecideTarget(record);
                                        setDecideDecision('APPROVE');
                                        setDecideNote('');
                                    }}
                                >
                                    <Check className="h-4 w-4 text-emerald-600" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Reject"
                                    onClick={() => {
                                        setDecideTarget(record);
                                        setDecideDecision('REJECT');
                                        setDecideNote('');
                                    }}
                                >
                                    <X className="h-4 w-4 text-red-600" />
                                </Button>
                            </>
                        )}
                        {(status === 'DRAFT' || status === 'REJECTED') && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Edit reason"
                                    onClick={() => {
                                        setEditTarget(record);
                                        setEditReason(record.reason || '');
                                    }}
                                >
                                    <Pencil className="h-4 w-4 text-slate-600" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    title="Delete"
                                    onClick={() => handleDelete(record)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                );
            },
        },
    ];

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
                        <div className="flex items-center gap-2">
                            <Select
                                value={appliedFilters.approvalStatus || 'ALL'}
                                onValueChange={(value) => handleFilters({ ...filters, approvalStatus: value === 'ALL' ? '' : value })}
                            >
                                <SelectTrigger className="w-44 h-9">
                                    <SelectValue placeholder="Approval Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All statuses</SelectItem>
                                    {PUBLICATION_APPROVAL_STATUSES.map((status) => (
                                        <SelectItem key={status} value={status}>
                                            {STATUS_BADGE[status]?.label || status.replace('_', ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button className="flex items-center gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4" /> New Publication
                        </Button>
                    </div>
                </DataTable>
            </div>

            <CreatePublicationDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSaved={(payload) => runMutation(createMutation, payload, 'Publication created')}
                isPending={createMutation.isPending}
            />

            <DetailPublicationDialog session={detailTarget} onClose={() => setDetailTarget(null)} />

            <EditPublicationDialog
                target={editTarget}
                reason={editReason}
                onReasonChange={setEditReason}
                onClose={() => setEditTarget(null)}
                onSaved={(payload) => runMutation(updateMutation, payload, 'Publication updated')}
                isPending={updateMutation.isPending}
            />

            <Dialog open={!!decideTarget} onOpenChange={(next) => { if (!next) setDecideTarget(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {decideDecision === 'APPROVE' ? 'Approve' : 'Reject'} Publication
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            {decideTarget?.product?.description || decideTarget?.companyStockDetailId}
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        <Label className="text-sm font-medium">Response Note</Label>
                        <Input
                            className="mt-1"
                            placeholder="Optional note for the requester"
                            value={decideNote}
                            onChange={(e) => setDecideNote(e.target.value)}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDecideTarget(null)}>Cancel</Button>
                        <Button
                            variant={decideDecision === 'APPROVE' ? 'default' : 'destructive'}
                            className={decideDecision === 'APPROVE' ? undefined : undefined}
                            disabled={decideMutation.isPending}
                            onClick={() =>
                                runMutation(
                                    decideMutation,
                                    { id: decideTarget!.id, decision: decideDecision },
                                    `Publication ${decideDecision === 'APPROVE' ? 'approved' : 'rejected'}`,
                                )
                            }
                        >
                            {decideMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
                                </>
                            ) : decideDecision === 'APPROVE' ? (
                                'Approve'
                            ) : (
                                'Reject'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

interface CreatePublicationDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved: (payload: CreateProductPublicationInput) => void;
    isPending: boolean;
}

const CreatePublicationDialog = ({ open, onClose, onSaved, isPending }: CreatePublicationDialogProps) => {
    const { data: productsRes } = useCompanyStockDetailsList({ limit: 1000, offset: 0, status: 'ACTIVE' });
    const products = (productsRes?.data?.rows || []) as StockDetails[];

    const { data: storesRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = (storesRes?.data?.rows || []) as { id: string; name?: string }[];

    const [companyStockDetailId, setCompanyStockDetailId] = useState('');
    const [scopeType, setScopeType] = useState<'COMPANY' | 'STORE'>('COMPANY');
    const [scopeId, setScopeId] = useState('');
    const [requestedIsSaleable, setRequestedIsSaleable] = useState(true);
    const [requestedIsOrderable, setRequestedIsOrderable] = useState(true);
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (!companyStockDetailId) return toast.error('Select a product');
        if (scopeType === 'STORE' && !scopeId) return toast.error('Select a store');
        onSaved({
            companyStockDetailId,
            scopeType,
            ...(scopeType === 'STORE' && scopeId ? { scopeId } : {}),
            requestedIsSaleable,
            requestedIsOrderable,
            ...(reason.trim() ? { reason: reason.trim() } : {}),
        });
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New Product Publication</DialogTitle>
                    <DialogDescription>Request that a product be made saleable / orderable.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium">Product</Label>
                        <Select value={companyStockDetailId} onValueChange={setCompanyStockDetailId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.description || p.itemCode || p.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm font-medium">Scope</Label>
                            <Select
                                value={scopeType}
                                onValueChange={(value) => setScopeType(value as 'COMPANY' | 'STORE')}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PUBLICATION_SCOPE_TYPES.map((scope) => (
                                        <SelectItem key={scope} value={scope}>
                                            {scope}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {scopeType === 'STORE' && (
                            <div>
                                <Label className="text-sm font-medium">Store</Label>
                                <Select value={scopeId} onValueChange={setScopeId}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select store" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stores.map((store) => (
                                            <SelectItem key={store.id} value={store.id}>
                                                {store.name || store.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm font-medium">Saleable</Label>
                            <Select
                                value={String(requestedIsSaleable)}
                                onValueChange={(value) => setRequestedIsSaleable(value === 'true')}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Orderable</Label>
                            <Select
                                value={String(requestedIsOrderable)}
                                onValueChange={(value) => setRequestedIsOrderable(value === 'true')}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm font-medium">Reason</Label>
                        <Input
                            className="mt-1"
                            placeholder="Reason for this listing request"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Create Publication'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface EditPublicationDialogProps {
    target: ProductPublicationRecord | null;
    reason: string;
    onReasonChange: (value: string) => void;
    onClose: () => void;
    onSaved: (payload: UpdateProductPublicationInput) => void;
    isPending: boolean;
}

const EditPublicationDialog = ({ target, reason, onReasonChange, onClose, onSaved, isPending }: EditPublicationDialogProps) => {
    if (!target) return null;

    const handleSave = () => {
        onSaved({
            id: target.id,
            reason: reason.trim() || 'Updated reason',
        });
        onClose();
    };

    return (
        <Dialog open={!!target} onOpenChange={(next) => { if (!next && !isPending) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Publication</DialogTitle>
                    <DialogDescription className="text-xs">
                        {target.product?.description || target.companyStockDetailId}
                    </DialogDescription>
                </DialogHeader>
                <div>
                    <Label className="text-sm font-medium">Reason</Label>
                    <Input
                        className="mt-1"
                        placeholder="Reason for this listing request"
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

interface DetailPublicationDialogProps {
    session: ProductPublicationRecord | null;
    onClose: () => void;
}

const DetailPublicationDialog = ({ session, onClose }: DetailPublicationDialogProps) => {
    if (!session) return null;
    const detailRow = (label: string, value?: string | null) => (
        <div className="flex items-center justify-between gap-4 border-b py-1.5 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value || '—'}</span>
        </div>
    );

    const person = (user?: PublicationUserRef | null, fallback?: string | null) => {
        if (user) {
            const name = `${user.firstName ?? ''} ${user.surname ?? ''}`.trim();
            if (name) return name;
        }
        return fallback || null;
    };
    const requested = person(session.requestedByUser, session.requestedBy);
    const approved = person(session.approvedByUser, session.approvedBy);
    const rejected = person(session.rejectedByUser, session.rejectedBy);
    const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : null);

    return (
        <Dialog open={!!session} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Product Publication</DialogTitle>
                    <DialogDescription className="text-xs">
                        {session.approvalStatus && (
                            <Badge variant="outline" className="mr-1">
                                {STATUS_BADGE[session.approvalStatus]?.label || session.approvalStatus}
                            </Badge>
                        )}
                        {session.product?.itemCode || null}
                    </DialogDescription>
                </DialogHeader>
                <div>
                    {detailRow('Product', session.product?.description || session.companyStockDetailId)}
                    {detailRow('Item Code', session.product?.itemCode)}
                    {detailRow('General Code', session.product?.generalCode)}
                    {detailRow('Scope', session.scopeType)}
                    {detailRow('Store', session.store?.name || session.store?.accountNumber || session.scopeId)}
                    {detailRow('Requested Saleable', session.requestedIsSaleable ? 'Yes' : 'No')}
                    {detailRow('Requested Orderable', session.requestedIsOrderable ? 'Yes' : 'No')}
                    {detailRow('Current Saleable', session.isSaleable === undefined ? null : session.isSaleable ? 'Yes' : 'No')}
                    {detailRow('Current Orderable', session.isOrderable === undefined ? null : session.isOrderable ? 'Yes' : 'No')}
                    {detailRow('Reason', session.reason)}
                    {detailRow('Minimum Approver Level', session.minimumApproverLevel ? String(session.minimumApproverLevel) : null)}
                    {detailRow('Requested By', requested)}
                    {detailRow('Requested At', formatDate(session.requestedAt))}
                    {detailRow('Approved By', approved)}
                    {detailRow('Approved At', formatDate(session.approvedAt))}
                    {detailRow('Rejected By', rejected)}
                    {detailRow('Rejected At', formatDate(session.rejectedAt))}
                    {detailRow('Rejection Reason', session.rejectionReason)}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ProductPublication;