import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGetSessionsList, useGetSessionsSummary, useRevokeSession, useGetUserMonitoringConfiguration, useSaveUserMonitoringConfiguration } from '@/api-queries/user-monitoring/sessions';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import type { ColumnDef } from '@tanstack/react-table';
import { Activity, Users, UserCheck, UserX, AlertCircle, Clock, Settings, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useGetUsers } from '@/api-queries/user';
import { useDebounce } from '@/modules/common/hooks/usedebounce';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { hasPermission } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    ENDED: 'bg-gray-100 text-gray-800',
    LOGOUT: 'bg-gray-100 text-gray-800',
    REVOKED: 'bg-red-100 text-red-800',
};

const UserSessionsModule = () => {
    const queryClient = useQueryClient();
    const currentUser = useAuthUser((state) => state.user);
    const userGroupPermissions = useUsersPermissions();
    const canRevokeSessions = hasPermission(
        userGroupPermissions,
        SYSTEM_MODULES.UTILITIES.USER_MONITORING.USER_SESSIONS.code,
        [SYSTEM_PERMISSIONS.UPDATE],
    );
    const { filters, handleFilters, pagination, setPagination } =
        useTableFilters<any>({});
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [userSearch, setUserSearch] = useState('');
    const [userFilterOpen, setUserFilterOpen] = useState(false);
    const [selectedUserLabel, setSelectedUserLabel] = useState('');
    const debouncedUserSearch = useDebounce(userSearch, 300);
    const usersQuery = useGetUsers({
        limit: 10,
        offset: 0,
        ...(debouncedUserSearch.trim() ? { search: debouncedUserSearch.trim() } : {}),
    });
    const users = usersQuery.data?.data || [];

    const summaryQuery = useGetSessionsSummary();
    const listQuery = useGetSessionsList(
        {
            ...(statusFilter && statusFilter !== 'ALL' ? { status: statusFilter as any } : {}),
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
            ...(filters as any),
        },
    );
    const revokeMutation = useRevokeSession();
    const configQuery = useGetUserMonitoringConfiguration();
    const saveConfigMutation = useSaveUserMonitoringConfiguration();
    const [configOpen, setConfigOpen] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const summary = (summaryQuery.data as any)?.data || {};
    const rows = (listQuery.data as any)?.data?.rows || (listQuery.data as any)?.rows || [];
    const count = (listQuery.data as any)?.data?.count || (listQuery.data as any)?.count || 0;
    const config = (configQuery.data as any)?.data || {};

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'sessions'] });
        queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'activity'] });
        setLastRefreshed(new Date());
        toast.success('Refreshed');
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'user',
            header: 'User / Staff',
            cell: ({ row }) => {
                const r = row.original;
                const userName = r.user ? [r.user.firstName, r.user.surname].filter(Boolean).join(' ') : r.userId;
                const staff = r.user?.staffNumber;
                return (
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
                            {userName ? userName.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <div className="font-medium">{userName || '-'}</div>
                            {staff != null && <div className="text-xs text-muted-foreground">#{staff}</div>}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'ipAddress',
            header: 'IP Address',
            cell: ({ row }) => <div>{row.original.ipAddress || '-'}</div>,
        },
        {
            accessorKey: 'deviceName',
            header: 'Device',
            cell: ({ row }) => <div>{row.original.deviceName || row.original.deviceId || '-'}</div>,
        },
        {
            accessorKey: 'terminalName',
            header: 'Terminal',
            cell: ({ row }) => <div>{row.original.terminalName || row.original.terminalId || '-'}</div>,
        },
        {
            accessorKey: 'loginMethod',
            header: 'Login Method',
            cell: ({ row }) => <div>{row.original.loginMethod || '-'}</div>,
        },
        {
            accessorKey: 'loggedInAt',
            header: 'Login Time',
            cell: ({ row }) => <div>{row.original.loggedInAt ? moment(row.original.loggedInAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>,
        },
        {
            accessorKey: 'lastSeenAt',
            header: 'Last Seen',
            cell: ({ row }) => <div>{row.original.lastSeenAt ? moment(row.original.lastSeenAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>,
        },
        {
            accessorKey: 'expiresAt',
            header: 'Expires',
            cell: ({ row }) => <div>{row.original.expiresAt ? moment(row.original.expiresAt).format('YYYY-MM-DD HH:mm:ss') : '-'}</div>,
        },
        {
            accessorKey: 'logoutAt',
            header: 'Logout/End Time',
            cell: ({ row }) => (
                <div>
                    {row.original.endedAt || row.original.logoutAt
                        ? moment(row.original.endedAt || row.original.logoutAt).format('YYYY-MM-DD HH:mm:ss')
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const displayStatus = getDisplayStatus(row.original);
                return (
                    <Badge
                        className={`${
                            statusColors[displayStatus] || 'bg-gray-100 text-gray-800'
                        } px-2 py-1 text-xs font-medium`}
                    >
                        <span
                            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                                displayStatus === 'ACTIVE'
                                    ? 'bg-green-600'
                                    : displayStatus === 'INACTIVE'
                                    ? 'bg-yellow-600'
                                    : displayStatus === 'REVOKED'
                                    ? 'bg-red-600'
                                    : 'bg-gray-600'
                            }`}
                        />
                        {displayStatus}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => {
                const r = row.original;
                const displayStatus = getDisplayStatus(r);
                return (
                    <div className="flex items-center justify-center gap-1">
                        {canRevokeSessions &&
                            (displayStatus === 'ACTIVE' || displayStatus === 'INACTIVE') &&
                            r.userId !== currentUser?.id && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRevoke(r.id)}
                                    disabled={revokeMutation.isPending}
                                    className="h-7"
                                >
                                    Revoke
                                </Button>
                            )}
                    </div>
                );
            },
        },
    ];

    const handleRevoke = async (sessionId: string) => {
        if (!sessionId) return;
        if (!confirm('Are you sure you want to revoke this session?')) return;
        try {
            await revokeMutation.mutateAsync(sessionId);
            toast.success('Session revoked successfully');
            queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'sessions'] });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to revoke session');
        }
    };

    const getDisplayStatus = (row: any) => {
        const status = row.status;
        if (status === 'LOGOUT' || row.endReason === 'LOGOUT') {
            return 'LOGOUT';
        }
        if (status === 'REVOKED' || row.endReason === 'REVOKED') {
            return 'REVOKED';
        }
        if (status === 'EXPIRED') {
            return 'EXPIRED';
        }
        if (row.endedAt || row.logoutAt) {
            return status || 'ENDED';
        }
        if (row.isActive === true || status === 'ACTIVE') {
            if (row.lastSeenAt) {
                const diffMinutes = moment().diff(moment(row.lastSeenAt), 'minutes');
                if (diffMinutes > 2) return 'INACTIVE';
            }
            return 'ACTIVE';
        }
        if (row.lastSeenAt) {
            const diffMinutes = moment().diff(moment(row.lastSeenAt), 'minutes');
            if (diffMinutes > 2) return 'INACTIVE';
        }
        return status || 'ACTIVE';
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">User Sessions</h1>
                    <p className="text-sm text-muted-foreground">Monitor active and historical user sessions · Last refreshed: {lastRefreshed.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.total ?? count}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary.active ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{summary.inactive ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ended/Logged Out</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{summary.ended ?? summary.loggedOut ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Revoked/Expired</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{summary.revoked ?? summary.expired ?? 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Legacy filters removed */}

            <Card>
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
                                    <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                                    <Select value={statusFilter || 'ALL'} onValueChange={(v) => setStatusFilter(v === 'ALL' ? '' : v)}>
                                        <SelectTrigger className="w-[200px] h-9 bg-background">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Status</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                            <SelectItem value="EXPIRED">Expired</SelectItem>
                                            <SelectItem value="REVOKED">Revoked</SelectItem>
                                            <SelectItem value="LOGOUT">Logout</SelectItem>
                                            <SelectItem value="ENDED">Ended</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">User</Label>
                                    <Popover
                                        open={userFilterOpen}
                                        onOpenChange={(open) => {
                                            setUserFilterOpen(open);
                                            if (!open) setUserSearch('');
                                        }}
                                    >
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={userFilterOpen}
                                                className="h-9 w-[220px] justify-between bg-background font-normal"
                                            >
                                                <span className="truncate">
                                                    {selectedUserLabel ||
                                                        (filters as any)?.userId ||
                                                        'All users'}
                                                </span>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[260px] p-0" align="start">
                                            <Command shouldFilter={false}>
                                                <CommandInput
                                                    placeholder="Search users..."
                                                    value={userSearch}
                                                    onValueChange={setUserSearch}
                                                />
                                                <CommandList>
                                                    <CommandItem
                                                        value="ALL"
                                                        onSelect={() => {
                                                            handleFilters({
                                                                ...(filters as any),
                                                                userId: undefined,
                                                            });
                                                            setSelectedUserLabel('');
                                                            setPagination({
                                                                pageIndex: 0,
                                                                pageSize: pagination.pageSize,
                                                            });
                                                            setUserFilterOpen(false);
                                                            setUserSearch('');
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${
                                                                !(filters as any)?.userId ? 'opacity-100' : 'opacity-0'
                                                            }`}
                                                        />
                                                        All users
                                                    </CommandItem>
                                                    {users.map((user) => {
                                                        const label = [
                                                            [user.firstName, user.surname].filter(Boolean).join(' ') ||
                                                                user.email,
                                                            user.staffNumber ? `#${user.staffNumber}` : '',
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' ');
                                                        return (
                                                            <CommandItem
                                                                key={user.id}
                                                                value={`${label} ${user.email}`}
                                                                onSelect={() => {
                                                                    handleFilters({
                                                                        ...(filters as any),
                                                                        userId: user.id,
                                                                    });
                                                                    setSelectedUserLabel(label);
                                                                    setPagination({
                                                                        pageIndex: 0,
                                                                        pageSize: pagination.pageSize,
                                                                    });
                                                                    setUserFilterOpen(false);
                                                                    setUserSearch('');
                                                                }}
                                                            >
                                                                <Check
                                                                    className={`mr-2 h-4 w-4 ${
                                                                        (filters as any)?.userId === user.id
                                                                            ? 'opacity-100'
                                                                            : 'opacity-0'
                                                                    }`}
                                                                />
                                                                {label}
                                                            </CommandItem>
                                                        );
                                                    })}
                                                    {usersQuery.isFetching && (
                                                        <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Searching users...
                                                        </div>
                                                    )}
                                                    {!usersQuery.isFetching && users.length === 0 && (
                                                        <CommandEmpty>No users found.</CommandEmpty>
                                                    )}
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    {usersQuery.isError && (
                                        <p className="text-xs text-red-700">Could not load users for filtering.</p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Date From</Label>
                                    <Input
                                        type="datetime-local"
                                        className="w-[220px] h-9 bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:ml-auto"
                                        style={{ colorScheme: 'light' }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleFilters({ ...(filters as any), dateFrom: new Date(e.target.value).toISOString() });
                                            } else {
                                                const { dateFrom, ...rest } = (filters as any) || {};
                                                handleFilters(rest);
                                            }
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium text-muted-foreground">Date To</Label>
                                    <Input
                                        type="datetime-local"
                                        className="w-[220px] h-9 bg-background cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:ml-auto"
                                        style={{ colorScheme: 'light' }}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleFilters({ ...(filters as any), dateTo: new Date(e.target.value).toISOString() });
                                            } else {
                                                const { dateTo, ...rest } = (filters as any) || {};
                                                handleFilters(rest);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </DataTable>
                </CardContent>
            </Card>

            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Company Configuration</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Enable Attendance</Label>
                                <p className="text-xs text-muted-foreground">Enables fingerprint attendance recording</p>
                            </div>
                            <Switch
                                checked={!!config.attendanceEnabled}
                                onCheckedChange={(checked) => {
                                    saveConfigMutation.mutate(
                                        { ...(config || {}), attendanceEnabled: checked },
                                        {
                                            onSuccess: () => {
                                                queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'configuration'] });
                                                toast.success('Configuration updated');
                                            },
                                            onError: (err: any) => {
                                                toast.error(err?.response?.data?.message || 'Failed to update configuration');
                                            },
                                        },
                                    );
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Require Clock-in Before POS</Label>
                                <p className="text-xs text-muted-foreground">Requires clock-in before opening a till or creating a POS sale</p>
                            </div>
                            <Switch
                                checked={!!config.requireClockInBeforePos}
                                onCheckedChange={(checked) => {
                                    saveConfigMutation.mutate(
                                        { ...(config || {}), requireClockInBeforePos: checked },
                                        {
                                            onSuccess: () => {
                                                queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'configuration'] });
                                                toast.success('Configuration updated');
                                            },
                                            onError: (err: any) => {
                                                toast.error(err?.response?.data?.message || 'Failed to update configuration');
                                            },
                                        },
                                    );
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Session Idle Timeout (minutes)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={10080}
                                value={config.sessionIdleTimeoutMinutes ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? null : parseInt(e.target.value);
                                    saveConfigMutation.mutate(
                                        { ...(config || {}), sessionIdleTimeoutMinutes: val },
                                        {
                                            onSuccess: () => {
                                                queryClient.invalidateQueries({ queryKey: ['userMonitoring', 'configuration'] });
                                                toast.success('Configuration updated');
                                            },
                                            onError: (err: any) => {
                                                toast.error(err?.response?.data?.message || 'Failed to update configuration');
                                            },
                                        },
                                    );
                                }}
                                placeholder="null (disabled)"
                            />
                            <p className="text-xs text-muted-foreground">1-10080 minutes or leave empty to disable</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserSessionsModule;
