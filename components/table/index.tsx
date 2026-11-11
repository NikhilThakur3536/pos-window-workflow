import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { UseQueryResult, UseSuspenseQueryResult } from '@tanstack/react-query';
import {
    CellContext,
    ColumnDef,
    flexRender,
    HeaderContext,
    PaginationState,
    Row,
    Table as TableType,
} from '@tanstack/react-table';
import { ArrowUpDown, CheckCircle, CircleAlert, SearchIcon, XCircle, XIcon } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { ReactNode, useState } from 'react';
import OfflineFetchDataError from '@/offline/offline-fetch-no-data';
import { useNetworkStore } from '@/stores/network.store';

type TableContentProps<TData, TQuery> = {
    table: TableType<TData>;
    query?: UseQueryResult<TQuery> | UseSuspenseQueryResult<TQuery>;
    columns: ColumnDef<TData>[];
    onRowClick?: (row: Row<TData>) => void;
    rowClassName?: (rowData: TData, row: Row<TData>) => string;
    tableClassName?: string;
    // Shown in place of the default "No results." when the table has no rows.
    emptyMessage?: ReactNode;
};

export function TableContent<TData, TQuery>({
    table,
    query,
    columns,
    onRowClick,
    rowClassName,
    emptyMessage,
    tableClassName,
}: TableContentProps<TData, TQuery>) {
    const isOnline = useNetworkStore((state) => state.online);
    const isLoading = query?.isLoading;
    const isError = query?.isError;

    return (
        <div className="rounded-md border">
            {isLoading ? (
                <>
                    <Table className={tableClassName}>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead
                                            key={header.id}
                                            className="!text-sm"
                                            style={
                                                typeof header.column.columnDef.size === 'number'
                                                    ? { width: header.column.getSize() }
                                                    : undefined
                                            }
                                        >
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                    </Table>
                    <TableLoader />
                </>
            ) : isError ? (
                <TableError query={query} message="Error fetching items. Please try again." />
            ) : (
                <Table className={tableClassName}>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="!text-sm"
                                        style={
                                            typeof header.column.columnDef.size === 'number'
                                                ? { width: header.column.getSize() }
                                                : undefined
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && 'selected'}
                                    className={cn(
                                        'transition-colors',
                                        onRowClick && 'cursor-pointer',
                                        rowClassName?.(row.original, row),
                                    )}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            style={
                                                typeof cell.column.columnDef.size === 'number'
                                                    ? { width: cell.column.getSize() }
                                                    : undefined
                                            }
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                {isOnline ? (
                                    <TableCell colSpan={columns.length} className="h-24 text-center">
                                        {emptyMessage ?? 'No results.'}
                                    </TableCell>
                                ) : (
                                    <TableCell colSpan={columns.length}>
                                        <OfflineFetchDataError />
                                    </TableCell>
                                )}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}

type TableErrorProps<T> = {
    query?: UseQueryResult<T> | UseSuspenseQueryResult<T>;
    message: string;
};

export function TableError<T>({ query, message }: TableErrorProps<T>) {
    return (
        <div className="border-destructive flex h-132.5 flex-col items-center justify-center gap-4 rounded-md border border-dashed pt-4">
            <p className="text-center text-lg font-semibold">{message}</p>
            <div className="flex justify-center">
                <Button onClick={() => query?.refetch()}>Retry</Button>
            </div>
        </div>
    );
}

export function TableLoader() {
    return (
        <div className="space-y-1.5 bg-white p-1">
            {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full rounded-md border" />
            ))}
        </div>
    );
}

type TablePaginationProps<T> = {
    table: TableType<T>;
    pagination: PaginationState;
    totalRowCount: number;
};

export function TablePagination<T>({ table, pagination, totalRowCount }: TablePaginationProps<T>) {
    const totalPages = Math.ceil(totalRowCount / pagination.pageSize) || 1;
    const currentPage = pagination.pageIndex + 1;
    return (
        <div className="flex items-center justify-between gap-3 py-4">
            <div>
                {pagination.pageIndex + 1} of {totalPages} pages
            </div>
            <Pagination className="mx-0 flex w-fit items-center gap-3">
                <PaginationContent>
                    <PaginationItem>
                        <Button
                            variant="secondary"
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                        >
                            Previous
                        </Button>
                    </PaginationItem>
                    <PaginationItem>
                        <Select
                            value={String(currentPage)}
                            onValueChange={(value) => {
                                const pageNumber = Number(value);
                                table.setPageIndex(pageNumber - 1);
                            }}
                            aria-label="Select page"
                        >
                            <SelectTrigger id="select-page" className="w-fit whitespace-nowrap">
                                <SelectValue placeholder="Select page" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <SelectItem key={page} value={String(page)}>
                                        Page {page}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </PaginationItem>
                    <PaginationItem>
                        <Button variant="secondary" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                            Next
                        </Button>
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}

type TableSearchProps = {
    children?: ReactNode;
    handleSearch: (val: string) => void;
    handleClear: () => void;
};

export function TableSearch({ children, handleSearch, handleClear }: TableSearchProps) {
    const [search] = useQueryState('search', { defaultValue: '' });
    const [uiSearch, setUiSearch] = useState(search);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch(uiSearch);
    };

    return (
        <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-1">
                <Input
                    placeholder="Filter data..."
                    value={uiSearch || ''}
                    onChange={(e) => setUiSearch(String(e.target.value))}
                    onKeyDown={handleKeyDown}
                    className="max-w-sm"
                />
                <Button type="button" onClick={() => handleSearch(uiSearch)} size="icon">
                    <SearchIcon className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    onClick={() => {
                        handleClear();
                        setUiSearch('');
                    }}
                    variant="outline"
                    size="icon"
                >
                    <XIcon className="h-4 w-4" />
                </Button>
            </div>
            {children}
        </div>
    );
}

export type TableHeaderToggleProps<T> = HeaderContext<T, unknown> & {
    children: ReactNode;
    className?: string;
};

export function TableHeaderToggle<T>({ column, children, className }: TableHeaderToggleProps<T>) {
    return (
        <Button
            variant="reset"
            size="link"
            className={`group ${className || ''}`}
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
            {children}
            <ArrowUpDown className="group-hover:text-primary" />
        </Button>
    );
}

export function TableCellStatus<T extends { status: string }>({ row }: CellContext<T, unknown>) {
    const status = row.original.status.toLowerCase();
    const Icon =
        status == 'active' || status == 'paid'
            ? CheckCircle
            : status == 'inactive' || status == 'cancelled'
              ? XCircle
              : CircleAlert;
    return (
        <div
            className={cn('flex items-center font-medium', {
                'text-emerald-600': status == 'active' || status == 'paid',
                'text-red-600': status == 'inactive' || status == 'cancelled',
                'text-yellow-600': status == 'pending',
            })}
        >
            <Icon className="mr-1 h-4 w-4" strokeWidth={2} />
            {row.original.status}
        </div>
    );
}
