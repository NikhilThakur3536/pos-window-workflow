import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- LOYALTY CARDS ---------------------------------------

// Loyalty Cards Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface LoyaltyCardDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    name: string;
    cardNumber: string;
    barcode: string;
    description: string;
}

export interface GetLoyaltyCardResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: LoyaltyCardDetails[];
    };
}

export async function getLoyaltyCards(props: FilterProps): Promise<GetLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.loyaltyCards.list.url,
            method: apiUrls.loyalty.loyaltyCards.list.method,
            data: props,
        })
    ).data;
}

export const useGetLoyaltyCards = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.loyaltyCards), props],
        queryFn: async () => await getLoyaltyCards(props),
    });
};

// Loyalty Card Get By Id
export interface GetLoyaltyCardByIdResponse {
    success: boolean;
    data: LoyaltyCardDetails;
}

export async function getLoyaltyCardById(id: string): Promise<GetLoyaltyCardByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.loyaltyCards.get.url,
            method: apiUrls.loyalty.loyaltyCards.get.method,
            data: { id },
        })
    ).data;
}

export const useGetLoyaltyCardById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.loyaltyCards), id],
        queryFn: async () => await getLoyaltyCardById(id),
    });
};

// Loyalty Card Create

export const loyaltyCardBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    cardNumber: z.string().min(1, 'Card Number is required'),
    barcode: z.string().optional(),
    description: z.string().optional(),
});

export const loyaltyCardCreateSchema = loyaltyCardBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type LoyaltyCardCreateSchema = z.infer<typeof loyaltyCardCreateSchema>;

export type MutateLoyaltyCardResponse = {
    success: boolean;
};

export async function createLoyaltyCard(data: LoyaltyCardCreateSchema): Promise<MutateLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.loyaltyCards.create.url,
            method: apiUrls.loyalty.loyaltyCards.create.method,
            data,
        })
    ).data;
}

export const useCreateLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.loyaltyCards)] });
        },
    });
};

// Loyalty Card Update

export const loyaltyCardUpdateSchema = loyaltyCardBaseSchema.extend({ id: z.string() });

export type LoyaltyCardUpdateSchema = z.infer<typeof loyaltyCardUpdateSchema>;

export async function updateLoyaltyCard(data: LoyaltyCardUpdateSchema): Promise<MutateLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.loyaltyCards.update.url,
            method: apiUrls.loyalty.loyaltyCards.update.method,
            data,
        })
    ).data;
}

export const useUpdateLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.loyaltyCards)] });
        },
    });
};

// Loyalty Card Delete

export async function removeLoyaltyCard(loyaltyCardId: string): Promise<MutateLoyaltyCardResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.loyaltyCards.delete.url,
            method: apiUrls.loyalty.loyaltyCards.delete.method,
            data: { loyaltyCardId },
        })
    ).data;
}

export const useRemoveLoyaltyCard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeLoyaltyCard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.loyalty.loyaltyCards)] });
        },
    });
};
