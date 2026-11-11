import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { UserGroupDetails } from '../user-groups';
import { GetUserGroupPermissionResponse } from '../user-groups/user-group-permissions';
import { getDBData, setDBData } from '@/offline/db';
import { useRouter } from 'next/router';
import { CompanyCreditor } from '@/types';
import { WarehouseDetails } from '../warehouse';
import { useAuthUser } from '@/stores/auth-user.store';

const validTimezones = moment.tz.names();

export const userTypeMenu = [
    {
        value: 'COMPANY-USER',
        label: 'Company',
    },
    {
        value: 'COMPANY-DEBTOR-USER',
        label: 'Company Debtor',
    },
    {
        value: 'WAREHOUSE-USER',
        label: 'Warehouse',
    },
];

// --------------------------------------- Users ---------------------------------------

// Users Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyId?: string;
    userType?: UserTypesType | '';
    companyDebtorId?: string;
    warehouseId?: string;
};

export const userTypesEnum = z.enum(['COMPANY-USER', 'COMPANY-DEBTOR-USER', 'WAREHOUSE-USER']);

export type UserTypesType = z.infer<typeof userTypesEnum>;

export interface UserDetails {
    id: string;
    timezone: string;
    staffNumber: number;
    firstName: string;
    surname: string;
    initials?: string;
    idNumber?: number;
    addressOne?: string;
    addressTwo?: string;
    addressThree?: string;
    postCode?: string;
    telephone?: string;
    cellPhone?: string;
    email: string;
    password?: string;
    reportAccessLevelId?: string;
    administrator: boolean;
    pinNumber?: string;
    forcePasswordChange?: string;
    forcePasswordChangeEveryXDays?: number;
    useClassicMenu?: boolean;
    askForPinContinuously?: boolean;
    enableSystemNotifications?: boolean;
    systemLanguageId?: string;
    systemCharacterSetId?: string;
    companyUserGroups: { groupId: string; group: UserGroupDetails }[];
    userType: UserTypesType;
    companyDebtorId: string;
    warehouseId: string;
    companyDebtor: CompanyCreditor;
    warehouse: WarehouseDetails;
    status?: 'ACTIVE' | 'INACTIVE';
    domainId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface GetUserResponse {
    success: boolean;
    message: string;
    count: number;
    data: UserDetails[];
}

export async function getUsers(props: FilterProps): Promise<GetUserResponse> {
    return (
        await axiosInstance({
            url: apiUrls.users.list.url,
            method: apiUrls.users.list.method,
            params: props,
        })
    ).data;
}

export const useGetUsers = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.users), props],
        queryFn: async () => await getUsers(props),
    });
};

// User Get By Id
export interface GetUserByIdResponse {
    success: boolean;
    data: UserDetails;
}

export async function getUserById(id: string): Promise<GetUserByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.users.get.url(id),
            method: apiUrls.users.get.method,
        })
    ).data;
}

export const useGetUserById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.users), id],
        queryFn: async () => await getUserById(id),
    });
};

// User Create

export const userBaseSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    surname: z.string().optional(),
    initials: z.string().optional(),
    email: z.email('Invalid email address'),
    staffNumber: z.number().min(1, 'Invalid Staff Number'),
    idNumber: z.string().min(1, 'ID number is required'),
    addressOne: z.string().optional(),
    addressTwo: z.string().optional(),
    addressThree: z.string().optional(),
    postCode: z.string().optional(),
    telephone: z.string().optional(),
    cellPhone: z.string().optional(),
    reportAccessLevelId: z.string().optional(),
    groupId: z.string().optional(),
    userType: userTypesEnum,
    companyDebtorId: z.string().optional(),
    warehouseId: z.string().optional(),
    administrator: z.boolean().optional(),
    forcePasswordChangeEveryXDays: z.number().optional(),
    pinNumber: z.string().optional(),
    forcePasswordChange: z.string().optional(),
    useClassicMenu: z.boolean().optional(),
    askForPinContinuously: z.boolean().optional(),
    enableSystemNotifications: z.boolean().optional(),
    systemLanguageId: z.string().optional(),
    systemCharacterSetId: z.string().optional(),
});

export const userCreateSchema = userBaseSchema
    .extend({
        timezone: z.string(),
        password: z.string().min(6, 'Password must be at least 6 characters long'),
        companyId: z.string().min(1, 'Company id is required'),
        domainId: z.string().min(1, 'Domain id is required'),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    })
    .refine(
        (data) => {
            if (data.userType === 'COMPANY-DEBTOR-USER') {
                return !!data.companyDebtorId;
            }
            return true;
        },
        {
            message: 'Debtor is required for Company Debtor User',
            path: ['companyDebtorId'],
        },
    )
    .refine(
        (data) => {
            if (data.userType === 'WAREHOUSE-USER') {
                return !!data.warehouseId;
            }
            return true;
        },
        {
            message: 'Warehouse is required for Warehouse User',
            path: ['warehouseId'],
        },
    );

export type UserCreateSchema = z.infer<typeof userCreateSchema>;

export type MutateUserResponse = {
    success: boolean;
};

export async function createUser(data: UserCreateSchema): Promise<MutateUserResponse> {
    return (
        await axiosInstance({
            url: apiUrls.users.create.url,
            method: apiUrls.users.create.method,
            data,
        })
    ).data;
}

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.users)] });
        },
    });
};

// User Update

export const userUpdateSchema = userBaseSchema.extend({ id: z.string() });

export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;

export async function updateUser(data: UserUpdateSchema): Promise<MutateUserResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.users.update.url(id),
            method: apiUrls.users.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.users)] });
        },
    });
};

// User Delete

export async function removeUser(id: string): Promise<MutateUserResponse> {
    return (
        await axiosInstance({
            url: apiUrls.users.delete.url(id),
            method: apiUrls.users.delete.method,
        })
    ).data;
}

export const useRemoveUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.users)] });
        },
    });
};

// Users Permissions

export type PermissionFilterProps = {
    companyUserGroupId?: string;
};

export async function getUsersPermissions(
    companyUserGroupId: string,
    online: boolean,
): Promise<GetUserGroupPermissionResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.userGroupPermissions.list.url,
            method: apiUrls.userGroupPermissions.list.method,
            params: { companyUserGroupId },
        });

        await setDBData(`db_${getApiKey(apiUrls.userGroupPermissions)}`, response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetUserGroupPermissionResponse>(getIDBKey(apiUrls.userGroupPermissions));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetUsersPermissions = (online: boolean, enabled: boolean = true) => {
    const router = useRouter();
    const companyUserGroupId = useAuthUser.getState().user?.companyUserGroups?.[0]?.groupId || '';

    return useQuery({
        queryKey: [getApiKey(apiUrls.userGroupPermissions), companyUserGroupId, online, router.asPath],
        queryFn: async () => await getUsersPermissions(companyUserGroupId, online),
        networkMode: 'always',
        enabled,
    });
};
