import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RotateCcw } from 'lucide-react';
import TillToSafeForm from './form';
import ReverseDialog from './reverse-dialog';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    TillToSafeFilterProps,
    TillToSafeDetails,
    useGetTillToSafeTransfers,
} from '@/api-queries/till-management/till-to-safe';
import { useGetTills, TillDetails } from '@/api-queries/masters/tills';
import { useGetSafes, SafeDetails } from '@/api-queries/safes';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';

interface TillToSafeListProps {
    moduleCode: string;
}

const TillToSafeList = ({ moduleCode }: TillToSafeListProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const tillsList = useGetTills({})?.data?.data?.rows;
    const safesList = useGetSafes({})?.data?.data?.rows;

    const [reverseData, setReverseData] = useState<TillToSafeDetails | null>(null);

    const initialFilters: TillToSafeFilterProps = {
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
    } = useTableFilters<TillToSafeFilterProps>(initialFilters);

    const query = useGetTillToSafeTransfers({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: transfers, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<TillToSafeDetails>[] = [
        {
            accessorKey: 'tillId',
            header: (data) => <TableHeaderToggle {...data}>Till</TableHeaderToggle>,
            cell: ({ row }) => {
                const till = tillsList?.find((t: TillDetails) => t.id === row.getValue('tillId'));
                return <div>{till?.name || till?.tillNumber || row.getValue('tillId')}</div>;
            },
        },
        {
            accessorKey: 'safeId',
            header: (data) => <TableHeaderToggle {...data}>Safe</TableHeaderToggle>,
            cell: ({ row }) => {
                const safe = safesList?.find((s: SafeDetails) => s.id === row.getValue('safeId'));
                return <div>{safe?.name || safe?.code || row.getValue('safeId')}</div>;
            },
        },
        {
            accessorKey: 'amount',
            header: (data) => <TableHeaderToggle {...data}>Amount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {row.getValue('amount')}
                </div>
            ),
        },
        {
            accessorKey: 'referenceNumber',
            header: (data) => <TableHeaderToggle {...data}>Reference No.</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('referenceNumber') || 'N/A'}</div>,
        },
        {
            accessorKey: 'reason',
            header: (data) => <TableHeaderToggle {...data}>Reason</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('reason') || 'N/A'}</div>,
        },
        {
            accessorKey: 'createdAt',
            header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('createdAt') ? (
                    <div>{moment(row.getValue('createdAt')).format('DD/MM/YYYY HH:mm')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('status') || 'N/A'}</div>,
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReverseData(row.original)}
                        className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Reverse"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <div className="text-lg font-bold">Till-to-Safe Transfer</div>
                <DataTable
                    query={query}
                    data={transfers?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search transfers..."
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
                        <Button onClick={() => setOpen(true)} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Transfer to Safe
                        </Button>
                    </div>
                </DataTable>

                <TillToSafeForm open={open} onClose={() => setOpen(false)} />

                <ReverseDialog data={reverseData} onClose={() => setReverseData(null)} />
            </div>
        </PageLoader>
    );
};

export default TillToSafeList;
