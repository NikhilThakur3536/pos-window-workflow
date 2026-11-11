import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Fingerprint, Clock, LogIn, LogOut, AlertCircle } from 'lucide-react';
import { useGetAttendanceStatus, useRecordAttendance } from '@/api-queries/attendance';
import { useAuthUser } from '@/stores/auth-user.store';
import { toast } from 'sonner';
import { v4 as uuidv4 } from '@/utils/uuid';
import moment from 'moment';
import { useGetUserMonitoringConfiguration } from '@/api-queries/user-monitoring/sessions';

const AttendanceClockModule = () => {
    const currentUser = useAuthUser((state) => state.user);
    const statusQuery = useGetAttendanceStatus();
    const recordMutation = useRecordAttendance();
    const configQuery = useGetUserMonitoringConfiguration();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const config = (configQuery.data as any)?.data || {};
    const status = (statusQuery.data as any)?.data || statusQuery.data;
    const checkedIn = status?.checkedIn;
    const lastEvent = status?.lastEvent;

    if (config.attendanceEnabled === false) {
        return (
            <div className="p-4 space-y-4">
                <div>
                    <h1 className="text-xl font-semibold">Attendance Clock</h1>
                    <p className="text-sm text-muted-foreground">Fingerprint-based check in and check out</p>
                </div>
                <Card>
                    <CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        <span>Attendance is disabled in company configuration</span>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleAttendance = async (eventType: 'CHECK_IN' | 'CHECK_OUT') => {
        setIsSubmitting(true);
        try {
            const deviceId = (typeof window !== 'undefined' && (window as any).__TERMINAL_ID__) || currentUser?.id || 'terminal';
            const clientEventId = uuidv4();
            // For testing/console use as requested - in real scanner would get templateReference
            const templateReference = `scan-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            // Fingerprint scan must not be stored/logged in persistent logs; console only for testing
            console.log('Fingerprint scan (console):', { deviceId });
            
            const res = await recordMutation.mutateAsync({
                eventType,
                clientEventId,
                deviceId,
                templateReference,
            });
            
            if (res.success) {
                toast.success(eventType === 'CHECK_IN' ? 'Checked in successfully' : 'Checked out successfully');
                statusQuery.refetch();
            } else {
                toast.error(res.message || 'Attendance recording failed');
            }
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Failed to record attendance';
            toast.error(message);
            // On 409 or conflict, reload status
            if (error?.response?.status === 409) {
                statusQuery.refetch();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 space-y-4">
            <div>
                <h1 className="text-xl font-semibold">Attendance Clock</h1>
                <p className="text-sm text-muted-foreground">Fingerprint-based check in and check out</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Current Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="text-center p-6">
                            <div className={`text-2xl font-bold ${checkedIn ? 'text-green-600' : 'text-gray-600'}`}>
                                {checkedIn ? 'CHECKED IN' : 'NOT CHECKED IN'}
                            </div>
                            {lastEvent && (
                                <div className="mt-2 text-sm text-muted-foreground">
                                    Last {lastEvent.eventType === 'CHECK_IN' ? 'Check In' : 'Check Out'}:{' '}
                                    {lastEvent.occurredAt ? moment(lastEvent.occurredAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Button
                                className="flex-1"
                                size="lg"
                                onClick={() => handleAttendance('CHECK_IN')}
                                disabled={checkedIn || isSubmitting}
                            >
                                <LogIn className="mr-2 h-4 w-4" />
                                Check In
                            </Button>
                            <Button
                                className="flex-1"
                                size="lg"
                                variant="secondary"
                                onClick={() => handleAttendance('CHECK_OUT')}
                                disabled={!checkedIn || isSubmitting}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Check Out
                            </Button>
                        </div>
                        <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                            <Fingerprint className="h-3 w-3" />
                            Fingerprint scan required (using console for testing)
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">User Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium">Name:</span> {currentUser?.firstName} {currentUser?.surname}
                            </div>
                            {currentUser?.staffNumber && (
                                <div>
                                    <span className="font-medium">Staff Number:</span> {currentUser.staffNumber}
                                </div>
                            )}
                            <div>
                                <span className="font-medium">Email:</span> {currentUser?.email}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AttendanceClockModule;
