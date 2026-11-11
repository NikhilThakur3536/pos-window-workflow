import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/api-queries';

export interface AttendanceStatus {
    checkedIn: boolean;
    lastEvent?: {
        id?: string;
        eventType?: 'CHECK_IN' | 'CHECK_OUT';
        occurredAt?: string;
        attendanceDate?: string;
        authenticationMethod?: string;
    } | null;
    status?: string;
}

export interface AttendanceStatusResponse {
    success: boolean;
    data: AttendanceStatus;
    message?: string;
}

export async function getAttendanceStatus(): Promise<AttendanceStatusResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/attendance/status', {});
    return res.data;
}

export const useGetAttendanceStatus = (options: any = {}) => {
    return useQuery({
        queryKey: ['attendance', 'status'],
        queryFn: async () => await getAttendanceStatus(),
        ...options,
    });
};

export interface RecordAttendancePayload {
    eventType: 'CHECK_IN' | 'CHECK_OUT';
    clientEventId: string;
    deviceId: string;
    templateReference: string;
    occurredAt?: string;
}

export interface AttendanceRecordResponse {
    success: boolean;
    data: {
        event: {
            id: string;
            eventType: 'CHECK_IN' | 'CHECK_OUT';
            authenticationMethod?: string;
            occurredAt: string;
            attendanceDate?: string;
        };
        summary?: {
            workedMinutes?: number;
            status?: string;
        };
        duplicate?: boolean;
    };
    message?: string;
}

export async function recordAttendance(payload: RecordAttendancePayload): Promise<AttendanceRecordResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/attendance/record', payload);
    return res.data;
}

export const useRecordAttendance = () => {
    return useMutation({
        mutationFn: (payload: RecordAttendancePayload) => recordAttendance(payload),
    });
};

export interface AttendanceDay {
    userId?: string;
    user?: {
        id?: string;
        staffNumber?: number | string;
        firstName?: string;
        surname?: string;
    };
    attendanceDate?: string;
    date?: string;
    firstCheckInAt?: string;
    firstCheckIn?: string;
    lastCheckOutAt?: string;
    lastCheckOut?: string;
    workedMinutes?: number;
    totalMinutes?: number;
    status?: string;
    reviewReason?: string;
    reviewRequired?: boolean;
}

export interface AttendanceDaysParams {
    dateFrom: string;
    dateTo: string;
    limit?: number;
    offset?: number;
    userId?: string;
}

export interface AttendanceDaysResponse {
    success: boolean;
    data: {
        count: number;
        rows: AttendanceDay[];
    };
    message?: string;
}

export async function getAttendanceDays(params: AttendanceDaysParams): Promise<AttendanceDaysResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/attendance/days', params);
    return res.data;
}

export const useGetAttendanceDays = (params: AttendanceDaysParams, options: any = {}) => {
    return useQuery({
        queryKey: ['attendance', 'days', params],
        queryFn: async () => await getAttendanceDays(params),
        ...options,
    });
};

export interface AttendanceEvent {
    id: string;
    userId?: string;
    user?: any;
    eventType: 'CHECK_IN' | 'CHECK_OUT' | 'MANUAL';
    occurredAt: string;
    attendanceDate?: string;
    authenticationMethod?: string;
    deviceId?: string;
    isManual?: boolean;
    corrected?: boolean;
    correctedBy?: any;
    correctionReason?: string;
    reason?: string;
    actor?: any;
}

export interface AttendanceEventsParams {
    userId: string;
    dateFrom: string;
    dateTo: string;
    limit?: number;
    offset?: number;
}

export interface AttendanceEventsResponse {
    success: boolean;
    data: {
        count: number;
        rows: AttendanceEvent[];
    };
    message?: string;
}

export async function getAttendanceEvents(params: AttendanceEventsParams): Promise<AttendanceEventsResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/attendance/events', params);
    return res.data;
}

export const useGetAttendanceEvents = (params: AttendanceEventsParams, options: any = {}) => {
    return useQuery({
        queryKey: ['attendance', 'events', params],
        queryFn: async () => await getAttendanceEvents(params),
        ...options,
    });
};

export interface CorrectAttendancePayload {
    eventId?: string;
    userId?: string;
    eventType?: 'CHECK_IN' | 'CHECK_OUT';
    clientEventId: string;
    occurredAt: string;
    reason: string;
}

export async function correctAttendance(payload: CorrectAttendancePayload): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/attendance/correct', payload);
    return res.data;
}

export const useCorrectAttendance = () => {
    return useMutation({
        mutationFn: (payload: CorrectAttendancePayload) => correctAttendance(payload),
    });
};
