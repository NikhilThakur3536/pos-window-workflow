import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '@/api-queries/company/stock-details';

// --------------------------------------- SCHEDULED PRICING ---------------------------------------

export type ScheduledPricingFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    scheduleStatus?: string;
};

export interface ScheduledPricingDetails {
    id: string;
    pricingId: string;
    companyId: string;
    domainId: string;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    priceExclusive: number;
    priceInclusive: number;
    effectiveAt: string;
    scheduleStatus: 'SCHEDULED' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
    createdAt: string;
    updatedAt: string;
    canceledAt?: string | null;
    cancellationReason?: string | null;
    CompanyStockDetail?: StockDetails;
    CompanyStockPricing?: {
        CompanyStockPricingType?: {
            id: string;
            name: string;
        };
        pumpPrice?: number;
    };
}

export interface GetScheduledPricingResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: ScheduledPricingDetails[];
    };
}

export async function getScheduledPricings(props: ScheduledPricingFilterProps): Promise<GetScheduledPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyStockPricing.scheduled.url,
            method: apiUrls.companyStockPricing.scheduled.method,
            data: props,
        })
    ).data;
}

export const useGetScheduledPricings = (props: ScheduledPricingFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyStockPricing), props],
        queryFn: async () => await getScheduledPricings(props),
    });
};

// Schedule
export const scheduledPricingSchema = z.object({
    pricingId: z.string().min(1, 'Pricing is required'),
    priceExclusive: z.number().min(0, 'Price must be at least 0'),
    priceInclusive: z.number().min(0, 'Price must be at least 0'),
    effectiveAt: z.string().min(1, 'Effective date is required'),
});

export type ScheduledPricingSchema = z.infer<typeof scheduledPricingSchema>;

export type MutateScheduledPricingResponse = {
    success: boolean;
    message?: string;
};

export async function schedulePricing(data: ScheduledPricingSchema): Promise<MutateScheduledPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyStockPricing.schedule.url,
            method: apiUrls.companyStockPricing.schedule.method,
            data,
        })
    ).data;
}

export const useSchedulePricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: schedulePricing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyStockPricing)] });
        },
    });
};

// Cancel
export async function cancelScheduledPricing(data: {
    pricingId: string;
    reason?: string;
}): Promise<MutateScheduledPricingResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyStockPricing.cancelSchedule.url,
            method: apiUrls.companyStockPricing.cancelSchedule.method,
            data,
        })
    ).data;
}

export const useCancelScheduledPricing = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelScheduledPricing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyStockPricing)] });
        },
    });
};
