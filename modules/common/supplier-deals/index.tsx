import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, Check, X } from 'lucide-react';
import SupplierDealForm from './supplier-deal-form';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetSupplierDeals,
    SupplierDealDetails,
    useRemoveSupplierDeal,
    getSupplierDeals,
    useGetSupplierDealSummary,
    normaliseSupplierDealSummary,
} from '@/api-queries/goods-receiving/supplier-deals';
import DeleteConfirmation from '@/components/custom-components/DeleteConfirmation';
import { toast } from 'sonner';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import SelectPopover from '@/components/select-popover';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';
import moment from 'moment';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ImportModule from '@/components/import-sheets/import-module';
import ExportSheets from '@/components/export-sheets';

const isDealExpired = (deal: SupplierDealDetails) =>
    deal.isExpired ?? (deal.endDate ? moment(deal.endDate).isBefore(moment(), 'day') : false);

const SupplierDeals = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [selectedItem, setSelectedItem] = useState<SupplierDealDetails | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const initialFilters = {
        search: '',
        expiringWithinDays: '',
        expiredOnly: false,
        activeOnly: false,
        companyDebtorId: '',
        companyWarehouseId: '',
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
    } = useTableFilters<typeof initialFilters>(initialFilters);

    const activeUser = useAuthUser((state) => state.user);

    const query = useGetSupplierDeals({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.expiringWithinDays !== '' && appliedFilters?.expiringWithinDays !== undefined
            ? { expiringWithinDays: Number(appliedFilters.expiringWithinDays) }
            : {}),
        ...(appliedFilters?.expiredOnly ? { expired: true } : {}),
        ...(appliedFilters?.activeOnly ? { activeOnly: true } : {}),
        // Explicit scope filters win; otherwise a store user still sees only their own deals.
        ...(appliedFilters?.companyDebtorId
            ? { companyDebtorId: appliedFilters.companyDebtorId }
            : activeUser?.companyDebtorId
              ? { companyDebtorId: activeUser.companyDebtorId }
              : {}),
        ...(appliedFilters?.companyWarehouseId
            ? { companyWarehouseId: appliedFilters.companyWarehouseId }
            : activeUser?.warehouseId
              ? { companyWarehouseId: activeUser.warehouseId }
              : {}),
    });
    const { data: supplierDeals, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const debtors = useDebtorList({ limit: 100, offset: 0 })?.data?.data?.rows || [];
    const rawWarehouses: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouseList: WarehouseDetails[] = Array.isArray(rawWarehouses)
        ? rawWarehouses
        : (rawWarehouses as { rows?: WarehouseDetails[] } | undefined)?.rows || [];
    const debtorOptions = debtors.map((data) => ({ label: data.name, value: data.id }));
    const warehouseOptions = warehouseList.map((data) => ({ label: data.name, value: data.id }));

    // Dashboard summary: total / active / expired plus the 30, 14, 7 and 1 day
    // expiry windows, scoped to the active debtor / warehouse like the list.
    const summaryQuery = useGetSupplierDealSummary({
        ...(appliedFilters?.companyDebtorId
            ? { companyDebtorId: appliedFilters.companyDebtorId }
            : activeUser?.companyDebtorId
              ? { companyDebtorId: activeUser.companyDebtorId }
              : {}),
        ...(appliedFilters?.companyWarehouseId
            ? { companyWarehouseId: appliedFilters.companyWarehouseId }
            : activeUser?.warehouseId
              ? { companyWarehouseId: activeUser.warehouseId }
              : {}),
    });
    const summary = normaliseSupplierDealSummary(summaryQuery?.data?.data);

    const columns: ColumnDef<SupplierDealDetails>[] = [
        {
            accessorKey: 'companyCreditor',
            header: `Supplier Details`,
            cell: ({ row }) => {
                const customer = row.original?.CompanyCreditor;
                return (
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
                            {row?.original?.CompanyTaxRate?.taxRatePercent || '0.00'}%
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'dealUnit',
            header: 'Deal Price',
            cell: ({ row }) => {
                const value = row.original.dealUnit;
                return <div>{value ? value : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'startDate',
            header: 'Start Date',
            cell: ({ row }) => {
                const startDate = row.original.startDate;
                return <div>{startDate ? moment(startDate).format('DD MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'endDate',
            header: 'End Date',
            cell: ({ row }) => {
                const endDate = row.original.endDate;
                const daysToExpiry = row.original.daysToExpiry;
                const isExpired = isDealExpired(row.original);

                let badge: React.ReactNode = null;
                if (isExpired) {
                    badge = (
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                            Expired
                        </Badge>
                    );
                } else if (daysToExpiry != null && daysToExpiry >= 0 && daysToExpiry <= 30) {
                    // Expiry severity windows: 0-7d red, 8-14d amber, 15-30d info.
                    const { className, label } =
                        daysToExpiry <= 7
                            ? {
                                  className: 'bg-red-100 text-red-700',
                                  label: daysToExpiry === 0 ? 'Expiring today' : `Expiring soon · ${daysToExpiry}d`,
                              }
                            : daysToExpiry <= 14
                              ? {
                                    className: 'bg-amber-100 text-amber-800',
                                    label: `${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'} left`,
                                }
                              : {
                                    className: 'bg-sky-100 text-sky-800',
                                    label: `${daysToExpiry} days left`,
                                };
                    badge = (
                        <Badge variant="outline" className={className}>
                            {label}
                        </Badge>
                    );
                }

                return (
                    <div className="space-y-1">
                        <div>{endDate ? moment(endDate).format('DD MMM, YY') : 'N/A'}</div>
                        {badge}
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
                        disabled={isDealExpired(row.original)}
                        title={isDealExpired(row.original) ? 'Expired deals cannot be used or edited' : 'Edit'}
                        onClick={(e) => {
                            if (isDealExpired(row.original)) return;
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code, [
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
                        <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            if (
                                hasPermission(userGroupPermissions, SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code, [
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
                </div>
            ),
        },
    ];

    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<SupplierDealDetails | null>(null);

    const onAddData = () => {
        setEditData(null);
        setSelectedItem(null);
        setOpen(true);
    };

    const onEditData = (data: SupplierDealDetails) => {
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

    const { mutate: removeCompany } = useRemoveSupplierDeal();

    const handleDelete = () => {
        if (selectedItem?.id)
            removeCompany(selectedItem?.id, {
                onSuccess: () => {
                    setSelectedItem(null);
                    toast.success('Deal Price deleted successfully');
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
        getSupplierDeals({
            isCsv: true,
            csvLabel: 'Supplier_Deals',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.expiringWithinDays !== '' && appliedFilters?.expiringWithinDays !== undefined
                ? { expiringWithinDays: Number(appliedFilters.expiringWithinDays) }
                : {}),
            ...(appliedFilters?.expiredOnly ? { expired: true } : {}),
            ...(appliedFilters?.activeOnly ? { activeOnly: true } : {}),
            ...(appliedFilters?.companyDebtorId
                ? { companyDebtorId: appliedFilters.companyDebtorId }
                : activeUser?.companyDebtorId
                  ? { companyDebtorId: activeUser.companyDebtorId }
                  : {}),
            ...(appliedFilters?.companyWarehouseId
                ? { companyWarehouseId: appliedFilters.companyWarehouseId }
                : activeUser?.warehouseId
                  ? { companyWarehouseId: activeUser.warehouseId }
                  : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
                    {(
                        [
                            ['Total Deals', summary.total, 'text-foreground'],
                            ['Active', summary.active, 'text-emerald-700'],
                            ['Expired', summary.expired, 'text-red-700'],
                            ['Expiring 30d', summary.within30Days, 'text-amber-700'],
                            ['Expiring 14d', summary.within14Days, 'text-amber-700'],
                            ['Expiring 7d', summary.within7Days, 'text-orange-700'],
                            ['Expiring 1d', summary.within1Days, 'text-red-700'],
                        ] as const
                    ).map(([label, value, tone]) => (
                        <Card key={label}>
                            <CardContent className="space-y-1 p-3">
                                <p className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</p>
                                <p className={`font-mono text-lg font-semibold tabular-nums ${tone}`}>{value ?? '—'}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DataTable
                    query={query}
                    data={supplierDeals?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Search by supplier name..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Expiring within"
                                onlyTitle="Any Expiry"
                                selectedValue={filters.expiringWithinDays || ''}
                                options={[
                                    { label: 'Any Expiry', value: '' },
                                    { label: '7 days', value: '7' },
                                    { label: '14 days', value: '14' },
                                    { label: '30 days', value: '30' },
                                    { label: '90 days', value: '90' },
                                ]}
                                onSelect={(value) =>
                                    setFilters({ ...filters, expiringWithinDays: String(value || '') })
                                }
                            />
                            <label className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                    checked={!!filters.activeOnly}
                                    onCheckedChange={(checked) => setFilters({ ...filters, activeOnly: !!checked })}
                                />
                                Active only
                            </label>
                            <label className="flex items-center gap-1.5 text-xs">
                                <Checkbox
                                    checked={!!filters.expiredOnly}
                                    onCheckedChange={(checked) => setFilters({ ...filters, expiredOnly: !!checked })}
                                />
                                Expired only
                            </label>
                            {/* Store/warehouse scoped users keep their own fixed scope. */}
                            {!activeUser?.companyDebtorId && (
                                <SelectPopover
                                    title="Store / Debtor"
                                    onlyTitle="Any Store"
                                    selectedValue={filters.companyDebtorId || ''}
                                    options={[{ label: 'Any Store', value: '' }, ...debtorOptions]}
                                    onSelect={(value) =>
                                        setFilters({ ...filters, companyDebtorId: String(value || '') })
                                    }
                                />
                            )}
                            {!activeUser?.warehouseId && (
                                <SelectPopover
                                    title="Warehouse"
                                    onlyTitle="Any Warehouse"
                                    selectedValue={filters.companyWarehouseId || ''}
                                    options={[{ label: 'Any Warehouse', value: '' }, ...warehouseOptions]}
                                    onSelect={(value) =>
                                        setFilters({ ...filters, companyWarehouseId: String(value || '') })
                                    }
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

                            <ImportModule
                                module="Supplier_Deals"
                                route="supplierDeal"
                                noLabel
                                hasPermission={hasPermission(
                                    userGroupPermissions,
                                    SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code,
                                    [SYSTEM_PERMISSIONS.CREATE],
                                )}
                            />
                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.PROCESSING.SUPPLIER_DEALS.code,
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
                                Add Supplier Deal Price
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <SupplierDealForm open={open} onClose={onClose} editData={editData} key={editData?.id || null} />

                <DeleteConfirmation
                    open={isDeleteOpen}
                    onClose={() => setIsDeleteOpen(false)}
                    title={`Are you sure you want to delete ${selectedItem?.description}`}
                    onConfirm={handleDelete}
                />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the supplier's deal price." }}
            />
        </PageLoader>
    );
};

export default SupplierDeals;
