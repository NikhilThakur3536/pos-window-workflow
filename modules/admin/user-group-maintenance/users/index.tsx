import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, Wallet } from 'lucide-react';
import UserForm from './user-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { useGetUsers, useRemoveUser, UserDetails, FilterProps, userTypeMenu } from '@/api-queries/user';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { useAuthUser } from '@/stores/auth-user.store';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import UserTills from '../user-tills';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const Users = () => {
    const userGroupPermissions = useUsersPermissions();
    const companyId = useAuthUser((state) => state?.company?.id);

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<UserDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const authUser = useAuthUser((state) => state.user);

    const initialFilters: FilterProps = {
        search: '',
        userType: '',
        warehouseId: '',
        companyDebtorId: '',
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

    const query = useGetUsers({
        companyId,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.userType ? { userType: appliedFilters?.userType } : {}),
        ...(authUser?.userType === 'COMPANY-DEBTOR-USER'
            ? { companyDebtorId: authUser.companyDebtorId }
            : appliedFilters?.companyDebtorId
              ? { companyDebtorId: appliedFilters?.companyDebtorId }
              : {}),
        ...(authUser?.userType === 'WAREHOUSE-USER'
            ? { warehouseId: authUser.warehouseId }
            : appliedFilters?.warehouseId
              ? { warehouseId: appliedFilters?.warehouseId }
              : {}),
    });
    const { data: users, isLoading } = query;
    const totalRowCount = query?.data?.count || 0;

    const columns: ColumnDef<UserDetails>[] = [
        {
            accessorKey: 'staffNumber',
            header: (data) => <TableHeaderToggle {...data}>Staff Number</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.staffNumber}</div>,
        },
        {
            accessorKey: 'initials',
            header: (data) => <TableHeaderToggle {...data}>Initials</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('initials') || 'N/A'}</div>,
        },
        {
            accessorKey: 'firstName',
            header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle>,
            cell: ({ row }) => {
                const name = `${row.original.firstName || ''} ${row.original.surname || ''}`;
                return <div>{name}</div>;
            },
        },
        {
            accessorKey: 'userType',
            header: 'User Type',
            cell: ({ row }) => {
                const userType =
                    row.original.userType === 'COMPANY-DEBTOR-USER'
                        ? 'Company Debtor'
                        : row.original.userType === 'WAREHOUSE-USER'
                          ? 'Warehouse'
                          : 'Company';
                return <div>{userType}</div>;
            },
        },
        {
            accessorKey: 'userGroup',
            header: 'User Group',
            cell: ({ row }) => {
                const userGroup = row.original.companyUserGroups?.[0]?.group?.name;
                return <div>{userGroup || 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'email',
            header: (data) => <TableHeaderToggle {...data}>Email</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('email')}</div>,
        },
        {
            accessorKey: 'cellPHone',
            header: 'Cellphone',
            cell: ({ row }) => <div>{row.getValue('cellPHone') || 'N/A'}</div>,
        },
        {
            accessorKey: 'telephone',
            header: 'Telephone',
            cell: ({ row }) => <div>{row.getValue('telephone') || 'N/A'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS
                                        .code,
                                    [SYSTEM_PERMISSIONS.CREATE, SYSTEM_PERMISSIONS.UPDATE],
                                    true,
                                )
                            ) {
                                e.stopPropagation();
                                onTillSelection(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        className="h-8 w-8 p-0 text-green-700"
                        title="Assign Tills"
                    >
                        <Wallet className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS
                                        .code,
                                    [SYSTEM_PERMISSIONS.UPDATE],
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
                                    SYSTEM_MODULES.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS
                                        .code,
                                    [SYSTEM_PERMISSIONS.DELETE],
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
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<UserDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: UserDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    // Filters

    const warehouses = useGetWarehouses({})?.data?.data;
    const companyDebtors = useDebtorList({})?.data?.data?.rows;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Delete Users

    const { mutate: removeUser } = useRemoveUser();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeUser(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('User deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    // Till Assignment

    const [selectedUserTill, setSelectedUserTill] = useState<UserDetails | null>(null);

    const onTillSelectionClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setSelectedUserTill(null);
    };

    const onTillSelection = (data: UserDetails) => {
        setEditData(null);
        setSelectedItem(null);
        setSelectedUserTill(data);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                {open ? (
                    <UserForm onClose={onClose} editData={editData} key={editData?.id || null} />
                ) : selectedUserTill ? (
                    <UserTills user={selectedUserTill} key={selectedUserTill?.id} onBack={onTillSelectionClose} />
                ) : (
                    <>
                        <DataTable
                            query={query}
                            data={users?.data || []}
                            columns={columns}
                            onRowClick={(row) => setSelectedItem(row.original)}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={totalRowCount}
                        >
                            <div className="mt-2 flex items-center justify-between">
                                <div className="flex w-full items-center gap-2">
                                    <Input
                                        placeholder="Search by user name.."
                                        value={filters.search || ''}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        onKeyDown={handleKeyDown}
                                        className="!max-w-xs"
                                    />

                                    {userTypeMenu && authUser?.userType === 'COMPANY-USER' && (
                                        <>
                                            <SelectPopover
                                                title="User Type"
                                                options={userTypeMenu}
                                                selectedValue={filters.userType}
                                                onSelect={(val) =>
                                                    setFilters({
                                                        ...filters,
                                                        userType: val,
                                                        warehouseId: '',
                                                        companyDebtorId: '',
                                                    })
                                                }
                                            />

                                            {warehouses && filters.userType === 'WAREHOUSE-USER' && (
                                                <SelectPopover
                                                    title="User Type"
                                                    options={warehouses?.map((data) => ({
                                                        label: `${data?.warehouse} ${data?.groupCode ? `(${data?.groupCode})` : ''}`,
                                                        value: data?.id,
                                                    }))}
                                                    selectedValue={filters.warehouseId}
                                                    onSelect={(val) => setFilters({ ...filters, warehouseId: val })}
                                                />
                                            )}

                                            {companyDebtors && filters.userType === 'COMPANY-DEBTOR-USER' && (
                                                <SelectPopover
                                                    title="Company Debtors"
                                                    options={companyDebtors?.map((data) => ({
                                                        label: `${data?.name} ${data?.accountNumber ? `(${data?.accountNumber})` : ''}`,
                                                        value: data?.id,
                                                    }))}
                                                    selectedValue={filters.companyDebtorId}
                                                    onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                                                />
                                            )}
                                        </>
                                    )}

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
                                                    .USER_GROUP_AND_MAINTENANCE.USERS.code,
                                                [SYSTEM_PERMISSIONS.CREATE],
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
                                    Add User
                                </Button>
                            </div>
                        </DataTable>

                        {isDeleteOpen && (
                            <DeleteConfirmation
                                open={isDeleteOpen}
                                onClose={() => setIsDeleteOpen(false)}
                                title={`Are you sure you want to delete ${selectedItem?.firstName} ${selectedItem?.surname}`}
                                onConfirm={handleDelete}
                            />
                        )}
                    </>
                )}
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the user." }}
            />
        </PageLoader>
    );
};

export default Users;
