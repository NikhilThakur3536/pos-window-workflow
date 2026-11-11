import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { BellRing, Check, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    DEFAULT_SUPPLIER_DEAL_ALERT_WINDOWS,
    SupplierDealAlert,
    SupplierDealAlertSeverity,
    useAcknowledgeSupplierDealAlert,
    useGenerateSupplierDealAlerts,
    useGetSupplierDealAlertSummary,
    useGetSupplierDealAlerts,
} from '@/api-queries/goods-receiving/supplier-deals';
import moment from 'moment';

const SEVERITY_BADGE_CLASS: Record<SupplierDealAlertSeverity, string> = {
    INFO: 'bg-sky-100 text-sky-800',
    WARNING: 'bg-amber-100 text-amber-800',
    CRITICAL: 'bg-red-100 text-red-700',
};

const SEVERITY_LABELS: Record<SupplierDealAlertSeverity, string> = {
    INFO: 'Info',
    WARNING: 'Warning',
    CRITICAL: 'Critical',
};

const SupplierDealAlertsScreen: React.FC = () => {
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [includeExpired, setIncludeExpired] = useState(false);

    const initialFilters = { acknowledged: 'false' };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const listQuery = useGetSupplierDealAlerts({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        alertType: 'EXPIRING',
        ...(appliedFilters?.acknowledged === 'true'
            ? { acknowledged: true }
            : appliedFilters?.acknowledged === 'false'
              ? { acknowledged: false }
              : {}),
    });

    const summaryQuery = useGetSupplierDealAlertSummary();
    const generateMutation = useGenerateSupplierDealAlerts();
    const acknowledgeMutation = useAcknowledgeSupplierDealAlert();

    const summary = summaryQuery?.data?.data;
    const alerts = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const handleGenerate = () => {
        generateMutation.mutate(
            {
                alertWindows: [...DEFAULT_SUPPLIER_DEAL_ALERT_WINDOWS],
                includeExpired,
                source: 'MANUAL',
            },
            {
                onSuccess: (response) => {
                    if (response.success) {
                        const created = response.data?.created;
                        toast.success(
                            created != null
                                ? `Alert generation complete: ${created} new alert${created === 1 ? '' : 's'}`
                                : 'Supplier deal alerts generated',
                        );
                    } else {
                        toast.error(response.message || 'Failed to generate alerts');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const handleAcknowledge = (alert: SupplierDealAlert) => {
        if (!alert.id) return;
        acknowledgeMutation.mutate(
            { id: alert.id },
            {
                onSuccess: (response) => {
                    if (response.success) toast.success('Alert acknowledged');
                    else toast.error(response.message || 'Failed to acknowledge alert');
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Internal Server Error!'),
            },
        );
    };

    const columns: ColumnDef<SupplierDealAlert>[] = [
        {
            accessorKey: 'CompanyStockDetail.description',
            header: 'Product',
            cell: ({ row }) => {
                const stock = row.original.CompanyStockDetail;
                return (
                    <div className="space-y-0.5">
                        <div className="font-medium">{stock?.description || '—'}</div>
                        <div className="text-muted-foreground text-xs">{stock?.itemCode || ''}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'CompanyCreditor.name',
            header: 'Supplier',
            cell: ({ row }) => {
                const creditor = row.original.CompanyCreditor;
                return (
                    <div className="space-y-0.5">
                        <div className="font-medium">{creditor?.name || '—'}</div>
                        <div className="text-muted-foreground text-xs">{creditor?.accountNumber || ''}</div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'message',
            header: 'Alert',
            cell: ({ row }) => <div className="max-w-[320px] text-xs">{row.original.message || '—'}</div>,
        },
        {
            accessorKey: 'severity',
            header: 'Severity',
            cell: ({ row }) => {
                const severity = (row.original.severity || 'INFO') as SupplierDealAlertSeverity;
                return (
                    <Badge variant="outline" className={SEVERITY_BADGE_CLASS[severity]}>
                        {SEVERITY_LABELS[severity]}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'dealEndDate',
            header: 'Deal End Date',
            cell: ({ row }) => (
                <div className="text-xs">
                    <div>{row.original.dealEndDate ? moment(row.original.dealEndDate).format('DD MMM, YY') : '—'}</div>
                    {row.original.daysToExpiry != null && (
                        <div className="text-muted-foreground">
                            {row.original.daysToExpiry < 0
                                ? `Expired ${Math.abs(row.original.daysToExpiry)} day(s) ago`
                                : `${row.original.daysToExpiry} day(s) left`}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'acknowledged',
            header: 'Status',
            cell: ({ row }) =>
                row.original.acknowledged ? (
                    <Badge variant="outline" className="bg-gray-100 text-gray-600">
                        Acknowledged
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-sky-100 text-sky-800">
                        Open
                    </Badge>
                ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {!row.original.acknowledged && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={acknowledgeMutation.isPending}
                            onClick={() => handleAcknowledge(row.original)}
                        >
                            <Check className="h-3.5 w-3.5" />
                            Acknowledge
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <h1 className="text-base font-semibold">Supplier Deal Alerts</h1>
                        <p className="text-muted-foreground text-xs">
                            Deals are flagged ahead of expiry using the {DEFAULT_SUPPLIER_DEAL_ALERT_WINDOWS.join(', ')}{' '}
                            day alert windows. Generating alerts is safe to repeat — existing open alerts are not
                            duplicated.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 pb-2 text-xs">
                            <Checkbox
                                checked={includeExpired}
                                onCheckedChange={(checked) => setIncludeExpired(!!checked)}
                            />
                            Include expired
                        </label>
                        <Button
                            onClick={handleGenerate}
                            disabled={generateMutation.isPending}
                            className="flex items-center gap-2"
                        >
                            {generateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Generate Alerts
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Total Alerts</p>
                            <p className="font-mono text-lg font-semibold tabular-nums">{summary?.total ?? '—'}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Open</p>
                            <p className="font-mono text-lg font-semibold text-sky-700 tabular-nums">
                                {summary?.unacknowledged ?? '—'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Acknowledged</p>
                            <p className="font-mono text-lg font-semibold text-gray-600 tabular-nums">
                                {summary?.acknowledged ?? '—'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-1 p-4">
                            <p className="text-muted-foreground text-xs tracking-wide uppercase">Critical</p>
                            <p className="font-mono text-lg font-semibold text-red-700 tabular-nums">
                                {summary?.bySeverity?.CRITICAL ?? '—'}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <DataTable
                    query={listQuery}
                    data={alerts}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-[200px]">
                            <Label className="text-xs">Acknowledgement</Label>
                            <div className="mt-1">
                                <SelectPopover
                                    title="Acknowledgement"
                                    onlyTitle="All Alerts"
                                    selectedValue={filters.acknowledged || ''}
                                    options={[
                                        { label: 'All Alerts', value: '' },
                                        { label: 'Open Only', value: 'false' },
                                        { label: 'Acknowledged', value: 'true' },
                                    ]}
                                    onSelect={(value) => setFilters({ ...filters, acknowledged: String(value || '') })}
                                />
                            </div>
                        </div>
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                        <div className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
                            <BellRing className="h-3.5 w-3.5" />
                            Notifications are raised for the Administrator role.
                        </div>
                    </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default SupplierDealAlertsScreen;
