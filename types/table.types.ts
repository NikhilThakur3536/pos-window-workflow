import type { ConditionalConfig, SelectOption } from '@/types/form.types';
import type React from 'react';

export interface TableConfig {
    id: string;
    title: string;
    columns: ColumnConfig[];
    filters: FilterConfig[];
    actions: TableAction[];
    pagination: PaginationConfig;
    sorting: SortingConfig;
    selection?: SelectionConfig;
}

export interface ColumnConfig {
    id: string;
    key: string;
    label: string;
    type: ColumnType;
    sortable?: boolean;
    filterable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: any) => React.ReactNode;
    conditional?: ConditionalConfig;
}

export type ColumnType =
    | 'text'
    | 'number'
    | 'date'
    | 'currency'
    | 'percentage'
    | 'boolean'
    | 'badge'
    | 'actions'
    | 'link';

export interface FilterConfig {
    id: string;
    label: string;
    type: FilterType;
    column: string;
    options?: SelectOption[];
    defaultValue?: any;
    multiple?: boolean;
}

export type FilterType = 'text' | 'select' | 'date-range' | 'number-range' | 'boolean';

export interface TableAction {
    id: string;
    label: string;
    icon?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    condition?: ((row: any) => boolean) | string;
}

export interface PaginationConfig {
    pageSize: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
}

export interface SortingConfig {
    defaultSort?: {
        column: string;
        direction: 'asc' | 'desc';
    };
    multiSort?: boolean;
}

export interface SelectionConfig {
    enabled: boolean;
    type: 'single' | 'multiple';
}

// --- Added for state management ---

export interface FilterState {
    [column: string]: any;
}

export interface SortState {
    id: string;
    desc: boolean;
}
