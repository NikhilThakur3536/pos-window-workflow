import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    useGetActivityList,
    useGetActivityFilters,
    type ActivityListParams,
} from '@/api-queries/user-monitoring/activity';
import moment from 'moment';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const UserActivityModule = () => {
    const queryClient = useQueryClient();
    const { appliedFilters, handleFilters, pagination, setPagination } = useTableFilters<ActivityListParams>({
        dateFrom: moment().startOf('day').toISOString(),
        dateTo: moment().endOf('day').toISOString(),
    });
    const [resultFilter, setResultFilter] = useState<string>('');
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const filtersQuery = useGetActivityFilters({
        dateFrom: moment().format('YYYY-MM-DD'),
        dateTo: moment().format('YYYY-MM-DD'),
        includeReadOnly: true,
    });

    const listQuery = useGetActivityList(
        {
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
            ...(resultFilter ? { result: resultFilter as ActivityListParams['result'] } : {}),
            ...appliedFilters,
        },
    );

    const rows = (listQuery.data as any)?.data?.rows || (listQuery.data as any)?.rows || [];
    const count = (listQuery.data as any)?.data?.count || (listQuery.data as any)?.count || rows.length;
    const filterOptions = (filtersQuery.data as any)?.data || {};

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'activity'] });
        setLastRefreshed(new Date());
        toast.success('Refreshed');
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'occurredAt',
            header: 'Time',
            cell: ({ row }) => <div>{row.original.occurredAt ? moment(row.original.occurredAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>,
        },
        {
            accessorKey: 'user',
            header: 'User',
            cell: ({ row }) => {
                const r = row.original;
                const userName = r.user ? [r.user.firstName, r.user.surname].filter(Boolean).join(' ') : r.userId;
                const staff = r.user?.staffNumber;
                return (
                    <div>
                        <div>{userName || '-'}</div>
                        {staff != null && <div className="text-xs text-muted-foreground">#{staff}</div>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'action',
            header: 'Action',
            cell: ({ row }) => {
                const action = row.original.action || row.original.actionCode || '-';
                return <div className="font-medium">{action}</div>;
            },
        },
        {
            accessorKey: 'module',
            header: 'Module',
            cell: ({ row }) => <div>{row.original.module || '-'}</div>,
        },
        {
            accessorKey: 'resource',
            header: 'Resource',
            cell: ({ row }) => (
                <div>
                    {row.original.resourceId || '-'}
                    {row.original.resource ? <div className="text-xs text-muted-foreground">{row.original.resource}</div> : null}
                </div>
            ),
        },
        {
            accessorKey: 'summary',
            header: 'Summary',
            cell: ({ row }) => <div className="max-w-xs truncate">{row.original.summary || row.original.description || '-'}</div>,
        },
        {
            accessorKey: 'result',
            header: 'Result',
            cell: ({ row }) => {
                const result = row.original.result || row.original.status || '-';
                const isSuccess = result === 'SUCCESS' || result === 'OK';
                const isFailed = result === 'FAILURE' || result === 'FAILED' || result === 'ERROR';
                return (
                    <Badge
                        className={`${
                            isSuccess
                                ? 'bg-green-100 text-green-800'
                                : isFailed
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        } px-2 py-1 text-xs font-medium`}
                    >
                        {isSuccess ? <CheckCircle className="h-3 w-3 mr-1" /> : isFailed ? <XCircle className="h-3 w-3 mr-1" /> : null}
                        {result}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'ipAddress',
            header: 'IP',
            cell: ({ row }) => <div>{row.original.ipAddress || '-'}</div>,
        },
    ];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Activity</h1>
                    <p className="text-sm text-muted-foreground mt-1">Track user actions and API activity across the system · Last refreshed: {lastRefreshed.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <div className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm text-blue-700">
                        <Activity className="h-4 w-4" />
                        <span>Live monitoring</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{count}</div>
                        <p className="text-xs text-muted-foreground mt-1">In selected period</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Successful</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {rows.filter((r: any) => r.result === 'SUCCESS' || r.result === 'OK').length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Completed actions</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {rows.filter((r: any) => r.result === 'FAILURE' || r.result === 'FAILED' || r.result === 'ERROR').length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Failed actions</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        query={listQuery}
                        data={rows}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={count}
                    >
                        <div className="mb-6 rounded-lg border bg-card/50 p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span className="text-sm font-medium">Filters</span>
                            </div>
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Module</Label>
                                    <Select value={appliedFilters.module || 'ALL'} onValueChange={(v) => handleFilters({ ...appliedFilters, module: v === 'ALL' ? undefined : v })}>
                                        <SelectTrigger className="h-9 w-[180px] bg-background">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All</SelectItem>
                                            {(filterOptions.modules || []).map((m: string) => (
                                                <SelectItem key={m} value={m}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Action</Label>
                                    <Select value={appliedFilters.actionCode || 'ALL'} onValueChange={(v) => handleFilters({ ...appliedFilters, actionCode: v === 'ALL' ? undefined : v })}>
                                        <SelectTrigger className="h-9 w-[280px] bg-background">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All</SelectItem>
                                            {(filterOptions.actionCodes || []).map((a: any) => (
                                                <SelectItem key={a.code} value={a.code}>{a.label || a.code}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">User</Label>
                                    <Select value={appliedFilters.userId || 'ALL'} onValueChange={(v) => handleFilters({ ...appliedFilters, userId: v === 'ALL' ? undefined : v })}>
                                        <SelectTrigger className="h-9 w-[220px] bg-background">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All</SelectItem>
                                            {(filterOptions.users || []).map((u: any) => (
                                                <SelectItem key={u.id} value={u.id}>{[u.firstName, u.surname].filter(Boolean).join(' ')} {u.staffNumber ? `#${u.staffNumber}` : ''}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Resource Type</Label>
                                    <Select value={appliedFilters.resourceType || 'ALL'} onValueChange={(v) => handleFilters({ ...appliedFilters, resourceType: v === 'ALL' ? undefined : v })}>
                                        <SelectTrigger className="h-9 w-[180px] bg-background">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All</SelectItem>
                                            {(filterOptions.resourceTypes || []).map((r: string) => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Date From</Label>
                                    <Input
                                        type="datetime-local"
                                        className="h-9 w-[220px] bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:ml-auto"
                                        style={{ colorScheme: 'light' }}
                                        defaultValue={moment().startOf('day').format('YYYY-MM-DDTHH:mm')}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleFilters({ ...appliedFilters, dateFrom: new Date(e.target.value).toISOString() });
                                            } else {
                                                handleFilters({ ...appliedFilters, dateFrom: undefined });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Date To</Label>
                                    <Input
                                        type="datetime-local"
                                        className="h-9 w-[220px] bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:ml-auto"
                                        style={{ colorScheme: 'light' }}
                                        defaultValue={moment().endOf('day').format('YYYY-MM-DDTHH:mm')}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleFilters({ ...appliedFilters, dateTo: new Date(e.target.value).toISOString() });
                                            } else {
                                                handleFilters({ ...appliedFilters, dateTo: undefined });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Result</Label>
                                    <Select value={resultFilter || 'ALL'} onValueChange={(v) => setResultFilter(v === 'ALL' ? '' : v)}>
                                        <SelectTrigger className="w-[150px] h-9 bg-background">
                                            <SelectValue placeholder="All" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Results</SelectItem>
                                            {(filterOptions.results || ['SUCCESS', 'FAILED']).map((r: string) => (
                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </DataTable>
                </CardContent>
            </Card>
        </div>
    );
};

export default UserActivityModule;
