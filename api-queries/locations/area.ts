import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { AreaDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- AREAS ---------------------------------------

// Areas Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetAreaResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: AreaDetails[];
    };
}

export async function getAreas(props: FilterProps): Promise<GetAreaResponse> {
    return (
        await axiosInstance({
            url: apiUrls.areas.list.url,
            method: apiUrls.areas.list.method,
            data: props,
        })
    ).data;
}

export const useGetAreas = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.areas), props],
        queryFn: async () => await getAreas(props),
    });
};

// Company Areas
export async function getCompanyAreas(props: FilterProps): Promise<GetAreaResponse> {
    return (
        await axiosInstance({
            url: apiUrls.areas.listForCompany.url,
            method: apiUrls.areas.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyAreas = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.areas), props],
        queryFn: async () => await getCompanyAreas(props),
    });
};
