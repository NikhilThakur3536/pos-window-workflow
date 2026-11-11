import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- CATEGORIES ---------------------------------------

// Categories Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CategoryDetails {
    id: string;
    name: string;
    code: string;
    description: string;
    targetGpPercent: number;
    minGpPercent?: number | null;
    maxGpPercent?: number | null;
    gpTolerancePercent?: number | null;
    blockingGpVariancePercent?: number | null;
    enforceGpPolicy?: boolean | null;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetCategoryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CategoryDetails[];
    };
}

export async function getCategories(props: FilterProps): Promise<GetCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categories.list.url,
            method: apiUrls.categories.list.method,
            data: props,
        })
    ).data;
}

export const useGetCategories = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.categories), props],
        queryFn: async () => await getCategories(props),
    });
};

// Category Get By Id
export interface GetCategoryByIdResponse {
    success: boolean;
    data: CategoryDetails;
}

export async function getCategoryById(id: string): Promise<GetCategoryByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categories.get.url,
            method: apiUrls.categories.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCategoryById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.categories), id],
        queryFn: async () => await getCategoryById(id),
    });
};

// Categories Create

export const categoryBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Category Code is required'),
    description: z.string().optional(),
    targetGpPercent: z.number().nullable().optional(),
    // Cost consistency limits resolved for this category when no SKU rule overrides them.
    minGpPercent: z.number().nullable().optional(),
    maxGpPercent: z.number().nullable().optional(),
    gpTolerancePercent: z.number().nullable().optional(),
    blockingGpVariancePercent: z.number().nullable().optional(),
    enforceGpPolicy: z.boolean().nullable().optional(),
});

export const categoryCreateSchema = categoryBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CategoryCreateSchema = z.infer<typeof categoryCreateSchema>;

export type MutateCategoryResponse = {
    success: boolean;
};

export async function createCategory(data: CategoryCreateSchema): Promise<MutateCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categories.create.url,
            method: apiUrls.categories.create.method,
            data,
        })
    ).data;
}

export const useCreateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.categories)] });
        },
    });
};

// Category Update

export const categoryUpdateSchema = categoryBaseSchema.extend({ id: z.string() });

export type CategoryUpdateSchema = z.infer<typeof categoryUpdateSchema>;

export async function updateCategory(data: CategoryUpdateSchema): Promise<MutateCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categories.update.url,
            method: apiUrls.categories.update.method,
            data,
        })
    ).data;
}

export const useUpdateCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.categories)] });
        },
    });
};

// Category Delete

export async function removeCategory(id: string): Promise<MutateCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.categories.delete.url,
            method: apiUrls.categories.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.categories)] });
        },
    });
};
