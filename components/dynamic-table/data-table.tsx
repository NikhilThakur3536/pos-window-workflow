// import {
//     ColumnDef,
//     getCoreRowModel,
//     getFilteredRowModel,
//     getPaginationRowModel,
//     getSortedRowModel,
//     useReactTable,
//     Row,
// } from '@tanstack/react-table';
// import { TableContent, TablePagination } from '@/components/table';
// import { UseQueryResult, UseSuspenseQueryResult } from '@tanstack/react-query';
// import DataTablePagination from '../list-only-table/data-table-pagination';
// import { DataTableViewOptions } from './table-view-options';
// import { ReactNode, useMemo } from 'react';

// interface DataTableProps<TData, TQuery> {
//     data?: TData[];
//     query: UseQueryResult<TQuery> | UseSuspenseQueryResult<TQuery>;
//     columns: ColumnDef<TData, any>[];
//     onRowClick?: (row: Row<TData>) => void;
//     totalRowCount: number;
//     pagination?: {
//         pageIndex: number;
//         pageSize: number;
//     };
//     setPagination?: React.Dispatch<
//         React.SetStateAction<{
//             pageIndex: number;
//             pageSize: number;
//         }>
//     >;
//     globalFilter?: string;
//     viewColumns?: boolean;
//     children?: ReactNode;
//     rowClassName?: (rowData: TData, row: Row<TData>) => string;
// }

// export function DataTable<TData, TQuery>({
//     query,
//     data = [],
//     columns,
//     onRowClick,
//     pagination,
//     setPagination,
//     totalRowCount,
//     globalFilter = '',
//     viewColumns = true,
//     rowClassName,
//     children,
// }: DataTableProps<TData, TQuery>) {
//     // Memoize the table state to prevent unnecessary re-renders
//     const tableState = useMemo(
//         () => ({
//             pagination,
//             ...(globalFilter ? { globalFilter } : {}),
//         }),
//         [pagination, globalFilter],
//     );

//     // Memoize the pageCount calculation
//     const pageCount = useMemo(() => {
//         return totalRowCount ? Math.ceil(totalRowCount / (pagination?.pageSize || 10)) : -1;
//     }, [totalRowCount, pagination?.pageSize]);

//     // Memoize the table configuration
//     const tableConfig = useMemo(
//         () => ({
//             data,
//             columns,
//             getCoreRowModel: getCoreRowModel(),
//             getSortedRowModel: getSortedRowModel(),
//             getPaginationRowModel: getPaginationRowModel(),
//             getFilteredRowModel: getFilteredRowModel(),
//             onPaginationChange: setPagination,
//             manualPagination: !!totalRowCount,
//             pageCount,
//             state: tableState,
//         }),
//         [data, columns, setPagination, totalRowCount, pageCount, tableState],
//     );

//     const table = useReactTable(tableConfig);

//     // Memoize the pagination condition check
//     const shouldShowPagination = useMemo(() => totalRowCount != null && pagination, [totalRowCount, pagination]);

//     return (
//         <>
//             {children && children}

//             <TableContent
//                 table={table}
//                 query={query}
//                 columns={columns}
//                 onRowClick={onRowClick}
//                 rowClassName={rowClassName}
//             />

//             <div className="flex items-center justify-between pb-4">
//                 <div>{viewColumns && <DataTableViewOptions table={table} />}</div>

//                 {shouldShowPagination && (
//                     <div className="self-end">
//                         <DataTablePagination table={table} />
//                     </div>
//                 )}
//             </div>
//         </>
//     );
// }
import {
    ColumnDef,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    Row,
} from '@tanstack/react-table';
import { TableContent, TablePagination } from '@/components/table';
import { UseQueryResult, UseSuspenseQueryResult } from '@tanstack/react-query';
import DataTablePagination from '../list-only-table/data-table-pagination';
import { DataTableViewOptions } from './table-view-options';
import { ReactNode, useMemo } from 'react';

