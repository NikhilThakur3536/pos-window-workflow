import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- STORE CATEGORIES ---------------------------------------
//
// Store classification lets a store (company debtor) be grouped into a category with
// an optional parent category. Categories are assigned to stores through
// storeCategory/assign which carries an effective window and a primary flag.

export interface StoreCategory {
    id: string;
    code: string;
    name: string;
    parentCategoryId?: string | null;
    parentCategoryName?: string | null;
    description?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface SaveStoreCategoryInput {
    // Omitted on create, sent on edit.
    id?: string;
    code: string;
    name: string;
    parentCategoryId?: string | null;
    description?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface MutateStoreCategoryResponse {
    success: boolean;
    message: string;
    data?: StoreCategory | null;
}

export interface StoreCategoryListProps {
    status?: string;
    parentCategoryId?: string | null;
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
}

export interface GetStoreCategoryListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StoreCategory[];
    };
}

export async function saveStoreCategory(data: SaveStoreCategoryInput): Promise<MutateStoreCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.save.url,
            method: apiUrls.storeCategory.save.method,
            data,
        })
    ).data;
}

export const useSaveStoreCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveStoreCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeCategory)] });
        },
    });
};

export async function getStoreCategoryList(props: StoreCategoryListProps): Promise<GetStoreCategoryListResponse> {
    const { offset, limit, ...rest } = props;
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.list.url,
            method: apiUrls.storeCategory.list.method,
            data: {
                ...rest,
                limit: limit ?? 20,
                // The list endpoint paginates with page/limit rather than offset.
                ...(offset != null ? { page: Math.floor(offset / (limit ?? 20)) + 1 } : {}),
            },
        })
    ).data;
}

export const useGetStoreCategoryList = (props: StoreCategoryListProps, enabled: boolean = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeCategory), 'list', props],
        queryFn: async () => await getStoreCategoryList(props),
        enabled,
    });
};

export async function getStoreCategory(id: string): Promise<MutateStoreCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.get.url,
            method: apiUrls.storeCategory.get.method,
            data: { id },
        })
    ).data;
}

export const useGetStoreCategory = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeCategory), 'get', id],
        queryFn: async () => await getStoreCategory(id as string),
        enabled: !!id,
    });
};

export interface StoreCategoryAssignmentUser {
    id: string;
    firstName?: string | null;
    surname?: string | null;
    email?: string | null;
    staffNumber?: number | null;
}

export interface StoreCategoryAssignmentDebtor {
    id: string;
    accountNumber?: string | null;
    name?: string | null;
}

export interface StoreCategoryAssignment {
    id: string;
    storeCategoryId: string;
    companyDebtorId: string;
    // The list endpoint returns the related records as nested objects rather
    // than flattened name columns.
    storeCategory?: StoreCategory | null;
    companyDebtor?: StoreCategoryAssignmentDebtor | null;
    assignedByUser?: StoreCategoryAssignmentUser | null;
    assignedBy?: string | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    isPrimary?: boolean;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface AssignStoreCategoryInput {
    storeCategoryId: string;
    companyDebtorId: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    isPrimary?: boolean;
}

export interface EditStoreCategoryAssignmentInput {
    id: string;
    storeCategoryId?: string;
    companyDebtorId?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
    isPrimary?: boolean;
}

export interface StoreCategoryAssignmentListProps {
    // Omit to load assignments across every store.
    companyDebtorId?: string;
    activeOnly?: boolean;
}

export interface GetStoreCategoryAssignmentsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StoreCategoryAssignment[];
    };
}

export interface GetStoreCategoryAssignmentResponse {
    success: boolean;
    message: string;
    data?: StoreCategoryAssignment | null;
}

export async function assignStoreCategory(
    data: AssignStoreCategoryInput,
): Promise<MutateStoreCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.assign.url,
            method: apiUrls.storeCategory.assign.method,
            data,
        })
    ).data;
}

export const useAssignStoreCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignStoreCategory,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeCategory)] });
        },
    });
};

export async function getStoreCategoryAssignments(
    data: StoreCategoryAssignmentListProps,
): Promise<GetStoreCategoryAssignmentsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.assignmentsList.url,
            method: apiUrls.storeCategory.assignmentsList.method,
            data,
        })
    ).data;
}

export const useGetStoreCategoryAssignments = (props: StoreCategoryAssignmentListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeCategory), 'assignments', props],
        queryFn: async () => await getStoreCategoryAssignments(props),
    });
};

export async function getStoreCategoryAssignment(id: string): Promise<GetStoreCategoryAssignmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.assignmentsGet.url,
            method: apiUrls.storeCategory.assignmentsGet.method,
            data: { id },
        })
    ).data;
}

export const useGetStoreCategoryAssignment = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.storeCategory), 'assignments', 'get', id],
        queryFn: async () => await getStoreCategoryAssignment(id as string),
        enabled: !!id,
    });
};

export async function editStoreCategoryAssignment(
    data: EditStoreCategoryAssignmentInput,
): Promise<MutateStoreCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.assignmentsEdit.url,
            method: apiUrls.storeCategory.assignmentsEdit.method,
            data,
        })
    ).data;
}

export const useEditStoreCategoryAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: editStoreCategoryAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeCategory)] });
        },
    });
};

export async function deleteStoreCategoryAssignment(id: string): Promise<MutateStoreCategoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.storeCategory.assignmentsDelete.url,
            method: apiUrls.storeCategory.assignmentsDelete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteStoreCategoryAssignment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStoreCategoryAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.storeCategory)] });
        },
    });
};