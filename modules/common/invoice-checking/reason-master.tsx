'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolverCoerced as zodResolver } from '@/utils/zod-coerced';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormItem, FormField, FormControl, FormMessage } from '@/components/ui/form';
import MandatoryField from '@/components/dynamic-form/mandatory-fields';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import ExportSheets from '@/components/export-sheets';
import ConfirmDialog from '@/components/confirm-dialog';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
    getReasonMasterList,
    ShortageReturnReason,
    ShortageReturnReasonPayload,
    shortageReturnReasonSchema,
    useCreateReasonMaster,
    useDeleteReasonMaster,
    useGetReasonMasterById,
    useGetReasonMasterList,
    useUpdateReasonMaster,
} from '@/api-queries/invoice-checking';

const STATUS_FILTERS = ['ACTIVE', 'INACTIVE'];

const ReasonMaster = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [deniedAction, setDeniedAction] = useState('manage');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ShortageReturnReason | null>(null);

    const initialFilters: { search: string; status: string } = { search: '', status: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters(initialFilters);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    // Shared stock-adjustment reason master (warehouse + retail use the same list).
    const query = useGetReasonMasterList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters?.status } : {}),
    });
    const { data: reasonRows, isLoading } = query;
    const totalRowCount = reasonRows?.count || 0;

    const createMut = useCreateReasonMaster();
    const updateMut = useUpdateReasonMaster();
    const deleteMut = useDeleteReasonMaster();

    const moduleCode = SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code;
    const canCreate = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.CREATE]);
    const canEdit = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDelete = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.DELETE]);

    const columns: ColumnDef<ShortageReturnReason>[] = [
        {
            accessorKey: 'reason',
            header: 'Reason',
            cell: ({ row }) => row.original.reason || row.original.name || 'N/A',
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => row.original.description || '—',
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const active = (row.original.status ?? 'ACTIVE') !== 'INACTIVE';
                return (
                    <Badge variant="outline" className={active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {active ? 'Active' : 'Inactive'}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600"
                        title="Delete"
                        onClick={() => openDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleAdd = () => {
        if (canCreate) {
            setEditingId(null);
            setIsFormOpen(true);
        } else {
            setDeniedAction('create');
            setIsPermissionDeniedOpen(true);
        }
    };

    const openEdit = (row: ShortageReturnReason) => {
        if (!canEdit) {
            setDeniedAction('edit');
            setIsPermissionDeniedOpen(true);
            return;
        }
        setEditingId(row.id);
        setIsFormOpen(true);
    };

    const openDelete = (row: ShortageReturnReason) => {
        if (!canDelete) {
            setDeniedAction('delete');
            setIsPermissionDeniedOpen(true);
            return;
        }
        setDeleteTarget(row);
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        deleteMut.mutate(deleteTarget.id, {
            onSuccess: (res: { success?: boolean; message?: string }) => {
                if (res?.success === false) {
                    toast.error(res?.message || 'Failed to delete reason');
                    return;
                }
                toast.success('Reason deleted');
                setDeleteTarget(null);
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    function downloadCSV() {
        getReasonMasterList({
            isCsv: true,
            csvLabel: 'Invoice_Checking_Reason_Master',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.status ? { status: appliedFilters?.status } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={reasonRows?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            placeholder="Search reason..."
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                            className="!max-w-sm"
                        />
                        <select
                            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                            value={filters.status || ''}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All statuses</option>
                            {STATUS_FILTERS.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                        <div className="ml-auto flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />
                            <Button onClick={handleAdd} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Reason
                            </Button>
                        </div>
                    </div>
                </DataTable>
            </div>

            <ReasonMasterForm
                open={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                editingId={editingId}
                onCreate={createMut.mutateAsync}
                onUpdate={updateMut.mutateAsync}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                setOpen={(open) => {
                    if (!open) setDeleteTarget(null);
                    return open;
                }}
                title="Delete Reason"
                description={
                    deleteTarget
                        ? `Are you sure you want to delete "${deleteTarget.reason || deleteTarget.name || 'this reason'}"? This cannot be undone.`
                        : 'Are you sure you want to delete this reason?'
                }
                variant="destructive"
                confirmBtnTitle="Delete Reason"
                onConfirm={handleDelete}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{
                    description:
                        deniedAction === 'create'
                            ? "You don't have access to create discrepancy reasons."
                            : deniedAction === 'edit'
                              ? "You don't have access to edit discrepancy reasons."
                              : "You don't have access to delete discrepancy reasons.",
                }}
            />
        </PageLoader>
    );
};

interface ReasonMasterFormProps {
    open: boolean;
    onClose: () => void;
    editingId: string | null;
    onCreate: (data: ShortageReturnReasonPayload) => Promise<unknown>;
    onUpdate: (data: Partial<ShortageReturnReasonPayload> & { id: string }) => Promise<unknown>;
}

function ReasonMasterForm({ open, onClose, editingId, onCreate, onUpdate }: ReasonMasterFormProps) {
    const isEditing = !!editingId;

    const getQuery = useGetReasonMasterById(editingId);
    const editData = getQuery?.data?.data;

    const form = useForm<ShortageReturnReasonPayload>({
        resolver: zodResolver(shortageReturnReasonSchema),
        defaultValues: {
            reason: '',
            description: '',
            timezone: 'Asia/Kolkata',
            status: 'ACTIVE',
            ledgerAccountId: '',
        },
    });

    const { handleSubmit, reset, watch, setValue } = form;
    const currentStatus = watch('status');
    const prefilledRef = useRef(false);

    // Prefill the form from the get-by-id response when editing.
    useEffect(() => {
        if (!open) {
            prefilledRef.current = false;
            reset();
            return;
        }
        if (isEditing && editData && !prefilledRef.current) {
            reset({
                reason: editData.reason || '',
                description: editData.description || '',
                timezone: editData.timezone || 'Asia/Kolkata',
                status: editData.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
                ledgerAccountId: editData.ledgerAccountId || '',
            });
            prefilledRef.current = true;
        }
    }, [open, isEditing, editData, reset]);

    async function onSubmit(values: ShortageReturnReasonPayload) {
        const payload = {
            reason: values.reason,
            description: values.description || undefined,
            timezone: values.timezone,
            status: values.status,
            ledgerAccountId: values.ledgerAccountId || undefined,
        };
        let res: { success?: boolean; message?: string } | undefined;
        try {
            if (isEditing && editingId) {
                res = (await onUpdate({ id: editingId, ...payload })) as { success?: boolean; message?: string };
            } else {
                res = (await onCreate(payload as ShortageReturnReasonPayload)) as {
                    success?: boolean;
                    message?: string;
                };
            }
            if (res?.success === false) {
                toast.error(res?.message || 'Failed to save reason');
                return;
            }
            toast.success(isEditing ? 'Reason updated successfully' : 'Reason created successfully');
            reset();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="font-semibold">{isEditing ? 'Edit Reason' : 'Add Reason'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 text-xs">
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">
                                        Reason <MandatoryField />
                                    </Label>
                                    <FormControl>
                                        <Input {...field} className="h-7 text-xs" placeholder="e.g. Damaged in transit" />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">Description</Label>
                                    <FormControl>
                                        <Input {...field} className="h-7 text-xs" placeholder="Optional description" />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="ledgerAccountId"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">Ledger Account</Label>
                                    <FormControl>
                                        <Input {...field} className="h-7 text-xs" placeholder="Optional ledger account id" />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="timezone"
                            render={({ field }) => (
                                <FormItem className="gap-1">
                                    <Label className="gap-1 text-xs">
                                        Timezone <MandatoryField />
                                    </Label>
                                    <FormControl>
                                        <Input {...field} className="h-7 text-xs" placeholder="e.g. Asia/Kolkata" />
                                    </FormControl>
                                    <FormMessage className="text-[10px]" />
                                </FormItem>
                            )}
                        />
                        <div className="flex items-center gap-2 pt-1">
                            <Switch
                                checked={currentStatus !== 'INACTIVE'}
                                onCheckedChange={(checked) => setValue('status', checked ? 'ACTIVE' : 'INACTIVE')}
                            />
                            <Label className="text-xs">{currentStatus === 'INACTIVE' ? 'Inactive' : 'Active'}</Label>
                        </div>
                        <div className="flex items-end justify-end gap-2 pt-2">
                            <Button type="button" variant="outline" className="px-2 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                                disabled={getQuery.isLoading}
                            >
                                {getQuery.isLoading ? 'Loading...' : isEditing ? 'Update Reason' : 'Create Reason'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default ReasonMaster;