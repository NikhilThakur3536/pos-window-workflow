import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface UserTypeMasterDetails {
    id: string;
    code: string;
    description: string;
    status: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetUserTypeMasterListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: UserTypeMasterDetails[];
    };
}

export interface GetUserTypeMasterResponse {
    success: boolean;
    message: string;
    data: UserTypeMasterDetails;
}

export interface MutateUserTypeMasterResponse {
    success: boolean;
    message: string;
    data?: UserTypeMasterDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type UserTypeMasterFilterProps = {
    status?: string;
    limit?: number;
    offset?: number;
};

export async function getUserTypeMasters(
    props: UserTypeMasterFilterProps
): Promise<GetUserTypeMasterListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTypeMaster.all.url,
            method: apiUrls.userTypeMaster.all.method,
            data: props,
        })
    ).data;
}

export const useGetUserTypeMasters = (
    props: UserTypeMasterFilterProps
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.userTypeMaster), props],
        queryFn: () => getUserTypeMasters(props),
    });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getUserTypeMasterById(
    userTypeId: string
): Promise<GetUserTypeMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTypeMaster.get.url,
            method: apiUrls.userTypeMaster.get.method,
            data: { userTypeId },
        })
    ).data;
}

export const useGetUserTypeMasterById = (
    userTypeId: string
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.userTypeMaster), userTypeId],
        queryFn: () => getUserTypeMasterById(userTypeId),
        enabled: !!userTypeId,
    });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const userTypeMasterCreateSchema = z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    timezone: z.string().min(1),
});

export type UserTypeMasterCreateSchema = z.infer<
    typeof userTypeMasterCreateSchema
>;

export async function createUserTypeMaster(
    data: UserTypeMasterCreateSchema
): Promise<MutateUserTypeMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTypeMaster.create.url,
            method: apiUrls.userTypeMaster.create.method,
            data,
        })
    ).data;
}

export const useCreateUserTypeMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createUserTypeMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.userTypeMaster)],
            });
        },
    });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const userTypeMasterUpdateSchema = z.object({
    userTypeId: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    timezone: z.string().optional(),
});

export type UserTypeMasterUpdateSchema = z.infer<
    typeof userTypeMasterUpdateSchema
>;

export async function updateUserTypeMaster(
    data: UserTypeMasterUpdateSchema
): Promise<MutateUserTypeMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTypeMaster.update.url,
            method: apiUrls.userTypeMaster.update.method,
            data,
        })
    ).data;
}

export const useUpdateUserTypeMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateUserTypeMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.userTypeMaster)],
            });
        },
    });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteUserTypeMaster(
    userTypeId: string
): Promise<MutateUserTypeMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTypeMaster.delete.url,
            method: apiUrls.userTypeMaster.delete.method,
            data: { userTypeId },
        })
    ).data;
}

export const useDeleteUserTypeMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteUserTypeMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.userTypeMaster)],
            });
        },
    });
};