'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FilterConfig } from '@/types/table.types';
import type { Table } from '@tanstack/react-table';
import { X } from 'lucide-react';

interface TableFiltersProps {
    config: FilterConfig[];
    table: Table<any>;
    onFiltersChange: (filters: any) => void;
}

export function TableFilters({ config, table, onFiltersChange }: TableFiltersProps) {
    const handleFilterChange = (filterId: string, value: any) => {
        const column = table.getColumn(filterId);
        if (column) {
            column.setFilterValue(value);
        }
    };

    const clearFilters = () => {
        table.resetColumnFilters();
    };

    const hasActiveFilters = table.getState().columnFilters.length > 0;

    return (
        <div className="flex items-center space-x-4">
            {config.map((filter) => {
                const column = table.getColumn(filter.column);
                const filterValue = column?.getFilterValue();

                switch (filter.type) {
                    case 'text':
                        return (
                            <Input
                                key={filter.id}
                                placeholder={`Filter ${filter.label}...`}
                                value={(filterValue as string) ?? ''}
                                onChange={(e) => handleFilterChange(filter.column, e.target.value)}
                                className="max-w-sm"
                            />
                        );

                    case 'select':
                        return (
                            <Select
                                key={filter.id}
                                value={(filterValue as string) ?? 'all'}
                                onValueChange={(value) => handleFilterChange(filter.column, value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={`Select ${filter.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All {filter.label}</SelectItem>
                                    {filter.options?.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        );

                    case 'boolean':
                        return (
                            <Select
                                key={filter.id}
                                value={(filterValue as string) ?? 'all'}
                                onValueChange={(value) => handleFilterChange(filter.column, value === 'true')}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder={`Select ${filter.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="true">Yes</SelectItem>
                                    <SelectItem value="false">No</SelectItem>
                                </SelectContent>
                            </Select>
                        );

                    default:
                        return null;
                }
            })}

            {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="h-8 px-2 lg:px-3">
                    Reset
                    <X className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    );
}
