import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- Report Access Level ---------------------------------------

// Report Access Level Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    searchKey?: string;
    status?: string;
};

export interface ReportLevelDetails {
    id: string;
    timezone: string;
    description: string;
    domainId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface GetReportLevelResponse {
    success: boolean;
    message: string;
    data: ReportLevelDetails[];
}

export async function getReportLevels(props: FilterProps): Promise<GetReportLevelResponse> {
    return (
        await axiosInstance({
            url: apiUrls.reportAccessLevels.list.url,
            method: apiUrls.reportAccessLevels.list.method,
            data: props,
        })
    ).data;
}

export const useGetReportLevels = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.reportAccessLevels), props],
        queryFn: async () => await getReportLevels(props),
    });
};
