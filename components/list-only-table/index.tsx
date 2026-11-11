import * as React from 'react';
import { ColumnDef, getCoreRowModel, getPaginationRowModel, useReactTable, flexRender } from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DataTablePagination from './data-table-pagination';
import { useNetworkStore } from '@/stores/network.store';
import OfflineFetchDataError from '@/offline/offline-fetch-no-data';
import { toast } from 'sonner';

interface Column {
    key: string;
    label: string;
    className?: string;
    render?: (row: any, index: number) => React.ReactNode;
}

interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

interface ListOnlyTableProps {
    columns: Column[];
    data: any[];
    isLoading?: boolean;
    onRowClick?: (row: any, index: number) => void;
    onRowDoubleClick?: (row: any, index: number) => void;
    selectedRowKey?: string | number | null;
    rowKeyExtractor?: (row: any) => string | number;
    showLineComments?: boolean;
    lineCommentExtractor?: (row: any) => string;
    totalCount?: number;
    pagination?: PaginationState;
    setPagination?: React.Dispatch<React.SetStateAction<PaginationState>>;
    showNoDataAlert?: boolean;
    showNoDataMessage?: string;
    staticTable?: boolean;
    itemError?: any;
    disabledRows?: string;
    shouldShowPagination?: boolean;
}

