import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface StateMasterDetails {
    id: string;
    name: string;
    code: string;
    countryId: string;
    status: string;
    timezone: string;
    createdAt: string;
    country:{
        name:string
    }
    updatedAt: string;
}

export interface GetStateMasterListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StateMasterDetails[];
    };
}

export interface GetStateMasterResponse {
    success: boolean;
    message: string;
    data: StateMasterDetails;
}

export interface MutateStateMasterResponse {
    success: boolean;
    message: string;
    data?: StateMasterDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type StateMasterFilterProps = {
    status?: string;
    countryId?: string;
    limit?: number;
    offset?: number;
};

export async function getStateMasters(
    props: StateMasterFilterProps
): Promise<GetStateMasterListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stateMaster.all.url,
            method: apiUrls.stateMaster.all.method,
            data: props,
        })
    ).data;
}

export const useGetStateMasters = (
    props: StateMasterFilterProps
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.stateMaster), props],
        queryFn: () => getStateMasters(props),
    });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getStateMasterById(
    stateId: string
): Promise<GetStateMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stateMaster.get.url,
            method: apiUrls.stateMaster.get.method,
            data: { stateId },
        })
    ).data;
}

export const useGetStateMasterById = (
    stateId: string
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.stateMaster), stateId],
        queryFn: () => getStateMasterById(stateId),
        enabled: !!stateId,
    });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const stateMasterCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    countryId: z.string().optional(),
    timezone: z.string().min(1),
});

export type StateMasterCreateSchema = z.infer<
    typeof stateMasterCreateSchema
>;

export async function createStateMaster(
    data: StateMasterCreateSchema
): Promise<MutateStateMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stateMaster.create.url,
            method: apiUrls.stateMaster.create.method,
            data,
        })
    ).data;
}

export const useCreateStateMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStateMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stateMaster)],
            });
        },
    });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const stateMasterUpdateSchema = z.object({
    stateId: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    countryId: z.string().optional(),
    timezone: z.string().optional(),
});

export type StateMasterUpdateSchema = z.infer<
    typeof stateMasterUpdateSchema
>;

export async function updateStateMaster(
    data: StateMasterUpdateSchema
): Promise<MutateStateMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stateMaster.update.url,
            method: apiUrls.stateMaster.update.method,
            data,
        })
    ).data;
}

export const useUpdateStateMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateStateMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stateMaster)],
            });
        },
    });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteStateMaster(
    stateId: string
): Promise<MutateStateMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stateMaster.delete.url,
            method: apiUrls.stateMaster.delete.method,
            data: { stateId },
        })
    ).data;
}

export const useDeleteStateMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteStateMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.stateMaster)],
            });
        },
    });
};