import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- LANGUAGES ---------------------------------------

// Languages Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    searchKey?: string;
    status?: string;
};

export interface LanguageDetails {
    id: string;
    timezone: string;
    code: string;
    name: string;
    status?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

export interface GetLanguageResponse {
    success: boolean;
    message: string;
    data: LanguageDetails[];
}

export async function getLanguages(props: FilterProps): Promise<GetLanguageResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languages.list.url,
            method: apiUrls.languages.list.method,
            data: props,
        })
    ).data;
}

export const useGetLanguages = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.languages), props],
        queryFn: async () => await getLanguages(props),
    });
};

// Language Get By Id
export interface GetLanguageByIdResponse {
    success: boolean;
    data: LanguageDetails;
}

export async function getLanguageById(id: string): Promise<GetLanguageByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languages.get.url(id),
            method: apiUrls.languages.get.method,
        })
    ).data;
}

export const useGetLanguageById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.languages), id],
        queryFn: async () => await getLanguageById(id),
    });
};
