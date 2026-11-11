import { useMemo, useState } from 'react';
import moment from 'moment-timezone';
import { toast } from 'sonner';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Eye, History, Loader2, Pencil, Play, Plus, RefreshCw, Square } from 'lucide-react';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetWarehouses } from '@/api-queries/warehouse';
import {
    type ReplenishmentAutomationExecution,
    type ReplenishmentAutomationSchedule,
    AUTOMATION_EXECUTION_STATUSES,
    getAutomationExecutionCount,
    getAutomationExecutionDocuments,
    getAutomationExecutionStatus,
    getAutomationExecutions,
    getAutomationScheduleCount,
    getAutomationSchedules,
    useGetAutomationHistory,
    useGetAutomationSchedules,
    useRetryAutomationExecution,
    useSaveAutomationSchedule,
} from '@/api-queries/replenishment-automation';
import { ReplenishmentTabs } from '../components';
import {
    AutomationEnabledBadge,
    AutomationExecutionStatusBadge,
    automationOutputLabel,
    automationScopeLabel,
} from './components';
import ScheduleDialog from './schedule-dialog';
import AutomationDocumentDialog, { type AutomationDocumentTarget } from './document-dialog';

const apiMessage = (err: unknown) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
    (err as Error)?.message ||
    'Something went wrong';

const fmtDateTime = (value?: string | null) => (value ? moment(value).format('DD MMM YY, HH:mm') : '—');

const AUTOMATION_MODULE_CODE = SYSTEM_MODULES.PROCESSING.REPLENISHMENT_RECOMMENDATIONS.AUTOMATION.code;

