import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus } from 'lucide-react';
import QuantityWiseDiscountForm from './quantity-wise-discount-form';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetQuantityWiseDiscounts,
    FilterProps,
    QuantityWiseDiscountDetails,
    useRemoveQuantityWiseDiscount,
    getQuantityWiseDiscounts,
} from '@/api-queries/quantity-wise-discount';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ImportModule from '@/components/import-sheets/import-module';
import ExportSheets from '@/components/export-sheets';

export interface QuantityWiseDiscountsProps {
    isGoodsDiscount?: boolean;
}

const QuantityWiseDiscounts = ({ isGoodsDiscount = false }: QuantityWiseDiscountsProps) => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const permissionModuleType = isGoodsDiscount
        ? SYSTEM_MODULES.PROCESSING.GOODS_DISCOUNT.code
        : SYSTEM_MODULES.POINT_OF_SALE.SALES_DISCOUNT.code;

    const [selectedItem, setSelectedItem] = useState<QuantityWiseDiscountDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters = {
        search: '',
        isGoodsDiscount,
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

    const query = useGetQuantityWiseDiscounts({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        isGoodsDiscount,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: quantityWiseDiscounts, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<QuantityWiseDiscountDetails>[] = [
        isGoodsDiscount
            ? {
                  accessorKey: 'companyCreditor',
                  header: `Creditor Details`,
                  cell: ({ row }) => {
                      const customer = row.original?.CompanyCreditor;
                      return row.original.isApplicableForCashSale ? (
                          <div className="font-bold">Applicable for cash sale</div>
                      ) : (
                          <div>
                              <div>
                                  <span className="font-bold">Name :</span> {customer?.name || 'N/A'}
                              </div>
                              <div>
                                  <span className="font-bold">Account No. :</span> {customer?.accountNumber || 'N/A'}
                              </div>
                              <div>
                                  <span className="font-bold">Contact :</span> {customer?.contact || 'N/A'}
                              </div>
                          </div>
                      );
                  },
              }
            : {
                  accessorKey: 'companyDebtor',
                  header: `Debtor Details`,
                  cell: ({ row }) => {
                      const customer = row.original?.CompanyDebtor;
                      return row.original.isApplicableForCashSale ? (
                          <div className="font-bold">Applicable for cash sale</div>
                      ) : (
                          <div>
                              <div>
                                  <span className="font-bold">Name :</span> {customer?.name || 'N/A'}
                              </div>
                              <div>
                                  <span className="font-bold">Account No. :</span> {customer?.accountNumber || 'N/A'}
                              </div>
                              <div>
                                  <span className="font-bold">Contact :</span> {customer?.contact || 'N/A'}
                              </div>
                          </div>
                      );
                  },
              },
        {
            accessorKey: 'companyStockDetails',
            header: `Stock Details`,
            cell: ({ row }) => {
                const stock = row.original?.CompanyStockDetail;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Name :</span> {stock?.description || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">SKU :</span> {stock?.itemCode || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Tax Rate :</span>{' '}
                            {stock?.subCategory?.taxRate?.taxRatePercent || '0.00'}%
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'discounts',
            header: `Discount Details`,
            cell: ({ row }) => {
                const discounts = row.original?.discounts;
                return (
                    <div>
                        {discounts?.map((discount, index) => (
                            <div key={index} className="mb-2 flex items-center gap-2">
                                <div>
                                    <span className="font-bold">Quantity :</span> {discount.quantity}
                                </div>
                                |
                                <div>
                                    <span className="font-bold">Percent :</span> {discount.discountPercent}%
                                </div>
                            </div>
                        ))}
                    </div>
                );
            },
        },

        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, permissionModuleType, [SYSTEM_PERMISSIONS.UPDATE])
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

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, permissionModuleType, [SYSTEM_PERMISSIONS.DELETE])
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
                    </Button>
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<QuantityWiseDiscountDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: QuantityWiseDiscountDetails) => {
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

    const { mutate: removeDiscount } = useRemoveQuantityWiseDiscount();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeDiscount(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Discount deleted successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    // Export

    async function downloadCSV() {
        getQuantityWiseDiscounts({
            isCsv: true,
            isGoodsDiscount,
            csvLabel: isGoodsDiscount ? 'Sales_Discount' : 'Goods_Discount',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={quantityWiseDiscounts?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder={`Search by ${isGoodsDiscount ? 'creditor' : 'debtor'} name or stock item...`}
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

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />

                            <ImportModule
                                module={isGoodsDiscount ? 'Goods_Discount' : 'Sales_Discount'}
                                route={isGoodsDiscount ? 'goodsDiscount' : 'salesDiscount'}
                                customRoute={
                                    isGoodsDiscount
                                        ? '/goods-stock-qty-discounts/import'
                                        : '/sales-stock-qty-discounts/import'
                                }
                                noLabel
                                hasPermission={hasPermission(userGroupPermissions, permissionModuleType, [
                                    SYSTEM_PERMISSIONS.CREATE,
                                ])}
                                fileFieldName="file"
                            />

                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(userGroupPermissions, permissionModuleType, [
                                            SYSTEM_PERMISSIONS.CREATE,
                                        ])
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
                                Add {isGoodsDiscount ? 'Goods' : 'Sales'} Discount
                            </Button>
                        </div>
                    </div>
                </DataTable>

                {open && (
                    <QuantityWiseDiscountForm
                        open={open}
                        onClose={onClose}
                        editData={editData}
                        key={editData?.id || null}
                        isGoodsDiscount={isGoodsDiscount}
                    />
                )}

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete the selected item`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the quantity wise discounts." }}
            />
        </PageLoader>
    );
};

export default QuantityWiseDiscounts;