interface DataTableProps<TData, TQuery> {
    data?: TData[];
    query?: UseQueryResult<TQuery> | UseSuspenseQueryResult<TQuery>;
    columns: ColumnDef<TData, any>[];
    onRowClick?: (row: Row<TData>) => void;
    totalRowCount: number;
    pagination?: {
        pageIndex: number;
        pageSize: number;
    };
    setPagination?: React.Dispatch<
        React.SetStateAction<{
            pageIndex: number;
            pageSize: number;
        }>
    >;
    globalFilter?: string;
    viewColumns?: boolean;
    children?: ReactNode;
    rowClassName?: (rowData: TData, row: Row<TData>) => string;
    tableClassName?: string;
    // Replaces the default "No results." row so a screen can explain why the list is
    // empty (e.g. no stock for the selected pricing type) instead of a generic message.
    emptyMessage?: ReactNode;
    // Optional stable row identity. Without it react-table falls back to the row
    // index, so a row can get a new key when the page/filter changes and its cells
    // remount (which drops focus from any input the user is typing in).
    getRowId?: (row: TData, index: number) => string;
}

// Module-level stable reference. A default parameter value like `data = []`
// evaluates a brand-new array literal on every call where `data` is
// undefined, which then looks like a "changed" dependency to every
// downstream useMemo/useEffect that lists `data`. Using one shared,
// never-changing empty array avoids that entirely.
const EMPTY_DATA: never[] = [];

export function DataTable<TData, TQuery>({
    query,
    data = EMPTY_DATA as unknown as TData[],
    columns,
    onRowClick,
    pagination,
    setPagination,
    totalRowCount,
    globalFilter = '',
    viewColumns = true,
    rowClassName,
    tableClassName,
    children,
    getRowId,
    emptyMessage,
}: DataTableProps<TData, TQuery>) {
    // Memoize the table state to prevent unnecessary re-renders. When the
    // caller does not pass `pagination`/`setPagination` (client-side,
    // non-manual mode) we supply a default PaginationState so the whole
    // in-memory list is shown without pagination controls. Without this,
    // `getPaginationRowModel()` reads an undefined `pagination` and throws
    // "Cannot destructure property 'pageSize' of 'pagination'."
    const tableState = useMemo(
        () => ({
            // Non-manual (client-side) mode: default to a large page size so
            // the whole in-memory list is shown without pagination controls.
            pagination: pagination ?? { pageIndex: 0, pageSize: 10000 },
            ...(globalFilter ? { globalFilter } : {}),
        }),
        [pagination, globalFilter],
    );

    // Memoize the pageCount calculation
    const pageCount = useMemo(() => {
        return totalRowCount ? Math.ceil(totalRowCount / (pagination?.pageSize || 10)) : -1;
    }, [totalRowCount, pagination?.pageSize]);

    // Server-side pagination is always in effect here (the caller always
    // supplies `pagination`/`setPagination` from useTableFilters), so this
    // should not flip to `false` just because the current page has 0 rows
    // (e.g. an empty search result). Flipping modes based on totalRowCount
    // being falsy is what caused react-table to keep re-deriving pagination
    // state and calling onPaginationChange in a loop.
    const manualPagination = !!pagination && !!setPagination;

    // Memoize the table configuration
    const tableConfig = useMemo(
        () => ({
            data,
            columns,
            ...(getRowId ? { getRowId: (original: TData, index: number) => getRowId(original, index) } : {}),
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            onPaginationChange: setPagination,
            manualPagination,
            pageCount,
            state: tableState,
        }),
        [data, columns, getRowId, setPagination, manualPagination, pageCount, tableState],
    );

    const table = useReactTable(tableConfig);

    // Memoize the pagination condition check
    const shouldShowPagination = useMemo(() => totalRowCount != null && pagination, [totalRowCount, pagination]);

    return (
        <>
            {children && children}

            <TableContent
                table={table}
                query={query}
                columns={columns}
                onRowClick={onRowClick}
                rowClassName={rowClassName}
                emptyMessage={emptyMessage}
                tableClassName={tableClassName}
            />

            <div className="flex items-center justify-between pb-4">
                <div>{viewColumns && <DataTableViewOptions table={table} />}</div>

                {shouldShowPagination && (
                    <div className="self-end">
                        <DataTablePagination table={table} />
                    </div>
                )}
            </div>
        </>
    );
}
