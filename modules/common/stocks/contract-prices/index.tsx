import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Plus, Box, QrCode } from 'lucide-react';
import { DataTable } from '@/components/dynamic-table/data-table';
import { toast } from 'sonner';
import StockContractPriceForm from './contract-price-form';
import {
    FilterProps,
    useGetStockContractPrices,
    useDeleteStockContractPrice,
    StockContractPrice,
} from '@/api-queries/contract-prices';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { type ColumnDef } from '@tanstack/react-table';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import ImportModule from '@/components/import-sheets/import-module';
import { useAuthUser } from '@/stores/auth-user.store';

interface ContractPricesProps {}

export const contractPricesDebtorFilters = [
    'Discount per Product per Debtor',
    'Discount per Department per Debtor',
    "Discount per Product per Debtor's Group",
    "Discount per Department per Debtor's Group",
];

const ContractPrices: React.FC<ContractPricesProps> = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [selectedItem, setSelectedItem] = useState<StockContractPrice | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const userGroupPermissions = useUsersPermissions();

    const initialFilters: FilterProps = {
        search: '',
        discountType: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    const query = useGetStockContractPrices({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.discountType ? { discountType: appliedFilters?.discountType } : {}),
    });

    const { data: contractPriceData, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<StockContractPrice>[] = [
        {
            accessorKey: 'CompanyStockDetail.description',
            header: 'Stock Details',
            cell: ({ row }: { row: { original: StockContractPrice } }) => {
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
        {
            accessorKey: 'discountType',
            header: 'Discount',
            cell: ({ row }) => (
                <div>
                    <div className="flex gap-1">
                        Type : <div className="font-semibold">{row.original.discountType}</div>
                    </div>
                    <div className="flex gap-1">
                        Percent : <div className="font-semibold">{row.original.discountPercent}%</div>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'sellerPrice',
            header: 'Selling Price',
            cell: ({ row }) => (
                <div>
                    <div className="flex gap-1">
                        Excl. :{' '}
                        <div className="font-semibold">
                            {currencySymbol} {row.original.sellPriceExclusive?.toFixed(2)}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        Incl. :{' '}
                        <div className="font-semibold">
                            {currencySymbol} {row.original.sellPriceInclusive?.toFixed(2)}
                        </div>
                    </div>
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
                                    SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                    [SYSTEM_PERMISSIONS.UPDATE],
                                )
                            ) {
                                e.stopPropagation();
                                handleEdit(row.original);
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
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
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
                    </Button>
                </div>
            ),
        },
    ];

    const deleteMutation = useDeleteStockContractPrice();

    // Filters
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Mutate
    const handleDelete = () => {
        if (selectedItem?.id) {
            deleteMutation.mutate(selectedItem.id, {
                onSuccess: () => {
                    toast.success('Stock Contract Price deleted successfully');
                    setSelectedItem(null);
                    setIsDeleteOpen(false);
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Failed to delete contract price');
                },
            });
        }
    };

    const handleAddNew = () => {
        if (
            hasPermission(userGroupPermissions, SYSTEM_MODULES?.STOCK?.CONTRACT_PRICE_MAINTENANCE.code, [
                SYSTEM_PERMISSIONS.CREATE,
            ])
        ) {
            setSelectedItem(null);
            setIsFormOpen(true);
        } else {
            setIsPermissionDeniedOpen(true);
        }
    };

    const handleEdit = (item: StockContractPrice) => {
        if (
            hasPermission(userGroupPermissions, SYSTEM_MODULES?.STOCK?.CONTRACT_PRICE_MAINTENANCE.code, [
                SYSTEM_PERMISSIONS.UPDATE,
            ])
        ) {
            setSelectedItem(item);
            setIsFormOpen(true);
        } else {
            setIsPermissionDeniedOpen(true);
        }
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setSelectedItem(null);
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    // Export

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={contractPriceData?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by stock ID, item code, or description..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />

                            <SelectPopover
                                selectedValue={filters.discountType}
                                onSelect={(val) => setFilters({ ...filters, discountType: val })}
                                options={contractPricesDebtorFilters?.map((data) => ({ label: data, value: data }))}
                            />

                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ImportModule
                                module="Contract_Price"
                                route="contractPrice"
                                noLabel
                                hasPermission={hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.STOCK.CONTRACT_PRICE_MAINTENANCE.code,
                                    [SYSTEM_PERMISSIONS.CREATE],
                                )}
                            />
                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.UTILITIES.SETUP.COMPANY_DETAILS.TAX_RATES.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        handleAddNew();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Contract Price
                            </Button>
                        </div>
                    </div>
                </DataTable>

                {isFormOpen && (
                    <StockContractPriceForm
                        open={isFormOpen}
                        onClose={handleFormClose}
                        editData={selectedItem}
                        key={selectedItem?.id || ''}
                    />
                )}

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete contract price for ${selectedItem?.CompanyStockDetail?.description}`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the contract price." }}
            />
        </PageLoader>
    );
};

export default ContractPrices;
