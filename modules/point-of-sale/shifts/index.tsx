import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import ShiftForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    ShiftFilterProps,
    ShiftDetails,
    useGetShifts,
    useRemoveShift,
} from '@/api-queries/till-management/shifts';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';

const ShiftsList = () => {
    const [selectedItem, setSelectedItem] = useState<ShiftDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters: ShiftFilterProps = {
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
    } = useTableFilters<ShiftFilterProps>(initialFilters);

    const query = useGetShifts({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: shifts, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<ShiftDetails>[] = [
        {
            accessorKey: 'tillNumber',
            header: (data) => <TableHeaderToggle {...data}>Till Number</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('tillNumber') || 'N/A'}</div>,
        },
        {
            accessorKey: 'currentShiftNumber',
            header: (data) => <TableHeaderToggle {...data}>Current Shift</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.currentShiftNumber || row.original.currentShiftNumber === 0
                        ? `Shift ${row.original.currentShiftNumber}`
                        : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'nextShiftNumber',
            header: (data) => <TableHeaderToggle {...data}>Next Shift</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {row.original.nextShiftNumber || (row.original.nextShiftNumber as number) === 0
                        ? `Shift ${row.original.nextShiftNumber}`
                        : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'store',
            header: (data) => <TableHeaderToggle {...data}>Store</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.store?.name || 'N/A'}</div>,
        },
        {
            accessorKey: 'firstSaleDateTime',
            header: (data) => <TableHeaderToggle {...data}>First Sale</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.firstSaleDateTime
                        ? moment(row.original.firstSaleDateTime).format('DD/MM/YYYY HH:mm')
                        : 'N/A'}
                    {row.original.firstSaleNumber != null && (
                        <div className="text-xs text-muted-foreground">#{row.original.firstSaleNumber}</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'lastSaleDateTime',
            header: (data) => <TableHeaderToggle {...data}>Last Sale</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.lastSaleDateTime
                        ? moment(row.original.lastSaleDateTime).format('DD/MM/YYYY HH:mm')
                        : 'N/A'}
                    {row.original.lastSaleNumber != null && (
                        <div className="text-xs text-muted-foreground">#{row.original.lastSaleNumber}</div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = String(row.original.status || 'N/A');
                const colour =
                    status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : status === 'CLOSED' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground';
                return (
                    <div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colour}`}>
                            {status}
                        </span>
                    </div>
                );
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
    const [editData, setEditData] = useState<ShiftDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: ShiftDetails) => {
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

    const { mutate: removeShift } = useRemoveShift();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeShift(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Shift deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            });
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <div className="text-lg font-bold">Shifts</div>
                <DataTable
                    query={query}
                    //@ts-ignore
                    data={shifts?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by till number..."
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
                            Add Shift
                        </Button>
                    </div>
                </DataTable>

                <ShiftForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete shift for till ${selectedItem?.tillNumber}`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default ShiftsList;
