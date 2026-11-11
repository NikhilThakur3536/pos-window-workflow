'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetApprovalsSummary, type ApprovalSummaryFilters, type ApprovalStatus } from '@/api-queries/security';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import TableDateFilter from '@/components/table/table-date-filter';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { APPROVAL_STATUSES } from '@/api-queries/security';
import useTableFilters from '@/components/list-only-table/use-table-filters';

const ApprovalsSummary = () => {
    type SummaryFilters = ApprovalSummaryFilters & { fromDate?: string; toDate?: string };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
    } = useTableFilters<SummaryFilters>({
        status: [],
        actionCode: '',
        resourceType: '',
        fromDate: '',
        toDate: '',
    });

    const query = useGetApprovalsSummary({
        ...appliedFilters,
        dateFrom: appliedFilters.fromDate,
        dateTo: appliedFilters.toDate,
        ...(appliedFilters.status && appliedFilters.status.length ? { status: appliedFilters.status } : {}),
    });

    const summary = query.data?.data;

    const toggleStatus = (status: string) => {
        const current = filters.status || [];
        const next = current.includes(status as ApprovalStatus)
            ? current.filter((s) => s !== (status as ApprovalStatus))
            : [...current, status as ApprovalStatus];
        setFilters({ ...filters, status: next });
    };

    const statusCounts = summary?.statusCounts || {};
    const actionRows = summary?.byAction || [];

    const totalByAction = actionRows.reduce((acc, row) => acc + (row.total || 0), 0);

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
                    <div className="min-w-[200px]">
                        <Label className="text-xs">Status</Label>
                        <div className="mt-1 flex flex-wrap gap-2">
                            {APPROVAL_STATUSES.map((s) => (
                                <label key={s} className="flex items-center gap-1 text-xs">
                                    <Checkbox
                                        checked={(filters.status || []).includes(s)}
                                        onCheckedChange={() => toggleStatus(s)}
                                    />
                                    {s}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="min-w-[160px]">
                        <Label className="text-xs">Action Code</Label>
                        <Input
                            placeholder="e.g. POS_VOID_SALE"
                            value={filters.actionCode || ''}
                            onChange={(e) => setFilters({ ...filters, actionCode: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    <div className="min-w-[150px]">
                        <Label className="text-xs">Resource Type</Label>
                        <Input
                            placeholder="e.g. SALE"
                            value={filters.resourceType || ''}
                            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                            className="mt-1"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-5">
                        <TableDateFilter filters={filters} setFilters={setFilters} />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={clearFilters}
                            showClearButton={showClearButton}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Status Counts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {(Object.keys(statusCounts).length ? Object.keys(statusCounts) : APPROVAL_STATUSES).map(
                                    (status) => (
                                        <div
                                            key={status}
                                            className="flex items-center justify-between rounded-md border px-3 py-2"
                                        >
                                            <span className="text-sm font-medium">{status}</span>
                                            <span className="text-lg font-bold tabular-nums">
                                                {statusCounts[status] ?? 0}
                                            </span>
                                        </div>
                                    ),
                                )}
                                <div className="mt-2 flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                                    <span className="text-sm font-semibold">Total</span>
                                    <span className="text-lg font-bold tabular-nums">{summary?.totalRequests ?? 0}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md border border-red-100 bg-red-50/60 px-3 py-2">
                                    <span className="text-sm font-medium">Authentication failures</span>
                                    <span className="text-lg font-bold tabular-nums text-red-600">
                                        {summary?.authenticationFailureCount ?? 0}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Action-wise Counts</CardTitle>
                        </CardHeader>
                        <CardContent className="max-h-[320px] overflow-y-auto">
                            {actionRows.length ? (
                                <div className="space-y-2">
                                    {actionRows.map((row) => (
                                        <div
                                            key={row.actionId || row.actionCode}
                                            className="rounded-md border px-3 py-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{row.actionName || '—'}</span>
                                                <span className="text-base font-bold tabular-nums">{row.total ?? 0}</span>
                                            </div>
                                            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                {row.actionCode} · pending {row.pending ?? 0} · approved{' '}
                                                {row.approved ?? 0} · rejected {row.rejected ?? 0} · cancelled{' '}
                                                {row.cancelled ?? 0} · expired {row.expired ?? 0} · consumed{' '}
                                                {row.consumed ?? 0}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2">
                                        <span className="text-sm font-medium">Total</span>
                                        <span className="text-base font-bold tabular-nums">{totalByAction}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-6 text-center text-sm text-muted-foreground">No data</div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Requester Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summary?.byRequestedBy?.length ? (
                                    <div className="space-y-2">
                                        {summary.byRequestedBy.slice(0, 10).map((row, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-md border px-3 py-2"
                                            >
                                                <span className="text-sm">{row.name || row.email || row.userId || '—'}</span>
                                                <span className="text-base font-bold tabular-nums">{row.total ?? 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center text-sm text-muted-foreground">No data</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Approver Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {summary?.byApprovedBy?.length ? (
                                    <div className="space-y-2">
                                        {summary.byApprovedBy.slice(0, 10).map((row, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between rounded-md border px-3 py-2"
                                            >
                                                <span className="text-sm">{row.name || row.email || row.userId || '—'}</span>
                                                <span className="text-base font-bold tabular-nums">{row.total ?? 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center text-sm text-muted-foreground">No data</div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Authentication</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                        <span className="text-sm font-medium">Failed requests</span>
                                        <span className="text-lg font-bold tabular-nums text-red-600">
                                            {summary?.failedRequestCount ?? 0}
                                        </span>
                                    </div>
                                    <div className="rounded-md border px-3 py-2">
                                        <div className="text-sm font-medium">By method</div>
                                        {summary?.byAuthenticationMethod &&
                                        Object.keys(summary.byAuthenticationMethod).length ? (
                                            <div className="mt-1 space-y-1">
                                                {Object.entries(summary.byAuthenticationMethod).map(([method, count]) => (
                                                    <div key={method} className="flex items-center justify-between text-sm">
                                                        <span className="text-muted-foreground">{method}</span>
                                                        <span className="font-bold tabular-nums">{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-2 text-xs text-muted-foreground">No data</div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageLoader>
    );
};

export default ApprovalsSummary;
