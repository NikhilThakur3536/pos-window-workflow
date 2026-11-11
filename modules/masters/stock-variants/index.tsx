import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Plus } from 'lucide-react';
import { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Badge } from '@/components/ui/badge';
import VariantForm from './variant-form';
import {
    useGetStockVariants,
    StockVariantDetails,
    StockVariantFilterProps,
    useRemoveStockVariant,
} from '@/api-queries/masters/stock-variants';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const MODULE_CODE = SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_VARIANTS.code;

const StockVariants = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<StockVariantDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
    } = useTableFilters<StockVariantFilterProps>(initialFilters);

    const query = useGetStockVariants({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { searchKey: appliedFilters?.search } : {}),
    });
    const { data: stockVariants, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<StockVariantDetails>[] = [
        {
            accessorKey: 'identifier',
            header: 'Identifier',
            cell: ({ row }) => <div className="font-medium">{row.original.identifier}</div>,
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => <div className="max-w-1 whitespace-pre">{row.original.description || 'N/A'}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
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
                                onEditData(row.original);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
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
                                return;
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<StockVariantDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: StockVariantDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
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

    const { mutate: removeStockVariant } = useRemoveStockVariant();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeStockVariant(
                selectedItem?.id,
                {
                    onSuccess: () => {
                        setSelectedItem(null);
                        toast.success('Stock Variant deleted successfully');
                    },
                    onError: (error) => {
                        // @ts-ignore
                        toast.error(error?.response.data.message || 'Internal Server Error!');
                    },
                },
            );
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4">
                <div className="px-4 pt-4">
                    <h1 className="text-2xl font-semibold">Stock Variants</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage stock variants - identifiers and descriptions used to categorize your stock items.
                    </p>
                </div>

                <div className="px-4 pb-4">
                    <DataTable
                        query={query}
                        data={stockVariants?.data?.rows || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="mb-3 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder="Search by identifier or description..."
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

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => {
                                        if (hasPermission(userGroupPermissions, MODULE_CODE, [SYSTEM_PERMISSIONS.CREATE])) {
                                            onAddData();
                                        } else {
                                            setIsPermissionDeniedOpen(true);
                                            return;
                                        }
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Stock Variant
                                </Button>
                            </div>
                        </div>
                    </DataTable>
                </div>

                <VariantForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.identifier}`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to manage the stock variant masters." }}
            />
        </PageLoader>
    );
};

export default StockVariants;