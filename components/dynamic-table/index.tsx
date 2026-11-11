import { TableFilters } from '@/components/dynamic-table/table-filters';
import { TablePagination } from '@/components/dynamic-table/table-pagination';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDynamicTable } from '@/hooks/use-dynamic-table';
import type { TableConfig } from '@/types/table.types';
import { flexRender } from '@tanstack/react-table';
import { ArrowUpDown, Loader2 } from 'lucide-react';

interface DynamicTableProps {
    config: TableConfig;
    data: any[];
    loading?: boolean;
    onAction?: (action: string, row: any) => void;
}

function getColumnAlignment(columnDef: { meta?: { align?: 'left' | 'center' | 'right' } }) {
    const align = columnDef?.meta?.align ?? 'left';
    const alignMap: Record<'left' | 'center' | 'right', string> = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };
    return alignMap[align];
}

export function DynamicTable({ config, data, loading: externalLoading, onAction }: DynamicTableProps) {
    const { table, handleAction, isLoading } = useDynamicTable(config, data);

    const loading = externalLoading || isLoading;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{config.title}</h2>
                <TableFilters config={config.filters} table={table} onFiltersChange={() => {}} />
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className={getColumnAlignment(header.column.columnDef)}>
                                        {header.isPlaceholder ? null : (
                                            <div className="flex items-center space-x-2">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => header.column.toggleSorting()}
                                                    >
                                                        <ArrowUpDown className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={config.columns.length} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className={getColumnAlignment(cell.column.columnDef)}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={config.columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <TablePagination table={table} />
        </div>
    );
}
