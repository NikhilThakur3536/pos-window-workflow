import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import CharacterSetMasterForm from './form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
  useGetCharacterSetMasters,
  CharacterSetMasterDetails,
  useDeleteCharacterSetMaster,
  CharacterSetMasterFilterProps,
} from '@/api-queries/character-master'; // Adjust import path

import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';

const CharacterSetMasterList = () => {
  const userGroupPermissions = useUsersPermissions();
  const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CharacterSetMasterDetails | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const initialFilters = {
    search: '',
  };

  const {
    filters,
    setFilters,
    handleFilters,
    clearFilters,
    appliedFilters,
    showClearButton,
    pagination,
    setPagination,
  } = useTableFilters<CharacterSetMasterFilterProps>(initialFilters);

  const query = useGetCharacterSetMasters({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
    ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
  });

  const { data: characterSetMasters, isLoading } = query;
  const totalRowCount = query?.data?.data?.count || 0;

  const columns: ColumnDef<CharacterSetMasterDetails>[] = [
    {
      accessorKey: 'code',
      header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle>,
      cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
    },
    {
      accessorKey: 'name',
      header: (data) => <TableHeaderToggle {...data}>Name</TableHeaderToggle>,
      cell: ({ row }) => <div>{row.getValue('name')}</div>,
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
      header: ({ column }) => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              if (
                hasPermission(
                  userGroupPermissions,
                  SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS?.code || 'character-set-master',
                  [SYSTEM_PERMISSIONS.UPDATE],
                )
              ) {
                e.stopPropagation();
                onEditData(row.original);
              } else {
                setIsPermissionDeniedOpen(true);
              }
            }}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              if (
                hasPermission(
                  userGroupPermissions,
                  SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS?.code || 'character-set-master',
                  [SYSTEM_PERMISSIONS.DELETE],
                )
              ) {
                e.preventDefault();
                setSelectedItem(row.original);
                setIsDeleteOpen(true);
              } else {
                setIsPermissionDeniedOpen(true);
              }
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
  const [editData, setEditData] = useState<CharacterSetMasterDetails | null>(null);

  const onAddData = () => {
    setEditData(null);
    setSelectedItem(null);
    setOpen(true);
  };

  const onEditData = (data: CharacterSetMasterDetails) => {
    setEditData(data);
    setSelectedItem(null);
    setOpen(true);
  };

  const onClose = () => {
    setEditData(null);
    setSelectedItem(null);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApplyFilters();
  };

  const handleClearSearch = () => {
    clearFilters();
  };

  const handleApplyFilters = () => {
    handleFilters(filters);
  };

  const { mutate: deleteCharacterSetMaster } = useDeleteCharacterSetMaster();

  const handleDelete = () => {
    if (selectedItem?.id) {
      deleteCharacterSetMaster(selectedItem.id, {
        onSuccess: () => {
          setSelectedItem(null);
          toast.success('Character Set Master deleted successfully');
        },
        onError: (error: any) => {
          toast.error(error?.response?.data?.message || 'Internal Server Error!');
        },
      });
    }
  };

  const onClosePermissionDenied = () => {
    setIsPermissionDeniedOpen(false);
  };

  return (
    <PageLoader isLoading={isLoading}>
      <div className="space-y-2 p-4">
        <DataTable
          query={query}
          data={characterSetMasters?.data?.rows || []}
          columns={columns}
          pagination={pagination}
          setPagination={setPagination}
          totalRowCount={totalRowCount}
        >
          <div className="mt-2 flex items-center justify-between">
            <div className="flex w-full items-center gap-2">
              <Input
                placeholder="Search by name or code..."
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
              onClick={() => {
                if (
                  hasPermission(
                    userGroupPermissions,
                    SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.TILLS?.code || 'character-set-master',
                    [SYSTEM_PERMISSIONS.CREATE],
                  )
                ) {
                  onAddData();
                } else {
                  setIsPermissionDeniedOpen(true);
                }
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Character Set
            </Button>
          </div>
        </DataTable>

        <CharacterSetMasterForm
          open={open}
          onClose={onClose}
          editData={editData}
          key={editData?.id || 'new'}
        />

        <DeleteConfirmation
          open={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          title={`Are you sure you want to delete ${selectedItem?.name} (${selectedItem?.code})?`}
          onConfirm={handleDelete}
        />
      </div>

      <ViewAccessDeniedDialog
        open={isPermissionDeniedOpen}
        onClose={onClosePermissionDenied}
        options={{ description: "You don't have access to manage character set masters." }}
      />
    </PageLoader>
  );
};

export default CharacterSetMasterList;