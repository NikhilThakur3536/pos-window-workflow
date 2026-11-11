import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import CurrencyMasterForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetCurrencies,
    CurrencyMasterDetails,
    useDeleteCurrency,
    CurrencyMasterFilterProps,
} from '@/api-queries/currency';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';

const CurrencyMasterList = () => {
    const [selectedItem, setSelectedItem] = useState<CurrencyMasterDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters: CurrencyMasterFilterProps = { search: '' };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<CurrencyMasterFilterProps>(initialFilters);

    const query = useGetCurrencies({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
    });

    const { data: currencies, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<CurrencyMasterDetails>[] = [
        {
            accessorKey: 'code',
            header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
        },
        {
            accessorKey: 'name',
            header: (data) => <TableHeaderToggle {...data}>Currency Name</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('name')}</div>,
        },
        {
            accessorKey: 'symbol',
            header: (data) => <TableHeaderToggle {...data}>Symbol</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('symbol')}</div>,
        },
        {
            accessorKey: 'decimalPlaces',
            header: (data) => <TableHeaderToggle {...data}>Decimal Places</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('decimalPlaces') ?? 2}</div>,
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => (
                <div
                    className={`capitalize ${
                        String(row.getValue('status')).toLowerCase() === 'active' ? 'text-green-600' : 'text-red-600'
                    }`}
                >
                    {row.getValue('status')}
                </div>
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
                        onClick={() => onEditData(row.original)}
                        className="h-8 w-8 p-0"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedItem(row.original);
                            setIsDeleteOpen(true);
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
    const [editData, setEditData] = useState<CurrencyMasterDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onEditData = (data: CurrencyMasterDetails) => {
        setEditData(data);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => clearFilters();
    const handleApplyFilters = () => handleFilters(filters);

    const { mutate: deleteCurrency } = useDeleteCurrency();

    const handleDelete = () => {
        if (selectedItem?.id) {
            deleteCurrency(selectedItem.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Currency deleted successfully');
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
        }
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <div className="text-lg font-bold">Currencies</div>
                <DataTable
                    query={query}
                    data={currencies?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by name or code..."
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

                        <Button onClick={onAddData} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Currency
                        </Button>
                    </div>
                </DataTable>

                <CurrencyMasterForm open={open} onClose={onClose} editData={editData} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.name}?`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default CurrencyMasterList;