const AutomationScreen = () => {
    const userGroupPermissions = useUsersPermissions();
    const user = useAuthUser((state) => state.user);

    // Store / debtor and warehouse logins may read their own schedules but must never
    // manage them: only company / admin users configure automation.
    const isCompanyUser = user?.userType !== 'COMPANY-DEBTOR-USER' && user?.userType !== 'WAREHOUSE-USER';
    const canManage =
        isCompanyUser &&
        hasPermission(userGroupPermissions, AUTOMATION_MODULE_CODE, [SYSTEM_PERMISSIONS.CREATE]);

    const stores = useDebtorList({ limit: 500 })?.data?.data?.rows;
    const warehousesRes = useGetWarehouses({ limit: 500 })?.data?.data;
    const warehouses: { id: string; name: string }[] = Array.isArray(warehousesRes) ? warehousesRes : [];

    const [view, setView] = useState<'schedules' | 'history'>('schedules');
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [historyPagination, setHistoryPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [historyScheduleId, setHistoryScheduleId] = useState<string>('');
    const [historyStatus, setHistoryStatus] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<ReplenishmentAutomationSchedule | null>(null);
    const [documentTarget, setDocumentTarget] = useState<AutomationDocumentTarget | null>(null);

    // --------------------------------------- Schedules ---------------------------------------

    const schedulesQuery = useGetAutomationSchedules({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const schedules = useMemo(() => getAutomationSchedules(schedulesQuery.data), [schedulesQuery.data]);
    const scheduleCount = useMemo(() => getAutomationScheduleCount(schedulesQuery.data), [schedulesQuery.data]);

    const saveSchedule = useSaveAutomationSchedule();

    const storeName = (id?: string | null) => (stores || []).find((d) => d.id === id)?.name || id || '';
    const warehouseName = (id?: string | null) => warehouses.find((w) => w.id === id)?.name || id || '';

    const targetLabel = (schedule: ReplenishmentAutomationSchedule) => {
        const scope = automationScopeLabel(schedule.scopeType);
        if (schedule.scopeType === 'STORE') {
            return `${scope}: ${schedule.companyDebtorName || storeName(schedule.companyDebtorId) || '—'}`;
        }
        if (schedule.scopeType === 'WAREHOUSE') {
            return `${scope}: ${schedule.warehouseName || warehouseName(schedule.warehouseId) || '—'}`;
        }
        return scope;
    };

    const sourceLabel = (schedule: ReplenishmentAutomationSchedule) => {
        const company = schedule.sourceCompanyName || schedule.sourceCompanyId || '';
        const warehouse = schedule.sourceWarehouseName || warehouseName(schedule.sourceWarehouseId);
        if (schedule.sourceWarehouseId) return `${company} · ${warehouse}`;
        return `${company || '—'} · Company / DC`;
    };

    const frequencyLabel = (schedule: ReplenishmentAutomationSchedule) => {
        const frequency = (schedule.frequency || '').toUpperCase();
        if (frequency !== 'WEEKLY') return frequency || '—';
        const weekday = typeof schedule.weekday === 'number' ? schedule.weekday : null;
        const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return weekday === null ? 'Weekly' : `Weekly · ${names[weekday] || ''}`;
    };

    const toggleSchedule = (schedule: ReplenishmentAutomationSchedule) => {
        if (!schedule.id) return;
        const nextEnabled = !schedule.enabled;
        saveSchedule.mutate(
            { id: schedule.id, enabled: nextEnabled },
            {
                onSuccess: (res) => {
                    if (res?.success === false) {
                        toast.error(res.message || 'Failed to update the schedule');
                        return;
                    }
                    toast.success(nextEnabled ? 'Schedule enabled' : 'Schedule paused');
                },
                onError: (error: unknown) => toast.error(apiMessage(error)),
            },
        );
    };

    const scheduleColumns: ColumnDef<ReplenishmentAutomationSchedule>[] = [
        {
            id: 'name',
            header: 'Schedule',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="font-medium">{row.original.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                        {automationOutputLabel(row.original.outputType)}
                    </div>
                </div>
            ),
        },
        { id: 'target', header: 'Target', cell: ({ row }) => targetLabel(row.original) },
        { id: 'source', header: 'Source', cell: ({ row }) => sourceLabel(row.original) },
        { id: 'frequency', header: 'Frequency', cell: ({ row }) => frequencyLabel(row.original) },
        {
            id: 'localTime',
            header: 'Local Time',
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.localTime || '—'}</span>
            ),
        },
        { id: 'timezone', header: 'Timezone', cell: ({ row }) => row.original.timezone || '—' },
        {
            id: 'enabled',
            header: 'Enabled',
            cell: ({ row }) => <AutomationEnabledBadge enabled={!!row.original.enabled} />,
        },
        {
            id: 'nextRun',
            header: 'Next Run',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="font-mono tabular-nums">{fmtDateTime(row.original.nextRunAt)}</div>
                    {row.original.lastStatus && (
                        <div className="text-xs text-muted-foreground">
                            Last run: {String(row.original.lastStatus).toUpperCase()}
                        </div>
                    )}
                </div>
            ),
        },
        ...(canManage
            ? [
                  {
                      id: 'actions',
                      header: '',
                      cell: ({ row }: { row: { original: ReplenishmentAutomationSchedule } }) => (
                          <div className="flex items-center gap-1">
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Edit schedule"
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setEditing(row.original);
                                      setDialogOpen(true);
                                  }}
                              >
                                  <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title={row.original.enabled ? 'Pause schedule' : 'Enable schedule'}
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSchedule(row.original);
                                  }}
                              >
                                  {row.original.enabled ? (
                                      <Square className="h-3.5 w-3.5" />
                                  ) : (
                                      <Play className="h-3.5 w-3.5" />
                                  )}
                              </Button>
                          </div>
                      ),
                  } as ColumnDef<ReplenishmentAutomationSchedule>,
              ]
            : []),
    ];

    // --------------------------------------- Execution history ---------------------------------------

    const historyProps = useMemo(
        () => ({
            scheduleId: historyScheduleId || null,
            limit: historyPagination.pageSize,
            offset: historyPagination.pageIndex * historyPagination.pageSize,
        }),
        [historyScheduleId, historyPagination.pageSize, historyPagination.pageIndex],
    );

    const historyQuery = useGetAutomationHistory(historyProps);
    const historyRows = useMemo(() => getAutomationExecutions(historyQuery.data), [historyQuery.data]);
    const historyCount = useMemo(() => getAutomationExecutionCount(historyQuery.data), [historyQuery.data]);

    // The status filter is applied on the loaded rows: the history endpoint only
    // supports the schedule filter.
    const visibleHistoryRows = useMemo(
        () => (historyStatus ? historyRows.filter((row) => getAutomationExecutionStatus(row) === historyStatus) : historyRows),
        [historyRows, historyStatus],
    );

    const retryExecution = useRetryAutomationExecution();

    const handleRetry = (execution: ReplenishmentAutomationExecution) => {
        if (!execution.id) return;
        retryExecution.mutate(execution.id, {
            onSuccess: (res) => {
                if (res?.success === false) {
                    toast.error(res.message || 'The execution could not be retried');
                    return;
                }
                toast.success('The execution was queued again');
            },
            onError: (error: unknown) => toast.error(apiMessage(error)),
        });
    };

    const openDocument = (documentType?: string, documentId?: string) => {
        if (!documentId) return;
        const kind = (documentType || '').toUpperCase();
        if (kind === 'STORE_ORDER') {
            setDocumentTarget({ kind: 'STORE_ORDER', id: documentId });
            return;
        }
        if (kind === 'PURCHASE_ORDER') {
            setDocumentTarget({ kind: 'PURCHASE_ORDER', id: documentId });
            return;
        }
        toast.error('This document type cannot be opened from here');
    };

    const executionColumns: ColumnDef<ReplenishmentAutomationExecution>[] = [
        {
            id: 'schedule',
            header: 'Schedule',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <div className="font-medium">{row.original.scheduleName || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.scheduleId ? String(row.original.scheduleId).slice(0, 8) : ''}
                    </div>
                </div>
            ),
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => <AutomationExecutionStatusBadge status={getAutomationExecutionStatus(row.original)} />,
        },
        {
            id: 'attempts',
            header: 'Attempts',
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{row.original.attemptCount ?? 0}</span>
            ),
        },
        {
            id: 'reason',
            header: 'Reason',
            cell: ({ row }) => (
                <div className="max-w-[320px] space-y-0.5">
                    <div
                        className="truncate text-xs"
                        title={row.original.reason || row.original.errorMessage || ''}
                    >
                        {row.original.reason || row.original.errorMessage || '—'}
                    </div>
                    {row.original.status === 'FAILED' && row.original.errorMessage && row.original.reason && (
                        <div className="truncate text-xs text-red-600" title={row.original.errorMessage}>
                            {row.original.errorMessage}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'startedAt',
            header: 'Started',
            cell: ({ row }) => <span className="font-mono tabular-nums">{fmtDateTime(row.original.startedAt)}</span>,
        },
        {
            id: 'finishedAt',
            header: 'Finished',
            cell: ({ row }) => (
                <span className="font-mono tabular-nums">{fmtDateTime(row.original.finishedAt)}</span>
            ),
        },
        {
            id: 'recommendation',
            header: 'Recommendation',
            cell: ({ row }) =>
                row.original.recommendationRunId ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                            setDocumentTarget({
                                kind: 'RECOMMENDATION',
                                id: row.original.recommendationRunId as string,
                            })
                        }
                    >
                        <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                ) : (
                    '—'
                ),
        },
        {
            id: 'documents',
            header: 'Generated Documents',
            cell: ({ row }) => {
                const documents = getAutomationExecutionDocuments(row.original);
                if (!documents.length) return '—';
                return (
                    <div className="flex flex-col gap-1">
                        {documents.map((doc, index) => (
                            <Button
                                key={`${doc.documentId || 'doc'}-${index}`}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => openDocument(doc.documentType, doc.documentId)}
                            >
                                {automationOutputLabel(doc.documentType)}
                                {doc.documentNumber ? ` · ${doc.documentNumber}` : ''}
                            </Button>
                        ))}
                    </div>
                );
            },
        },
        ...(canManage
            ? [
                  {
                      id: 'actions',
                      header: '',
                      cell: ({ row }: { row: { original: ReplenishmentAutomationExecution } }) =>
                          getAutomationExecutionStatus(row.original) === 'FAILED' ? (
                              <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-xs"
                                  disabled={retryExecution.isPending}
                                  onClick={() => handleRetry(row.original)}
                              >
                                  {retryExecution.isPending ? (
                                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  Retry
                              </Button>
                          ) : null,
                  } as ColumnDef<ReplenishmentAutomationExecution>,
              ]
            : []),
    ];

    // --------------------------------------- Views ---------------------------------------

    const viewTabs = [
        { id: 'schedules' as const, label: 'Schedules' },
        { id: 'history' as const, label: 'Execution History' },
    ];

    return (
        <PageLoader isLoading={schedulesQuery.isLoading}>
            <div className="space-y-3">
                <ReplenishmentTabs active="automation" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <div className="text-sm font-semibold">Replenishment automation</div>
                        <p className="text-xs text-muted-foreground">
                            Schedules calculate the replenishment on the backend and create the matching draft documents.
                            Automation never invoices, reserves, dispatches or receives stock — the documents continue
                            through the normal order workflow.
                        </p>
                    </div>

                    {canManage && view === 'schedules' && (
                        <Button
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => {
                                setEditing(null);
                                setDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" /> New Schedule
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-4 border-b">
                    {viewTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setView(tab.id)}
                            className={`-mb-px border-b-2 px-1 py-2 text-sm transition-colors ${
                                view === tab.id
                                    ? 'border-blue-600 font-medium text-blue-700'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {view === 'schedules' && (
                    <>
                        {!canManage && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                                You can view the schedules but only a company / admin user with the automation permission
                                can create or change them.
                            </div>
                        )}

                        <DataTable
                            query={schedulesQuery}
                            data={schedules}
                            columns={scheduleColumns}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalRowCount={scheduleCount}
                            getRowId={(row, index) => row.id || String(index)}
                            rowClassName={(row) => (row.id === editing?.id ? 'bg-blue-50' : '')}
                            onRowClick={(row) => {
                                setHistoryScheduleId(row.original.id || '');
                                setHistoryPagination((p) => ({ ...p, pageIndex: 0 }));
                                setView('history');
                            }}
                            emptyMessage={
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    No replenishment schedules yet. Create one to let the backend replenish a store or a
                                    supplier automatically.
                                </div>
                            }
                        />

                        {schedules.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                                Select a schedule to open its execution history.
                            </p>
                        )}
                    </>
                )}

                {view === 'history' && (
                    <>
                        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/20 p-2">
                            <div>
                                <Label className="text-xs text-muted-foreground">Schedule</Label>
                                <select
                                    value={historyScheduleId}
                                    onChange={(e) => {
                                        setHistoryScheduleId(e.target.value);
                                        setHistoryPagination((p) => ({ ...p, pageIndex: 0 }));
                                    }}
                                    className="mt-1 h-8 w-[240px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                >
                                    <option value="">All schedules</option>
                                    {schedules.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name || '—'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs text-muted-foreground">Status</Label>
                                <select
                                    value={historyStatus}
                                    onChange={(e) => setHistoryStatus(e.target.value)}
                                    className="mt-1 h-8 w-[150px] rounded-md border border-input bg-background px-2 text-sm focus:outline-none"
                                >
                                    <option value="">All</option>
                                    {AUTOMATION_EXECUTION_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {historyScheduleId && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mb-0.5 flex items-center gap-1"
                                    onClick={() => {
                                        setHistoryScheduleId('');
                                        setHistoryPagination((p) => ({ ...p, pageIndex: 0 }));
                                    }}
                                >
                                    <History className="h-3.5 w-3.5" /> Show all schedules
                                </Button>
                            )}
                        </div>

                        <DataTable
                            query={historyQuery}
                            data={visibleHistoryRows}
                            columns={executionColumns}
                            pagination={historyPagination}
                            setPagination={setHistoryPagination}
                            totalRowCount={historyCount}
                            getRowId={(row, index) => row.id || String(index)}
                            emptyMessage={
                                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                    No executions yet. The history shows what each scheduled run created, skipped or
                                    failed.
                                </div>
                            }
                        />

                        <p className="text-[11px] text-muted-foreground">
                            A retry re-runs the same execution with its existing id, so no duplicate order is created.
                            When a schedule was edited or paused in the meantime, wait for the next scheduled run instead.
                        </p>
                    </>
                )}
            </div>

            {dialogOpen && (
                <ScheduleDialog
                    key={editing?.id || 'new'}
                    editing={editing}
                    onClose={() => {
                        setDialogOpen(false);
                        setEditing(null);
                    }}
                />
            )}

            {documentTarget && (
                <AutomationDocumentDialog target={documentTarget} onClose={() => setDocumentTarget(null)} />
            )}
        </PageLoader>
    );
};

export default AutomationScreen;
