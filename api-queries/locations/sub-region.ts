import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { SubRegionDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- SUB REGIONS ---------------------------------------

// Sub Regions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetSubRegionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SubRegionDetails[];
    };
}

export async function getSubRegions(props: FilterProps): Promise<GetSubRegionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subRegions.list.url,
            method: apiUrls.subRegions.list.method,
            data: props,
        })
    ).data;
}

export const useGetSubRegions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.subRegions), props],
        queryFn: async () => await getSubRegions(props),
    });
};

// Company Sub Regions
export async function getCompanySubRegions(props: FilterProps): Promise<GetSubRegionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subRegions.listForCompany.url,
            method: apiUrls.subRegions.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanySubRegions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.subRegions), props],
        queryFn: async () => await getCompanySubRegions(props),
    });
};
