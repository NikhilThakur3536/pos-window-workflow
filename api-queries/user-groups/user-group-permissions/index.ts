import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- User Group Permissions ---------------------------------------

// User Group Permissions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyUserGroupId?: string;
    moduleId?: string;
};

export interface UserGroupPermissionDetails {
    id: string;
    moduleId: string;
    moduleName: string;
    moduleCode: string;
    groupId: string;
    canAccess: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    showInMenu: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    companyId: string;
    domainId: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetUserGroupPermissionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: UserGroupPermissionDetails[];
    };
}

export async function getUserGroupPermissions(props: FilterProps): Promise<GetUserGroupPermissionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroupPermissions.list.url,
            method: apiUrls.userGroupPermissions.list.method,
            params: props,
        })
    ).data;
}

export const useGetUserGroupPermissions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroupPermissions), props],
        queryFn: async () => await getUserGroupPermissions(props),
    });
};

// User Group Permission Get By Id
export interface GetUserGroupPermissionByIdResponse {
    success: boolean;
    data: UserGroupPermissionDetails;
}

export async function getUserGroupPermissionById(id: string): Promise<GetUserGroupPermissionByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroupPermissions.get.url(id),
            method: apiUrls.userGroupPermissions.get.method,
        })
    ).data;
}

export const useGetUserGroupPermissionById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroupPermissions), id],
        queryFn: async () => await getUserGroupPermissionById(id),
    });
};

// User Group Modules Listing

export interface UserGroupModulesDetails {
    id: string;
    code: string;
    name: string;
    parentId?: string | null;
    children?: UserGroupModulesDetails[];
}

export interface GetUserGroupModulesResponse {
    success: boolean;
    message: string;
    data: UserGroupModulesDetails[];
}

export async function getUserGroupModules(): Promise<GetUserGroupModulesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroupModules.list.url,
            method: apiUrls.userGroupModules.list.method,
        })
    ).data;
}

export const useGetUserGroupModules = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroupModules)],
        queryFn: async () => await getUserGroupModules(),
    });
};

// User Group Permissions Create

export const UserGroupPermissionBaseSchema = z.object({
    canAccess: z.boolean(),
    canCreate: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
    showInMenu: z.boolean(),
    moduleId: z.string().min(1, 'Module is required'),
    groupId: z.string().min(1, 'User Group is required'),
    companyId: z.string().min(1, 'Company is required'),
    domainId: z.string().min(1, 'Domain is required'),
});

export const userGroupPermissionCreateSchema = UserGroupPermissionBaseSchema;

export type UserGroupPermissionCreateSchema = z.infer<typeof userGroupPermissionCreateSchema>;

export type MutateUserGroupPermissionResponse = {
    success: boolean;
};

export async function createUserGroupPermission(
    data: UserGroupPermissionCreateSchema,
): Promise<MutateUserGroupPermissionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroupPermissions.create.url,
            method: apiUrls.userGroupPermissions.create.method,
            data,
        })
    ).data;
}

export const useCreateUserGroupPermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUserGroupPermission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroupPermissions)], exact: false });
        },
    });
};

// User Group Permission Update

export const userGroupPermissionUpdateSchema = UserGroupPermissionBaseSchema.extend({ id: z.string() });

export type UserGroupPermissionUpdateSchema = z.infer<typeof userGroupPermissionUpdateSchema>;

export async function updateUserGroupPermission(
    data: UserGroupPermissionUpdateSchema,
): Promise<MutateUserGroupPermissionResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.userGroupPermissions.update.url(id),
            method: apiUrls.userGroupPermissions.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateUserGroupPermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUserGroupPermission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroupPermissions)], exact: false });
        },
    });
};

// User Group Permission Delete

export async function removeUserGroupPermission(id: string): Promise<MutateUserGroupPermissionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroupPermissions.delete.url(id),
            method: apiUrls.userGroupPermissions.delete.method,
        })
    ).data;
}

export const useRemoveUserGroupPermission = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUserGroupPermission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroupPermissions)], exact: false });
        },
    });
};
