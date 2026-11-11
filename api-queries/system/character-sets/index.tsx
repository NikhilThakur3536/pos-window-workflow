import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- CHARACTER SETS ---------------------------------------

// Character Sets Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    searchKey?: string;
    status?: string;
};

export interface CharacterSetDetails {
    id: string;
    timezone: string;
    code: string;
    name: string;
    status?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

export interface GetCharacterSetResponse {
    success: boolean;
    message: string;
    data: CharacterSetDetails[];
}

export async function getCharacterSets(props: FilterProps): Promise<GetCharacterSetResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSets.list.url,
            method: apiUrls.characterSets.list.method,
            params: props,
        })
    ).data;
}

export const useGetCharacterSets = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.characterSets), props],
        queryFn: async () => await getCharacterSets(props),
    });
};

// Character Set Get By Id
export interface GetCharacterSetByIdResponse {
    success: boolean;
    data: CharacterSetDetails;
}

export async function getCharacterSetById(id: string): Promise<GetCharacterSetByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSets.get.url(id),
            method: apiUrls.characterSets.get.method,
        })
    ).data;
}

export const useGetCharacterSetById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.characterSets), id],
        queryFn: async () => await getCharacterSetById(id),
    });
};
