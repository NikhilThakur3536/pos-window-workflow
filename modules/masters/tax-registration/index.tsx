import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import CompanyTaxRegistrationForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetCompanyTaxRegistrations,
  CompanyTaxRegistrationDetails,
  useDeleteCompanyTaxRegistration,
} from '@/api-queries/company-tax-resgistration';

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const CompanyTaxRegistrationList = () => {
  const userGroupPermissions = useUsersPermissions();
  const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CompanyTaxRegistrationDetails | null>(null);
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

  const query = useGetCompanyTaxRegistrations();

  const { data: registrations, isLoading } = query;
  const totalRowCount = query?.data?.data?.count || 0;

  const columns: ColumnDef<CompanyTaxRegistrationDetails>[] = [
    {
      accessorKey: 'registrationNumber',
      header: (data) => <TableHeaderToggle {...data}>Registration Number</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('registrationNumber')}</div>,
    },
    {
      accessorKey: 'registrationType',
      header: (data) => <TableHeaderToggle {...data}>Registration Type</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('registrationType')}</div>,
    },
    {
      accessorKey: 'countryId',
      header: (data) => <TableHeaderToggle {...data}>Country</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('countryId')}</div>,
    },
    {
      accessorKey: 'isPrimary',
      header: (data) => <TableHeaderToggle {...data}>Primary</TableHeaderToggle>,
      cell: ({ row }) => (
        <div className={row.getValue('isPrimary') ? 'text-green-600 font-medium' : 'text-gray-500'}>
          {row.getValue('isPrimary') ? 'Yes' : 'No'}
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
  const [editData, setEditData] = useState<CompanyTaxRegistrationDetails | null>(null);

  const onAddData = () => {
    setEditData(null);
    setOpen(true);
  };

  const onEditData = (data: CompanyTaxRegistrationDetails) => {
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

  const { mutate: deleteCompanyTaxRegistration } = useDeleteCompanyTaxRegistration();

  const handleDelete = () => {
    if (selectedItem?.id) {
      deleteCompanyTaxRegistration(selectedItem.id, {
        onSuccess: () => {
          setSelectedItem(null);
          toast.success('Tax Registration deleted successfully');
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
          data={registrations?.data?.rows || []}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Search by registration number or type..."
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
              Add Tax Registration
            </Button>
          </div>
        </DataTable>

        <CompanyTaxRegistrationForm
          open={open}
          onClose={onClose}
          editData={editData}
        />

        <DeleteConfirmation
          open={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title={`Are you sure you want to delete registration ${selectedItem?.registrationNumber}?`}
          onConfirm={handleDelete}
        />
      </div>
    </PageLoader>
  );
};

export default CompanyTaxRegistrationList;