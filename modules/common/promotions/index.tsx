import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, CheckIcon, XIcon, Eye } from 'lucide-react';
import PromotionForm from './promotion-form';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    useGetPromotions,
    FilterProps,
    useRemovePromotion,
    PromotionDetails,
    getPromotions,
} from '@/api-queries/promotions';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import ExportSheets from '@/components/export-sheets';
import ImportModule from '@/components/import-sheets/import-module';
import RetailPromotionForm from './retail-promotion-form';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';

const Promotions = () => {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType === 'COMPANY-DEBTOR-USER');
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<PromotionDetails | null>(null);
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetPromotions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });
    const { data: promotions, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<PromotionDetails>[] = [
        {
            accessorKey: 'promotionBatchCode',
            header: (data) => <TableHeaderToggle {...data}>Batch</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.promotionBatchCode}</div>,
        },
        {
            accessorKey: 'promotionDescription',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.promotionDescription}</div>,
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => (
                <Badge className={`capitalize ${row.original.status === 'ACTIVE' ? 'bg-green-700' : 'bg-red-500'}`}>
                    {row.original.status?.toLowerCase() || 'N/A'}
                </Badge>
            ),
        },
        {
            accessorKey: 'qualifyingItemsRule',
            header: (data) => <TableHeaderToggle {...data}>Eligible Items</TableHeaderToggle>,
            cell: ({ row }) => <div className="capitalize">{row.original.qualifyingItemsRule?.toLowerCase()}</div>,
        },
        {
            accessorKey: 'startDate',
            header: (data) => <TableHeaderToggle {...data}>Start Date</TableHeaderToggle>,
            cell: ({ row }) => {
                const date = row.original.startDate ? moment(row.original.startDate).format('Do MMM, YY') : 'N/A';
                return <div>{date}</div>;
            },
        },
        {
            accessorKey: 'endDate',
            header: (data) => <TableHeaderToggle {...data}>End Date</TableHeaderToggle>,
            cell: ({ row }) => {
                const date = row.original.endDate ? moment(row.original.endDate).format('Do MMM, YY') : 'N/A';
                return <div>{date}</div>;
            },
        },
        {
            accessorKey: 'startTime',
            header: (data) => <TableHeaderToggle {...data}>Start Time</TableHeaderToggle>,
            cell: ({ row }) => {
                const time = row.original.startTime || 'N/A';
                return <div>{time}</div>;
            },
        },
        {
            accessorKey: 'endTime',
            header: (data) => <TableHeaderToggle {...data}>End Time</TableHeaderToggle>,
            cell: ({ row }) => {
                const time = row.original.endTime || 'N/A';
                return <div>{time}</div>;
            },
        },
        {
            accessorKey: 'cashOnly',
            header: 'Cash Only',
            cell: ({ row }) => {
                const value = row.original.cashOnly;
                return (
                    <div>
                        {value ? (
                            <CheckIcon className="h-4 w-4 text-green-700" />
                        ) : (
                            <XIcon className="h-4 w-4 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'loyaltyOnly',
            header: 'Loyalty Only',
            cell: ({ row }) => {
                const value = row.original.loyaltyOnly;
                return (
                    <div>
                        {value ? (
                            <CheckIcon className="h-4 w-4 text-green-700" />
                        ) : (
                            <XIcon className="h-4 w-4 text-red-600" />
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'CompanyStockPromotionType?.name',
            header: 'Promotion Type',
            cell: ({ row }) => {
                const value = `${row.original.CompanyStockPromotionType?.typeName} (${row.original.CompanyStockPromotionType?.code})`;
                return <div className="w-64 whitespace-pre-wrap">{value}</div>;
            },
        },
        {
            accessorKey: 'CompanyStockPromotionItems',
            header: (data) => <TableHeaderToggle {...data}>Products</TableHeaderToggle>,
            cell: ({ row }) => {
                const items = row.original.CompanyStockPromotionItems || [];
                if (!items.length) return <div className="text-xs text-gray-400">No items</div>;

                // Only show the first two badges directly so a promotion with several
                // products (e.g. B1G1 + extra reward lines) never spills onto new rows;
                // the remaining products are collapsed into a +N summary badge.
                const visibleItems = items.slice(0, 2);
                const hiddenItems = items.slice(2);

                const renderBadge = (item: (typeof items)[number], key: string) => {
                    const isReward = item.itemType === 'REWARD' || item.isFree;
                    const label = item.CompanyStockDetail?.description || item.CompanyStockDetail?.itemCode || 'N/A';
                    return (
                        <Badge
                            key={key}
                            title={
                                isReward
                                    ? `${item.CompanyStockDetail?.description} (free)`
                                    : item.CompanyStockDetail?.description
                            }
                            className={
                                isReward
                                    ? 'border-green-300 bg-green-50 text-green-700'
                                    : 'border-blue-200 bg-blue-50 text-blue-700'
                            }
                        >
                            {isReward ? '+' : ''}
                            {label}
                        </Badge>
                    );
                };

                return (
                    <div className="flex max-w-[340px] flex-wrap items-center gap-1">
                        {visibleItems.map((item, index) =>
                            renderBadge(item, `${item.companyStockDetailId || item.CompanyStockDetail?.id}-${index}`),
                        )}
                        {hiddenItems.length > 0 && (
                            <Badge
                                title={hiddenItems
                                    .map(
                                        (item) =>
                                            `${item.CompanyStockDetail?.description || item.CompanyStockDetail?.itemCode || 'N/A'}: ${
                                                item.CompanyStockDetail?.description
                                            }${item.itemType === 'REWARD' || item.isFree ? ' (free)' : ''}`,
                                    )
                                    .join('\n')}
                                className="border-gray-300 bg-gray-50 text-gray-600"
                            >
                                +{hiddenItems.length} more
                            </Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: ({}) => <div className="text-center">Actions</div>,
            cell: ({ row }: { row: { original: PromotionDetails } }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code, [
                                    SYSTEM_PERMISSIONS.UPDATE,
                                ])
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
                        {isCompanyDebtor ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>

                    {isCompanyDebtor ? null : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                if (
                                    hasPermission(userGroupPermissions, SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code, [
                                        SYSTEM_PERMISSIONS.DELETE,
                                    ])
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
                    )}
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<PromotionDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: PromotionDetails) => {
        setEditData(data);
        setSelectedItem(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(false);
    };

    const [openRetailPromotion, setOpenRetailPromotion] = useState(false);

    const [importType, setImportType] = useState<'simplePromotionWholesale' | 'simplePromotionRetail' | null>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const { mutate: removeCompany } = useRemovePromotion();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeCompany(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Promotion deleted successfully');
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
        getPromotions({
            isCsv: true,
            csvLabel: 'Promotions',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    // Store Filters

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                {open ? (
                    <PromotionForm onClose={onClose} editData={editData} key={editData?.id || null} />
                ) : (
                    <DataTable
                        query={query}
                        data={promotions?.data?.rows || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder="Search by promotion description..."
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="!max-w-sm"
                                />

                                {isCompanyDebtor ? null : (
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
                                )}

                                <FilterActionButtons
                                    onApplyFilters={handleApplyFilters}
                                    onClearClick={handleClearSearch}
                                    showClearButton={showClearButton}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <ExportSheets downloadCSV={downloadCSV} />

                                {isCompanyDebtor ? null : (
                                    <>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline">Import Promotion</Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                    className="p-2"
                                                >
                                                    <div>
                                                        <ImportModule
                                                            module="Promotion_Wholesale"
                                                            route="simplePromotionWholesale"
                                                            noLabel
                                                            label="Wholesale Promotion"
                                                            hasPermission={hasPermission(
                                                                userGroupPermissions,
                                                                SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code,
                                                                [SYSTEM_PERMISSIONS.CREATE],
                                                            )}
                                                        />
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem
                                                    onSelect={(e) => {
                                                        e.preventDefault();
                                                    }}
                                                    className="p-2"
                                                >
                                                    <div>
                                                        <ImportModule
                                                            module="Promotion_Retail"
                                                            route="simplePromotionRetail"
                                                            noLabel
                                                            label="Retail Promotion"
                                                            hasPermission={hasPermission(
                                                                userGroupPermissions,
                                                                SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code,
                                                                [SYSTEM_PERMISSIONS.CREATE],
                                                            )}
                                                        />
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <Button
                                            onClick={() => {
                                                if (
                                                    hasPermission(
                                                        userGroupPermissions,
                                                        SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code,
                                                        [SYSTEM_PERMISSIONS.CREATE],
                                                    )
                                                ) {
                                                    setOpenRetailPromotion(true);
                                                } else {
                                                    setIsPermissionDeniedOpen(true);
                                                    return;
                                                }
                                            }}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Retail Promotion
                                        </Button>

                                        <Button
                                            onClick={() => {
                                                if (
                                                    hasPermission(
                                                        userGroupPermissions,
                                                        SYSTEM_MODULES.POINT_OF_SALE.PROMOTIONS.code,
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
                                            Add Promotion
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </DataTable>
                )}

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.promotionDescription}`}
                    onConfirm={handleDelete}
                />

                {openRetailPromotion ? (
                    <RetailPromotionForm open={openRetailPromotion} onClose={() => setOpenRetailPromotion(false)} />
                ) : null}
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the loyalty modules." }}
            />
        </PageLoader>
    );
};

export default Promotions;