export function ListOnlyTable({
    columns,
    data,
    onRowClick,
    onRowDoubleClick,
    selectedRowKey,
    rowKeyExtractor = (row) => row.code,
    showLineComments = false,
    lineCommentExtractor = (row) => row.lineComment,
    totalCount,
    pagination,
    isLoading = false,
    setPagination,
    showNoDataAlert = true,
    showNoDataMessage = 'No data found.',
    staticTable = false,
    itemError,
    disabledRows = '',
    shouldShowPagination = true,
}: ListOnlyTableProps) {
    const isOnline = useNetworkStore((state) => state.online);

    const columnDefs = React.useMemo<ColumnDef<any, any>[]>(() => {
        return columns.map((col) => ({
            accessorKey: col.key,
            header: () => <span className={`text-xs font-semibold ${col.className || ''}`}>{col.label}</span>,
            cell: ({ row }) => {
                const value = row.original[col.key];
                const index = row.index;

                if (col.key === 'description' && typeof value === 'string') {
                    return (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="block truncate">{value}</span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                    <p>{value}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                return col.render ? col.render(row.original, index) : (value ?? '').toString();
            },
            meta: col.className,
        }));
    }, [columns]);

    const table = useReactTable({
        data,
        columns: columnDefs,
        autoResetPageIndex: false,
        state: shouldShowPagination
            ? {
                  pagination: pagination ?? { pageIndex: 0, pageSize: 10 },
              }
            : {},

        onPaginationChange: shouldShowPagination ? setPagination : undefined,
        getCoreRowModel: getCoreRowModel(),
        ...(shouldShowPagination && {
            getPaginationRowModel: getPaginationRowModel(),
            manualPagination: !!totalCount,
            pageCount: totalCount ? Math.ceil(totalCount / (pagination?.pageSize || 10)) : -1,
        }),
    });

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className={header.column.columnDef.meta as string}>
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>

                    {/* <TableBody>
                        {table.getRowModel().rows?.length == 0 && showNoDataAlert ? (
                            <TableRow className="py-2 text-gray-600">
                                {isOnline || staticTable ? (
                                    <TableCell colSpan={table.options.columns.length} className="text-center">
                                        {showNoDataMessage}
                                    </TableCell>
                                ) : (
                                    <TableCell colSpan={table.options.columns.length}>
                                        <OfflineFetchDataError />
                                    </TableCell>
                                )}
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => {
                                const rowKey = rowKeyExtractor(row.original);
                                const isSelected = selectedRowKey !== undefined && rowKey === selectedRowKey;
                                const lineComment = showLineComments ? lineCommentExtractor(row.original) : null;

                                return (
                                    <React.Fragment key={row.id}>
                                        <TableRow
                                            className={`text-xs hover:bg-gray-50 ${
                                                disabledRows &&
                                                (row?.original?.disabled
                                                    ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                                                    : 'cursor-pointer')
                                            } ${
                                                isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''
                                            } ${lineComment ? 'border-b-0 pb-0' : ''}`}
                                            onClick={(e) => {
                                                if (disabledRows && row.original.disabled) {
                                                    toast.error(disabledRows);
                                                    return;
                                                }
                                                if (e.detail === 1) {
                                                    onRowClick?.(row.original, row.index);
                                                }
                                            }}
                                            onDoubleClick={() => {
                                                onRowDoubleClick?.(row.original, row.index);
                                            }}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={cell.column.columnDef.meta as string}
                                                >
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>

                                        {(lineComment || (itemError && itemError[row.index])) && (
                                            <TableRow key={`${row.id}-extra`}>
                                                <TableCell colSpan={columns.length} className="py-0">
                                                    {lineComment && (
                                                        <div className="pb-1 text-sm font-semibold">{lineComment}</div>
                                                    )}

                                                    {itemError && itemError[row.index] && (
                                                        <div className="bg-red-50 px-2 py-1 text-xs text-red-500">
                                                            Error(s) in item {row.index + 1} -
                                                            {Object.entries(itemError[row.index])
                                                                .map(([key, val]) => {
                                                                    const value = val as
                                                                        | { message?: string }
                                                                        | undefined;
                                                                    return value?.message
                                                                        ? { key, message: value.message }
                                                                        : null;
                                                                })
                                                                .filter(
                                                                    (v): v is { key: string; message: string } =>
                                                                        v !== null,
                                                                )
                                                                .map((v, idx, arr) => (
                                                                    <React.Fragment key={v.key}>
                                                                        {v.message}
                                                                        {idx < arr.length - 1 && ' | '}
                                                                    </React.Fragment>
                                                                ))}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        )}
                    </TableBody> */}
                    <TableBody>
    {isLoading ? (
        <TableRow>
            <TableCell
                colSpan={table.options.columns.length}
                className="h-32"
            >
                <div className="flex h-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
                </div>
            </TableCell>
        </TableRow>
    ) : table.getRowModel().rows?.length === 0 && showNoDataAlert ? (
        <TableRow className="py-2 text-gray-600">
            {isOnline || staticTable ? (
                <TableCell colSpan={table.options.columns.length} className="text-center">
                    {showNoDataMessage}
                </TableCell>
            ) : (
                <TableCell colSpan={table.options.columns.length}>
                    <OfflineFetchDataError />
                </TableCell>
            )}
        </TableRow>
    ) : (
        table.getRowModel().rows.map((row) => {
            const rowKey = rowKeyExtractor(row.original);
            const isSelected = selectedRowKey !== undefined && rowKey === selectedRowKey;
            const lineComment = showLineComments ? lineCommentExtractor(row.original) : null;

            return (
                <React.Fragment key={row.id}>
                    <TableRow
                        className={`text-xs hover:bg-gray-50 ${
                            disabledRows &&
                            (row?.original?.disabled
                                ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                                : 'cursor-pointer')
                        } ${
                            isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''
                        } ${lineComment ? 'border-b-0 pb-0' : ''}`}
                        onClick={(e) => {
                            if (disabledRows && row.original.disabled) {
                                toast.error(disabledRows);
                                return;
                            }

                            if (e.detail === 1) {
                                onRowClick?.(row.original, row.index);
                            }
                        }}
                        onDoubleClick={() => {
                            onRowDoubleClick?.(row.original, row.index);
                        }}
                    >
                        {row.getVisibleCells().map((cell) => (
                            <TableCell
                                key={cell.id}
                                className={cell.column.columnDef.meta as string}
                            >
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                )}
                            </TableCell>
                        ))}
                    </TableRow>

                    {(lineComment || (itemError && itemError[row.index])) && (
                        <TableRow key={`${row.id}-extra`}>
                            <TableCell colSpan={columns.length} className="py-0">
                                {lineComment && (
                                    <div className="pb-1 text-sm font-semibold">
                                        {lineComment}
                                    </div>
                                )}

                                {itemError && itemError[row.index] && (
                                    <div className="bg-red-50 px-2 py-1 text-xs text-red-500">
                                        Error(s) in item {row.index + 1} -
                                        {Object.entries(itemError[row.index])
                                            .map(([key, val]) => {
                                                const value = val as
                                                    | { message?: string }
                                                    | undefined;

                                                return value?.message
                                                    ? {
                                                          key,
                                                          message: value.message,
                                                      }
                                                    : null;
                                            })
                                            .filter(
                                                (
                                                    v,
                                                ): v is {
                                                    key: string;
                                                    message: string;
                                                } => v !== null,
                                            )
                                            .map((v, idx, arr) => (
                                                <React.Fragment key={v.key}>
                                                    {v.message}
                                                    {idx < arr.length - 1 && ' | '}
                                                </React.Fragment>
                                            ))}
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
            );
        })
    )}
</TableBody>
                </Table>
            </div>
            {shouldShowPagination && totalCount != null && pagination && setPagination && (
                <DataTablePagination table={table} />
            )}
        </div>
    );
}
