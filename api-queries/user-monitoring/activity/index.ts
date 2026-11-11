import { useQuery } from '@tanstack/react-query';
import { axiosInstance } from '@/api-queries';

export interface UserActivity {
    id?: string;
    time?: string;
    occurredAt?: string;
    userId?: string;
    user?: {
        id?: string;
        staffNumber?: number | string;
        firstName?: string;
        surname?: string;
    };
    module?: string;
    action?: string;
    actionCode?: string;
    summary?: string;
    resourceType?: string;
    resourceId?: string | null;
    documentReference?: string | null;
    result?: 'SUCCESS' | 'FAILED' | string;
    httpStatus?: number;
    ipAddress?: string;
    sessionId?: string;
}

export interface ActivityListParams {
    limit?: number;
    offset?: number;
    userId?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    module?: string;
    actionCode?: string;
    resourceType?: string;
    resourceId?: string;
    sessionId?: string;
    result?: 'SUCCESS' | 'FAILED';
    dateFrom?: string;
    dateTo?: string;
}

export interface ActivityListResponse {
    success: boolean;
    data: {
        count: number;
        rows: UserActivity[];
    };
    message?: string;
}

export async function getActivityList(params: ActivityListParams = {}): Promise<ActivityListResponse> {
    const res = await axiosInstance.post('/api/company/userMonitoring/activity/list', params);
    return res.data;
}

export const useGetActivityList = (params: ActivityListParams = {}, options: any = {}) => {
    return useQuery({
        queryKey: ['userMonitoring', 'activity', 'list', params],
        queryFn: async () => await getActivityList(params),
        ...options,
    });
};


export async function getActivityFilters(params: any = {}): Promise<any> {
    const res = await axiosInstance.post('/api/company/userMonitoring/activity/filters', params);
    return res.data;
}

export const useGetActivityFilters = (params: any = {}, options: any = {}) => {
    return useQuery({
        queryKey: ['userMonitoring', 'activity', 'filters', params],
        queryFn: async () => await getActivityFilters(params),
        ...options,
    });
};
