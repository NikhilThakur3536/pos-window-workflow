'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import SalesRepresentativeForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetSalesRepresentativeList,
  SalesRepresentativeItem,
  useDeleteSalesRepresentative,
} from '@/api-queries/sales-rep';

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';

const EMPTY_ROWS: SalesRepresentativeItem[] = [];

const initialFilters = { search: '' };

const SalesRepresentativeList = () => {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<SalesRepresentativeItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<SalesRepresentativeItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    filters,
    setFilters,
    handleFilters,
    clearFilters,
    appliedFilters,
    showClearButton,
    pagination,
    setPagination,
  } = useTableFilters(initialFilters);

  // Memoize query parameters
  const queryParams = useMemo(() => ({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    search: appliedFilters?.search || undefined,
  }), [pagination.pageSize, pagination.pageIndex, appliedFilters?.search]);

  const query = useGetSalesRepresentativeList(queryParams);

  const { data: repsData, isLoading } = query;
  const totalRowCount = repsData?.data?.count || 0;

  const rows = useMemo(() => repsData?.data ?? EMPTY_ROWS, [repsData]);

  const { mutate: deleteRep } = useDeleteSalesRepresentative();

  const onAddData = useCallback(() => {
    setEditData(null);
    setOpen(true);
  }, []);

  const onEditData = useCallback((data: SalesRepresentativeItem) => {
    setEditData(data);
    setOpen(true);
  }, []);

  const onClose = useCallback(() => {
    setEditData(null);
    setOpen(false);
  }, []);

  const handleClearSearch = useCallback(() => clearFilters(), [clearFilters]);

  const handleApplyFilters = useCallback(() => {
    handleFilters(filters);
  }, [handleFilters, filters]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApplyFilters();
  }, [handleApplyFilters]);

  const handleDelete = useCallback(() => {
    if (selectedItem?.id) {
      deleteRep(selectedItem.id, {
        onSuccess: () => {
          setSelectedItem(null);
          toast.success('Sales Representative deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
      });
    }
  }, [selectedItem?.id, deleteRep]);

  // Stable columns
  const columns: ColumnDef<SalesRepresentativeItem>[] = useMemo(() => [
    {
      accessorKey: 'repNumber',
      header: (data) => <TableHeaderToggle {...data}>Rep Number</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('repNumber')}</div>,
    },
    {
      accessorKey: 'name',
      header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'email',
      header: (data) => <TableHeaderToggle {...data}>Email</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('email')}</div>,
    },
    {
      accessorKey: 'cellNumber',
      header: (data) => <TableHeaderToggle {...data}>Cell Number</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('cellNumber')}</div>,
    },
    {
      accessorKey: 'isSalesManager',
      header: (data) => <TableHeaderToggle {...data}>Sales Manager</TableHeaderToggle>,
      cell: ({ row }) => (
        <div>{row.getValue('isSalesManager') ? 'Yes' : 'No'}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
      cell: ({ row }) => (
        <div className={`capitalize ${row.getValue('status') === 'active' ? 'text-green-600' : 'text-red-600'}`}>
          {row.getValue('status')}
        </div>
      ),
    },
    {
      accessorKey: 'comPercent',
      header: (data) => <TableHeaderToggle {...data}>Commission %</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('comPercent')}%</div>,
    },
    {
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEditData(row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedItem(row.original);
              setIsDeleteOpen(true);
            }}
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ], [onEditData]);

  // Memoize the entire toolbar to prevent re-creation on every render
  const tableToolbar = useMemo(() => (
    <div className="mt-2 flex items-center justify-between">
      <div className="flex w-full items-center gap-2">
        <Input
          placeholder="Search by name, email or rep number..."
          value={filters.search || ''}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={handleKeyDown}
          className="!max-w-sm"
        />
        <FilterActionButtons
          onApplyFilters={handleApplyFilters}
          onClearClick={handleClearSearch}
          showClearButton={showClearButton}
        />
      </div>

      <Button
        onClick={onAddData}
        type="button"
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Representative
      </Button>
    </div>
  ), [filters, setFilters, handleKeyDown, handleApplyFilters, handleClearSearch, showClearButton, onAddData]);

  return (
    <PageLoader isLoading={isLoading}>
      <div className="space-y-2 p-4">
        <DataTable
          query={query}
          data={rows}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          {tableToolbar}
        </DataTable>

        <SalesRepresentativeForm
          open={open}
          onClose={onClose}
          editData={editData}
        />

        <DeleteConfirmation
          open={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title={`Are you sure you want to delete ${selectedItem?.name}?`}
          onConfirm={handleDelete}
        />
      </div>
    </PageLoader>
  );
};

export default SalesRepresentativeList;