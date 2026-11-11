'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { toast } from 'sonner';
import { Edit, Plus, Trash2, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    useGetCompanyMenuList,
    useCreateCompanyMenu,
    useUpdateCompanyMenu,
    useDeleteCompanyMenu,
    type CompanyMenuItem,
} from '@/api-queries/menu';

const MenuManagement = () => {
    const { filters, setFilters, handleFilters, clearFilters, showClearButton, pagination, setPagination } =
        useTableFilters<{ search: string }>({ search: '' });

    const query = useGetCompanyMenuList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: CompanyMenuItem[] = Array.isArray(query?.data?.data) ? query.data.data : (query.data?.data?.rows || []);
    const totalRowCount = Array.isArray(query?.data?.data) ? query.data.data.length : (query.data?.data?.count || 0);

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CompanyMenuItem | null>(null);

    const createMutation = useCreateCompanyMenu();
    const updateMutation = useUpdateCompanyMenu();
    const deleteMutation = useDeleteCompanyMenu();

    const handleDelete = (item: CompanyMenuItem) => {
        if (!window.confirm(`Delete menu "${item.label}"?`)) return;
        deleteMutation
            .mutateAsync(item.id)
            .then((data) => {
                if (data?.success) toast.success('Menu deleted');
                else toast.error(data?.message || 'Delete failed');
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const columns: ColumnDef<CompanyMenuItem>[] = [
        {
            accessorKey: 'label',
            header: 'Label',
            cell: ({ row }) => <div className="font-medium text-sm">{row.original.label || '—'}</div>,
        },
        {
            accessorKey: 'icon',
            header: 'Icon',
            cell: ({ row }) => <span className="font-mono text-xs">{row.original.icon || '—'}</span>,
        },
        {
            accessorKey: 'href',
            header: 'Link',
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">{row.original.href || '—'}</span>
            ),
        },
        {
            accessorKey: 'parentId',
            header: 'Parent',
            cell: ({ row }) => <div className="text-sm">{row.original.parent?.label || row.original.parentId || '—'}</div>,
        },
        {
            accessorKey: 'isActive',
            header: 'Active',
            cell: ({ row }) =>
                row.original.isActive === false ? (
                    <Badge variant="outline" className="bg-red-100 text-red-700">No</Badge>
                ) : (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Yes</Badge>
                ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Edit"
                        onClick={() => {
                            setEditTarget(row.original);
                            setFormOpen(true);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="Delete"
                        onClick={() => handleDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
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
                            <Input
                                placeholder="Search by label..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleFilters(filters);
                                }}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            className="flex items-center gap-2"
                            onClick={() => {
                                setEditTarget(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" /> New Menu
                        </Button>
                    </div>
                </DataTable>
            </div>

            <MenuFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editTarget={editTarget}
                menus={rows}
                isPending={createMutation.isPending || updateMutation.isPending}
                onCreate={(payload) =>
                    createMutation
                        .mutateAsync(payload)
                        .then((data) => {
                            if (data?.success) {
                                toast.success('Menu created');
                                setFormOpen(false);
                            } else toast.error(data?.message || 'Create failed');
                        })
                        .catch((error) => {
                            // @ts-ignore
                            toast.error(error?.response?.data?.message || 'Internal Server Error!');
                        })
                }
                onUpdate={(payload) =>
                    updateMutation
                        .mutateAsync(payload)
                        .then((data) => {
                            if (data?.success) {
                                toast.success('Menu updated');
                                setFormOpen(false);
                            } else toast.error(data?.message || 'Update failed');
                        })
                        .catch((error) => {
                            // @ts-ignore
                            toast.error(error?.response?.data?.message || 'Internal Server Error!');
                        })
                }
            />
        </PageLoader>
    );
};

interface MenuFormDialogProps {
    open: boolean;
    onClose: () => void;
    editTarget: CompanyMenuItem | null;
    menus: CompanyMenuItem[];
    isPending: boolean;
    onCreate: (payload: { label: string; icon?: string; href?: string; parentId?: string | null }) => void;
    onUpdate: (payload: {
        id: string;
        label?: string;
        icon?: string;
        href?: string;
        parentId?: string | null;
        isActive?: boolean;
    }) => void;
}

const MenuFormDialog = ({ open, onClose, editTarget, menus, isPending, onCreate, onUpdate }: MenuFormDialogProps) => {
    const [label, setLabel] = useState(editTarget?.label || '');
    const [icon, setIcon] = useState(editTarget?.icon || '');
    const [href, setHref] = useState(editTarget?.href || '');
    const [parentId, setParentId] = useState(editTarget?.parentId || '');
    const [isActive, setIsActive] = useState(editTarget?.isActive !== false);

    const parentOptions = menus.filter((m) => m.id !== editTarget?.id);

    const handleSubmit = () => {
        if (!label.trim()) return toast.error('Label is required');
        if (editTarget) {
            onUpdate({
                id: editTarget.id,
                label: label.trim(),
                ...(icon.trim() ? { icon: icon.trim() } : {}),
                ...(href.trim() ? { href: href.trim() } : {}),
                parentId: parentId || null,
                isActive,
            });
        } else {
            onCreate({
                label: label.trim(),
                ...(icon.trim() ? { icon: icon.trim() } : {}),
                ...(href.trim() ? { href: href.trim() } : {}),
                parentId: parentId || null,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editTarget ? 'Edit Menu' : 'New Menu'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium">Label</Label>
                        <Input className="mt-1" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Stock" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm font-medium">Icon</Label>
                            <Input className="mt-1" value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="inventory" />
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Link</Label>
                            <Input className="mt-1" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/stock/add" />
                        </div>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Parent Menu</Label>
                        <Select value={parentId || ''} onValueChange={setParentId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="No parent (top level)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">No parent</SelectItem>
                                {parentOptions.map((menu) => (
                                    <SelectItem key={menu.id} value={menu.id}>
                                        {menu.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {editTarget && (
                        <div>
                            <Label className="text-sm font-medium">Active</Label>
                            <Select value={String(isActive)} onValueChange={(value) => setIsActive(value === 'true')}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MenuManagement;