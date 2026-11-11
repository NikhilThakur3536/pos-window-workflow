import { TableCellStatus, TableContent, TableHeaderToggle, TablePagination, TableSearch } from '@/components/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryOptions, useQuery } from '@tanstack/react-query';
import {
    ColumnDef,
    ColumnFiltersState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
    VisibilityState,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { NextPageWithLayout } from '@/types/next-page.types';

interface ListDataType {
    document_number: string;
    order_number: number;
    name: string;
    account: number;
    start_date: string;
    change_date: string;
    invoiced_date: string;
    status: 'PAID' | 'PENDING' | 'CANCELLED';
    total: number;
    total_processed: number;
}

const listData: ListDataType[] = [
    {
        document_number: 'SAL001',
        order_number: 356128,
        name: 'Alpha Corp',
        account: 445,
        start_date: '2023-01-01',
        change_date: '2023-01-31',
        invoiced_date: '2023-01-31',
        status: 'PAID',
        total: 1000,
        total_processed: 1000,
    },
    {
        document_number: 'SAL002',
        order_number: 356129,
        name: 'Beta LLC',
        account: 446,
        start_date: '2023-02-01',
        change_date: '2023-02-28',
        invoiced_date: '2023-02-28',
        status: 'PENDING',
        total: 2000,
        total_processed: 1500,
    },
    {
        document_number: 'SAL003',
        order_number: 356130,
        name: 'Gamma Inc',
        account: 447,
        start_date: '2023-03-01',
        change_date: '2023-03-31',
        invoiced_date: '2023-03-31',
        status: 'CANCELLED',
        total: 3000,
        total_processed: 3000,
    },
    {
        document_number: 'SAL004',
        order_number: 356131,
        name: 'Delta Ltd',
        account: 448,
        start_date: '2023-04-01',
        change_date: '2023-04-30',
        invoiced_date: '2023-04-30',
        status: 'PAID',
        total: 4000,
        total_processed: 3500,
    },
    {
        document_number: 'SAL005',
        order_number: 356132,
        name: 'Epsilon GmbH',
        account: 449,
        start_date: '2023-05-01',
        change_date: '2023-05-31',
        invoiced_date: '2023-05-31',
        status: 'PENDING',
        total: 5000,
        total_processed: 5000,
    },
    {
        document_number: 'SAL006',
        order_number: 356133,
        name: 'Zeta PLC',
        account: 450,
        start_date: '2023-06-01',
        change_date: '2023-06-30',
        invoiced_date: '2023-06-30',
        status: 'PAID',
        total: 6000,
        total_processed: 6000,
    },
    {
        document_number: 'SAL007',
        order_number: 356134,
        name: 'Eta S.A.',
        account: 451,
        start_date: '2023-07-01',
        change_date: '2023-07-31',
        invoiced_date: '2023-07-31',
        status: 'CANCELLED',
        total: 7000,
        total_processed: 6500,
    },
    {
        document_number: 'SAL008',
        order_number: 356135,
        name: 'Theta Co',
        account: 452,
        start_date: '2023-08-01',
        change_date: '2023-08-31',
        invoiced_date: '2023-08-31',
        status: 'PAID',
        total: 8000,
        total_processed: 8000,
    },
    {
        document_number: 'SAL009',
        order_number: 356136,
        name: 'Iota Group',
        account: 453,
        start_date: '2023-09-01',
        change_date: '2023-09-30',
        invoiced_date: '2023-09-30',
        status: 'PENDING',
        total: 9000,
        total_processed: 8500,
    },
    {
        document_number: 'SAL010',
        order_number: 356137,
        name: 'Kappa Holdings',
        account: 454,
        start_date: '2023-10-01',
        change_date: '2023-10-31',
        invoiced_date: '2023-10-31',
        status: 'PAID',
        total: 10000,
        total_processed: 10000,
    },
    {
        document_number: 'SAL011',
        order_number: 356138,
        name: 'Lambda Partners',
        account: 455,
        start_date: '2023-11-01',
        change_date: '2023-11-30',
        invoiced_date: '2023-11-30',
        status: 'CANCELLED',
        total: 11000,
        total_processed: 10500,
    },
    {
        document_number: 'SAL012',
        order_number: 356139,
        name: 'Mu Ventures',
        account: 456,
        start_date: '2023-12-01',
        change_date: '2023-12-31',
        invoiced_date: '2023-12-31',
        status: 'PAID',
        total: 12000,
        total_processed: 12000,
    },
    {
        document_number: 'SAL013',
        order_number: 356140,
        name: 'Nu Solutions',
        account: 457,
        start_date: '2024-01-01',
        change_date: '2024-01-31',
        invoiced_date: '2024-01-31',
        status: 'PENDING',
        total: 13000,
        total_processed: 12500,
    },
    {
        document_number: 'SAL014',
        order_number: 356141,
        name: 'Xi Technologies',
        account: 458,
        start_date: '2024-02-01',
        change_date: '2024-02-29',
        invoiced_date: '2024-02-29',
        status: 'PAID',
        total: 14000,
        total_processed: 14000,
    },
    {
        document_number: 'SAL015',
        order_number: 356142,
        name: 'Omicron Systems',
        account: 459,
        start_date: '2024-03-01',
        change_date: '2024-03-31',
        invoiced_date: '2024-03-31',
        status: 'CANCELLED',
        total: 15000,
        total_processed: 14500,
    },
];

const columns: ColumnDef<ListDataType>[] = [
    {
        accessorKey: 'document_number',
        header: (data) => <TableHeaderToggle {...data}>Document #</TableHeaderToggle>,
        cell: ({ row }) => <div className="capitalize">{row.original.document_number}</div>,
    },
    {
        accessorKey: 'order_number',
        header: (data) => <TableHeaderToggle {...data}>Order #</TableHeaderToggle>,
        cell: ({ row }) => <div>{row.original.order_number}</div>,
    },
    {
        accessorKey: 'name',
        header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle>,
        cell: ({ row }) => <div className="capitalize">{row.original.name}</div>,
    },
    {
        accessorKey: 'account',
        header: (data) => <TableHeaderToggle {...data}>Account</TableHeaderToggle>,
        cell: ({ row }) => <div>{row.original.account}</div>,
    },
    {
        accessorKey: 'status',
        header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
        cell: TableCellStatus,
    },
    {
        accessorKey: 'start_date',
        header: (data) => <TableHeaderToggle {...data}>Start Date</TableHeaderToggle>,
        cell: ({ row }) => <div>{format(row.original.start_date, 'PP')}</div>,
    },
    {
        accessorKey: 'change_date',
        header: (data) => <TableHeaderToggle {...data}>Change Date</TableHeaderToggle>,
        cell: ({ row }) => <div>{format(row.original.change_date, 'PP')}</div>,
    },
    {
        accessorKey: 'invoiced_date',
        header: (data) => <TableHeaderToggle {...data}>Invoiced Date</TableHeaderToggle>,
        cell: ({ row }) => <div>{format(row.original.invoiced_date, 'PP')}</div>,
    },
    {
        accessorKey: 'total',
        header: (data) => <TableHeaderToggle {...data}>Total</TableHeaderToggle>,
        cell: ({ row }) => (
            <div className="font-mono font-medium tabular-nums">
                {row.original.total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
        ),
    },
    {
        accessorKey: 'total_processed',
        header: (data) => <TableHeaderToggle {...data}>Total Processed</TableHeaderToggle>,
        cell: ({ row }) => (
            <div className="font-mono font-medium tabular-nums">
                {row.original.total_processed.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </div>
        ),
    },
];

const ITEMS_PER_PAGE = 10;

type QueryOptions = {
    limit: number;
    offset: number;
    searchKey: string;
};

const listDataQueryOptions = ({ limit = 10, offset = 0, searchKey = '' }: Partial<QueryOptions> = {}) =>
    queryOptions({
        queryKey: ['list-data', { limit, offset, searchKey }],
        queryFn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return listData;
        },
    });

const ListPage: NextPageWithLayout = () => {
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [_, setSearch] = useQueryState('search', { defaultValue: '' });
    const [status, setStatus] = useQueryState('status', { defaultValue: '' });
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

    const pagination = useMemo(
        () => ({
            pageIndex: page - 1,
            pageSize: ITEMS_PER_PAGE,
        }),
        [page, ITEMS_PER_PAGE],
    );

    const listDataApi = useQuery(listDataQueryOptions({}));
    const data = listDataApi.data || [];
    const totalRowCount = data.length;

    const table = useReactTable({
        data: data,
        columns: columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        onPaginationChange: (updater) => {
            const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
            const newPage = newPagination.pageIndex + 1;
            setPage(newPage);
        },
        rowCount: totalRowCount,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
            pagination,
        },
    });

    const handleSearch = (uiSearch: string) => {
        if (uiSearch && uiSearch.trim().length > 0) {
            table.setGlobalFilter(uiSearch);
            setSearch(uiSearch);
        }
    };

    const handleClear = () => {
        table.setGlobalFilter('');
        setSearch('');
    };

    return (
        <div className="w-full bg-white p-4">
            <TableSearch handleSearch={handleSearch} handleClear={handleClear}>
                <div className="flex gap-2">
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            table.getColumn('status')?.setFilterValue(value === 'ALL' ? '' : value);
                            setStatus(value === 'ALL' ? '' : value);
                        }}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </TableSearch>
            <TableContent table={table} query={listDataApi} columns={columns} />
            <TablePagination table={table} pagination={pagination} totalRowCount={totalRowCount} />
        </div>
    );
};

ListPage.layoutType = 'dashboard';

export default ListPage;
