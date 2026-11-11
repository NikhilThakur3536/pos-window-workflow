import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { LoyaltyCardDetails } from './loyalty-cards';
import { MembershipDetails } from './memberships';

const validTimezones = moment.tz.names();

// --------------------------------------- DEBTOR LOYALTY CARDS ---------------------------------------

// Debtor Loyalty Cards Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface DebtorLoyaltyCardDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    debtorId: string;
    CompanyDebtor: CompanyCreditor;
    loyaltyCardId: string;
    loyaltyCard: LoyaltyCardDetails;
    membershipId: string;
    membership: MembershipDetails;
    availablePoints: number;
    issueDate: string;
    expiryDate: string;
    isExpired: boolean;
}

export interface GetDebtorLoyaltyCardResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorLoyaltyCardDetails[];
    };
}

export async function getDebtorLoyaltyCards(props: FilterProps): Promise<GetDebtorLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.debtorLoyaltyCards.list.url,
            method: apiUrls.loyalty.debtorLoyaltyCards.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorLoyaltyCards = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.debtorLoyaltyCards), props],
        queryFn: async () => await getDebtorLoyaltyCards(props),
    });
};

// Debtor Loyalty Card Get By Id
export interface GetDebtorLoyaltyCardByIdResponse {
    success: boolean;
    data: DebtorLoyaltyCardDetails;
}

export async function getDebtorLoyaltyCardById(id: string): Promise<GetDebtorLoyaltyCardByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.debtorLoyaltyCards.get.url,
            method: apiUrls.loyalty.debtorLoyaltyCards.get.method,
            data: { id },
        })
    ).data;
}

export const useGetDebtorLoyaltyCardById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.debtorLoyaltyCards), id],
        queryFn: async () => await getDebtorLoyaltyCardById(id),
    });
};

// Debtor Loyalty Card Create

export const debtorLoyaltyCardBaseSchema = z.object({
    debtorId: z.string().min(1, 'Debtor is required'),
    loyaltyCardId: z.string().min(1, 'Card is required'),
    membershipId: z.string().min(1, 'Membership is required'),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
});

export const debtorLoyaltyCardCreateSchema = debtorLoyaltyCardBaseSchema
    .extend({
        availablePoints: z.number().optional(),
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type DebtorLoyaltyCardCreateSchema = z.infer<typeof debtorLoyaltyCardCreateSchema>;

export type MutateDebtorLoyaltyCardResponse = {
    success: boolean;
};

export async function createDebtorLoyaltyCard(
    data: DebtorLoyaltyCardCreateSchema,
): Promise<MutateDebtorLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.debtorLoyaltyCards.create.url,
            method: apiUrls.loyalty.debtorLoyaltyCards.create.method,
            data,
        })
    ).data;
}

export const useCreateDebtorLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.debtorLoyaltyCards)] });
        },
    });
};

// Debtor Loyalty Card Update

export const debtorLoyaltyCardUpdateSchema = debtorLoyaltyCardBaseSchema.extend({ id: z.string() });

export type DebtorLoyaltyCardUpdateSchema = z.infer<typeof debtorLoyaltyCardUpdateSchema>;

export async function updateDebtorLoyaltyCard(
    data: DebtorLoyaltyCardUpdateSchema,
): Promise<MutateDebtorLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.debtorLoyaltyCards.update.url,
            method: apiUrls.loyalty.debtorLoyaltyCards.update.method,
            data,
        })
    ).data;
}

export const useUpdateDebtorLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.debtorLoyaltyCards)] });
        },
    });
};

// Debtor Loyalty Card Delete

export async function removeDebtorLoyaltyCard(debtorLoyaltyCardId: string): Promise<MutateDebtorLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.debtorLoyaltyCards.delete.url,
            method: apiUrls.loyalty.debtorLoyaltyCards.delete.method,
            data: { debtorLoyaltyCardId },
        })
    ).data;
}

export const useRemoveDebtorLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeDebtorLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.debtorLoyaltyCards)] });
        },
    });
};
