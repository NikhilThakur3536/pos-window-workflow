import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TenderMasterForm from './tender-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    TenderMaster,
    TenderMasterFilterProps,
    useGetTenderMasters,
    useRemoveTenderMaster,
} from '@/api-queries/masters/tenders';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS, TENDER_TYPES } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useAuthUser } from '@/stores/auth-user.store';

const MODULE_CODE = SYSTEM_MODULES.UTILITIES.SETUP.TENDER_SETUP.code;

const PaymentMethodsList = () => {
    return (
        <div className="space-y-2 p-4">
            <Tabs defaultValue="payment-methods">
                <TabsList>
                    <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
                    <TabsTrigger value="coupons">Coupons</TabsTrigger>
                    <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
                </TabsList>
                <TabsContent value="payment-methods">
                    <PaymentMethodsTab />
                </TabsContent>
                <TabsContent value="coupons">
                    <DiscountCategoryTab type={TENDER_TYPES.COUPON} label="Coupon" />
                </TabsContent>
                <TabsContent value="vouchers">
                    <DiscountCategoryTab type={TENDER_TYPES.VOUCHER} label="Voucher" />
                </TabsContent>
            </Tabs>
        </div>
    );
};

const PaymentMethodsTab = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<TenderMaster | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<TenderMaster | null>(null);

    const initialFilters = { search: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<TenderMasterFilterProps>(initialFilters);

    const query = useGetTenderMasters({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        status: 'ACTIVE',
        isParentNull: true,
        isDiscountParent: false,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const { mutate: removeTender } = useRemoveTenderMaster();

    const columns: ColumnDef<TenderMaster>[] = [
        {
            accessorKey: 'code',
            header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('description') || 'N/A'}</div>,
        },
        {
            accessorKey: 'type',
            header: (data) => <TableHeaderToggle {...data}>Type</TableHeaderToggle>,
            cell: ({ row }) => {
                const type = row.getValue('type') as string;
                return <Badge variant="outline">{type}</Badge>;
            },
        },
        {
            accessorKey: 'isBankable',
            header: (data) => <TableHeaderToggle {...data}>Bankable</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{row.original.isBankable ? <Badge variant="outline" className="bg-green-50 text-green-700">Yes</Badge> : 'No'}</div>
            ),
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>{status}</Badge>;
            },
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
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.UPDATE])) {
                                e.stopPropagation();
                                setEditData(row.original);
                                setOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.DELETE])) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleApplyFilters = () => handleFilters(filters);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleDelete = () => {
        if (selectedItem?.id)
            removeTender(selectedItem.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Payment method deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <DataTable
                query={query}
                data={data?.data?.rows || []}
                columns={columns}
                pagination={pagination}
                setPagination={setPagination}
                totalRowCount={totalRowCount}
            >
                <div className="mt-2 flex items-center justify-between">
                    <div className="flex w-full items-center gap-2">
                        <Input
                            placeholder="Search by code or description..."
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="!max-w-sm"
                        />
                        <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                            Apply
                        </Button>
                        {showClearButton && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                Clear
                            </Button>
                        )}
                    </div>
                    <Button
                        onClick={() => {
                            if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.CREATE])) {
                                onAddData();
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                        className="flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Add Payment Method
                    </Button>
                </div>
            </DataTable>

            <TenderMasterForm open={open} onClose={onClose} editData={editData} mode="parent" key={editData?.id || 'new'} />

            <DeleteConfirmation
                open={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={`Are you sure you want to delete ${selectedItem?.description || selectedItem?.code}`}
                onConfirm={handleDelete}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to manage payment method masters." }}
            />
        </PageLoader>
    );
};

interface DiscountCategoryTabProps {
    type: string;
    label: string;
}

