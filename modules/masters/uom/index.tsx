'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, ArrowLeftRight } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import UomForm from './form';
import UomConversionForm from './conversion-form';
import {
    useGetUoms,
    useGetUomConversions,
    useRemoveUom,
    uomLabel,
    UomDetails,
    UomConversionDetails,
    UomFilterProps,
    UomConversionFilterProps,
} from '@/api-queries/masters/uom';

const UomMasterList = () => {
    const [selectedItem, setSelectedItem] = useState<UomDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<UomDetails | null>(null);
    const [conversionOpen, setConversionOpen] = useState(false);

    const initialFilters: UomFilterProps = { search: '' };
    const initialConversionFilters: UomConversionFilterProps = {};

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<UomFilterProps>(initialFilters);

    const {
        filters: conversionFilters,
        setFilters: setConversionFilters,
        handleFilters: handleConversionFilters,
        clearFilters: clearConversionFilters,
        appliedFilters: appliedConversionFilters,
        showClearButton: showConversionClearButton,
        pagination: conversionPagination,
        setPagination: setConversionPagination,
    } = useTableFilters<UomConversionFilterProps>(initialConversionFilters);

    const query = useGetUoms({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
    });

    const conversionQuery = useGetUomConversions({
        limit: conversionPagination.pageSize,
        offset: conversionPagination.pageIndex * conversionPagination.pageSize,
    });

    const { data: uoms, isLoading } = query;
    const { data: conversions } = conversionQuery;
    const totalRowCount = query?.data?.data?.count || 0;
    const conversionRowCount = conversionQuery?.data?.data?.count || 0;

    const uomNameFor = (uomId: string, joined?: { name?: string } | null) =>
        joined?.name || uoms?.data?.rows?.find((uom) => uom.id === uomId)?.name || '—';

    const columns: ColumnDef<UomDetails>[] = [
  {
    accessorKey: 'code',
    header: () => 'Code',
    cell: ({ row }) => row.getValue('code') || '—',
  },
  {
    accessorKey: 'name',
    header: () => 'UOM Name',
    cell: ({ row }) => row.getValue('name') || '—',
  },
  {
    id: 'category',
    header: () => 'Category',
    cell: ({ row }) => row.original.category?.name || '—',
  },
  {
    accessorKey: 'dimensionType',
    header: () => 'Dimension',
    cell: ({ row }) => row.getValue('dimensionType') || '—',
  },
  {
    accessorKey: 'isMain',
    header: () => 'Is Main',
    cell: ({ row }) => (row.getValue('isMain') ? 'Yes' : 'No'),
  },
  {
    accessorKey: 'rounding',
    header: () => 'Rounding',
    cell: ({ row }) => Number(row.getValue('rounding') ?? 0),
  },
  {
    accessorKey: 'status',
    header: () => 'Status',
    cell: ({ row }) => (
      <span
        className={
          row.getValue('status') === 'ACTIVE'
            ? 'text-green-600 font-medium'
            : 'text-muted-foreground'
        }
      >
        {row.getValue('status')}
      </span>
    ),
  },
  {
    id: 'actions',
    header: () => 'Actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEditData(row.original)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
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

    const conversionColumns: ColumnDef<UomConversionDetails>[] = [
        {
            id: 'mainUom',
            header: () => <div>Main UOM</div>,
            cell: ({ row }) => (
                <div className="font-medium">
                    {uomNameFor(row.original.mainUomId, row.original.mainUom as { name?: string } | null)}
                </div>
            ),
        },
        {
            id: 'childUom',
            header: () => <div>Child UOM</div>,
            cell: ({ row }) => (
                <div>{uomNameFor(row.original.childUomId, row.original.childUom as { name?: string } | null)}</div>
            ),
        },
        {
            accessorKey: 'conversionFactor',
            header: (data) => <TableHeaderToggle {...data}>Conversion Factor</TableHeaderToggle>,
            cell: ({ row }) => <div className="tabular-nums">{Number(row.getValue('conversionFactor') || 0)}</div>,
        },
    ];

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onEditData = (data: UomDetails) => {
        setEditData(data);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setOpen(false);
    };

    const handleApplyFilters = () => handleFilters(filters);
    const handleApplyConversionFilters = () => handleConversionFilters(conversionFilters);

    const { mutate: deleteUom } = useRemoveUom();

    const handleDelete = () => {
        if (selectedItem?.id) {
            deleteUom(selectedItem.id, {
                onSuccess: (res) => {
                    if (res?.success) {
                        setSelectedItem(null);
                        toast.success('UOM deleted successfully');
                    }
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
                <div className="text-lg font-bold">Units of Measure</div>

                <DataTable
                    query={query}
                    data={uoms?.data?.rows || []}
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
                                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <Button onClick={onAddData} className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Add UOM
                        </Button>
                    </div>
                </DataTable>

                <div className="flex items-center gap-2 pt-4 text-sm font-semibold">
                    <ArrowLeftRight className="h-4 w-4" /> UOM Conversions
                </div>

                <DataTable
                    query={conversionQuery}
                    data={conversions?.data?.rows || []}
                    columns={conversionColumns}
                    pagination={conversionPagination}
                    setPagination={setConversionPagination}
                    totalRowCount={conversionRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2" />

                        <Button
                            onClick={() => setConversionOpen(true)}
                            className="flex items-center gap-2"
                            disabled={(uoms?.data?.rows?.length || 0) < 2}
                        >
                            <Plus className="h-4 w-4" />
                            Add Conversion
                        </Button>
                    </div>
                </DataTable>

                {(uoms?.data?.rows?.length || 0) < 2 && (
                    <p className="text-muted-foreground text-xs">
                        A conversion needs two UOMs. Create at least two before adding one.
                    </p>
                )}

                <UomForm open={open} onClose={onClose} editData={editData} />
                <UomConversionForm open={conversionOpen} onClose={() => setConversionOpen(false)} />

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

export default UomMasterList;
