import { useMutation, useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/api-queries';

export interface UserSession {
    id: string;
    userId: string;
    ipAddress?: string;
    deviceName?: string;
    deviceId?: string;
    terminalId?: string;
    terminalName?: string;
    loginMethod?: string;
    loggedInAt?: string;
    lastSeenAt?: string;
    expiresAt?: string;
    endedAt?: string | null;
    logoutAt?: string | null;
    endReason?: string | null;
    reason?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ENDED' | 'LOGOUT' | 'REVOKED';
    isActive?: boolean;
    user?: {
        id: string;
        staffNumber?: number | string;
        firstName?: string;
        surname?: string;
        email?: string;
    };
}

export interface SessionsListParams {
    limit?: number;
    offset?: number;
    status?: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'ENDED' | 'LOGOUT' | 'REVOKED';
    userId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    ipAddress?: string;
    deviceId?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface SessionsListResponse {
    success: boolean;
    data: {
        count: number;
        rows: UserSession[];
    };
    message?: string;
}

export async function getSessionsList(params: SessionsListParams = {}): Promise<SessionsListResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/sessions/list', params);
    return res.data;
}

export const useGetSessionsList = (params: SessionsListParams = {}, options: any = {}) => {
    return useQuery({
        queryKey: ['userMonitoring', 'sessions', 'list', params],
        queryFn: async () => await getSessionsList(params),
        ...options,
    });
};

export interface SessionsSummaryResponse {
    success: boolean;
    data: {
        total?: number;
        active?: number;
        inactive?: number;
        ended?: number;
        expired?: number;
        revoked?: number;
        loggedOut?: number;
        [key: string]: any;
    };
    message?: string;
}

export async function getSessionsSummary(): Promise<SessionsSummaryResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/sessions/summary', {});
    return res.data;
}

export const useGetSessionsSummary = (options: any = {}) => {
    return useQuery({
        queryKey: ['userMonitoring', 'sessions', 'summary'],
        queryFn: async () => await getSessionsSummary(),
        ...options,
    });
};

export async function revokeSession(sessionId: string): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/sessions/revoke', { sessionId });
    return res.data;
}

export const useRevokeSession = () => {
    return useMutation({
        mutationFn: (sessionId: string) => revokeSession(sessionId),
    });
}

export async function sendSessionHeartbeat(): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/sessions/heartbeat', {});
    return res.data;
}


export interface CompanyConfiguration {
    attendanceEnabled?: boolean;
    requireClockInBeforePos?: boolean;
    sessionIdleTimeoutMinutes?: number | null;
}

export interface GetConfigurationResponse {
    success: boolean;
    data: CompanyConfiguration;
    message?: string;
}

export async function getUserMonitoringConfiguration(): Promise<GetConfigurationResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/configuration/get', {});
    return res.data;
}

export const useGetUserMonitoringConfiguration = (options: any = {}) => {
    return useQuery({
        queryKey: ['userMonitoring', 'configuration'],
        queryFn: async () => await getUserMonitoringConfiguration(),
        ...options,
    });
};

export async function saveUserMonitoringConfiguration(config: CompanyConfiguration): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/configuration/save', config);
    return res.data;
}

export const useSaveUserMonitoringConfiguration = () => {
    return useMutation({
        mutationFn: (config: CompanyConfiguration) => saveUserMonitoringConfiguration(config),
    });
};


export async function switchUser(): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/sessions/switch-user', {});
    return res.data;
}

export const useSwitchUser = () => {
    return useMutation({
        mutationFn: () => switchUser(),
    });
}
