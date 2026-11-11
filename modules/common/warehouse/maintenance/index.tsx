import { TableHeaderToggle } from '@/components/table';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import { Edit, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
    FilterProps,
    WarehouseDetails,
    useGetWarehouses,
    useGetWarehouseById,
    useRemoveWarehouse,
} from '@/api-queries/warehouse';

import { PageLoader } from '@/components/custom-components/PageLoader';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';

import WarehouseModal from './warehouseModal';

const WarehouseMaintenance = () => {
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<WarehouseDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);


    const queryParams = {
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    ...(appliedFilters?.search?.trim()
        ? {
              search:
                  appliedFilters.search.trim(),
          }
        : {}),
};

console.log(
    'Warehouse Query Params:',
    queryParams
);

    const query = useGetWarehouses(queryParams);

    console.log(
    'Warehouse Query Params:',
    queryParams
);

    const data = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.count || 0;

    const { data: warehouseResponse, isLoading } =
    useGetWarehouseById(
        selectedWarehouseId || '',
        !!selectedWarehouseId
    );

    const warehouse = warehouseResponse?.data;

    const columns: ColumnDef<WarehouseDetails>[] = [
        {
            accessorKey: 'warehouse',
            header: () => (
                <div className="text-center">
                    Warehouse
                </div>
            ),
        },
        {
            accessorKey: 'timezone',
            header: () => (
                <div className="text-center">
                    Timezone
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: () => (
                <div className="text-center">
                    Status
                </div>
            ),
            cell: ({ row }) => (
                <div className="text-center">
                    {row.original.status}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => (
                <div className="text-center">
                    Actions
                </div>
            ),
            cell: ({ row }) => (
                <div className="flex justify-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedWarehouseId(
                                row.original.id
                            );
                            setIsModalOpen(true);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                            setSelectedItem(row.original);
                            setIsDeleteOpen(true);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleAdd = () => {
        setSelectedWarehouseId(null);
        setIsModalOpen(true);
    };

    const { mutate: removeWarehouse } =
        useRemoveWarehouse();

    const handleDelete = () => {
        if (!selectedItem?.id) return;

        removeWarehouse(selectedItem.id, {
            onSuccess: () => {
                toast.success(
                    'Warehouse deleted successfully'
                );
                setIsDeleteOpen(false);
                setSelectedItem(null);
            },
            onError: (error: any) => {
                toast.error(
                    error?.response?.data?.message ||
                        'Failed to delete warehouse'
                );
            },
        });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 bg-white px-2 pt-4">
                <DataTable
                    query={query}
                    data={data}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="Search warehouse"
                                value={filters.search}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        search:
                                            e.target.value,
                                    })
                                }
                                className="w-80"
                            />

                            <FilterActionButtons
                                onApplyFilters={
                                    handleApplyFilters
                                }
                                onClearClick={
                                    handleClearSearch
                                }
                                showClearButton={
                                    showClearButton
                                }
                            />
                        </div>

                        <Button
                            onClick={handleAdd}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Warehouse
                        </Button>
                    </div>
                </DataTable>

                <WarehouseModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedWarehouseId(null);
                    }}
                    warehouse={warehouse}
                    isLoading={isLoading}
                />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() =>
                        setIsDeleteOpen(false)
                    }
                    title={`Delete ${selectedItem?.name}?`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default WarehouseMaintenance;