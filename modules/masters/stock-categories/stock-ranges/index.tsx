import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import StockRangeForm from './stock-range-form';
import {
    useGetStockRanges,
    StockRangeDetails,
    StockRangeFilter,
    useRemoveStockRange,
} from '@/api-queries/company/stock-ranges';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const StockRanges = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<StockRangeDetails | null>(null);
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
    } = useTableFilters<StockRangeFilter>(initialFilters);

    const query = useGetStockRanges({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: stockRanges, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<StockRangeDetails>[] = [
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <div>{row.original.name}</div>,
        },
        {
            accessorKey: 'code',
            header: 'Code',
            cell: ({ row }) => <div>{row.original.code}</div>,
        },
        {
            accessorKey: 'subCategory',
            header: 'Sub Category (Code)',
            cell: ({ row }) => {
                const subCategory = row.original.CompanyStockSubCategory;
                return (
                    <div>
                        {subCategory?.name} ({subCategory?.code})
                    </div>
                );
            },
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => <div className="max-w-1 whitespace-pre">{row.original.description || 'N/A'}</div>,
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
                                    SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code,
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
                                    SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code,
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
    const [editData, setEditData] = useState<StockRangeDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: StockRangeDetails) => {
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

    const { mutate: removeStockRange } = useRemoveStockRange();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeStockRange(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Stock Range deleted successfully');
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

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2">
                <DataTable
                    query={query}
                    data={stockRanges?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by range name..."
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
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_RANGES.code,
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
                                Add Stock Range
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <StockRangeForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.name}`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the stock ranges." }}
            />
        </PageLoader>
    );
};

export default StockRanges;