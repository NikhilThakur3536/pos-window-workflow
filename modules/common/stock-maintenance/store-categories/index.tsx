'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import { useGetStoreCategoryList, useSaveStoreCategory, type StoreCategory } from '@/api-queries/store-category';
import { Pencil, Plus, Save } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
];

const StoreCategories = () => {
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<StoreCategory | null>(null);
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parentCategoryId, setParentCategoryId] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

    const initialFilters = { status: 'ACTIVE', search: '' };
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const listQuery = useGetStoreCategoryList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters.search ? { search: appliedFilters.search } : {}),
    });
    const rows = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    // Parent category options exclude the category being edited so a category
    // cannot become its own parent.
    const parentOptions = (listQuery?.data?.data?.rows || [])
        .filter((category: StoreCategory) => category.id !== editing?.id)
        .map((category: StoreCategory) => ({ label: `${category.code} — ${category.name}`, value: category.id }));

    const saveMutation = useSaveStoreCategory();

    const resetForm = () => {
        setEditing(null);
        setCode('');
        setName('');
        setDescription('');
        setParentCategoryId('');
        setStatus('ACTIVE');
    };

    const openCreate = () => {
        resetForm();
        setFormOpen(true);
    };

    const openEdit = (category: StoreCategory) => {
        setEditing(category);
        setCode(category.code || '');
        setName(category.name || '');
        setDescription(category.description || '');
        setParentCategoryId(category.parentCategoryId || '');
        setStatus(category.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE');
        setFormOpen(true);
    };

    const handleSave = () => {
        if (!code.trim() || !name.trim()) {
            toast.error('Code and name are required');
            return;
        }
        saveMutation.mutate(
            {
                ...(editing?.id ? { id: editing.id } : {}),
                code: code.trim(),
                name: name.trim(),
                description: description.trim() || null,
                parentCategoryId: parentCategoryId || null,
                status,
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        toast.success(editing ? 'Store category updated' : 'Store category created');
                        resetForm();
                        setFormOpen(false);
                    } else {
                        toast.error(response.message || 'Save failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const columns: ColumnDef<StoreCategory>[] = [
        { accessorKey: 'code', header: 'Code' },
        { accessorKey: 'name', header: 'Name' },
        {
            accessorKey: 'parentCategoryName',
            header: 'Parent Category',
            cell: ({ row }) => <div>{row.original.parentCategoryName || '—'}</div>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => <div className="max-w-md truncate">{row.original.description || '—'}</div>,
        },
        { accessorKey: 'status', header: 'Status' },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit category"
                        onClick={() => openEdit(row.original)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading}>
            <div className="space-y-4">

                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    {/* <div className="flex flex-wrap items-center gap-2">
                        <Input
                            className="h-9 w-60"
                            placeholder="Search categories"
                            value={filters.search}
                            onChange={(event) => handleFilters({ ...filters, search: event.target.value })}
                        />
                        <SelectPopover
                            title="Status"
                            onlyTitle="All statuses"
                            selectedValue={filters.status}
                            options={[{ label: 'All statuses', value: '' }, ...STATUS_OPTIONS]}
                            onSelect={(value) => handleFilters({ ...filters, status: String(value || '') })}
                        />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={() => clearFilters()}
                            showClearButton={showClearButton}
                        />
                    </div> */}
                    <div className="text-lg font-bold">Store Categories</div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            className="h-9 w-60"
                            placeholder="Search categories"
                            value={filters.search}
                            onChange={(event) => handleFilters({ ...filters, search: event.target.value })}
                        />
                        <SelectPopover
                            title="Status"
                            onlyTitle="All statuses"
                            selectedValue={filters.status}
                            options={[{ label: 'All statuses', value: '' }, ...STATUS_OPTIONS]}
                            onSelect={(value) => handleFilters({ ...filters, status: String(value || '') })}
                        />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={() => clearFilters()}
                            showClearButton={showClearButton}
                        />
                        <div className="flex justify-end">
                            <Button onClick={openCreate}>
                                <Plus className="mr-1 h-4 w-4" /> Add Category
                            </Button>
                        </div>
                    </div>
                    
                </DataTable>
            </div>

            <Dialog
                open={formOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Store Category' : 'Add Store Category'}</DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <Label>Code</Label>
                            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. VIP" />
                        </div>
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Category name" />
                        </div>
                        <div>
                            <Label>Parent Category</Label>
                            <SelectPopover
                                title="Parent Category"
                                onlyTitle="No parent"
                                selectedValue={parentCategoryId}
                                options={parentOptions}
                                onSelect={(value) => setParentCategoryId(String(value || ''))}
                            />
                        </div>
                        <div>
                            <Label>Status</Label>
                            <SelectPopover
                                title="Status"
                                onlyTitle="Select status"
                                selectedValue={status}
                                options={STATUS_OPTIONS}
                                onSelect={(value) => setStatus((value as 'ACTIVE' | 'INACTIVE') || 'ACTIVE')}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label>Description</Label>
                            <Input
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                                placeholder="Optional description"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                resetForm();
                                setFormOpen(false);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={saveMutation.isPending}
                            onClick={handleSave}
                        >
                            <Save className="mr-1 h-4 w-4" />
                            {saveMutation.isPending ? 'Saving...' : 'Save Category'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageLoader>
    );
};

export default StoreCategories;