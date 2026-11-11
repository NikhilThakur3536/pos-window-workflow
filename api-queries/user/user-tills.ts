import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { TillDetails } from '@/api-queries/masters/tills';
import { UserDetails } from '@/api-queries/user';

const validTimezones = moment.tz.names();

// --------------------------------------- USER TILLS ---------------------------------------

// User Tills Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    userId?: string;
    tillId?: string;
};

export interface UserTillDetails {
    id: string;
    companyId: string;
    domainId: string;
    tillId: string;
    userId: string;
    till: TillDetails;
    user: UserDetails;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetUserTillResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: UserTillDetails[];
    };
}

export async function getUserTills(props: FilterProps): Promise<GetUserTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.list.url,
            method: apiUrls.userTills.list.method,
            data: { filter: props },
        })
    ).data;
}

export const useGetUserTills = (props: FilterProps, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userTills), props],
        queryFn: async () => await getUserTills(props),
        enabled,
    });
};

// User Till Get By Id
export interface GetUserTillByIdResponse {
    success: boolean;
    data: UserTillDetails;
}

export async function getUserTillById(id: string): Promise<GetUserTillByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.get.url,
            method: apiUrls.userTills.get.method,
            data: { id },
        })
    ).data;
}

export const useGetUserTillById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userTills), id],
        queryFn: async () => await getUserTillById(id),
    });
};

// User Till Create
//
// Backlog 3023: assignment and reassignment BOTH go through tillAssign/create.
// tillAssign/update is never used to change userId/tillId, so it is deliberately
// not wrapped here. Calling create with an already-active till/user pair is safe -
// the backend returns the existing active assignment instead of a duplicate, and a
// till that still has an open cashier session is rejected with a 409.

export const userTillBaseSchema = z.object({
    tillId: z.string().min(1, 'Till is required'),
    userId: z.string().min(1, 'User is Number is required'),
});

export const userTillCreateSchema = userTillBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type UserTillCreateSchema = z.infer<typeof userTillCreateSchema>;

export type MutateUserTillResponse = {
    success: boolean;
};

export async function createUserTill(data: UserTillCreateSchema): Promise<MutateUserTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.create.url,
            method: apiUrls.userTills.create.method,
            data,
        })
    ).data;
}

export const useCreateUserTill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUserTill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills)] });
        },
    });
};

// User Till Delete
//
// Deactivation only. Unassigning is not a userId/tillId change, so this stays on
// tillAssign/delete. It is not a substitute for closing a cashier session.

export async function removeUserTill(id: string): Promise<MutateUserTillResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.delete.url,
            method: apiUrls.userTills.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveUserTill = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUserTill,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills)] });
        },
    });
};
