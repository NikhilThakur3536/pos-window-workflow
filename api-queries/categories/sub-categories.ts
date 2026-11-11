import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { TaxRateDetails } from '../company-details/tax-rates';
import { CategoryDetails } from '.';

const validTimezones = moment.tz.names();

// --------------------------------------- SUB CATEGORIES ---------------------------------------

// Sub Categories Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    categoryId?: string;
};

export interface SubCategoryDetails {
    id: string;
    name: string;
    code: string;
    description: string;
    categoryId: string;
    CompanyStockCategory: CategoryDetails;
    taxId: string;
    CompanyTaxRate: TaxRateDetails;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetSubCategoryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SubCategoryDetails[];
    };
}

export async function getSubCategories(props: FilterProps): Promise<GetSubCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subCategories.list.url,
            method: apiUrls.subCategories.list.method,
            data: props,
        })
    ).data;
}

export const useGetSubCategories = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.subCategories), props],
        queryFn: async () => await getSubCategories(props),
    });
};

// Sub Category Get By Id
export interface GetSubCategoryByIdResponse {
    success: boolean;
    data: SubCategoryDetails;
}

export async function getSubCategoryById(id: string): Promise<GetSubCategoryByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subCategories.get.url,
            method: apiUrls.subCategories.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSubCategoryById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.subCategories), id],
        queryFn: async () => await getSubCategoryById(id),
    });
};

// Sub Categories Create

export const subCategoryBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Sub Category Code is required'),
    description: z.string().optional(),
    categoryId: z.string().min(1, 'Category is required'),
    taxRateId: z.string().optional(),
});

export const subCategoryCreateSchema = subCategoryBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SubCategoryCreateSchema = z.infer<typeof subCategoryCreateSchema>;

export type MutateSubCategoryResponse = {
    success: boolean;
};

export async function createSubCategory(data: SubCategoryCreateSchema): Promise<MutateSubCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subCategories.create.url,
            method: apiUrls.subCategories.create.method,
            data,
        })
    ).data;
}

export const useCreateSubCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.subCategories)] });
        },
    });
};

// Sub Category Update

export const subCategoryUpdateSchema = subCategoryBaseSchema.extend({ id: z.string() });

export type SubCategoryUpdateSchema = z.infer<typeof subCategoryUpdateSchema>;

export async function updateSubCategory(data: SubCategoryUpdateSchema): Promise<MutateSubCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subCategories.update.url,
            method: apiUrls.subCategories.update.method,
            data,
        })
    ).data;
}

export const useUpdateSubCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.subCategories)] });
        },
    });
};

// Sub Category Delete

export async function removeSubCategory(id: string): Promise<MutateSubCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.subCategories.delete.url,
            method: apiUrls.subCategories.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveSubCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSubCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.subCategories)] });
        },
    });
};
