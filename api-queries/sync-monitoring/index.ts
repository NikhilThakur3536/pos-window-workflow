import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- SYNC MONITORING ---------------------------------------
//
// Overview stats and per-row sync monitoring for offline POS terminals posting
// transactions to the online backend.

// --------------------------------------- Types ---------------------------------------

export interface SyncMonitoringOverview {
    totalPending?: number;
    totalSynced?: number;
    totalFailed?: number;
    lastSyncedAt?: string | null;
    pendingByType?: Record<string, number>;
    failedByType?: Record<string, number>;
    [key: string]: unknown;
}

export interface SyncMonitoringOverviewResponse {
    success: boolean;
    message?: string;
    data?: SyncMonitoringOverview;
}

export interface SyncMonitoringRecord {
    id: string;
    reference?: string;
    documentType?: string;
    status?: 'PENDING' | 'SYNCED' | 'FAILED' | 'IN_PROGRESS';
    errorMessage?: string;
    retryCount?: number;
    tillId?: string;
    tillName?: string;
    terminalId?: string;
    createdBy?: string;
    createdAt?: string;
    syncedAt?: string | null;
    data?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface SyncMonitoringFilterProps {
    status?: SyncMonitoringRecord['status'];
    documentType?: string;
    tillId?: string;
    fromDate?: string;
    toDate?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface SyncMonitoringListResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: SyncMonitoringRecord[];
    };
}

export type SyncMonitoringListProps = SyncMonitoringFilterProps & {
    isCsv?: boolean;
    csvLabel?: string;
};

// --------------------------------------- Overview ---------------------------------------

export async function getSyncMonitoringOverview(): Promise<SyncMonitoringOverviewResponse> {
    return (
        await axiosInstance({
            url: apiUrls.syncMonitoring.overview.url,
            method: apiUrls.syncMonitoring.overview.method,
            data: {},
        })
    ).data;
}

export const useGetSyncMonitoringOverview = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.syncMonitoring.overview.url)],
        queryFn: async () => await getSyncMonitoringOverview(),
    });
};

// --------------------------------------- List ---------------------------------------

export async function getSyncMonitoringList(
    props: SyncMonitoringListProps,
): Promise<SyncMonitoringListResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'syncMonitoring', label: props?.csvLabel });
        return;
    }
    return (
        await axiosInstance({
            url: apiUrls.syncMonitoring.list.url,
            method: apiUrls.syncMonitoring.list.method,
            data: props,
        })
    ).data;
}

export const useGetSyncMonitoringList = (props: SyncMonitoringListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.syncMonitoring.list.url), props],
        queryFn: async () => await getSyncMonitoringList(props),
    });
};