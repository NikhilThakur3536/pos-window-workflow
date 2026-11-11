import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CountryDetails } from './location-types';

const validTimezones = moment.tz.names();

// --------------------------------------- COUNTRIES ---------------------------------------

// Countries Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetCountryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CountryDetails[];
    };
}

export async function getCountries(props: FilterProps): Promise<GetCountryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.countries.list.url,
            method: apiUrls.countries.list.method,
            data: props,
        })
    ).data;
}

export const useGetCountries = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.countries), props],
        queryFn: async () => await getCountries(props),
    });
};

// Company Countries
export async function getCompanyCountries(props: FilterProps): Promise<GetCountryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.countries.listForCompany.url,
            method: apiUrls.countries.listForCompany.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyCountries = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.countries), props],
        queryFn: async () => await getCompanyCountries(props),
    });
};
