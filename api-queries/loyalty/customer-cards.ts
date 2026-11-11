import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { LoyaltyCardDetails } from './loyalty-cards';
import { MembershipDetails } from './memberships';
import { B2CCustomerDetails } from '../b2c-customers';

const validTimezones = moment.tz.names();

// --------------------------------------- CUSTOMER LOYALTY CARDS ---------------------------------------

// Customer Loyalty Cards Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CustomerLoyaltyCardDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    customerId: string;
    customer: B2CCustomerDetails;
    loyaltyCardId: string;
    loyaltyCard: LoyaltyCardDetails;
    membershipId: string;
    membership: MembershipDetails;
    availablePoints: number;
    issueDate: string;
    expiryDate: string;
    isExpired: boolean;
}

export interface GetCustomerLoyaltyCardResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CustomerLoyaltyCardDetails[];
    };
}

export async function getCustomerLoyaltyCards(props: FilterProps): Promise<GetCustomerLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.customerLoyaltyCards.list.url,
            method: apiUrls.loyalty.customerLoyaltyCards.list.method,
            data: props,
        })
    ).data;
}

export const useGetCustomerLoyaltyCards = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.customerLoyaltyCards), props],
        queryFn: async () => await getCustomerLoyaltyCards(props),
    });
};

// Customer Loyalty Card Get By Id
export interface GetCustomerLoyaltyCardByIdResponse {
    success: boolean;
    data: CustomerLoyaltyCardDetails;
}

export async function getCustomerLoyaltyCardById(id: string): Promise<GetCustomerLoyaltyCardByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.customerLoyaltyCards.get.url,
            method: apiUrls.loyalty.customerLoyaltyCards.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCustomerLoyaltyCardById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.customerLoyaltyCards), id],
        queryFn: async () => await getCustomerLoyaltyCardById(id),
    });
};

// Customer Loyalty Card Create

export const customerLoyaltyCardBaseSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    loyaltyCardId: z.string().min(1, 'Card is required'),
    membershipId: z.string().min(1, 'Membership is required'),
    availablePoints: z.number().optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
});

export const customerLoyaltyCardCreateSchema = customerLoyaltyCardBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CustomerLoyaltyCardCreateSchema = z.infer<typeof customerLoyaltyCardCreateSchema>;

export type MutateCustomerLoyaltyCardResponse = {
    success: boolean;
};

export async function createCustomerLoyaltyCard(
    data: CustomerLoyaltyCardCreateSchema,
): Promise<MutateCustomerLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.customerLoyaltyCards.create.url,
            method: apiUrls.loyalty.customerLoyaltyCards.create.method,
            data,
        })
    ).data;
}

export const useCreateCustomerLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCustomerLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.customerLoyaltyCards)] });
        },
    });
};

// Customer Loyalty Card Update

export const customerLoyaltyCardUpdateSchema = customerLoyaltyCardBaseSchema.extend({ id: z.string() });

export type CustomerLoyaltyCardUpdateSchema = z.infer<typeof customerLoyaltyCardUpdateSchema>;

export async function updateCustomerLoyaltyCard(
    data: CustomerLoyaltyCardUpdateSchema,
): Promise<MutateCustomerLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.customerLoyaltyCards.update.url,
            method: apiUrls.loyalty.customerLoyaltyCards.update.method,
            data,
        })
    ).data;
}

export const useUpdateCustomerLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCustomerLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.customerLoyaltyCards)] });
        },
    });
};

// Customer Loyalty Card Delete

export async function removeCustomerLoyaltyCard(
    customerLoyaltyCardId: string,
): Promise<MutateCustomerLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.customerLoyaltyCards.delete.url,
            method: apiUrls.loyalty.customerLoyaltyCards.delete.method,
            data: { customerLoyaltyCardId },
        })
    ).data;
}

export const useRemoveCustomerLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCustomerLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.customerLoyaltyCards)] });
        },
    });
};