const DiscountCategoryTab = ({ type, label }: DiscountCategoryTabProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<TenderMaster | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<TenderMaster | null>(null);
    const [formMode, setFormMode] = useState<'parent' | 'child'>('parent');

    const parentsQuery = useGetTenderMasters({
        limit: 100,
        offset: 0,
        status: 'ACTIVE',
        isParentNull: true,
        isDiscountParent: true,
    });
    const parent = parentsQuery?.data?.data?.rows?.find((p) => p.type === type);

    const initialFilters = { search: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<TenderMasterFilterProps>(initialFilters);

    const childrenQuery = useGetTenderMasters({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        status: 'ACTIVE',
        ...(parent?.id ? { parentTenderId: parent.id } : {}),
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    }, !!parent?.id);

    const { data, isLoading } = childrenQuery;
    const totalRowCount = childrenQuery?.data?.data?.count || 0;

    const { mutate: removeTender } = useRemoveTenderMaster();

    const columns: ColumnDef<TenderMaster>[] = [
        {
            accessorKey: 'code',
            header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('description') || 'N/A'}</div>,
        },
        {
            accessorKey: 'fixedDiscountType',
            header: (data) => <TableHeaderToggle {...data}>Discount Type</TableHeaderToggle>,
            cell: ({ row }) => {
                const type = row.original.fixedDiscountType;
                return <div>{type === 'PERCENTAGE' ? 'Percentage' : type === 'FIXED_VALUE' ? 'Fixed Amount' : '—'}</div>;
            },
        },
        {
            accessorKey: 'fixedDiscountValue',
            header: (data) => <TableHeaderToggle {...data}>Value</TableHeaderToggle>,
            cell: ({ row }) => {
                const discountType = row.original.fixedDiscountType;
                const value = row.original.fixedDiscountValue;
                if (value == null) return <div>—</div>;
                return (
                    <div className="text-right">
                        {discountType === 'PERCENTAGE'
                            ? `${value}%`
                            : `${currencySymbol} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.getValue('status') as string;
                return <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>{status}</Badge>;
            },
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
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.UPDATE])) {
                                e.stopPropagation();
                                setEditData(row.original);
                                onOpenChildForm(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={(e) => {
                            if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.DELETE])) {
                                e.preventDefault();
                                setSelectedItem(row.original);
                                setIsDeleteOpen(true);
                            } else {
                                setIsPermissionDeniedOpen(true);
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const openParentForm = () => {
        setEditData(null);
        setSelectedItem(null);
        setFormMode('parent');
        setOpen(true);
    };

    const editParentForm = (tender: TenderMaster) => {
        setEditData(tender);
        setSelectedItem(null);
        setFormMode('parent');
        setOpen(true);
    };

    const openChildForm = () => {
        setEditData(null);
        setSelectedItem(null);
        setFormMode('child');
        setOpen(true);
    };

    const onOpenChildForm = (tender: TenderMaster) => {
        setEditData(tender);
        setSelectedItem(null);
        setFormMode('child');
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const handleApplyFilters = () => handleFilters(filters);
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleDelete = () => {
        if (selectedItem?.id)
            removeTender(selectedItem.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success(`${label} deleted successfully`);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
    };

    const canCreate = hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.CREATE]);

    return (
        <div className="space-y-4">
            {parent ? (
                <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-base font-semibold">{parent.description}</span>
                                <Badge variant="outline">{parent.code}</Badge>
                                <Badge variant={parent.status === 'ACTIVE' ? 'default' : 'secondary'}>{parent.status}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {label} category — child tenders are applied as stock discounts on the POS.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.UPDATE])) {
                                    editParentForm(parent);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                        >
                            <Edit className="mr-1 h-4 w-4" />
                            Edit Category
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                                if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.DELETE])) {
                                    setSelectedItem(parent);
                                    setIsDeleteOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                        >
                            <Trash2 className="mr-1 h-4 w-4" />
                            Delete Category
                        </Button>
                    </div>
                </div>
            ) : (
                <PageLoader isLoading={parentsQuery?.isLoading}>
                    <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                No {label.toLowerCase()} category has been created yet. Create one to start adding {label.toLowerCase()}s.
                            </p>
                        </div>
                        <Button onClick={() => { if (canCreate) { openParentForm(); } else { setIsPermissionDeniedOpen(true); } }} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Create {label} Category
                        </Button>
                    </div>
                </PageLoader>
            )}

            {parent && (
                <PageLoader isLoading={isLoading || parentsQuery?.isLoading}>
                    <DataTable
                        query={childrenQuery}
                        data={data?.data?.rows || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder={`Search ${label.toLowerCase()} by code or description...`}
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="!max-w-sm"
                                />
                                <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                                    Apply
                                </Button>
                                {showClearButton && (
                                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                                        Clear
                                    </Button>
                                )}
                            </div>
                            <Button
                                onClick={() => {
                                    if (canCreate) {
                                        openChildForm();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add {label}
                            </Button>
                        </div>
                    </DataTable>
                </PageLoader>
            )}

            <TenderMasterForm
                open={open}
                onClose={onClose}
                editData={editData}
                mode={formMode}
                defaultType={type}
                parent={parent}
                key={editData?.id || `${formMode}-${type}`}
            />

            <DeleteConfirmation
                open={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={`Are you sure you want to delete ${selectedItem?.description || selectedItem?.code}`}
                onConfirm={handleDelete}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to manage coupon / voucher masters." }}
            />
        </div>
    );
};

export default PaymentMethodsList;