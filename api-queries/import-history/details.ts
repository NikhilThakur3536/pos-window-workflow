import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { ImportResultsStatus } from '../global-types';
import { ImportHistoryDetails } from '.';

export type FilterProps = {
    limit?: number;
    offset?: number;
    importBatchId: string;
    validationStatus?: ImportResultsStatus;
};

export interface ImportHistoryDetailsType {
    id: string;
    isFlushed: boolean;
    validationMessage: boolean;
    validationStatus: ImportResultsStatus;
    rawData: Record<string, string | number | boolean | null>;
}

export interface GetImportHistoryDetailsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        importDetails: ImportHistoryDetails;
        rows: ImportHistoryDetailsType[];
    };
}

export async function getImportHistoryDetails(props: FilterProps): Promise<GetImportHistoryDetailsResponse | void> {
    return (
        await axiosInstance({
            url: apiUrls.importHistory.details.url,
            method: apiUrls.importHistory.details.method,
            data: props,
        })
    ).data;
}

export const useGetImportHistoryDetails = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.importHistory), 'details', props],
        queryFn: async () => await getImportHistoryDetails(props),
    });
};
