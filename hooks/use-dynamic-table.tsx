'use client';

import { cn } from '@/lib/utils';
import { useTableStore } from '@/stores/table-store';
import type { ColumnConfig, TableConfig } from '@/types/table.types';
import {
    type ColumnDef,
    type ColumnFiltersState,
    type PaginationState,
    type SortingState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useCallback, useMemo, useState } from 'react';

function getSafeNumber(val: unknown): number {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val))) return Number(val);
    return 0;
}

function getSafeString(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    return '';
}

export function useDynamicTable(config: TableConfig, data: any[]) {
    const { updateFilters, updateSorting, updatePagination, setLoading } = useTableStore();

    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: config.pagination.pageSize || 10,
    });

    const generateColumns = useCallback(
        (columns: ColumnConfig[], onAction?: (action: string, row: any) => void): ColumnDef<any>[] => {
            return columns.map((column) => ({
                id: column.id,
                accessorKey: column.key,
                header: column.label,
                size: column.width ? Number.parseInt(column.width) : undefined,
                enableSorting: column.sortable,
                enableColumnFilter: column.filterable,
                cell: ({ row, getValue }) => {
                    const value = getValue();

                    if (column.formatter) {
                        return column.formatter(value, row.original);
                    }

                    switch (column.type) {
                        case 'currency': {
                            const num = getSafeNumber(value);
                            return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            }).format(num);
                        }
                        case 'percentage': {
                            const num = getSafeNumber(value);
                            return `${num.toFixed(2)}%`;
                        }
                        case 'date': {
                            if (!value) return '';
                            let date: Date | null = null;
                            if (typeof value === 'string' || typeof value === 'number') {
                                const d = new Date(value);
                                date = isNaN(d.getTime()) ? null : d;
                            } else if (value instanceof Date) {
                                date = value;
                            }
                            return date ? date.toLocaleDateString() : '';
                        }
                        case 'boolean':
                            return value === true ? 'Yes' : 'No';
                        case 'badge':
                            return (
                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        value === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800',
                                    )}
                                >
                                    {getSafeString(value)}
                                </span>
                            );
                        case 'actions':
                            return (
                                <div className="flex space-x-2">
                                    {config.actions.map((action) => {
                                        let shouldShow = true;
                                        if (action.condition) {
                                            if (typeof action.condition === 'function') {
                                                shouldShow = action.condition(row.original);
                                            } else if (typeof action.condition === 'string') {
                                                try {
                                                    const conditionFn = new Function(
                                                        'row',
                                                        `return ${action.condition}`,
                                                    );
                                                    shouldShow = conditionFn(row.original);
                                                } catch (error) {
                                                    console.warn('Invalid condition string:', action.condition);
                                                    shouldShow = true;
                                                }
                                            }
                                        }
                                        if (!shouldShow) return null;
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={() => onAction?.(action.id, row.original)}
                                                className={cn(
                                                    'rounded px-3 py-1 text-sm',
                                                    action.variant === 'destructive'
                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                        : action.variant === 'outline'
                                                          ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200',
                                                )}
                                            >
                                                {action.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        default:
                            return getSafeString(value);
                    }
                },
            }));
        },
        [config.actions],
    );

    const columns = useMemo(() => generateColumns(config.columns), [config.columns, generateColumns]);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnFilters,
            pagination,
        },
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const handleAction = useCallback((action: string, row: any) => {
        console.log('Table action:', action, row);
        // Handle table actions here
    }, []);

    return {
        table,
        handleAction,
        isLoading: useTableStore((state) => state.loading),
    };
}
