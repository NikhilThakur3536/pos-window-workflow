import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit, Eye, History, Plus, Trash2 } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ConfirmDialog from '@/components/confirm-dialog';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { toast } from 'sonner';
import {
    CompanyAsset,
    useGetAssetList,
    useDeleteAsset,
    getAssetRows,
    ASSET_CATEGORIES,
    ASSET_STATUSES,
    AssetCategory,
    AssetStatus,
} from '@/api-queries/company-asset';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import AssetForm from '../asset-form';
import AssetDetails from '../asset-details';
import AssetEventForm from '../event-form';

interface RegisterProps {
    moduleCode?: string;
}

interface Filters {
    companyDebtorId: string;
    category: AssetCategory | '';
    status: AssetStatus | '';
    search: string;
    serviceDueBefore: string;
    warrantyExpiringBefore: string;
    headOfficeOnly: boolean;
}

const EMPTY_FILTERS: Filters = {
    companyDebtorId: '',
    category: '',
    status: '',
    search: '',
    serviceDueBefore: '',
    warrantyExpiringBefore: '',
    headOfficeOnly: false,
};

const STATUS_COLOR: Record<string, string> = {
    AVAILABLE: 'bg-green-100 text-green-700',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    IN_REPAIR: 'bg-amber-100 text-amber-700',
    RETIRED: 'bg-gray-100 text-gray-600',
    LOST: 'bg-red-100 text-red-700',
    DELETED: 'bg-gray-100 text-gray-400',
};

