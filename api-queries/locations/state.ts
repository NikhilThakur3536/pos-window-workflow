import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { StateDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- STATES ---------------------------------------

// States Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetStateResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StateDetails[];
    };
}

export async function getStates(props: FilterProps): Promise<GetStateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.states.list.url,
            method: apiUrls.states.list.method,
            data: props,
        })
    ).data;
}

export const useGetStates = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.states), props],
        queryFn: async () => await getStates(props),
    });
};

// Company States
export async function getCompanyStates(props: FilterProps): Promise<GetStateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.states.listForCompany.url,
            method: apiUrls.states.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyStates = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.states), props],
        queryFn: async () => await getCompanyStates(props),
    });
};
