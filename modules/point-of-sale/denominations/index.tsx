import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Plus } from 'lucide-react';
import DenominationForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    FilterProps,
    DenominationDetails,
    DenominationType,
    useGetDenominations,
    useRemoveDenomination,
} from '@/api-queries/till-management/denominations';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { useAuthUser } from '@/stores/auth-user.store';

interface DenominationsListProps {
    moduleCode: string;
}

const DenominationsList = ({ moduleCode }: DenominationsListProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [selectedItem, setSelectedItem] = useState<DenominationDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters: FilterProps = {
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

    const query = useGetDenominations({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.type ? { type: appliedFilters.type } : {}),
    });
    const { data: denominations, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<DenominationDetails>[] = [
        {
            accessorKey: 'label',
            header: (data) => <TableHeaderToggle {...data}>Label</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('label')}</div>,
        },
        {
            accessorKey: 'type',
            header: (data) => <TableHeaderToggle {...data}>Type</TableHeaderToggle>,
            cell: ({ row }) => (
                <Badge variant="outline" className={row.original.type === 'COIN' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}>
                    {row.original.type || 'NOTE'}
                </Badge>
            ),
        },
        {
            accessorKey: 'value',
            header: (data) => <TableHeaderToggle {...data}>Value</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.currency?.symbol || currencySymbol} {row.original.value ?? row.original.conversionValue}
                </div>
            ),
        },
        {
            accessorKey: 'conversionValue',
            header: (data) => <TableHeaderToggle {...data}>Conversion Value</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.currency?.symbol || currencySymbol} {row.original.conversionValue}
                </div>
            ),
        },
        {
            accessorKey: 'currencyId',
            header: (data) => <TableHeaderToggle {...data}>Currency</TableHeaderToggle>,
            cell: ({ row }) => {
                const currency = row.original.currency;
                return (
                    <div>
                        {currency ? `${currency.name} (${currency.code})` : row.getValue('currencyId')}
                    </div>
                );
            },
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('status')}</div>,
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
    const [editData, setEditData] = useState<DenominationDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: DenominationDetails) => {
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

    const handleApplyFilters = (overrides?: FilterProps) => {
        handleFilters(overrides ? { ...filters, ...overrides } : filters);
    };

    const { mutate: removeDenomination } = useRemoveDenomination();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeDenomination(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Denomination deleted successfully');
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
                <div className="text-lg font-bold">Denominations Setup</div>
                <DataTable
                    query={query}
                    data={denominations?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by label or type..."
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
                            <Select
                                value={appliedFilters?.type || 'ALL'}
                                onValueChange={(value) =>
                                    handleApplyFilters({
                                        ...filters,
                                        type: value === 'ALL' ? undefined : (value as DenominationType),
                                    })
                                }
                            >
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All types</SelectItem>
                                    <SelectItem value="NOTE">Notes</SelectItem>
                                    <SelectItem value="COIN">Coins</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={onAddData} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add Denomination
                        </Button>
                    </div>
                </DataTable>

                <DenominationForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.label}`}
                    onConfirm={handleDelete}
                />
            </div>
        </PageLoader>
    );
};

export default DenominationsList;
