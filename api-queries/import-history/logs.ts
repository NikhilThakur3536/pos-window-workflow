import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { ImportHistoryDetails, ImportUserType } from '.';

export type FilterProps = {
    limit?: number;
    offset?: number;
    importBatchId: string;
};

export interface ImportHistoryLogDetails {
    id: string;
    importBatchId: string;
    message: string;
    action: string;

    performedBy: ImportUserType;

    status: string;
    timezone: string;

    createdAt: string;
    updatedAt: string;

    metadata: Record<string, any>;

    companyId: string;
    domainId: string;
}

export interface GetImportHistoryLogsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: ImportHistoryLogDetails[];
        importDetails: ImportHistoryDetails;
    };
}

export async function getImportHistoryLogs(props: FilterProps): Promise<GetImportHistoryLogsResponse | void> {
    return (
        await axiosInstance({
            url: apiUrls.importHistory.logs.url,
            method: apiUrls.importHistory.logs.method,
            data: props,
        })
    ).data;
}

export const useGetImportHistoryLogs = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.importHistory), 'logs', props],
        queryFn: async () => await getImportHistoryLogs(props),
    });
};
