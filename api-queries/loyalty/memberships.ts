import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- MEMBERSHIPS ---------------------------------------

// Memberships Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface MembershipDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    name: string;
    code: string;
    pointsPerSpending: number;
    redeemRate: number;
    description: string;
}

export interface GetMembershipResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: MembershipDetails[];
    };
}

export async function getMemberships(props: FilterProps): Promise<GetMembershipResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.memberships.list.url,
            method: apiUrls.loyalty.memberships.list.method,
            data: props,
        })
    ).data;
}

export const useGetMemberships = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.memberships), props],
        queryFn: async () => await getMemberships(props),
    });
};

// Membership Get By Id
export interface GetMembershipByIdResponse {
    success: boolean;
    data: MembershipDetails;
}

export async function getMembershipById(id: string): Promise<GetMembershipByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.memberships.get.url,
            method: apiUrls.loyalty.memberships.get.method,
            data: { id },
        })
    ).data;
}

export const useGetMembershipById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.memberships), id],
        queryFn: async () => await getMembershipById(id),
    });
};

// Membership Create

export const membershipBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    code: z.string().min(1, 'Code is required'),
    pointsPerSpending: z.number().min(1, 'Points per spending is required'),
    redeemRate: z.number().min(1, 'Redeem rate is required'),
    description: z.string().optional(),
});

export const membershipCreateSchema = membershipBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type MembershipCreateSchema = z.infer<typeof membershipCreateSchema>;

export type MutateMembershipResponse = {
    success: boolean;
};

export async function createMembership(data: MembershipCreateSchema): Promise<MutateMembershipResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.memberships.create.url,
            method: apiUrls.loyalty.memberships.create.method,
            data,
        })
    ).data;
}

export const useCreateMembership = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createMembership,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.memberships)] });
        },
    });
};

// Membership Update

export const membershipUpdateSchema = membershipBaseSchema.extend({ id: z.string() });

export type MembershipUpdateSchema = z.infer<typeof membershipUpdateSchema>;

export async function updateMembership(data: MembershipUpdateSchema): Promise<MutateMembershipResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.memberships.update.url,
            method: apiUrls.loyalty.memberships.update.method,
            data,
        })
    ).data;
}

export const useUpdateMembership = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMembership,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.memberships)] });
        },
    });
};

// Membership Delete

export async function removeMembership(membershipId: string): Promise<MutateMembershipResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.memberships.delete.url,
            method: apiUrls.loyalty.memberships.delete.method,
            data: { membershipId },
        })
    ).data;
}

export const useRemoveMembership = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeMembership,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.memberships)] });
        },
    });
};
