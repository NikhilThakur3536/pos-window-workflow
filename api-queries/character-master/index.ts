import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface CharacterSetMasterDetails {
    id: string;
    name: string;
    code: string;
    status: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetCharacterSetMasterListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CharacterSetMasterDetails[];
    };
}

export interface GetCharacterSetMasterResponse {
    success: boolean;
    message: string;
    data: CharacterSetMasterDetails;
}

export interface MutateCharacterSetMasterResponse {
    success: boolean;
    message: string;
    data?: CharacterSetMasterDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type CharacterSetMasterFilterProps = {
    status?: string;
    limit?: number;
    offset?: number;
};

export async function getCharacterSetMasters(
    props: CharacterSetMasterFilterProps
): Promise<GetCharacterSetMasterListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSetMaster.all.url,
            method: apiUrls.characterSetMaster.all.method,
            data: props,
        })
    ).data;
}

export const useGetCharacterSetMasters = (
    props: CharacterSetMasterFilterProps
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.characterSetMaster), props],
        queryFn: () => getCharacterSetMasters(props),
    });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getCharacterSetMasterById(
    characterSetId: string
): Promise<GetCharacterSetMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSetMaster.get.url,
            method: apiUrls.characterSetMaster.get.method,
            data: { characterSetId },
        })
    ).data;
}

export const useGetCharacterSetMasterById = (
    characterSetId: string
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.characterSetMaster), characterSetId],
        queryFn: () => getCharacterSetMasterById(characterSetId),
        enabled: !!characterSetId,
    });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const characterSetMasterCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    timezone: z.string().min(1),
});

export type CharacterSetMasterCreateSchema = z.infer<
    typeof characterSetMasterCreateSchema
>;

export async function createCharacterSetMaster(
    data: CharacterSetMasterCreateSchema
): Promise<MutateCharacterSetMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSetMaster.create.url,
            method: apiUrls.characterSetMaster.create.method,
            data,
        })
    ).data;
}

export const useCreateCharacterSetMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCharacterSetMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.characterSetMaster)],
            });
        },
    });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const characterSetMasterUpdateSchema = z.object({
    characterSetId: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    timezone: z.string().optional(),
});

export type CharacterSetMasterUpdateSchema = z.infer<
    typeof characterSetMasterUpdateSchema
>;

export async function updateCharacterSetMaster(
    data: CharacterSetMasterUpdateSchema
): Promise<MutateCharacterSetMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSetMaster.update.url,
            method: apiUrls.characterSetMaster.update.method,
            data,
        })
    ).data;
}

export const useUpdateCharacterSetMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateCharacterSetMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.characterSetMaster)],
            });
        },
    });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteCharacterSetMaster(
    characterSetId: string
): Promise<MutateCharacterSetMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.characterSetMaster.delete.url,
            method: apiUrls.characterSetMaster.delete.method,
            data: { characterSetId },
        })
    ).data;
}

export const useDeleteCharacterSetMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteCharacterSetMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.characterSetMaster)],
            });
        },
    });
};