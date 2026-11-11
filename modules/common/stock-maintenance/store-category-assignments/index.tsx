'use client';


import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PageLoader } from '@/components/custom-components/PageLoader';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import SelectPopover from '@/components/select-popover';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import {
    useAssignStoreCategory,
    useDeleteStoreCategoryAssignment,
    useEditStoreCategoryAssignment,
    useGetStoreCategoryAssignment,
    useGetStoreCategoryAssignments,
    useGetStoreCategoryList,
    type StoreCategoryAssignment,
} from '@/api-queries/store-category';
import { useDebtorList } from '@/api-queries/debtor';
import { Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';


const StoreCategoryAssignments = () => {
    const [assignOpen, setAssignOpen] = useState(false);
    const [companyDebtorId, setCompanyDebtorId] = useState('');
    const [storeCategoryId, setStoreCategoryId] = useState('');
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
    const [effectiveTo, setEffectiveTo] = useState('');
    const [isPrimary, setIsPrimary] = useState(true);
    const [editTarget, setEditTarget] = useState<StoreCategoryAssignment | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StoreCategoryAssignment | null>(null);


    const categoriesQuery = useGetStoreCategoryList({ status: 'ACTIVE', limit: 200 });
    const categoryOptions = (categoriesQuery?.data?.data?.rows || []).map((category) => ({
        label: `${category.code} — ${category.name}`,
        value: category.id,
    }));


    const storesQuery = useDebtorList({ limit: 200, offset: 0, companyDebtorType: 'COMPANY_OWNED' });
    const storeOptions = (storesQuery?.data?.data?.rows || []).map((store) => ({
        label: `${store.name} (${store.accountNumber})`,
        value: store.id,
    }));


    const initialFilters = { companyDebtorId: '' };
    const { filters, handleFilters, appliedFilters, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);


    // No store selected means "all stores", so companyDebtorId is omitted rather
    // than sent as an empty string.
    const assignmentsQuery = useGetStoreCategoryAssignments({
        ...(appliedFilters.companyDebtorId ? { companyDebtorId: appliedFilters.companyDebtorId } : {}),
        activeOnly: true,
    });
    const rows: StoreCategoryAssignment[] = assignmentsQuery?.data?.data?.rows || [];
    const totalRowCount = assignmentsQuery?.data?.data?.count || 0;


    const assignMutation = useAssignStoreCategory();
    const editMutation = useEditStoreCategoryAssignment();
    const deleteMutation = useDeleteStoreCategoryAssignment();

    const editAssignmentQuery = useGetStoreCategoryAssignment(editTarget?.id ?? null);
    const isEdit = !!editTarget;

    useEffect(() => {
        const assignment = editAssignmentQuery.data?.data;
        if (!editTarget || !assignment) return;
        setCompanyDebtorId(assignment.companyDebtorId ?? '');
        setStoreCategoryId(assignment.storeCategoryId ?? '');
        setEffectiveFrom(assignment.effectiveFrom ? assignment.effectiveFrom.slice(0, 10) : '');
        setEffectiveTo(assignment.effectiveTo ? assignment.effectiveTo.slice(0, 10) : '');
        setIsPrimary(assignment.isPrimary ?? true);
        setAssignOpen(true);
    }, [editAssignmentQuery.data, editTarget]);


    const resetAssignForm = () => {
        setEditTarget(null);
        setCompanyDebtorId('');
        setStoreCategoryId('');
        setEffectiveFrom(new Date().toISOString().slice(0, 10));
        setEffectiveTo('');
        setIsPrimary(true);
    };


    const openAssign = () => {
        resetAssignForm();
        setAssignOpen(true);
    };


    const handleEdit = (assignment: StoreCategoryAssignment) => {
        setEditTarget(assignment);
    };


    const handleSubmit = () => {
        if (!companyDebtorId) {
            toast.error('Select a store');
            return;
        }
        if (!storeCategoryId) {
            toast.error('Select a category');
            return;
        }

        const effectiveFromValue = effectiveFrom
            ? new Date(`${effectiveFrom}T00:00:00.000Z`).toISOString()
            : undefined;
        const effectiveToValue = effectiveTo ? new Date(`${effectiveTo}T00:00:00.000Z`).toISOString() : null;

        if (isEdit && editTarget) {
            editMutation.mutate(
                {
                    id: editTarget.id,
                    storeCategoryId,
                    effectiveFrom: effectiveFromValue,
                    effectiveTo: effectiveToValue,
                    isPrimary,
                },
                {
                    onSuccess: (response) => {
                        if (response.success) {
                            toast.success('Assignment updated');
                            resetAssignForm();
                            setAssignOpen(false);
                        } else {
                            toast.error(response.message || 'Update failed');
                        }
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response?.data?.message || 'Internal Server Error!');
                    },
                },
            );
            return;
        }

        assignMutation.mutate(
            {
                storeCategoryId,
                companyDebtorId,
                effectiveFrom: effectiveFromValue,
                effectiveTo: effectiveToValue,
                isPrimary,
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success('Category assigned to store');
                        resetAssignForm();
                        setAssignOpen(false);
                    } else {
                        toast.error(response.message || 'Assignment failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };


    const handleDelete = () => {
        if (!deleteTarget?.id) return;
        deleteMutation.mutate(deleteTarget.id, {
            onSuccess: (response) => {
                if (response.success) {
                    toast.success('Assignment deleted');
                    setDeleteTarget(null);
                } else {
                    toast.error(response.message || 'Delete failed');
                }
            },
            onError: (error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            },
        });
    };

    const formatDate = (value?: string | null) => {
        if (!value) return '—';
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return value;
        return parsed.toLocaleDateString();
    };


    const columns: ColumnDef<StoreCategoryAssignment>[] = [
        {
            id: 'storeCategory',
            header: 'Category',
            cell: ({ row }) => {
                const category = row.original.storeCategory;
                if (!category) return <div>—</div>;
                return (
                    <div>
                        <div className="font-medium">{category.name || '—'}</div>
                        {category.code ? <div className="text-xs text-muted-foreground">{category.code}</div> : null}
                    </div>
                );
            },
        },
        {
            id: 'companyDebtor',
            header: 'Store',
            cell: ({ row }) => {
                const debtor = row.original.companyDebtor;
                if (!debtor) return <div>—</div>;
                return (
                    <div>
                        <div>{debtor.name || '—'}</div>
                        {debtor.accountNumber ? (
                            <div className="text-xs text-muted-foreground">{debtor.accountNumber}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'isPrimary',
            header: 'Primary',
            cell: ({ row }) => <div>{row.original.isPrimary ? 'Yes' : 'No'}</div>,
        },
        {
            id: 'effectiveFrom',
            header: 'Effective From',
            cell: ({ row }) => <div>{formatDate(row.original.effectiveFrom)}</div>,
        },
        {
            id: 'effectiveTo',
            header: 'Effective To',
            cell: ({ row }) => <div>{formatDate(row.original.effectiveTo)}</div>,
        },
        {
            id: 'assignedBy',
            header: 'Assigned By',
            cell: ({ row }) => {
                const user = row.original.assignedByUser;
                if (!user) return <div>—</div>;
                const name = [user.firstName, user.surname].filter(Boolean).join(' ').trim();
                return (
                    <div>
                        <div>{name || '—'}</div>
                        {user.staffNumber ? (
                            <div className="text-xs text-muted-foreground">{user.staffNumber}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit assignment"
                        onClick={() => handleEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Delete assignment"
                        onClick={() => setDeleteTarget(row.original)}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
            ),
        },
    ];


    return (
        <PageLoader isLoading={categoriesQuery.isLoading || storesQuery.isLoading}>
            <div className="space-y-4">
                {/* Heading, filter and action all share one row; the button sits at the far right. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-lg font-bold">Store Category Assignments</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <SelectPopover
                            title="Store"
                            onlyTitle="All stores"
                            selectedValue={appliedFilters.companyDebtorId}
                            options={storeOptions}
                            onSelect={(value) => handleFilters({ ...filters, companyDebtorId: String(value || '') })}
                            wrapperClass="min-w-[240px]"
                        />
                        <Button onClick={openAssign}>
                            <Plus className="mr-1 h-4 w-4" /> Assign Category
                        </Button>
                    </div>
                </div>


                <DataTable
                    query={assignmentsQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="text-sm text-muted-foreground">
                        {appliedFilters.companyDebtorId
                            ? `Showing assignments for ${storeOptions.find((s) => s.value === appliedFilters.companyDebtorId)?.label || 'the selected store'}.`
                            : 'Showing assignments for all stores.'}
                    </div>
                </DataTable>
            </div>


            <Dialog
                open={assignOpen}
                onOpenChange={(open) => {
                    if (!open) resetAssignForm();
                }}
            >
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>{isEdit ? 'Edit Category Assignment' : 'Assign Category to Store'}</DialogTitle>
                    </DialogHeader>


                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label>Store</Label>
                            <SelectPopover
                                title="Store"
                                onlyTitle="Select store"
                                selectedValue={companyDebtorId}
                                options={storeOptions}
                                disabled={isEdit}
                                onSelect={(value) => setCompanyDebtorId(String(value || ''))}
                            />
                        </div>
                        <div>
                            <Label>Category</Label>
                            <SelectPopover
                                title="Category"
                                onlyTitle="Select category"
                                selectedValue={storeCategoryId}
                                options={categoryOptions}
                                onSelect={(value) => setStoreCategoryId(String(value || ''))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Effective From</Label>
                                <Input
                                    type="date"
                                    value={effectiveFrom}
                                    onChange={(event) => setEffectiveFrom(event.target.value)}
                                />
                            </div>
                            <div>
                                <Label>Effective To</Label>
                                <Input
                                    type="date"
                                    value={effectiveTo}
                                    onChange={(event) => setEffectiveTo(event.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="isPrimary"
                                checked={isPrimary}
                                onCheckedChange={(checked) => setIsPrimary(checked === true)}
                            />
                            <Label htmlFor="isPrimary" className="cursor-pointer">
                                Primary category
                            </Label>
                        </div>
                    </div>


                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => { resetAssignForm(); setAssignOpen(false); }}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={assignMutation.isPending || editMutation.isPending}
                            onClick={handleSubmit}
                        >
                            <Save className="mr-1 h-4 w-4" />
                            {assignMutation.isPending || editMutation.isPending
                                ? isEdit
                                    ? 'Updating...'
                                    : 'Assigning...'
                                : isEdit
                                  ? 'Update'
                                  : 'Assign'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <DeleteConfirmation
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                description={`Delete the ${deleteTarget?.storeCategory?.name || 'selected'} category assignment from ${
                    deleteTarget?.companyDebtor?.name || 'this store'
                }?`}
            />
        </PageLoader>
    );
};


export default StoreCategoryAssignments;