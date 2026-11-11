import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- User Groups ---------------------------------------

// User Groups Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    searchKey?: string;
    status?: string;
    companyId?:string;
    sortBy?:'asc'|'desc'
};

export interface UserGroupDetails {
    id: string;
    name: string;
    groupCode: string;
    status: 'ACTIVE' | 'INACTIVE';
    companyId: string;
    domainId: string;
    description: string;
    isTerminalLock: boolean;
    timezone: string;
    approvalLevel?: number;
    canSupervisorLogin?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GetUserGroupResponse {
    success: boolean;
    message: string;
    count: number;
    data: UserGroupDetails[];
}

export async function getUserGroups(props: FilterProps): Promise<GetUserGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroups.list.url,
            method: apiUrls.userGroups.list.method,
            params: props,
        })
    ).data;
}

export const useGetUserGroups = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroups), props],
        queryFn: async () => await getUserGroups(props),
    });
};

// User Group Get By Id
export interface GetUserGroupByIdResponse {
    success: boolean;
    data: UserGroupDetails;
}

export async function getUserGroupById(id: string): Promise<GetUserGroupByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroups.get.url(id),
            method: apiUrls.userGroups.get.method,
        })
    ).data;
}

export const useGetUserGroupById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroups), id],
        queryFn: async () => await getUserGroupById(id),
    });
};

// User Groups Create

export const userGroupBaseSchema = z.object({
    name: z.string().min(1, 'Group name is required'),
    groupCode: z.string().min(1, 'Group code is required'),
    isTerminalLock: z.boolean(),
    description: z.string().optional(),
    approvalLevel: z.number().min(0).max(99).optional(),
    canSupervisorLogin: z.boolean().optional(),
});

export const userGroupCreateSchema = userGroupBaseSchema
    .extend({
        timezone: z.string(),
        companyId: z.string().min(1, 'Company id is required'),
        domainId: z.string().min(1, 'Domain id is required'),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type UserGroupCreateSchema = z.infer<typeof userGroupCreateSchema>;

export type MutateUserGroupResponse = {
    success: boolean;
};

export async function createUserGroup(data: UserGroupCreateSchema): Promise<MutateUserGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroups.create.url,
            method: apiUrls.userGroups.create.method,
            data,
        })
    ).data;
}

export const useCreateUserGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUserGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroups)] });
        },
    });
};

// User Group Update

export const userGroupUpdateSchema = userGroupBaseSchema.extend({ id: z.string() });

export type UserGroupUpdateSchema = z.infer<typeof userGroupUpdateSchema>;

export async function updateUserGroup(data: UserGroupUpdateSchema): Promise<MutateUserGroupResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.userGroups.update.url(id),
            method: apiUrls.userGroups.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateUserGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUserGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroups)] });
        },
    });
};

// User Group Delete

export async function removeUserGroup(id: string): Promise<MutateUserGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userGroups.delete.url(id),
            method: apiUrls.userGroups.delete.method,
        })
    ).data;
}

export const useRemoveUserGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUserGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userGroups)] });
        },
    });
};
