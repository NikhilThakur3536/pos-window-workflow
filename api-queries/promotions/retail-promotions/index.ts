import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// Retail Promotion Create

export const retailRetailPromotionBaseSchema = z.object({
    companyStockPromotionId: z.string().min(1, 'Promotion is required'),
    companyDebtorIds: z.array(z.string()).min(1, 'At least one store is required'),
    allStore: z.boolean(),
});

export const retailRetailPromotionCreateSchema = retailRetailPromotionBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type RetailPromotionCreateSchema = z.infer<typeof retailRetailPromotionCreateSchema>;

export type MutateRetailPromotionResponse = {
    success: boolean;
};

export async function createRetailPromotion(data: RetailPromotionCreateSchema): Promise<MutateRetailPromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.update.url,
            method: apiUrls.promotions.update.method,
            data,
        })
    ).data;
}

export const useCreateRetailPromotion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createRetailPromotion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.promotions)] });
        },
    });
};
