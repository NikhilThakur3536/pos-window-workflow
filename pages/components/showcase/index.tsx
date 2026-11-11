import MultiSelectPopover from '@/components/multi-select-popover';
import SelectPopover from '@/components/select-popover';
import SubmitButton from '@/components/submit-button';
import { TableCellStatus, TableContent, TableHeaderToggle, TablePagination, TableSearch } from '@/components/table';
import { ColumnChips } from '@/components/table/column-chips';
import TableDateFilter from '@/components/table/date-filter';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import {
    CellContext,
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
import { CopyIcon, EditIcon, MoreHorizontalIcon, TrashIcon } from 'lucide-react';
import { parseAsInteger, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const columnChips = ['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5'];

const selectOptions = [
    { value: '1', label: 'Item 1' },
    { value: '2', label: 'Item 2' },
    { value: '3', label: 'Item 3' },
    { value: '4', label: 'Item 4' },
    { value: '5', label: 'Item 5' },
    { value: '6', label: 'Item 6' },
    { value: '7', label: 'Item 7' },
    { value: '8', label: 'Item 8' },
];

const formatData = [
    { name: 'Alpha', category: 'A', status: 'Active' },
    { name: 'Beta', category: 'B', status: 'Inactive' },
    { name: 'Gamma', category: 'A', status: 'Pending' },
    { name: 'Delta', category: 'C', status: 'Active' },
    { name: 'Epsilon', category: 'B', status: 'Inactive' },
];

type ColumnDataType = (typeof formatData)[number];

const columns: ColumnDef<ColumnDataType>[] = [
    {
        accessorKey: 'name',
        header: (data) => {
            return <TableHeaderToggle {...data}>Name</TableHeaderToggle>;
        },
        cell: ({ row }) => <div className="capitalize">{row.original.name}</div>,
    },
    {
        accessorKey: 'category',
        header: (data) => {
            return <TableHeaderToggle {...data}>Category</TableHeaderToggle>;
        },
        cell: ({ row }) => <div className="uppercase">{row.original.category}</div>,
    },
    {
        accessorKey: 'status',
        header: (data) => {
            return <TableHeaderToggle {...data}>Status</TableHeaderToggle>;
        },
        cell: TableCellStatus,
    },
    {
        accessorKey: 'actions',
        header: '',
        cell: ColumnAction,
    },
];

function ColumnAction({ row }: CellContext<ColumnDataType, unknown>) {
    const column = row.original;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontalIcon className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                    onClick={() => {
                        navigator.clipboard.writeText(column.name);
                        toast.success('column name copied to clipboard');
                    }}
                >
                    <CopyIcon className="size-3" />
                    Copy column
                </DropdownMenuItem>
                <DropdownMenuItem>
                    <EditIcon className="size-3" />
                    Edit column
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive">
                    <TrashIcon className="size-3" />
                    Delete column
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function ShowcasePage() {
    const [clearDate, setClearDate] = useState(false);
    const [selectedValue, setSelectedValue] = useState({
        from: '2023-01-01',
        to: '2023-01-31',
    });
    const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);
    const [selectvalue, setSelectvalue] = useState<string | null>(null);
    const [submitButtonStatus, setSubmitButtonStatus] = useState(false);

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-4 p-5">
            <ColumnChips items={columnChips} />
            <TableDateFilter
                setClearDate={setClearDate}
                clearDate={clearDate}
                from={selectedValue.from}
                to={selectedValue.to}
                onRangeChange={setSelectedValue}
                onClear={() => setSelectedValue({ from: '', to: '' })}
            />
            <MultiSelectPopover
                title="Select Items"
                options={selectOptions}
                selectedValue={multiSelectValue}
                onSelect={setMultiSelectValue}
            />
            <SelectPopover
                title="Select Item"
                options={selectOptions}
                selectedValue={selectvalue}
                onSelect={setSelectvalue}
            />
            <TableExample />
            <SubmitButton
                onClick={() => {
                    setSubmitButtonStatus(true);
                    new Promise((resolve) => setTimeout(resolve, 3000)).then(() => {
                        setSubmitButtonStatus(false);
                    });
                }}
                isPending={submitButtonStatus}
            >
                Submit
            </SubmitButton>
        </div>
    );
}

const ITEMS_PER_PAGE = 3;

function useProducts({ limit, offset, searchKey }: { limit: number; offset: number; searchKey: string }) {
    return useQuery({
        queryKey: ['products', { limit, offset, searchKey }],
        queryFn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 4000));
            return formatData;
        },
    });
}

function TableExample() {
    const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));
    const [search, setSearch] = useQueryState('search', { defaultValue: '' });
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

    const offset = pagination.pageIndex * pagination.pageSize;
    const totalRowCount = formatData.length;

    const products = useProducts({
        searchKey: search,
        limit: pagination.pageSize,
        offset,
    });

    const table = useReactTable({
        data: formatData,
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
        // manualPagination: true,
        // manualFiltering: true,
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
        <div className="w-full">
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
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </TableSearch>
            <TableContent table={table} query={products} columns={columns} />
            <TablePagination table={table} pagination={pagination} totalRowCount={totalRowCount} />
        </div>
    );
}
