import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Plus, User, Code, ArrowLeft, Box, QrCode, ClipboardList } from 'lucide-react';
import StockInventoryForm from './stock-inventory-form';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import {
    StockInventoryDetails,
    useGetStockInventoryByStockId,
    useRemoveStockInventory,
    FilterProps,
    useGetStockInventories,
    getStockInventories,
    getStockInventoryByStockId,
    exportMarkup,
} from '@/api-queries/company/stock-inventories';
import { useRouter } from 'next/router';
import SelectPopover from '@/components/select-popover';
import ImportModule from '@/components/import-sheets/import-module';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ExportSheets from '@/components/export-sheets';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StockInventoriesProps {
    stockId?: string;
}

const StockInventories = ({ stockId }: StockInventoriesProps) => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const router = useRouter();

    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

    const [activeTab, setActiveTab] = useState<'store' | 'warehouse'>('store');

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        search: '',
        companyDebtorId: '',
        warehouseId: '',
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = stockId
        ? useGetStockInventoryByStockId({
              ...(stockId ? { companyStockDetailId: stockId } : {}),
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
          })
        : useGetStockInventories({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(!isCompanyDebtor && activeTab === 'store' && appliedFilters?.companyDebtorId
                  ? { companyDebtorId: appliedFilters?.companyDebtorId }
                  : {}),
              ...(!isCompanyDebtor && activeTab === 'warehouse' && appliedFilters?.warehouseId
                  ? { warehouseId: appliedFilters?.warehouseId }
                  : {}),
          });

    const { data: stockInventories, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const tableData = useMemo(() => stockInventories?.data?.rows || [], [stockInventories?.data?.rows]);

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    useEffect(() => {
        if (!stockId && !isCompanyDebtor && activeTab === 'store' && debtors?.length && !appliedFilters?.companyDebtorId) {
            setFilters((prev) => ({ ...prev, companyDebtorId: debtors[0].id }));
            handleFilters({ ...appliedFilters, companyDebtorId: debtors[0].id });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debtors, activeTab, stockId, isCompanyDebtor]);

    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawWarehouses: unknown = warehousesRes?.data?.data;
    const warehouses = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : (rawWarehouses as { rows?: WarehouseDetails[] } | undefined)?.rows || [];

    useEffect(() => {
        if (!stockId && !isCompanyDebtor && activeTab === 'warehouse' && warehouses?.length && !appliedFilters?.warehouseId) {
            setFilters((prev) => ({ ...prev, warehouseId: warehouses[0].id }));
            handleFilters({ ...appliedFilters, warehouseId: warehouses[0].id });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouses, activeTab, stockId, isCompanyDebtor]);

    const columns: ColumnDef<StockInventoryDetails>[] = [
        ...(stockId
            ? []
            : [
                  {
                      accessorKey: 'CompanyStockDetail.description',
                      header: 'Stock Details',
                      cell: ({ row }: { row: { original: StockInventoryDetails } }) => {
                          const name = row?.original?.CompanyStockDetail?.description || 'N/A';
                          const itemCode = row?.original?.CompanyStockDetail?.itemCode || 'N/A';
                          return (
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                      <Box className="!h-4 !w-4" />
                                      {name || 'N/A'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <QrCode className="!h-4 !w-4" /> {itemCode || 'N/A'}
                                  </div>
                              </div>
                          );
                      },
                  },
              ]),
        ...(!isCompanyDebtor && activeTab === 'store' && !stockId
            ? [
                  {
                      accessorKey: 'companyDebtor.name',
                      header: 'Store Details',
                      cell: ({ row }: { row: { original: StockInventoryDetails } }) => {
                          const name = row?.original?.companyDebtor?.name || 'N/A';
                          const accountNumber = row?.original?.companyDebtor?.accountNumber || 'N/A';
                          return (
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                      <User className="!h-4 !w-4" />
                                      {name || 'N/A'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Code className="!h-4 !w-4" /> {accountNumber || 'N/A'}
                                  </div>
                              </div>
                          );
                      },
                  },
              ]
            : []),
        ...(!isCompanyDebtor && (stockId || activeTab === 'warehouse')
            ? [
                  {
                      accessorKey: 'warehouse',
                      header: 'Warehouse Details',
                      cell: ({ row }: { row: { original: StockInventoryDetails } }) => {
                          const wh = row?.original?.warehouse;
                          const name = wh?.warehouse || wh?.name || wh?.description || 'N/A';
                          const groupCode = wh?.groupCode || 'N/A';
                          return (
                              <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                      <User className="!h-4 !w-4" />
                                      {name || 'N/A'}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Code className="!h-4 !w-4" /> {groupCode || 'N/A'}
                                  </div>
                              </div>
                          );
                      },
                  },
              ]
            : []),
        {
            accessorKey: 'location',
            header: 'Location',
            cell: ({ row }) => <div>{row.getValue('location') || 'N/A'}</div>,
        },
        {
            accessorKey: 'batchNumber',
            header: 'Batch Number',
            cell: ({ row }) => <div>{row.getValue('batchNumber')}</div>,
        },
        {
            accessorKey: 'expiryDate',
            header: 'Expiry Date',
            cell: ({ row }) => {
                const expiry = row?.original?.expiryDate;
                return <div>{expiry ? moment(expiry).format('DD MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'stockCounts',
            header: 'Stock Counts',
            cell: ({ row }) => {
                const onHandStock = row?.original?.stockOnHand || 0;
                const availableStock = row?.original?.availableStock || 0;
                const reservedStock = row?.original?.reservedStock || 0;

                return (
                    <div className="space-y-1">
                        <div
                            className={`flex items-center gap-2 font-semibold ${onHandStock <= 5 ? 'text-red-600' : 'text-green-700'}`}
                        >
                            On Hand : {onHandStock}
                        </div>

                        <div
                            className={`flex items-center gap-2 font-semibold ${reservedStock <= 5 ? 'text-red-600' : 'text-green-700'}`}
                        >
                            Reserved : {reservedStock}
                        </div>

                        <div
                            className={`flex items-center gap-2 font-semibold ${availableStock <= 5 ? 'text-red-600' : 'text-green-700'}`}
                        >
                            Available : {availableStock}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'physicalCounts',
            header: 'Physical Counts',
            cell: ({ row }) => {
                const lastPhysicalCount = row?.original?.lastPhysicalCount || 0;
                const lastVariance = row?.original?.lastVariance || 0;
                const lastPhysicalCountDate = row?.original?.lastPhysicalCountDate || 0;

                return (
                    <div className="space-y-1">
                        <div className={`flex items-center gap-2 font-semibold`}>
                            Physical Count : {lastPhysicalCount}
                        </div>
                        <div className={`flex items-center gap-2 font-semibold`}>Variance : {lastVariance}</div>
                        <div className={`flex items-center gap-2 font-semibold`}>
                            Last Count Date :{' '}
                            {lastPhysicalCountDate ? moment(lastPhysicalCountDate).format('DD MMM, YY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'levels',
            header: 'Levels',
            cell: ({ row }) => {
                const minLevel = row?.original?.minimumStockLevel || 'N/A';
                const maxLevel = row?.original?.maximumStockLevel || 'N/A';
                const orderLevel = row?.original?.orderLevel || 'N/A';

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">Min : {minLevel}</div>
                        <div className="flex items-center gap-2">Max : {maxLevel}</div>
                        <div className="flex items-center gap-2">Order : {orderLevel}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'orders',
            header: 'Orders',
            cell: ({ row }) => {
                const unitCost = row?.original?.unitCost || 'N/A';
                const totalValue = row?.original?.totalValue || 0;
                const orderQuantity = row?.original?.orderQuantity || 0;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold">Unit Cost : {unitCost}</div>
                        <div className="flex items-center gap-2 font-semibold">
                            Total Value : {currencySymbol} {totalValue}
                        </div>
                        <div className="flex items-center gap-2 font-semibold">Order Quantity : {orderQuantity}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'lastRestockDate',
            header: 'Last Restock / Sale',
            cell: ({ row }) => {
                const lastRestockDate = row.original.lastRestockDate;
                const lastSaleDate = row.original.lastSaleDate;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            Last Restock : {lastRestockDate ? moment(lastRestockDate).format('DD MMM, YY') : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            Last Sale : {lastSaleDate ? moment(lastSaleDate).format('DD MMM, YY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        ...(isCompanyDebtor
            ? []
            : [
                  {
                      id: 'actions',
                      header: ({}) => <div className="text-center">Actions</div>,
                      cell: ({ row }: { row: { original: StockInventoryDetails } }) => (
                          <div className="flex items-center justify-center gap-1">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Inventory Logs"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/stocks/inventory/logs/${row.original.id}`);
                                  }}
                                  className="h-8 w-8 p-0"
                              >
                                  <ClipboardList className="h-4 w-4" />
                              </Button>

                              <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                      if (
                                          hasPermission(
                                              userGroupPermissions,
                                              SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                              [SYSTEM_PERMISSIONS.UPDATE],
                                          )
                                      ) {
                                          e.stopPropagation();
                                          onEditData(row.original);
                                      } else {
                                          setIsPermissionDeniedOpen(true);
                                          return;
                                      }
                                  }}
                                  className="h-8 w-8 p-0"
                              >
                                  <Edit className="h-4 w-4" />
                              </Button>

                              {/* <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                      if (
                                          hasPermission(
                                              userGroupPermissions,
                                              SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                              [SYSTEM_PERMISSIONS.DELETE],
                                          )
                                      ) {
                                          e.preventDefault();
                                          setSelectedItem(row.original);
                                          setIsDeleteOpen(true);
                                      } else {
                                          setIsPermissionDeniedOpen(true);
                                          return;
                                      }
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                  <Trash2 className="h-4 w-4" />
                              </Button> */}
                          </div>
                      ),
                  },
              ]),
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<StockInventoryDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onEditData = (data: StockInventoryDetails) => {
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

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };
    const { mutate: removeStockInventorys } = useRemoveStockInventory();

    // const handleDelete = () => {
    //     if (selectedItem?.id)
    //         removeStockInventorys(selectedItem?.id, {
    //             onSuccess: () => {
    //                 setSelectedItem(null);
    //                 toast.success('Stock inventory deleted successfully');
    //             },
    //             onError: (error) => {
    //                 // @ts-ignore
    //                 toast.error(error?.response.data.message || 'Internal Server Error!');
    //             },
    //         });
    // };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    // Export

    async function downloadCSV() {
        const csvObject = {
            isCsv: true,
            csvLabel: 'Company_Stock_Inventory',
        };
        stockId
            ? getStockInventoryByStockId({
                  ...csvObject,
                  ...(stockId ? { companyStockDetailId: stockId } : {}),
                  ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              })
            : getStockInventories({
                  ...csvObject,
                  ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
                  ...(activeTab === 'store' && appliedFilters?.companyDebtorId
                      ? { companyDebtorId: appliedFilters?.companyDebtorId }
                      : {}),
                  ...(activeTab === 'warehouse' && appliedFilters?.warehouseId
                      ? { warehouseId: appliedFilters?.warehouseId }
                      : {}),
              });
    }

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    const selectedWarehouse = warehouses?.find((data) => data?.id === appliedFilters?.warehouseId);

    const contextLabel =
        activeTab === 'warehouse'
            ? selectedWarehouse
                ? ` for ${selectedWarehouse?.warehouse || selectedWarehouse?.name}`
                : ''
            : selectedDebtor
              ? ` for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})`
              : '';

    async function exportMarkupCSV() {
        const csvObject = {
            csvLabel: 'Markup',
        };

        exportMarkup({
            ...csvObject,
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                {stockInventories ? (
                    <DataTable
                        query={query}
                        data={tableData || []}
                        columns={columns}
                        totalRowCount={totalRowCount}
                        pagination={pagination}
                        setPagination={setPagination}
                    >
                        <div className="text-lg font-bold">
                            Stock Inventory {contextLabel}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                {!stockId && !isCompanyDebtor ? (
                                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'store' | 'warehouse')}>
                                        <TabsList>
                                            <TabsTrigger value="store">Store</TabsTrigger>
                                            <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                ) : null}
                                <Input
                                    placeholder="Search inventory by stock name..."
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="!max-w-sm"
                                />
                                {stockId || isCompanyDebtor ? null : activeTab === 'store' ? (
                                    <SelectPopover
                                        title="debtor (store)"
                                        selectedValue={filters.companyDebtorId}
                                        options={
                                            debtors
                                                ? debtors?.map((debtor) => ({
                                                      value: debtor?.id,
                                                      label: `${debtor?.name} (${debtor?.accountNumber})`,
                                                  }))
                                                : []
                                        }
                                        onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                                    />
                                ) : (
                                    <SelectPopover
                                        title="warehouse"
                                        selectedValue={filters.warehouseId}
                                        options={
                                            warehouses
                                                ? warehouses.map((wh) => ({
                                                      value: wh?.id,
                                                      label: `${wh?.warehouse || wh?.name} (${wh?.groupCode})`,
                                                  }))
                                                : []
                                        }
                                        onSelect={(val) => setFilters({ ...filters, warehouseId: val })}
                                    />
                                )}

                                <FilterActionButtons
                                    onApplyFilters={handleApplyFilters}
                                    onClearClick={handleClearSearch}
                                    showClearButton={showClearButton}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                {stockId ? (
                                    <Button
                                        variant="secondary"
                                        onClick={() => router.push('/stocks')}
                                        className="flex items-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" /> Back
                                    </Button>
                                ) : null}

                                <ExportSheets downloadCSV={downloadCSV} />

                                {isCompanyDebtor ? null : (
                                    <>
                                        <ExportSheets downloadCSV={exportMarkupCSV} title="Markup" />

                                        <ImportModule
                                            module="Company_Stock_Inventory"
                                            route="companyStockInventory"
                                            noLabel
                                            hasPermission={hasPermission(
                                                userGroupPermissions,
                                                SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                                [SYSTEM_PERMISSIONS.CREATE],
                                            )}
                                        />

                                        <ImportModule
                                            module="Markup"
                                            route="markup"
                                            hasPermission={hasPermission(
                                                userGroupPermissions,
                                                SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                                [SYSTEM_PERMISSIONS.CREATE],
                                            )}
                                            customRoute="/simple-pricing/import"
                                            fileFieldName="file"
                                        />

                                        <ImportModule
                                            module="Stores_Stock_Quantity"
                                            route="companyStoreStockQuantity"
                                            hasPermission={hasPermission(
                                                userGroupPermissions,
                                                SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                                [SYSTEM_PERMISSIONS.CREATE],
                                            )}
                                            fileFieldName="file"
                                        />

                                        <Button
                                            onClick={() => {
                                                if (
                                                    hasPermission(
                                                        userGroupPermissions,
                                                        SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                                        [SYSTEM_PERMISSIONS.CREATE],
                                                    )
                                                ) {
                                                    onAddData();
                                                } else {
                                                    setIsPermissionDeniedOpen(true);
                                                    return;
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Inventory
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </DataTable>
                ) : null}
            </div>

            {open && (
                <StockInventoryForm
                    open={open}
                    onClose={onClose}
                    editData={editData}
                    companyStockDetailId={stockId || ''}
                    tab={!stockId ? activeTab : undefined}
                    presetDebtorId={activeTab === 'store' && appliedFilters?.companyDebtorId ? appliedFilters.companyDebtorId : ''}
                    key={editData?.id || null}
                />
            )}

            {/* {isDeleteOpen && (
                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete this stock inventory`}
                    onConfirm={handleDelete}
                />
            )} */}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the inventories." }}
            />
        </PageLoader>
    );
};

export default StockInventories;
