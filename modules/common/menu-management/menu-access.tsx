'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Plus, Trash2, Lock, Unlock, Loader2 } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    useGetMenuAccessList,
    useCreateMenuAccess,
    useUpdateMenuAccess,
    useDeleteMenuAccess,
    type MenuAccessRecord,
} from '@/api-queries/menu';
import { useGetCompanyMenuList, type CompanyMenuItem } from '@/api-queries/menu';
import { useGetUsers, type UserDetails } from '@/api-queries/user';

const MenuAccessManagement = () => {
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<{ userId: string }>({ userId: '' });

    const query = useGetMenuAccessList({
        ...(appliedFilters?.userId ? { userId: appliedFilters.userId } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: MenuAccessRecord[] = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;

    const usersQuery = useGetUsers({ limit: 1000, offset: 0 });
    const users = useMemo(
        () => (usersQuery?.data?.data || []) as UserDetails[],
        [usersQuery.data],
    );

    const menuQuery = useGetCompanyMenuList({ limit: 1000, offset: 0 });
    const menus = useMemo(
        () =>
            (Array.isArray(menuQuery?.data?.data)
                ? menuQuery.data.data
                : (menuQuery.data?.data?.rows || [])) as CompanyMenuItem[],
        [menuQuery.data],
    );

    const [formOpen, setFormOpen] = useState(false);

    const createMutation = useCreateMenuAccess();
    const updateMutation = useUpdateMenuAccess();
    const deleteMutation = useDeleteMenuAccess();

    const toggleAccess = (record: MenuAccessRecord) => {
        const next = !record.canAccess;
        updateMutation
            .mutateAsync({ id: record.id, canAccess: next })
            .then((data) => {
                if (data?.success) toast.success(`Access ${next ? 'granted' : 'revoked'}`);
                else toast.error(data?.message || 'Update failed');
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const handleDelete = (record: MenuAccessRecord) => {
        if (!window.confirm('Remove this menu access record?')) return;
        deleteMutation
            .mutateAsync(record.id)
            .then((data) => {
                if (data?.success) toast.success('Menu access removed');
                else toast.error(data?.message || 'Delete failed');
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const userName = (record: MenuAccessRecord) => {
        const u = record.user;
        if (u) return `${u.firstName ?? ''} ${u.surname ?? ''}`.trim() || u.email || record.userId;
        const found = users.find((user) => user.id === record.userId);
        return found ? `${found.firstName} ${found.surname}`.trim() : record.userId;
    };

    const menuName = (record: MenuAccessRecord) => record.menu?.label || record.menuId;

    const columns: ColumnDef<MenuAccessRecord>[] = [
        {
            accessorKey: 'userId',
            header: 'User',
            cell: ({ row }) => <div className="text-sm font-medium">{userName(row.original) || '—'}</div>,
        },
        {
            accessorKey: 'menuId',
            header: 'Menu',
            cell: ({ row }) => {
                const menu = row.original.menu;
                return (
                    <div>
                        <div className="text-sm">{menuName(row.original) || '—'}</div>
                        {menu?.href ? (
                            <div className="font-mono text-xs text-muted-foreground">{menu.href}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'canAccess',
            header: 'Access',
            cell: ({ row }) =>
                row.original.canAccess ? (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">
                        <Unlock className="mr-1 h-3 w-3" /> Granted
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-700">
                        <Lock className="mr-1 h-3 w-3" /> Denied
                    </Badge>
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
                        title={row.original.canAccess ? 'Revoke access' : 'Grant access'}
                        onClick={() => toggleAccess(row.original)}
                    >
                        {row.original.canAccess ? (
                            <Lock className="h-4 w-4 text-amber-600" />
                        ) : (
                            <Unlock className="h-4 w-4 text-emerald-600" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        title="Remove"
                        onClick={() => handleDelete(row.original)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading || usersQuery.isLoading || menuQuery.isLoading}>
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
                                value={appliedFilters.userId || 'ALL'}
                                onValueChange={(value) => handleFilters({ ...filters, userId: value === 'ALL' ? '' : value })}
                            >
                                <SelectTrigger className="w-48 h-9">
                                    <SelectValue placeholder="Filter by user" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All users</SelectItem>
                                    {users.map((user) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {`${user.firstName} ${user.surname}`.trim() || user.email}
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
                        <Button className="flex items-center gap-2" onClick={() => setFormOpen(true)}>
                            <Plus className="h-4 w-4" /> Grant Access
                        </Button>
                    </div>
                </DataTable>
            </div>

            <MenuAccessFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                users={users}
                menus={menus}
                existing={rows}
                isPending={createMutation.isPending}
                onSave={(payload) =>
                    createMutation
                        .mutateAsync(payload)
                        .then((data) => {
                            if (data?.success) {
                                toast.success('Menu access granted');
                                setFormOpen(false);
                            } else toast.error(data?.message || 'Create failed');
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

interface MenuAccessFormDialogProps {
    open: boolean;
    onClose: () => void;
    users: UserDetails[];
    menus: CompanyMenuItem[];
    existing: MenuAccessRecord[];
    isPending: boolean;
    onSave: (payload: { userId: string; menuId: string; canAccess: boolean }) => void;
}

const MenuAccessFormDialog = ({ open, onClose, users, menus, existing, isPending, onSave }: MenuAccessFormDialogProps) => {
    const [userId, setUserId] = useState('');
    const [menuId, setMenuId] = useState('');
    const [canAccess, setCanAccess] = useState(true);

    const handleSubmit = () => {
        if (!userId) return toast.error('Select a user');
        if (!menuId) return toast.error('Select a menu');
        onSave({ userId, menuId, canAccess });
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Grant Menu Access</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <Label className="text-sm font-medium">User</Label>
                        <Select value={userId} onValueChange={setUserId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map((user) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {`${user.firstName} ${user.surname}`.trim() || user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Menu</Label>
                        <Select value={menuId} onValueChange={setMenuId}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select menu" />
                            </SelectTrigger>
                            <SelectContent>
                                {menus.map((menu) => (
                                    <SelectItem key={menu.id} value={menu.id}>
                                        {menu.label || menu.href || menu.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-sm font-medium">Can Access</Label>
                        <Select value={String(canAccess)} onValueChange={(value) => setCanAccess(value === 'true')}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">Yes</SelectItem>
                                <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {existing.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            {existing.length} access record(s) currently match the applied filter.
                        </p>
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
                            'Grant Access'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MenuAccessManagement;