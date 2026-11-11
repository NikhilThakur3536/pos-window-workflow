'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import DebtorSourceDocumentForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetDebtorSourceDocumentList,
  DebtorSourceDocumentItem,
  useDeleteDebtorSourceDocument,
} from '@/api-queries/source-document';

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';

const DebtorSourceDocumentList = () => {
  const [selectedItem, setSelectedItem] = useState<DebtorSourceDocumentItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const initialFilters = { search: '' };

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

  const query = useGetDebtorSourceDocumentList({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
  });

  const { data: docsData, isLoading } = query;
  const totalRowCount = docsData?.data?.count || 0;
  console.log('source document',docsData)
  const columns: ColumnDef<DebtorSourceDocumentItem>[] = [
    {
      accessorKey: 'name',
      header: (data) => <TableHeaderToggle {...data}>Document Name</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'description',
      header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
      cell: ({ row }) => <div className="max-w-xs truncate">{row.getValue('description')}</div>,
    },
    {
      accessorKey: 'timezone',
      header: (data) => <TableHeaderToggle {...data}>Timezone</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('timezone')}</div>,
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
      id: 'actions',
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditData(row.original)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
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
  ];

  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<DebtorSourceDocumentItem | null>(null);

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: DebtorSourceDocumentItem) => {
    setEditData(data);
    setOpen(true);
  };

  const onClose = () => {
    setEditData(null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApplyFilters();
  };

  const handleClearSearch = () => clearFilters();
  const handleApplyFilters = () => handleFilters(filters);

  const { mutate: deleteDocument } = useDeleteDebtorSourceDocument();

  const handleDelete = () => {
    if (selectedItem?.id) {
      deleteDocument(selectedItem.id, {
        onSuccess: () => {
          setSelectedItem(null);
          toast.success('Source Document deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
      });
    }
  };

  return (
    <PageLoader isLoading={isLoading}>
      <div className="space-y-2 p-4">
        <DataTable
          query={query}
          data={docsData?.data || []}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Search by name or description..."
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

            <Button onClick={onAddData} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Source Document
            </Button>
          </div>
        </DataTable>

        <DebtorSourceDocumentForm
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

export default DebtorSourceDocumentList;