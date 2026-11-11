import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useGetAttendanceDays, useGetAttendanceEvents, useCorrectAttendance } from '@/api-queries/attendance';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetUsers } from '@/api-queries/user';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import moment from 'moment';
import { toast } from 'sonner';
import { v4 as uuidv4 } from '@/utils/uuid';
import { Edit, Calendar, Clock, Users, AlertTriangle, FileText } from 'lucide-react';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import type { ColumnDef } from '@tanstack/react-table';

const AttendanceReportsModule = () => {
    const currentUser = useAuthUser((state) => state.user);
    const isAdmin = currentUser?.administrator;
    const usersQuery = useGetUsers({ status: 'ACTIVE', limit: 1000, offset: 0 });
    const users = usersQuery.data?.data || [];

    const [dateRange, setDateRange] = useState({
        dateFrom: moment().startOf('month').format('YYYY-MM-DD'),
        dateTo: moment().endOf('month').format('YYYY-MM-DD'),
    });
    const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || '');
    const [viewHistory, setViewHistory] = useState(false);
    const [correctionOpen, setCorrectionOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [correctionData, setCorrectionData] = useState({
        occurredAt: '',
        reason: '',
    });
    const { pagination: daysPagination, setPagination: setDaysPagination } = useTableFilters<any>({});
    const { pagination: eventsPagination, setPagination: setEventsPagination } = useTableFilters<any>({});

    const daysQuery = useGetAttendanceDays({
        ...dateRange,
        userId: isAdmin ? selectedUserId || undefined : undefined,
        limit: daysPagination.pageSize,
        offset: daysPagination.pageIndex * daysPagination.pageSize,
    });
    const eventsQuery = useGetAttendanceEvents(
        {
            userId: selectedUserId,
            dateFrom: dateRange.dateFrom,
            dateTo: dateRange.dateTo,
            limit: eventsPagination.pageSize,
            offset: eventsPagination.pageIndex * eventsPagination.pageSize,
        },
        { enabled: viewHistory && !!selectedUserId },
    );
    const correctMutation = useCorrectAttendance();

    const days = (daysQuery.data as any)?.data?.rows || (daysQuery.data as any)?.rows || [];
    const daysCount = (daysQuery.data as any)?.data?.count || (daysQuery.data as any)?.count || days.length;
    const events = (eventsQuery.data as any)?.data?.rows || (eventsQuery.data as any)?.rows || [];
    const eventsCount = (eventsQuery.data as any)?.data?.count || (eventsQuery.data as any)?.count || events.length;

    const daysColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'employee',
            header: 'Employee',
            cell: ({ row }) => {
                const day = row.original;
                const userName = day.user ? [day.user.firstName, day.user.surname].filter(Boolean).join(' ') : '-';
                const staff = day.user?.staffNumber;
                return (
                    <div>
                        <div>{userName}</div>
                        {staff != null && <div className="text-xs text-muted-foreground">#{staff}</div>}
                    </div>
                );
            },
        },
        {
            accessorKey: 'attendanceDate',
            header: 'Date',
            cell: ({ row }) => <div>{row.original.attendanceDate || row.original.date || '-'}</div>,
        },
        {
            accessorKey: 'firstCheckIn',
            header: 'First Check-In',
            cell: ({ row }) => (
                <div>
                    {row.original.firstCheckInAt || row.original.firstCheckIn
                        ? moment(row.original.firstCheckInAt || row.original.firstCheckIn).format('HH:mm:ss')
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'lastCheckOut',
            header: 'Last Check-Out',
            cell: ({ row }) => (
                <div>
                    {row.original.lastCheckOutAt || row.original.lastCheckOut
                        ? moment(row.original.lastCheckOutAt || row.original.lastCheckOut).format('HH:mm:ss')
                        : '-'}
                </div>
            ),
        },
        {
            accessorKey: 'workedMinutes',
            header: 'Worked Minutes',
            cell: ({ row }) => <div>{row.original.workedMinutes ?? row.original.totalMinutes ?? 0}</div>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => <div>{row.original.status || '-'}</div>,
        },
        {
            accessorKey: 'review',
            header: 'Review',
            cell: ({ row }) => {
                const day = row.original;
                const reviewRequired = day.status === 'REVIEW_REQUIRED' || day.reviewRequired;
                return (
                    <div>
                        {reviewRequired && (
                            <Badge className="bg-orange-100 text-orange-800 px-2 py-1 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                REVIEW_REQUIRED
                            </Badge>
                        )}
                        {day.reviewReason && <div className="text-xs text-muted-foreground mt-1">{day.reviewReason}</div>}
                    </div>
                );
            },
        },
    ];

    const eventsColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'eventType',
            header: 'Event Type',
            cell: ({ row }) => <div>{row.original.eventType}</div>,
        },
        {
            accessorKey: 'occurredAt',
            header: 'Date/Time',
            cell: ({ row }) => <div>{moment(row.original.occurredAt).format('YYYY-MM-DD HH:mm:ss')}</div>,
        },
        {
            accessorKey: 'attendanceDate',
            header: 'Attendance Date',
            cell: ({ row }) => <div>{row.original.attendanceDate || '-'}</div>,
        },
        {
            accessorKey: 'authenticationMethod',
            header: 'Method',
            cell: ({ row }) => <div>{row.original.authenticationMethod || '-'}</div>,
        },
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) => {
                const event = row.original;
                return event.isManual || event.corrected ? (
                    <Badge className="bg-blue-100 text-blue-800">MANUAL/CORRECTED</Badge>
                ) : (
                    'AUTOMATIC'
                );
            },
        },
        {
            accessorKey: 'actor',
            header: 'Actor/Corrected By',
            cell: ({ row }) => {
                const event = row.original;
                const actor = event.correctedBy || event.actor;
                const actorName = actor ? [actor.firstName, actor.surname].filter(Boolean).join(' ') : null;
                return <div>{actorName || '-'}</div>;
            },
        },
        {
            accessorKey: 'reason',
            header: 'Reason',
            cell: ({ row }) => <div>{row.original.correctionReason || row.original.reason || '-'}</div>,
        },
        ...(isAdmin
            ? [
                  {
                      id: 'actions',
                      header: () => <div className="text-center">Actions</div>,
                      cell: ({ row }: any) => {
                          const event = row.original;
                          return (
                              <div className="flex items-center justify-center gap-1">
                                  <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                          setSelectedEvent(event);
                                          setCorrectionData({
                                              occurredAt: moment(event.occurredAt).format('YYYY-MM-DDTHH:mm'),
                                              reason: '',
                                          });
                                          setCorrectionOpen(true);
                                      }}
                                  >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Correct
                                  </Button>
                              </div>
                          );
                      },
                  } as ColumnDef<any>,
              ]
            : []),
    ];

    const handleCorrect = async () => {
        if (!correctionData.reason) {
            toast.error('Reason is required');
            return;
        }
        try {
            const payload: any = {
                clientEventId: uuidv4(),
                occurredAt: correctionData.occurredAt,
                reason: correctionData.reason,
            };
            if (selectedEvent?.id) {
                payload.eventId = selectedEvent.id;
            }
            await correctMutation.mutateAsync(payload);
            toast.success('Attendance corrected successfully');
            setCorrectionOpen(false);
            setCorrectionData({ occurredAt: '', reason: '' });
            daysQuery.refetch();
            eventsQuery.refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to correct attendance');
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <h1 className="text-xl font-semibold">Attendance Reports</h1>
                <p className="text-sm text-muted-foreground">View attendance summaries and history</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    {isAdmin && (
                        <div className="space-y-2">
                            <Label>Employee</Label>
                            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((user: any) => (
                                        <SelectItem key={user.id} value={user.id}>
                                            {[user.firstName, user.surname].filter(Boolean).join(' ')}
                                            {user.staffNumber != null ? ` (#${user.staffNumber})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label>Date From</Label>
                        <Input
                            type="date"
                            value={dateRange.dateFrom}
                            onChange={(e) => setDateRange({ ...dateRange, dateFrom: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date To</Label>
                        <Input
                            type="date"
                            value={dateRange.dateTo}
                            onChange={(e) => setDateRange({ ...dateRange, dateTo: e.target.value })}
                        />
                    </div>
                    <div className="flex items-end">
                        <Button variant={viewHistory ? 'default' : 'outline'} onClick={() => setViewHistory(!viewHistory)}>
                            {viewHistory ? 'Show Daily Summary' : 'Show Event History'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {!viewHistory ? (
                <Card>
                    <CardContent>
                        <DataTable
                            query={daysQuery}
                            data={days}
                            columns={daysColumns}
                            pagination={daysPagination}
                            setPagination={setDaysPagination}
                            totalRowCount={daysCount}
                        />
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent>
                        <DataTable
                            query={eventsQuery}
                            data={events}
                            columns={eventsColumns}
                            pagination={eventsPagination}
                            setPagination={setEventsPagination}
                            totalRowCount={eventsCount}
                        />
                    </CardContent>
                </Card>
            )}

            <Dialog open={correctionOpen} onOpenChange={setCorrectionOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Correct Attendance Time</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Occurred At</Label>
                            <Input
                                type="datetime-local"
                                value={correctionData.occurredAt}
                                onChange={(e) => setCorrectionData({ ...correctionData, occurredAt: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Reason *</Label>
                            <Textarea
                                value={correctionData.reason}
                                onChange={(e) => setCorrectionData({ ...correctionData, reason: e.target.value })}
                                placeholder="Time verified by the manager"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCorrectionOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCorrect} disabled={correctMutation.isPending}>
                            Save Correction
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceReportsModule;
