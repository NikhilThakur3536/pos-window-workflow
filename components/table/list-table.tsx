'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MouseEvent, ReactNode } from 'react';
import { memo, useCallback, useMemo } from 'react';

// Better type definitions
export interface Column<T = Record<string, any>> {
    key: keyof T | string;
    label: string;
    className?: string;
    render?: (row: T, index: number) => ReactNode;
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
}

interface ListOnlyTableProps<T = Record<string, any>> {
    'columns': Column<T>[];
    'data': T[];
    'onRowClick'?: (row: T, index: number) => void;
    'onRowDoubleClick'?: (row: T, index: number) => void;
    'selectedRowKey'?: string | number | null;
    'rowKeyExtractor'?: (row: T) => string | number;
    'showLineComments'?: boolean;
    'lineCommentExtractor'?: (row: T) => string;
    'loading'?: boolean;
    'emptyMessage'?: string;
    'className'?: string;
    'aria-label'?: string;
}

// Memoized row component for better performance
const TableRowMemo = memo(function TableRowComponent({
    row,
    index,
    columns,
    rowKey,
    isSelected,
    lineComment,
    onRowClick,
    onRowDoubleClick,
    showLineComments,
}: {
    row: any;
    index: number;
    columns: Column<any>[];
    rowKey: string | number;
    isSelected: boolean;
    lineComment: string | null;
    onRowClick?: (row: any, index: number) => void;
    onRowDoubleClick?: (row: any, index: number) => void;
    showLineComments: boolean;
}) {
    const handleClick = useCallback(
        (e: MouseEvent<HTMLTableRowElement>) => {
            if (e.detail === 1) {
                onRowClick?.(row, index);
            }
        },
        [onRowClick, row, index],
    );

    const handleDoubleClick = useCallback(
        (e: MouseEvent<HTMLTableRowElement>) => {
            onRowDoubleClick?.(row, index);
        },
        [onRowDoubleClick, row, index],
    );

    const getAlignmentClass = (align?: 'left' | 'center' | 'right') => {
        switch (align) {
            case 'center':
                return 'text-center';
            case 'right':
                return 'text-right';
            default:
                return 'text-left';
        }
    };

    return (
        <>
            <TableRow
                key={rowKey}
                className={`cursor-pointer text-xs transition-colors duration-150 hover:bg-gray-50 ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''} ${lineComment ? 'border-b-0 pb-0' : ''} `}
                onClick={onRowClick ? handleClick : undefined}
                onDoubleClick={onRowDoubleClick ? handleDoubleClick : undefined}
                tabIndex={onRowClick || onRowDoubleClick ? 0 : -1}
                role={onRowClick || onRowDoubleClick ? 'button' : undefined}
                onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && onRowClick) {
                        e.preventDefault();
                        onRowClick(row, index);
                    }
                }}
                aria-selected={isSelected}
            >
                {columns.map((col) => (
                    <TableCell
                        key={String(col.key)}
                        className={` ${col.className || ''} ${getAlignmentClass(col.align)} `}
                        style={{ width: col.width }}
                    >
                        {col.key === 'description' && typeof (row as any)[col.key] === 'string' ? (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="block truncate">{(row as any)[col.key]}</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs break-words">
                                        <p>{(row as any)[col.key]}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ) : col.render ? (
                            col.render(row, index)
                        ) : (
                            String((row as any)[col.key] ?? '')
                        )}
                    </TableCell>
                ))}
            </TableRow>

            {lineComment && showLineComments && (
                <TableRow key={`${rowKey}-comment`} className="border-t-0">
                    <TableCell
                        colSpan={columns.length}
                        className="bg-gray-50 px-4 py-1 text-sm font-medium text-gray-600"
                    >
                        {lineComment}
                    </TableCell>
                </TableRow>
            )}
        </>
    );
});

// Loading skeleton component
const LoadingSkeleton = memo(function LoadingSkeleton({ columns }: { columns: Column[] }) {
    return (
        <>
            {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                    {columns.map((col) => (
                        <TableCell key={String(col.key)}>
                            <div className="h-4 animate-pulse rounded bg-gray-200" />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
});

// Empty state component
const EmptyState = memo(function EmptyState({ message, colSpan }: { message: string; colSpan: number }) {
    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="py-8 text-center text-gray-500">
                {message}
            </TableCell>
        </TableRow>
    );
});

export function ListOnlyTable<T = Record<string, any>>({
    columns,
    data,
    onRowClick,
    onRowDoubleClick,
    selectedRowKey,
    rowKeyExtractor = (row) => (row as any).code || (row as any).id,
    showLineComments = false,
    lineCommentExtractor = (row) => (row as any).lineComment,
    loading = false,
    emptyMessage = 'No data available',
    className = '',
    'aria-label': ariaLabel,
}: ListOnlyTableProps<T>) {
    // Memoize processed data to avoid recalculations
    const processedData = useMemo(() => {
        return data.map((row, index) => {
            const rowKey = rowKeyExtractor(row);
            const isSelected = selectedRowKey !== undefined && rowKey === selectedRowKey;
            const lineComment = showLineComments ? lineCommentExtractor(row) : null;

            return { row, index, rowKey, isSelected, lineComment };
        });
    }, [data, rowKeyExtractor, selectedRowKey, showLineComments, lineCommentExtractor]);

    return (
        <div className={`overflow-hidden rounded-md border bg-white shadow-sm ${className}`}>
            <Table aria-label={ariaLabel || 'Data table'}>
                <TableHeader>
                    <TableRow className="bg-gray-50/50">
                        {columns.map((col) => (
                            <TableHead
                                key={String(col.key)}
                                className={`border-b text-xs font-semibold text-gray-700 ${col.className || ''} ${col.align === 'center' ? 'text-center' : ''} ${col.align === 'right' ? 'text-right' : ''} `}
                                style={{ width: col.width }}
                            >
                                {col.label}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {loading ? (
                        <LoadingSkeleton columns={columns as Column<any>[]} />
                    ) : processedData.length === 0 ? (
                        <EmptyState message={emptyMessage} colSpan={columns.length} />
                    ) : (
                        processedData.map(({ row, index, rowKey, isSelected, lineComment }) => (
                            <TableRowMemo
                                key={String(rowKey)}
                                row={row}
                                index={index}
                                columns={columns as Column<any>[]}
                                rowKey={rowKey}
                                isSelected={isSelected}
                                lineComment={lineComment}
                                onRowClick={onRowClick as ((row: any, index: number) => void) | undefined}
                                onRowDoubleClick={onRowDoubleClick as ((row: any, index: number) => void) | undefined}
                                showLineComments={showLineComments}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
