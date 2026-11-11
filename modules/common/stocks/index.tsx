import {
    companyStockDetailsList,
    StockDetails,
    StockDetailsQuery,
    useCompanyStockDetailsList,
    useUpdateCompanyStockDetail,
} from '@/api-queries/company/stock-details';
import { Button } from '@/components/ui/button';
import StockDialog from '@/modules/common/stocks/stock-dialog';
import { Calendar, Check, ClipboardList, Clock, Edit, PackagePlus, PlusIcon, User, X } from 'lucide-react';
import { parseAsBoolean, useQueryState } from 'nuqs';
import { useState } from 'react';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { DataTable } from '@/components/dynamic-table/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/router';
import ImportModule from '@/components/import-sheets/import-module';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ExportSheets from '@/components/export-sheets';
import moment from 'moment';
import { Switch } from '@/components/ui/switch';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { UpdateStockDetailsSchema } from '@/schema/company/stock-details';
import { Badge } from '@/components/ui/badge';
import { useAuthUser } from '@/stores/auth-user.store';

const COMPANY_CONTEXT_KEY = 'companyContext';

const getStoredCompanyContext = (): { isChildCompany?: boolean; [key: string]: any } | null => {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(COMPANY_CONTEXT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function StocksList() {
    const authUserType = useAuthUser((state) => state.user?.userType);

    const router = useRouter();

    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const companyContext = getStoredCompanyContext();
    const isChildCompany = companyContext?.isChildCompany === true;

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
    } = useTableFilters<StockDetailsQuery>(initialFilters);

    const query = useCompanyStockDetailsList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const data = query?.data?.data?.rows || [];
    const totalRowCount = query?.data?.data?.count || 0;
    const { mutate: updateStock, isPending } = useUpdateCompanyStockDetail();
    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    const largestPriceListCount = data.reduce((max, item) => Math.max(max, item.CompanyStockPricing?.length || 0), 0);

    const [action, setAction] = useQueryState('action', parseAsBoolean.withDefault(false));
    const [stockId, setStockId] = useState<string | null>(null);

    const columns: ColumnDef<StockDetails>[] = [
        { accessorKey: 'itemCode', header: (data) => <TableHeaderToggle {...data}>Code</TableHeaderToggle> },
        { accessorKey: 'barcode', header: (data) => <TableHeaderToggle {...data}>Bar Code</TableHeaderToggle> },
        { accessorKey: 'description', header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle> },
        {
            accessorKey: 'category',
            header: (data) => <TableHeaderToggle {...data}>Category & Taxes</TableHeaderToggle>,
            cell: ({ row }) => {
                const category = row?.original?.category?.name;
                const subCategoryObj = row?.original?.subCategory;
                const subCategory = subCategoryObj?.name;
                const taxRate = subCategoryObj?.taxRate;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 capitalize">
                            <span className="font-semibold">Category :</span> {category || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 capitalize">
                            <span className="font-semibold">Sub Category :</span> {subCategory || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 capitalize">
                            <span className="font-semibold">Range :</span> {row?.original?.range?.name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 capitalize">
                            <span className="font-semibold">Tax :</span> {taxRate?.name || 'N/A'} -{' '}
                            {taxRate?.taxRatePercent || '0.00'}%
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'packSize',
            header: (data) => <TableHeaderToggle {...data}>Pack Info</TableHeaderToggle>,
            cell: ({ row }) => {
                const packSize = row?.original?.packSize;
                const packDescription = row?.original?.packDescription;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-1 capitalize">
                            <span className="font-semibold">Size :</span> {packSize || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 capitalize">
                            <span className="font-semibold">Desc. :</span> {packDescription || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'stockOnHand',
            header: (data) => <TableHeaderToggle {...data}>On Hand</TableHeaderToggle>,
            cell: ({ row }) => {
                const remainingStock = +row.original?.stockOnHand;
                return (
                    <div className={`font-semibold ${remainingStock <= 5 ? 'text-red-600' : 'text-green-700'}`}>
                        {remainingStock}
                    </div>
                );
            },
        },
        {
            accessorKey: 'onHold',
            header: () => <div className="text-center">On Hold?</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    {row.original.itemOnHold ? (
                        <Check className="h-5 w-5 text-green-700" />
                    ) : (
                        <X className="h-5 w-5 text-red-700" />
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'emailAddress',
            header: (data) => <TableHeaderToggle {...data}>Last Modified</TableHeaderToggle>,
            cell: ({ row }) => {
                const lastModifiedBy = row?.original?.lastModifiedUser?.name;
                const lastModifiedOn = moment(row?.original?.updatedAt).format('Do MMM, YY');
                const lastModifiedAt = moment(row?.original?.updatedAt).format('hh:mm A');

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" /> {lastModifiedBy || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="!h-4 !w-4" /> {lastModifiedOn || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="!h-4 !w-4" /> {lastModifiedAt || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: () => <div className="text-center">Status</div>,
            cell: ({ row }: { row: { original: StockDetails } }) => (
                <Badge
                    variant={row.original.status === 'ACTIVE' ? 'default' : 'destructive'}
                    className={`capitalize ${row.original.status === 'ACTIVE' ? 'bg-green-600' : ''}`}
                >
                    {row.original.status?.toLowerCase() || 'Inactive'}
                </Badge>
            ),
        },
        ...(hasPermission(userGroupPermissions, SYSTEM_MODULES.STOCK.MAINTENANCE.code, [SYSTEM_PERMISSIONS.UPDATE])
            ? [
                  {
                      id: 'toggleStatus',
                      header: () => <div className="text-center">Toggle Status</div>,
                      cell: ({ row }: { row: { original: StockDetails } }) => (
                          <div>
                              <Switch
                                  checked={row.original.status === 'ACTIVE'}
                                  onCheckedChange={(val) => {
                                      updateStock({
                                          id: row.original.id,
                                          status: val ? 'ACTIVE' : 'INACTIVE',
                                      } as UpdateStockDetailsSchema);
                                  }}
                              />
                          </div>
                      ),
                  },
              ]
            : []),
        {
    id: 'actions',
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => (
        <div className="flex items-center justify-center gap-1">
            {deviceType === 'WAREHOUSE-USER' && (
                <>
                    <Button
                        onClick={() => {
                            if (
                                hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.code,
                                    [SYSTEM_PERMISSIONS.READ],
                                )
                            ) {
                                router.push(`/stocks/${row.original.id}/inventory`);
                            } else {
                                setIsPermissionDeniedOpen(true);
                                return;
                            }
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Manage Inventory"
                    >
                        <PackagePlus className="h-4 w-4" />
                    </Button>

                    <Button
                        onClick={() => {
                            router.push(`/stocks/${row.original.id}/inventory/logs`);
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Inventory Logs"
                    >
                        <ClipboardList className="h-4 w-4" />
                    </Button>
                </>
            )}

            <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                    if (
                        hasPermission(userGroupPermissions, SYSTEM_MODULES.STOCK.MAINTENANCE.code, [
                            SYSTEM_PERMISSIONS.UPDATE,
                        ])
                    ) {
                        e.stopPropagation();
                        setStockId(row.original.id);
                        setAction(true);
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
                        hasPermission(userGroupPermissions, SYSTEM_MODULES.STOCK.MAINTENANCE.code, [
                            SYSTEM_PERMISSIONS.DELETE,
                        ])
                    ) {
                        e.preventDefault();
                        // setSelectedItem(row.original);
                        // setIsDeleteOpen(true);
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
    ];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    async function downloadCSV() {
        companyStockDetailsList({
            isCsv: true,
            csvLabel: 'Company_Stock_Details',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    return (
        <div className="p-2">
            {action ? (
                <StockDialog open={action} stockId={stockId} setStockId={setStockId} onClose={() => setAction(false)} />
            ) : (
                <PageLoader isLoading={isPending}>
                    <div className="space-y-4 bg-white px-2">
                        <DataTable
                            query={query}
                            data={data || []}
                            columns={columns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={totalRowCount}
                        >
                            <div className="flex items-center justify-between pt-2">
                                <div className="flex w-full items-center gap-2">
                                    <Input
                                        placeholder="Search by code, description, barcode"
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

                                    {authUserType === 'COMPANY-DEBTOR-USER' || isChildCompany ? null : (
                                        <>
                                            <ImportModule
                                                module="Company_Stock_Details"
                                                route="companyStockDetail"
                                                noLabel
                                                hasPermission={hasPermission(
                                                    userGroupPermissions,
                                                    SYSTEM_MODULES.STOCK.MAINTENANCE.code,
                                                    [SYSTEM_PERMISSIONS.CREATE],
                                                )}
                                            />

                                            <Button
                                                onClick={() => {
                                                    if (
                                                        hasPermission(
                                                            userGroupPermissions,
                                                            SYSTEM_MODULES.STOCK.MAINTENANCE.code,
                                                            [SYSTEM_PERMISSIONS.CREATE],
                                                        )
                                                    ) {
                                                        setAction(true);
                                                    } else {
                                                        setIsPermissionDeniedOpen(true);
                                                        return;
                                                    }
                                                }}
                                                variant="outline"
                                                className="h-auto px-6"
                                            >
                                                <PlusIcon className="h-5 w-5" />
                                                Add
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </DataTable>
                    </div>
                </PageLoader>
            )}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the stock." }}
            />
        </div>
    );
}