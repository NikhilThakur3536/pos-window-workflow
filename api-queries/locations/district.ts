import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { DistrictDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- DISTRICTS ---------------------------------------

// Districts Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetDistrictResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DistrictDetails[];
    };
}

export async function getDistricts(props: FilterProps): Promise<GetDistrictResponse> {
    return (
        await axiosInstance({
            url: apiUrls.districts.list.url,
            method: apiUrls.districts.list.method,
            data: props,
        })
    ).data;
}

export const useGetDistricts = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.districts), props],
        queryFn: async () => await getDistricts(props),
    });
};

// Company Districts
export async function getCompanyDistricts(props: FilterProps): Promise<GetDistrictResponse> {
    return (
        await axiosInstance({
            url: apiUrls.districts.listForCompany.url,
            method: apiUrls.districts.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyDistricts = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.districts), props],
        queryFn: async () => await getCompanyDistricts(props),
    });
};
