'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import ExportSheets from '@/components/export-sheets';
import { useGetTills, TillDetails } from '@/api-queries/masters/tills';
import SelectPopover from '@/components/select-popover';
import {
    useGetSyncMonitoringOverview,
    useGetSyncMonitoringList,
    getSyncMonitoringList,
    SyncMonitoringRecord,
    SyncMonitoringFilterProps,
    SyncMonitoringOverview,
} from '@/api-queries/sync-monitoring';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import { CheckCircle2, CloudUpload, Hourglass, RefreshCw, XCircle } from 'lucide-react';
import moment from 'moment';

interface SyncMonitoringModuleProps {
    moduleCode: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
    SYNCED: { label: 'Synced', className: 'bg-green-100 text-green-700' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
    IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
};

const SyncMonitoringModule = ({ moduleCode }: SyncMonitoringModuleProps) => {
    const tillsList = useGetTills({})?.data?.data?.rows;

    const [filters, setFilters] = useState<Pick<SyncMonitoringFilterProps, 'status' | 'documentType' | 'tillId' | 'search'>>({});
    const [applied, setApplied] = useState(false);

    const overviewQuery = useGetSyncMonitoringOverview();
    const listQuery = useGetSyncMonitoringList(applied ? filters : {});

    const overview = overviewQuery.data?.data;
    const rows = listQuery.data?.data?.rows || [];

    const apply = () => {
        setApplied(true);
    };
    const clear = () => {
        setFilters({});
        setApplied(false);
    };

    const refresh = () => {
        overviewQuery.refetch();
        listQuery.refetch();
    };

    const downloadCSV = () => {
        getSyncMonitoringList({
            ...(applied ? filters : {}),
            isCsv: true,
            csvLabel: 'Sync_Monitoring',
        });
    };

    const columns: ColumnDef<SyncMonitoringRecord>[] = [
        {
            accessorKey: 'documentType',
            header: (data) => <TableHeaderToggle {...data}>Document Type</TableHeaderToggle>,
            cell: ({ row }) => <div className="capitalize">{String(row.getValue('documentType') || 'Unknown')}</div>,
        },
        {
            accessorKey: 'reference',
            header: (data) => <TableHeaderToggle {...data}>Reference</TableHeaderToggle>,
            cell: ({ row }) => <div>{String(row.getValue('reference') || 'N/A')}</div>,
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = String(row.getValue('status') || 'PENDING');
                const badge = STATUS_BADGE[status] || { label: status, className: 'bg-muted text-muted-foreground' };
                return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>;
            },
        },
        {
            accessorKey: 'tillId',
            header: (data) => <TableHeaderToggle {...data}>Till</TableHeaderToggle>,
            cell: ({ row }) => {
                const tillId = String(row.getValue('tillId') || '');
                const till = tillsList?.find((t: TillDetails) => t.id === tillId);
                return <div>{till?.name || till?.tillNumber || (tillId ? tillId : 'N/A')}</div>;
            },
        },
        {
            accessorKey: 'retryCount',
            header: (data) => <TableHeaderToggle {...data}>Retries</TableHeaderToggle>,
            cell: ({ row }) => <div>{String(row.getValue('retryCount') ?? 0)}</div>,
        },
        {
            accessorKey: 'createdAt',
            header: (data) => <TableHeaderToggle {...data}>Created At</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.getValue('createdAt') ? moment(String(row.getValue('createdAt'))).format('DD/MM/YYYY HH:mm:ss') : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'syncedAt',
            header: (data) => <TableHeaderToggle {...data}>Synced At</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.getValue('syncedAt') ? moment(String(row.getValue('syncedAt'))).format('DD/MM/YYYY HH:mm:ss') : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'errorMessage',
            header: (data) => <TableHeaderToggle {...data}>Error</TableHeaderToggle>,
            cell: ({ row }) => <div className="max-w-[240px] truncate text-xs">{String(row.getValue('errorMessage') || '')}</div>,
        },
    ];

    return (
        <PageLoader isLoading={overviewQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Sync Monitoring</div>
                    <div className="flex items-center gap-2">
                        <ExportSheets downloadCSV={downloadCSV} title="Sync Log" />
                        <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={refresh}>
                            <RefreshCw className="h-4 w-4" /> Refresh
                        </Button>
                    </div>
                </div>

                {overview ? <OverviewCards overview={overview} /> : null}

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Sync Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Select
                                value={filters.status || ''}
                                onValueChange={(v) =>
                                    setFilters((f) => ({
                                        ...f,
                                        status: (v || undefined) as SyncMonitoringRecord['status'] | undefined,
                                    }))
                                }
                            >
                                <SelectTrigger className="h-8 w-[140px] text-xs">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="SYNCED">Synced</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                </SelectContent>
                            </Select>

                            <SelectPopover
                                title="till"
                                selectedValue={filters.tillId || null}
                                options={
                                    tillsList
                                        ? tillsList?.map((t: TillDetails) => ({
                                              value: t.id,
                                              label: t.name || t.tillNumber,
                                          }))
                                        : []
                                }
                                onSelect={(val) => setFilters((f) => ({ ...f, tillId: val || undefined }))}
                            />

                            <Input
                                placeholder="Search reference"
                                className="h-8 w-48 text-xs"
                                value={filters.search || ''}
                                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
                            />

                            <FilterActionButtons onApplyFilters={apply} onClearClick={clear} showClearButton={applied} />
                        </div>

                        <DataTable
                            query={listQuery}
                            data={rows}
                            columns={columns}
                            totalRowCount={listQuery.data?.data?.count || 0}
                        />

                        {!rows.length && !listQuery.isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">No sync records match the filters.</div>
                        ) : null}
                    </CardContent>
                </Card>
            </div>
        </PageLoader>
    );
};

export default SyncMonitoringModule;

function OverviewCards({ overview }: { overview: SyncMonitoringOverview }) {
    const stats: Array<{ title: string; value: number | string; icon: typeof Hourglass; className: string }> = [
        { title: 'Pending', value: overview.totalPending ?? 0, icon: Hourglass, className: 'text-amber-600' },
        { title: 'Synced', value: overview.totalSynced ?? 0, icon: CheckCircle2, className: 'text-green-600' },
        { title: 'Failed', value: overview.totalFailed ?? 0, icon: XCircle, className: 'text-red-600' },
        { title: 'Last Sync', value: overview.lastSyncedAt ? moment(overview.lastSyncedAt).format('DD/MM HH:mm') : 'Never', icon: CloudUpload, className: 'text-blue-600' },
    ];

    return (
        <Card className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div key={stat.title} className="px-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
                            <Icon className={`h-5 w-5 ${stat.className}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">{stat.value}</div>
                        </CardContent>
                    </div>
                );
            })}
        </Card>
    );
}