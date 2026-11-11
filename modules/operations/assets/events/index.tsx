import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    AssetEvent,
    useGetAssetEvents,
    useGetAssetList,
    getAssetRows,
    getEventRows,
    ASSET_EVENT_TYPES,
} from '@/api-queries/company-asset';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useGetUsers } from '@/api-queries/user';
import AssetEventForm from '../event-form';

interface EventsProps {
    moduleCode?: string;
}

const EVENT_COLOR: Record<string, string> = {
    ASSIGN: 'bg-blue-100 text-blue-700',
    RETURN: 'bg-green-100 text-green-700',
    TRANSFER: 'bg-cyan-100 text-cyan-700',
    SERVICE: 'bg-purple-100 text-purple-700',
    BREAKDOWN: 'bg-red-100 text-red-700',
    REPAIR_OUT: 'bg-orange-100 text-orange-700',
    REPAIR_IN: 'bg-emerald-100 text-emerald-700',
    WARRANTY_CLAIM: 'bg-indigo-100 text-indigo-700',
    RETIRE: 'bg-gray-100 text-gray-600',
    LOST: 'bg-red-100 text-red-700',
};

const fmtDateTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

const AssetEvents = ({ moduleCode }: EventsProps) => {
    const userGroupPermissions = useUsersPermissions();
    const eventsCode = moduleCode || SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_EVENTS.code;

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [eventOpen, setEventOpen] = useState(false);

    const [companyAssetId, setCompanyAssetId] = useState('');
    const [pendingScheduleOnly, setPendingScheduleOnly] = useState(false);
    const [scheduledTo, setScheduledTo] = useState('');
    const [appliedCompanyAssetId, setAppliedCompanyAssetId] = useState('');
    const [appliedPendingScheduleOnly, setAppliedPendingScheduleOnly] = useState(false);
    const [appliedScheduledTo, setAppliedScheduledTo] = useState('');
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const assetsQuery = useGetAssetList({ limit: 200 });
    const assets = getAssetRows(assetsQuery.data).rows;
    const assetName = (id: string) => assets.find((a) => a.id === id)?.name || id;

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED', limit: 200 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 100 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes)
        ? (warehousesRes as { id: string; name: string }[])
        : ((warehousesRes as { rows?: { id: string; name: string }[] } | undefined)?.rows || []);
    const users = useGetUsers({ limit: 200 }).data?.data || [];

    const storeName = (id?: string | null) => debtors?.find((d) => d.id === id)?.name || id || '';
    const warehouseName = (id?: string | null) => warehouses.find((w) => w.id === id)?.name || id || '';
    const userName = (id?: string | null) =>
        users.find((u) => u.id === id)
            ? [users.find((u) => u.id === id)?.firstName, users.find((u) => u.id === id)?.surname].filter(Boolean).join(' ')
            : id || '';

    const canLogEvent = hasPermission(userGroupPermissions, eventsCode, [SYSTEM_PERMISSIONS.CREATE]);

    const query = useGetAssetEvents({
        companyAssetId: appliedCompanyAssetId || undefined,
        pendingScheduleOnly: appliedPendingScheduleOnly || undefined,
        scheduledTo: appliedScheduledTo || undefined,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
    });

    const { data, isLoading } = query;
    const { rows, count } = getEventRows(data);

    const columns: ColumnDef<AssetEvent>[] = useMemo(
        () => [
            {
                accessorKey: 'createdAt',
                header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
                cell: ({ row }) => <div>{fmtDateTime(row.original.createdAt)}</div>,
            },
            {
                accessorKey: 'eventType',
                header: 'Event',
                cell: ({ row }) => (
                    <Badge className={EVENT_COLOR[row.original.eventType] || 'bg-gray-100 text-gray-600'}>
                        {row.original.eventType.replace(/_/g, ' ')}
                    </Badge>
                ),
            },
            {
                accessorKey: 'companyAssetId',
                header: 'Asset',
                cell: ({ row }) => <div>{assetName(row.original.companyAssetId)}</div>,
            },
            {
                accessorKey: 'target',
                header: 'To',
                cell: ({ row }) => {
                    const e = row.original;
                    const target = e.toHeadOffice
                        ? 'Head Office'
                        : e.toCompanyDebtorId
                          ? `Store: ${storeName(e.toCompanyDebtorId)}`
                          : e.toWarehouseId
                            ? `Warehouse: ${warehouseName(e.toWarehouseId)}`
                            : e.toUserId
                              ? `User: ${userName(e.toUserId)}`
                              : '—';
                    return <div>{target}</div>;
                },
            },
            {
                accessorKey: 'scheduledFor',
                header: 'Scheduled',
                cell: ({ row }) => <div>{fmtDateTime(row.original.scheduledFor)}</div>,
            },
            {
                accessorKey: 'completedAt',
                header: 'Completed',
                cell: ({ row }) => <div>{fmtDateTime(row.original.completedAt)}</div>,
            },
            {
                accessorKey: 'vendorName',
                header: 'Vendor',
                cell: ({ row }) => <div>{row.original.vendorName || '—'}</div>,
            },
            {
                accessorKey: 'cost',
                header: 'Cost',
                cell: ({ row }) => <div>{row.original.cost != null ? row.original.cost : '—'}</div>,
            },
            {
                accessorKey: 'conditionAfter',
                header: 'Condition',
                cell: ({ row }) => <div>{row.original.conditionAfter || '—'}</div>,
            },
            {
                accessorKey: 'returnStatus',
                header: 'Return',
                cell: ({ row }) => <div>{row.original.returnStatus || '—'}</div>,
            },
            {
                accessorKey: 'notes',
                header: 'Notes',
                cell: ({ row }) => <div className="max-w-[180px] truncate" title={row.original.notes || ''}>{row.original.notes || '—'}</div>,
            },
        ],
        [assets, debtors, warehouses, users],
    );

    const applyFilters = () => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        setAppliedCompanyAssetId(companyAssetId);
        setAppliedPendingScheduleOnly(pendingScheduleOnly);
        setAppliedScheduledTo(scheduledTo);
    };

    const clearFilters = () => {
        setPagination((p) => ({ ...p, pageIndex: 0 }));
        setCompanyAssetId('');
        setPendingScheduleOnly(false);
        setScheduledTo('');
        setAppliedCompanyAssetId('');
        setAppliedPendingScheduleOnly(false);
        setAppliedScheduledTo('');
    };

    const showClearButton = !!companyAssetId || !!pendingScheduleOnly || !!scheduledTo;

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="text-lg font-bold">Asset Events & Maintenance</div>

                <div className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                    <div className="flex w-full flex-wrap items-center gap-2">
                        <SelectPopover
                            title="asset"
                            selectedValue={appliedCompanyAssetId || companyAssetId || null}
                            options={assets.map((a) => ({
                                value: a.id,
                                label: `[${a.assetCode || '—'}] ${a.name}`,
                            }))}
                            onSelect={(v) => setCompanyAssetId(v || '')}
                            selectClass="h-7 text-xs"
                        />
                        <label className="flex items-center gap-1 text-xs">
                            <input
                                type="checkbox"
                                checked={pendingScheduleOnly}
                                onChange={(e) => setPendingScheduleOnly(e.target.checked)}
                            />
                            Pending scheduled repairs only
                        </label>
                        <Input
                            type="date"
                            value={scheduledTo}
                            onChange={(e) => setScheduledTo(e.target.value)}
                            title="Scheduled up to"
                            className="!max-w-[150px]"
                        />
                        <FilterActionButtons
                            onApplyFilters={applyFilters}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-2">
                        <Button
                            onClick={() => {
                                if (canLogEvent) {
                                    setEventOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Log Event
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

                <div className="text-[10px] text-gray-400">
                    Event types: {ASSET_EVENT_TYPES.join(' · ')}
                </div>
            </div>

            {eventOpen && (
                <AssetEventForm
                    open={eventOpen}
                    onClose={() => setEventOpen(false)}
                    key="events-screen"
                />
            )}

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to log asset events." }}
            />
        </PageLoader>
    );
};

export default AssetEvents;