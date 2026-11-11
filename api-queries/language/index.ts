import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface LanguageMasterDetails {
    id: string;
    name: string;
    code: string;
    status: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetLanguageMasterListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: LanguageMasterDetails[];
    };
}

export interface GetLanguageMasterResponse {
    success: boolean;
    message: string;
    data: LanguageMasterDetails;
}

export interface MutateLanguageMasterResponse {
    success: boolean;
    message: string;
    data?: LanguageMasterDetails;
}

// ---------------------------------------
// LIST
// ---------------------------------------

export type LanguageMasterFilterProps = {
    status?: string;
    limit?: number;
    offset?: number;
};

export async function getLanguageMasters(
    props: LanguageMasterFilterProps
): Promise<GetLanguageMasterListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languageMaster.all.url,
            method: apiUrls.languageMaster.all.method,
            data: props,
        })
    ).data;
}

export const useGetLanguageMasters = (
    props: LanguageMasterFilterProps
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.languageMaster), props],
        queryFn: () => getLanguageMasters(props),
    });

// ---------------------------------------
// GET
// ---------------------------------------

export async function getLanguageMasterById(
    languageId: string
): Promise<GetLanguageMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languageMaster.get.url,
            method: apiUrls.languageMaster.get.method,
            data: { languageId },
        })
    ).data;
}

export const useGetLanguageMasterById = (
    languageId: string
) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.languageMaster), languageId],
        queryFn: () => getLanguageMasterById(languageId),
        enabled: !!languageId,
    });

// ---------------------------------------
// CREATE
// ---------------------------------------

export const languageMasterCreateSchema = z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    timezone: z.string().min(1),
});

export type LanguageMasterCreateSchema = z.infer<
    typeof languageMasterCreateSchema
>;

export async function createLanguageMaster(
    data: LanguageMasterCreateSchema
): Promise<MutateLanguageMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languageMaster.create.url,
            method: apiUrls.languageMaster.create.method,
            data,
        })
    ).data;
}

export const useCreateLanguageMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createLanguageMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.languageMaster)],
            });
        },
    });
};

// ---------------------------------------
// UPDATE
// ---------------------------------------

export const languageMasterUpdateSchema = z.object({
    languageId: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    timezone: z.string().optional(),
});

export type LanguageMasterUpdateSchema = z.infer<
    typeof languageMasterUpdateSchema
>;

export async function updateLanguageMaster(
    data: LanguageMasterUpdateSchema
): Promise<MutateLanguageMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languageMaster.update.url,
            method: apiUrls.languageMaster.update.method,
            data,
        })
    ).data;
}

export const useUpdateLanguageMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: updateLanguageMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.languageMaster)],
            });
        },
    });
};

// ---------------------------------------
// DELETE
// ---------------------------------------

export async function deleteLanguageMaster(
    languageId: string
): Promise<MutateLanguageMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.languageMaster.delete.url,
            method: apiUrls.languageMaster.delete.method,
            data: { languageId },
        })
    ).data;
}

export const useDeleteLanguageMaster = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteLanguageMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.languageMaster)],
            });
        },
    });
};