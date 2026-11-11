import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, UserCog, Check, X, ShieldCheck } from 'lucide-react';
import UserGroupForm from './user-group-form';
import UserGroupSecurity from './user-group-security';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { useGetUserGroups, useRemoveUserGroup, UserGroupDetails } from '@/api-queries/user-groups';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import UserGroupSettings from './user-group-settings';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { FilterProps } from '@/api-queries/user-groups/user-group-permissions';
import { useAuthUser } from '@/stores/auth-user.store';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const UserGroups = () => {
    const authUser = useAuthUser((state) => state.user?.companyUserGroups?.[0]?.group?.name);

    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<UserGroupDetails | null>(null);
    // const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSecurityOpen, setIsSecurityOpen] = useState(false);

    const initialFilters = {
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetUserGroups({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const { data: userGroups, isLoading } = query;
    const totalRowCount = query?.data?.count || 0;

    const columns: ColumnDef<UserGroupDetails>[] = [
        {
            accessorKey: 'name',
            header: (data) => <TableHeaderToggle {...data}>Group Name</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('name')}</div>,
        },
        {
            accessorKey: 'groupCode',
            header: (data) => (
                <TableHeaderToggle {...data} className="w-full justify-center text-center">
                    Group Code
                </TableHeaderToggle>
            ),
            cell: ({ row }) => <div className="text-center">{row.getValue('groupCode') || 'N/A'}</div>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => {
                const value = row.getValue('description') as string;
                return (
                    <div className="max-w-[250px] truncate" title={value}>
                        {value || 'N/A'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'isTerminalLock',
            header: () => <div className="text-center">Terminal Lock?</div>,
            cell: ({ row }) => {
                const isTerminalLock = row.original.isTerminalLock;
                return (
                    <div className="mx-auto w-max text-center">
                        {isTerminalLock ? (
                            <Check className="h-5 w-5 text-green-700" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'approvalLevel',
            header: () => <div className="text-center">Approval Level</div>,
            cell: ({ row }) => {
                const value = row.original.approvalLevel;
                return <div className="text-center">{value != null ? value : '—'}</div>;
            },
        },
        {
            accessorKey: 'canSupervisorLogin',
            header: () => <div className="text-center">Can Supervisor Login?</div>,
            cell: ({ row }) => {
                const value = row.original.canSupervisorLogin;
                return (
                    <div className="mx-auto w-max text-center">
                        {value ? <Check className="h-5 w-5 text-green-700" /> : <X className="h-5 w-5 text-red-600" />}
                    </div>
                );
            },
        },
        {
            id: 'security',
            header: () => <div className="text-center">Security</div>,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        title="Security Actions"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE
                                        .USER_GROUP_SETTINGS.code,
                                    [SYSTEM_PERMISSIONS.READ, SYSTEM_PERMISSIONS.CREATE],
                                    true,
                                    authUser?.toLowerCase() === 'admin',
                                )
                            ) {
                                e.stopPropagation();
                                handleSecurity(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <ShieldCheck className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        {
            id: 'actions',
            header: ({ column }) => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE
                                        .USER_GROUPS.code,
                                    [SYSTEM_PERMISSIONS.UPDATE],
                                    false,
                                    authUser?.toLowerCase() === 'admin',
                                )
                            ) {
                                e.stopPropagation();
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE
                                        .USER_GROUP_SETTINGS.code,
                                    [SYSTEM_PERMISSIONS.READ, SYSTEM_PERMISSIONS.CREATE],
                                    true,
                                    authUser?.toLowerCase() === 'admin',
                                )
                            ) {
                                e.stopPropagation();
                                handleSettings(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0"
                        title="Assign Module & Permissions"
                    >
                        <UserCog className="h-4 w-4" />
                    </Button>
                    {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE
                                        .USER_GROUPS.code,
                                    [SYSTEM_PERMISSIONS.DELETE],
                                    false,
                                    authUser?.toLowerCase() === 'admin',
                                )
                            ) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button> */}
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<UserGroupDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: UserGroupDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleSettings = (group: UserGroupDetails) => {
        setSelectedItem(group);
        setIsSettingsOpen(true);
    };

    const handleSecurity = (group: UserGroupDetails) => {
        setSelectedItem(group);
        setIsSecurityOpen(true);
    };

    const handleSecurityClose = () => {
        setSelectedItem(null);
        setIsSecurityOpen(false);
    };

    const handleSettingsClose = () => {
        setSelectedItem(null);
        setIsSettingsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const { mutate: removeUserGroup } = useRemoveUserGroup();

    // const handleDelete = () => {
    //     if (selectedItem?.id)
    //         removeUserGroup(selectedItem?.id, {
    //             onSuccess: () => {
    //                 setSelectedItem(null);
    //                 toast.success('User Group deleted successfully');
    //             },
    //             onError: (error) => {
    //                 // @ts-ignore
    //                 toast.error(error?.response.data.message || 'Internal Server Error!');
    //             },
    //         });
    // };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                {isSecurityOpen && selectedItem ? (
                    <UserGroupSecurity
                        onSecurityClose={handleSecurityClose}
                        selectedUserGroup={selectedItem}
                        key={selectedItem?.id}
                    />
                ) : isSettingsOpen && selectedItem ? (
                    <UserGroupSettings
                        onSettingsClose={handleSettingsClose}
                        selectedUserGroup={selectedItem}
                        key={selectedItem?.id}
                    />
                ) : (
                    <>
                        <DataTable
                            query={query}
                            data={userGroups?.data || []}
                            columns={columns}
                            onRowClick={(row) => setSelectedItem(row.original)}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={totalRowCount}
                        >
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex w-full items-center gap-2">
                                    <Input
                                        placeholder="Search by user groups..."
                                        value={filters.search || ''}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        onKeyDown={handleKeyDown}
                                        className="!max-w-sm"
                                    />
                                    <FilterActionButtons
                                        onApplyFilters={handleApplyFilters}
                                        onClearClick={handleClearSearch}
                                        showClearButton={showClearButton}
                                    />
                                </div>

                                <Button
                                    onClick={() => {
                                        if (
                                            hasPermission(
                                                userGroupPermissions,
                                                SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS
                                                    .USER_GROUP_AND_MAINTENANCE.USER_GROUPS.code,
                                                [SYSTEM_PERMISSIONS.CREATE],
                                                false,
                                                authUser?.toLowerCase() === 'admin',
                                            )
                                        ) {
                                            onAddData();
                                        } else {
                                            setIsPermissionDeniedOpen(true);
                                            return;
                                        }
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Group
                                </Button>
                            </div>
                        </DataTable>

                        <UserGroupForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                        {/* <DeleteConfirmation
                            open={isDeleteOpen}
                            onClose={() => setIsDeleteOpen(false)}
                            title={`Are you sure you want to delete ${selectedItem?.name}`}
                            onConfirm={handleDelete}
                        /> */}
                    </>
                )}
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the user group." }}
            />
        </PageLoader>
    );
};

export default UserGroups;
