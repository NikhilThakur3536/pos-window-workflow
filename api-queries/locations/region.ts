import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { RegionDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- REGIONS ---------------------------------------

// Regions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetRegionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: RegionDetails[];
    };
}

export async function getRegions(props: FilterProps): Promise<GetRegionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.regions.list.url,
            method: apiUrls.regions.list.method,
            data: props,
        })
    ).data;
}

export const useGetRegions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.regions), props],
        queryFn: async () => await getRegions(props),
    });
};

// Company Regions
export async function getCompanyRegions(props: FilterProps): Promise<GetRegionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.regions.listForCompany.url,
            method: apiUrls.regions.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyRegions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.regions), props],
        queryFn: async () => await getCompanyRegions(props),
    });
};