const AssetRegister = ({ moduleCode }: RegisterProps) => {
    const userGroupPermissions = useUsersPermissions();
    const registerCode = moduleCode || SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_REGISTER.code;
    const eventsCode = SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_EVENTS.code;

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [open, setOpen] = useState(false);
    const [editData, setEditData] = useState<CompanyAsset | null>(null);
    const [assetId, setAssetId] = useState<string | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CompanyAsset | null>(null);
    const [eventOpen, setEventOpen] = useState(false);
    const [eventAsset, setEventAsset] = useState<CompanyAsset | null>(null);

    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 200 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes)
        ? (warehousesRes as { id: string; name: string }[])
        : ((warehousesRes as { rows?: { id: string; name: string }[] } | undefined)?.rows || []);

    const query = useGetAssetList({
        companyDebtorId: appliedFilters.companyDebtorId || undefined,
        category: appliedFilters.category || undefined,
        status: appliedFilters.status || undefined,
        search: appliedFilters.search || undefined,
        serviceDueBefore: appliedFilters.serviceDueBefore || undefined,
        warrantyExpiringBefore: appliedFilters.warrantyExpiringBefore || undefined,
        headOfficeOnly: appliedFilters.headOfficeOnly || undefined,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    });

    const { data, isLoading } = query;
    const { rows, count } = getAssetRows(data);

    const storeName = (id?: string | null) => debtors?.find((d) => d.id === id)?.name || id || '—';
    const warehouseName = (id?: string | null) => warehouses.find((w) => w.id === id)?.name || id || '—';

    const canView = hasPermission(userGroupPermissions, registerCode, [SYSTEM_PERMISSIONS.READ]);
    const canCreate = hasPermission(userGroupPermissions, registerCode, [SYSTEM_PERMISSIONS.CREATE]);
    const canUpdate = hasPermission(userGroupPermissions, registerCode, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDelete = hasPermission(userGroupPermissions, registerCode, [SYSTEM_PERMISSIONS.DELETE]);
    const canLogEvent = hasPermission(userGroupPermissions, eventsCode, [SYSTEM_PERMISSIONS.CREATE]);

    const { mutate: deleteAsset } = useDeleteAsset();

    const columns: ColumnDef<CompanyAsset>[] = useMemo(
        () => [
            {
                accessorKey: 'assetCode',
                header: (data) => <TableHeaderToggle {...data}>Asset</TableHeaderToggle>,
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <div className="font-semibold">{row.original.assetCode || 'N/A'}</div>
                        <div className="text-xs">{row.original.name || 'N/A'}</div>
                    </div>
                ),
            },
            {
                accessorKey: 'category',
                header: 'Category',
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-xs">
                        {row.original.category.replace(/_/g, ' ')}
                    </Badge>
                ),
            },
            {
                accessorKey: 'location',
                header: 'Location',
                cell: ({ row }) => {
                    const asset = row.original;
                    if (asset.companyDebtorId) return <div>{storeName(asset.companyDebtorId)}</div>;
                    if (asset.warehouseId) return <div>{warehouseName(asset.warehouseId)}</div>;
                    return <div>Head Office</div>;
                },
            },
            {
                accessorKey: 'status',
                header: 'Status',
                cell: ({ row }) => (
                    <Badge className={STATUS_COLOR[row.original.status] || 'bg-gray-100 text-gray-600'}>
                        {row.original.status.replace(/_/g, ' ')}
                    </Badge>
                ),
            },
            {
                accessorKey: 'condition',
                header: 'Condition',
                cell: ({ row }) => <div>{row.original.condition}</div>,
            },
            {
                accessorKey: 'serialNumber',
                header: 'Serial',
                cell: ({ row }) => <div>{row.original.serialNumber || '—'}</div>,
            },
            {
                id: 'actions',
                header: () => <div className="text-center">Actions</div>,
                cell: ({ row }) => {
                    const asset = row.original;
                    const deletable = asset.status === 'AVAILABLE' && (asset.eventCount ?? 0) === 0;
                    return (
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="View details & history"
                                disabled={!canView}
                                onClick={() => setAssetId(asset.id)}
                            >
                                <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Log event"
                                disabled={!canLogEvent}
                                onClick={() => {
                                    setEventAsset(asset);
                                    setEventOpen(true);
                                }}
                            >
                                <History className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Edit"
                                disabled={!canUpdate}
                                onClick={() => {
                                    if (canUpdate) {
                                        setEditData(asset);
                                        setOpen(true);
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                            >
                                <Edit className="h-4 w-4" />
                            </Button>
                            {deletable ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    title="Delete"
                                    disabled={!canDelete}
                                    onClick={() => {
                                        if (canDelete) {
                                            setSelectedItem(asset);
                                            setIsDeleteOpen(true);
                                        } else {
                                            setIsPermissionDeniedOpen(true);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            ) : null}
                        </div>
                    );
                },
            },
        ],
        [canView, canUpdate, canDelete, canLogEvent, debtors, warehouses],
    );

    const onAddData = () => {
        setEditData(null);
        setOpen(true);
    };

    const onClose = () => {
        setEditData(null);
        setOpen(false);
    };

    const applyFilters = () => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        setAppliedFilters(filters);
    };

    const clearFilters = () => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        setFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
    };

    const showClearButton =
        !!filters.companyDebtorId ||
        !!filters.category ||
        !!filters.status ||
        !!filters.search ||
        !!filters.serviceDueBefore ||
        !!filters.warrantyExpiringBefore ||
        !!filters.headOfficeOnly;

    const handleDelete = () => {
        if (!selectedItem) return;
        deleteAsset(
            { id: selectedItem.id, version: selectedItem.version },
            {
                onSuccess: (res) => {
                    if (res?.success) {
                        toast.success('Asset deleted successfully');
                        setSelectedItem(null);
                        setIsDeleteOpen(false);
                    } else {
                        toast.error('Asset deletion failed');
                    }
                },
                onError: (error) => {
                    toast.error('Failed to delete asset', {
                        description: (error as { response?: { data?: { message?: string } } })?.response?.data?.message,
                    });
                },
            },
        );
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="text-lg font-bold">Asset Register</div>

                <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <SelectPopover
                            title="store"
                            selectedValue={filters.companyDebtorId || null}
                            options={(debtors || []).map((d) => ({ value: d.id, label: d.name }))}
                            onSelect={(v) => setFilters({ ...filters, companyDebtorId: v || '' })}
                            selectClass="h-7 text-xs"
                        />
                        <SelectPopover
                            title="category"
                            selectedValue={filters.category || null}
                            options={ASSET_CATEGORIES.map((c) => ({ value: c, label: c.replace(/_/g, ' ') }))}
                            onSelect={(v) => setFilters({ ...filters, category: (v as AssetCategory) || '' })}
                            selectClass="h-7 text-xs"
                        />
                        <SelectPopover
                            title="status"
                            selectedValue={filters.status || null}
                            options={ASSET_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                            onSelect={(v) => setFilters({ ...filters, status: (v as AssetStatus) || '' })}
                            selectClass="h-7 text-xs"
                        />
                        <Input
                            placeholder="Search by code, name, serial..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            className="!max-w-xs"
                        />
                        <Input
                            type="date"
                            value={filters.serviceDueBefore}
                            onChange={(e) => setFilters({ ...filters, serviceDueBefore: e.target.value })}
                            title="Service due before"
                            className="!max-w-[150px]"
                        />
                        <Input
                            type="date"
                            value={filters.warrantyExpiringBefore}
                            onChange={(e) => setFilters({ ...filters, warrantyExpiringBefore: e.target.value })}
                            title="Warranty expiring before"
                            className="!max-w-[150px]"
                        />
                        <label className="flex items-center gap-1 text-xs">
                            <input
                                type="checkbox"
                                checked={filters.headOfficeOnly}
                                onChange={(e) => setFilters({ ...filters, headOfficeOnly: e.target.checked })}
                            />
                            Head Office only
                        </label>
                        <FilterActionButtons
                            onApplyFilters={applyFilters}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2">
                        <Button
                            onClick={() => {
                                if (canCreate) {
                                    onAddData();
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Asset
                        </Button>
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={count}
                />
            </div>

            {open && <AssetForm open={open} onClose={onClose} editData={editData} key={editData?.id || 'new'} />}

            {assetId && <AssetDetails assetId={assetId} onClose={() => setAssetId(null)} />}

            {eventOpen && (
                <AssetEventForm
                    open={eventOpen}
                    onClose={() => {
                        setEventOpen(false);
                        setEventAsset(null);
                    }}
                    asset={eventAsset}
                    key={eventAsset?.id || 'no-asset'}
                />
            )}

            {isDeleteOpen && (
                <ConfirmDialog
                    open={isDeleteOpen}
                    setOpen={setIsDeleteOpen}
                    title={`Delete asset ${selectedItem?.assetCode || selectedItem?.name}?`}
                    description="Only assets with no event history can be deleted. This action cannot be undone."
                    onConfirm={handleDelete}
                />
            )}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to manage assets." }}
            />
        </PageLoader>
    );
};

export default AssetRegister;