'use client';

import { useState, type ComponentType } from 'react';
import { type ColumnDef, type PaginationState, type UseQueryResult } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import ExportSheets from '@/components/export-sheets';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { InvoiceCheckingFilter } from '@/api-queries/invoice-checking';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useDebtorList } from '@/api-queries/debtor';

export interface InvoiceCheckingColumn {
    key: string;
    header: string;
    render?: (row: Record<string, unknown>) => React.ReactNode;
}

export interface InvoiceCheckingDateFilter extends InvoiceCheckingFilter {
    fromDate?: string;
    toDate?: string;
}

interface InvoiceCheckingReportProps {
    title: string;
    useReport: (props: InvoiceCheckingDateFilter) => UseQueryResult<any, unknown>;
    getReport: (params: InvoiceCheckingFilter) => void;
    columns: InvoiceCheckingColumn[];
    discrepancyTypes?: readonly string[];
    defaultDiscrepancyType?: string;
    rowsKey?: string;
    countKey?: string;
    renderSummary?: (data: Record<string, unknown>) => React.ReactNode;
}

const InvoiceCheckingReport = ({
    title,
    useReport,
    getReport,
    columns,
    discrepancyTypes,
    defaultDiscrepancyType,
    rowsKey = 'rows',
    countKey = 'count',
    renderSummary,
}: InvoiceCheckingReportProps) => {
    const initialFilters: InvoiceCheckingDateFilter = {
        search: '',
        fromDate: '',
        toDate: '',
        companyDebtorId: '',
        warehouseId: '',
        ...(defaultDiscrepancyType ? { discrepancyType: defaultDiscrepancyType } : {}),
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<InvoiceCheckingDateFilter>(initialFilters);

    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const warehouses = Array.isArray(warehousesRes?.data?.data)
        ? (warehousesRes.data.data as { id: string; name?: string; warehouse?: string; description?: string }[])
        : ((((warehousesRes?.data?.data as unknown as
              | { rows?: { id: string; name?: string; warehouse?: string; description?: string }[] }
              | undefined)?.rows ||
              []) as { id: string; name?: string; warehouse?: string; description?: string }[]));
    const debtors = useDebtorList({ limit: 1000, offset: 0 })?.data?.data?.rows || [];

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const query = useReport({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
        ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        ...(appliedFilters?.discrepancyType ? { discrepancyType: appliedFilters?.discrepancyType } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
        ...(appliedFilters?.warehouseId ? { warehouseId: appliedFilters?.warehouseId } : {}),
    });

    const reportData = (query?.data?.data || {}) as Record<string, unknown>;
    const rows = (reportData?.[rowsKey] || []) as Record<string, unknown>[];
    const totalRowCount = (reportData?.[countKey] as number | undefined) ?? rows.length;

    const colDefs: ColumnDef<Record<string, unknown>>[] = columns.map((col) => ({
        accessorKey: col.key,
        header: col.header,
        cell: ({ row }) => {
            if (col.render) return col.render(row.original);
            const value = row.original[col.key];
            if (value === null || value === undefined) return '—';
            if (typeof value === 'boolean') return value ? 'Yes' : 'No';
            return String(value);
        },
    }));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleFilters(filters);
    };

    function downloadCSV() {
        getReport({
            isCsv: true,
            csvLabel: title,
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
            ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
            ...(appliedFilters?.discrepancyType ? { discrepancyType: appliedFilters?.discrepancyType } : {}),
            ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
            ...(appliedFilters?.warehouseId ? { warehouseId: appliedFilters?.warehouseId } : {}),
        });
    }

    return (
        <PageLoader isLoading={query?.isLoading}>
            <div className="space-y-2 p-3">
                {renderSummary?.(reportData)}
                <DataTable
                    query={query}
                    data={rows}
                    columns={colDefs}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between gap-2 overflow-x-auto">
                        <div className="flex items-center gap-2">
                        {discrepancyTypes?.length && (
                            <Select
                                value={appliedFilters?.discrepancyType || filters.discrepancyType || ''}
                                onValueChange={(value) => handleFilters({ ...filters, discrepancyType: value })}
                            >
                                <SelectTrigger className="h-8 !w-36 text-xs">
                                    <SelectValue placeholder="Discrepancy type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {discrepancyTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type.replace(/_/g, ' ')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select
                            value={appliedFilters?.warehouseId || filters.warehouseId || 'all'}
                            onValueChange={(value) =>
                                handleFilters({ ...filters, warehouseId: value === 'all' ? '' : value })
                            }
                        >
                            <SelectTrigger className="h-8 !w-36 text-xs">
                                <SelectValue placeholder="Company (Warehouse)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Warehouses</SelectItem>
                                {warehouses.map((warehouse) => (
                                    <SelectItem key={warehouse.id} value={warehouse.id}>
                                        {warehouse.name || warehouse.warehouse || warehouse.description}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={appliedFilters?.companyDebtorId || filters.companyDebtorId || 'all'}
                            onValueChange={(value) =>
                                handleFilters({ ...filters, companyDebtorId: value === 'all' ? '' : value })
                            }
                        >
                            <SelectTrigger className="h-8 !w-36 text-xs">
                                <SelectValue placeholder="Debtor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Debtors</SelectItem>
                                {debtors.map((debtor) => (
                                    <SelectItem key={debtor.id} value={debtor.id}>
                                        {debtor.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            placeholder="Search..."
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="!max-w-[220px]"
                        />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                className="h-8 w-28 text-xs"
                                value={filters.fromDate || ''}
                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                                type="date"
                                className="h-8 w-28 text-xs"
                                value={filters.toDate || ''}
                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                            />
                        </div>
                        </div>
                        <ExportSheets downloadCSV={downloadCSV} title={title} size="sm" />
                        </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default InvoiceCheckingReport;
