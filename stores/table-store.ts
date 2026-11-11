import type { FilterState, SortState, TableConfig } from '@/types/table.types';
import { create } from 'zustand';

interface TableState {
    tables: Record<string, TableConfig>;
    currentTable: string | null;
    data: Record<string, any[]>;
    filters: Record<string, FilterState>;
    sorting: Record<string, SortState[]>;
    pagination: Record<string, { page: number; pageSize: number }>;
    selection: Record<string, string[]>;
    loading: boolean;
}

interface TableActions {
    setTable: (tableId: string, config: TableConfig) => void;
    setCurrentTable: (tableId: string) => void;
    setData: (tableId: string, data: any[]) => void;
    updateFilters: (tableId: string, filters: FilterState) => void;
    updateSorting: (tableId: string, sorting: SortState[]) => void;
    updatePagination: (tableId: string, page: number, pageSize: number) => void;
    updateSelection: (tableId: string, selection: string[]) => void;
    setLoading: (loading: boolean) => void;
    clearTable: (tableId: string) => void;
}

export const useTableStore = create<TableState & TableActions>((set, get) => ({
    tables: {},
    currentTable: null,
    data: {},
    filters: {},
    sorting: {},
    pagination: {},
    selection: {},
    loading: false,

    setTable: (tableId, config) =>
        set((state) => ({
            tables: { ...state.tables, [tableId]: config },
        })),

    setCurrentTable: (tableId) => set({ currentTable: tableId }),

    setData: (tableId, data) =>
        set((state) => ({
            data: { ...state.data, [tableId]: data },
        })),

    updateFilters: (tableId, filters) =>
        set((state) => ({
            filters: { ...state.filters, [tableId]: filters },
        })),

    updateSorting: (tableId, sorting) =>
        set((state) => ({
            sorting: { ...state.sorting, [tableId]: sorting },
        })),

    updatePagination: (tableId, page, pageSize) =>
        set((state) => ({
            pagination: {
                ...state.pagination,
                [tableId]: { page, pageSize },
            },
        })),

    updateSelection: (tableId, selection) =>
        set((state) => ({
            selection: { ...state.selection, [tableId]: selection },
        })),

    setLoading: (loading) => set({ loading }),

    clearTable: (tableId) =>
        set((state) => {
            const newState = { ...state };
            delete newState.data[tableId];
            delete newState.filters[tableId];
            delete newState.sorting[tableId];
            delete newState.pagination[tableId];
            delete newState.selection[tableId];
            return newState;
        }),
}));
