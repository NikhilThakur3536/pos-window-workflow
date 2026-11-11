import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import CompanyTaxRateForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetCompanyTaxRates,
  CompanyTaxRateDetails,
  useDeleteCompanyTaxRate,
} from '@/api-queries/company-tax-rate-master'; 

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const CompanyTaxRateList = () => {
  const userGroupPermissions = useUsersPermissions();
  const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyTaxRateDetails | null>(null);
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
  } = useTableFilters<any>(initialFilters);

  const query = useGetCompanyTaxRates({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
  });

  const { data: taxRates, isLoading } = query;
  const totalRowCount = query?.data?.data?.count || 0;

  const columns: ColumnDef<CompanyTaxRateDetails>[] = [
    {
      accessorKey: 'name',
      header: (data) => <TableHeaderToggle {...data}>Tax Name</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'type',
      header: (data) => <TableHeaderToggle {...data}>Type</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('type')}</div>,
    },
    {
      accessorKey: 'taxRatePercent',
      header: (data) => <TableHeaderToggle {...data}>Tax Rate %</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('taxRatePercent')}%</div>,
    },
    {
      accessorKey: 'default',
      header: (data) => <TableHeaderToggle {...data}>Default</TableHeaderToggle>,
      cell: ({ row }) => (
        <div className={row.getValue('default') ? 'text-green-600' : 'text-gray-500'}>
          {row.getValue('default') ? 'Yes' : 'No'}
        </div>
      ),
    },
    {
      accessorKey: 'taxOnly',
      header: (data) => <TableHeaderToggle {...data}>Tax Only</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('taxOnly') ? 'Yes' : 'No'}</div>,
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
  const [editData, setEditData] = useState<CompanyTaxRateDetails | null>(null);

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyTaxRateDetails) => {
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

  const { mutate: deleteCompanyTaxRate } = useDeleteCompanyTaxRate();

  const handleDelete = () => {
    if (selectedItem?.id) {
      deleteCompanyTaxRate(selectedItem.id, {
        onSuccess: () => {
          setSelectedItem(null);
          toast.success('Tax Rate deleted successfully');
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
          data={taxRates?.data?.rows || []}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Search by tax name or type..."
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
              Add Tax Rate
            </Button>
          </div>
        </DataTable>

        <CompanyTaxRateForm
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

export default CompanyTaxRateList;