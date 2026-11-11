import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import CompanyCountryForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetCompanyCountries,
  useRemoveCompanyCountry,
  CompanyCountry,
} from '@/api-queries/company-location';

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const CompanyCountryList = () => {
  const userGroupPermissions = useUsersPermissions();
  const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyCountry | null>(null);
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

  const query = useGetCompanyCountries();

  const { data: countriesData, isLoading, refetch } = query;
  const allCountries: CompanyCountry[] = countriesData?.data?.rows || [];

  const filteredCountries = useMemo(() => {
    const search = appliedFilters?.search?.trim().toLowerCase();
    if (!search) return allCountries;

    return allCountries.filter(
      (country) =>
        country.name?.toLowerCase().includes(search) ||
        country.code?.toLowerCase().includes(search)
    );
  }, [allCountries, appliedFilters?.search]);

  const totalRowCount = filteredCountries.length;

  const paginatedCountries = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredCountries.slice(start, start + pagination.pageSize);
  }, [filteredCountries, pagination]);

  const columns: ColumnDef<CompanyCountry>[] = [
    {
      accessorKey: 'code',
      header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
    },
    {
      accessorKey: 'name',
      header: (data) => <TableHeaderToggle {...data}>Country Name</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
    },
    {
      accessorKey: 'timezone',
      header: (data) => <TableHeaderToggle {...data}>Timezone</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('timezone')}</div>,
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
  const [editData, setEditData] = useState<CompanyCountry | null>(null);

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyCountry) => {
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

  const removeCountry = useRemoveCompanyCountry();

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await removeCountry.mutateAsync(selectedItem.id);
      toast.success('Country deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete country');
    }

    setSelectedItem(null);
    setIsDeleteOpen(false);
  };

  return (
    <PageLoader isLoading={isLoading}>
      <div className="space-y-2 p-4">
        <DataTable
          query={query}
          data={paginatedCountries}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Search by country name or code..."
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
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Country
            </Button>
          </div>
        </DataTable>

        <CompanyCountryForm
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

export default CompanyCountryList;