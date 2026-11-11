import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { PromotionTypesDetails } from './types';
import { StockDetails } from '../company/stock-details';
import { PromotionGroupsDetails } from './groups';

const validTimezones = moment.tz.names();

// --------------------------------------- PROMOTIONS ---------------------------------------

// Promotions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
};

export const PROGRESSIVE_LEVELS = ['NONE', 'APPLY_TO_ALL', 'APPLY_INCREMENTAL'];

export const REOCCURENCE_TYPES = ['STAGGERED', 'ONCE_OFF'];

export const discountValuesSchema = z.object({
    quantity: z.number().optional(),
    discountValue: z.number().optional(),
});

export const discountPercentsSchema = z.object({
    quantity: z.number().optional(),
    discountPercent: z.number().optional(),
});

export const discountSchema = z.union([discountValuesSchema, discountPercentsSchema]);

export const qualifyingItemsSchema = z.object({
    companyStockDetailId: z.string(),
    quantityGiven: z.number().int('Quantity must be an integer').min(0, 'Quantity must be 0 or greater').optional(),
    promotionalPrice: z.number().optional(),
    // Newer offer-type fields (BUY_X_GET_Y_FREE / BUY_X_GET_CHEAPEST_FREE etc.)
    quantity: z.number().optional(),
    selectionOrder: z.number().optional(),
    isExcluded: z.boolean().optional(),
});

export const qualifyingGroupsSchema = z.object({
    companyStockPromotionId: z.string(),
    quantityGiven: z.number().int('Quantity must be an integer').min(0, 'Quantity must be 0 or greater').optional(),
});

export const rewardItemsSchema = z.object({
    companyStockDetailId: z.string(),
    quantity: z.number().int('Quantity must be an integer').min(0, 'Quantity must be 0 or greater'),
    selectionOrder: z.number().optional(),
    isExcluded: z.boolean().optional(),
    // Buy-X-Get-Y reward units are handed over free; the engine reads this flag.
    isFree: z.boolean().optional(),
    companyTaxRateId: z.string().optional().nullable(),
});

export const OFFER_TYPES = [
    'STANDARD',
    'BUY_X_GET_Y_FREE',
    'BUY_X_GET_Y_PERCENT',
    'BUY_X_GET_Y_FIXED',
    'BUY_X_GET_CHEAPEST_FREE',
] as const;

export type OfferType = (typeof OFFER_TYPES)[number];

export const REWARD_SELECTION_RULES = ['CHEAPEST', 'MOST_EXPENSIVE', 'ANY'] as const;

export type RewardSelectionRule = (typeof REWARD_SELECTION_RULES)[number];

export interface PromotionDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'PENDING';
    isActive?: boolean;
    promotionDescription: string;
    promotionBatchCode: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    cashOnly: boolean;
    loyaltyOnly: boolean;
    qualifyingItemsRule: 'ANY' | 'ALL';
    promotionTypeId: string;
    CompanyStockPromotionType: PromotionTypesDetails;
    openEnded: boolean;
    isEligible: boolean;
    isAutoApplied: boolean;

    // Optional Fields
    quantityToBuy: number;
    freeQuantity: number;
    totalToPay: number;
    priceToPayPerItem: number;
    minimumSpend: number;
    discountPercent: number;
    discountValue: number;
    maximumDiscount?: number;
    progressiveScale: z.infer<typeof discountSchema>[];
    progressiveLevel: (typeof PROGRESSIVE_LEVELS)[number] | undefined;
    reoccurence: (typeof REOCCURENCE_TYPES)[number] | undefined;

    // Offer-type fields (B1G1 / buy-x-get-y family)
    offerType?: string;
    rewardSelectionRule?: string;
    allowStacking?: boolean;

    // Items
    CompanyStockPromotionItems: {
        CompanyStockDetail: StockDetails;
        companyStockDetailId: string;
        quantityGiven: number;
        promotionalPrice: number;
        itemType?: 'QUALIFYING' | 'REWARD';
        isFree?: boolean;
    }[];

    // Groups
    CompanyStockPromotionGroup: {
        group: PromotionGroupsDetails;
        quantityGiven: number;
    }[];
}

export interface GetPromotionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: PromotionDetails[];
    };
}

export async function getPromotions(props: FilterProps): Promise<GetPromotionResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'promotions', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.promotions.list.url,
                method: apiUrls.promotions.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetPromotions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.promotions), props],
        queryFn: async () => await getPromotions(props),
    });
};

// Eligible Promotions

export type EligiblePromotionsFilterProps = {
    search?: string;
    items: {
        companyStockDetailId: string;
        quantity: number;
    }[];
    basketTotal: number;
};

export async function getEligiblePromotions(props: EligiblePromotionsFilterProps): Promise<GetPromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.eligibleList.url,
            method: apiUrls.promotions.eligibleList.method,
            data: props,
        })
    ).data;
}

export const useGetElgiblePromotions = (props: EligiblePromotionsFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.promotions), props],
        queryFn: async () => await getEligiblePromotions(props),
    });
};

// Promotion Get By Id
export interface GetPromotionByIdResponse {
    success: boolean;
    data: PromotionDetails;
}

export async function getPromotionById(id: string): Promise<GetPromotionByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.get.url,
            method: apiUrls.promotions.get.method,
            data: { id },
        })
    ).data;
}

export const useGetPromotionById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.promotions), id],
        queryFn: async () => await getPromotionById(id),
    });
};

// Promotion Create

export const promotionBaseSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING']),
    isActive: z.boolean().optional(),
    promotionDescription: z.string().min(1, 'Promotion description is required'),
    promotionBatchCode: z.string().min(1, 'Promotion batch code is required'),

    startDate: z.string().optional(),
    endDate: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    openEnded: z.boolean(),

    cashOnly: z.boolean(),
    loyaltyOnly: z.boolean(),

    qualifyingItemsRule: z.enum(['ANY', 'ALL']).optional(),

    promotionTypeId: z.string().min(1, 'Promotion type is required'),

    // Optional Fields
    quantityToBuy: z.number().int('Quantity must be an integer').min(0, 'Quantity must be 0 or greater').optional(),
    freeQuantity: z
        .number()
        .int('Free quantity must be an integer')
        .min(0, 'Free quantity must be 0 or greater')
        .optional(),
    totalToPay: z.number().optional(),
    priceToPayPerItem: z.number().optional(),
    minimumSpend: z.number().optional(),
    discountPercent: z.number().optional(),
    discountValue: z.number().optional(),
    // BIAGDPT: ceiling applied to the percentage discount on the qualifying set.
    maximumDiscount: z.number().optional(),
    progressiveScale: z.array(discountSchema).optional(),
    progressiveLevel: z.enum(PROGRESSIVE_LEVELS).optional(),
    reoccurence: z.enum(REOCCURENCE_TYPES).optional(),

    // Items
    qualifyingItems: z.array(qualifyingItemsSchema).optional(),
    // Items
    qualifyingGroups: z.array(qualifyingGroupsSchema).optional(),

    // Newer offer-type scheme (optional; existing promotionType flow unchanged)
    offerType: z.enum(OFFER_TYPES).optional(),
    rewardSelectionRule: z.enum(REWARD_SELECTION_RULES).optional(),
    allowStacking: z.boolean().optional(),
    companyDebtorIds: z.array(z.string()).optional(),
    companyWarehouseId: z.string().optional(),
    customerIds: z.array(z.string()).optional(),
    rewardItems: z.array(rewardItemsSchema).optional(),
});

export const promotionCreateSchema = promotionBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type PromotionCreateSchema = z.infer<typeof promotionCreateSchema>;

export type MutatePromotionResponse = {
    success: boolean;
};

export async function createPromotion(data: PromotionCreateSchema): Promise<MutatePromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.create.url,
            method: apiUrls.promotions.create.method,
            data: { ...data, isActive: data.isActive ?? data.status === 'ACTIVE' },
        })
    ).data;
}

export const useCreatePromotion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPromotion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.promotions)] });
        },
    });
};

// Promotion Update

export const promotionUpdateSchema = promotionBaseSchema.extend({ companyStockPromotionId: z.string() });

export type PromotionUpdateSchema = z.infer<typeof promotionUpdateSchema>;

export async function updatePromotion(data: PromotionUpdateSchema): Promise<MutatePromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.update.url,
            method: apiUrls.promotions.update.method,
            data: { ...data, isActive: data.isActive ?? data.status === 'ACTIVE' },
        })
    ).data;
}

export const useUpdatePromotion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePromotion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.promotions)] });
        },
    });
};

// Promotion Delete

export async function removePromotion(companyStockPromotionId: string): Promise<MutatePromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.delete.url,
            method: apiUrls.promotions.delete.method,
            data: { companyStockPromotionId },
        })
    ).data;
}

export const useRemovePromotion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removePromotion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.promotions)] });
        },
    });
};

// Validate Promotion

export type PromotionValidationDetails = {
    items: {
        companyStockDetailId: string;
        quantity: number;
        promotionalPrice?: number;
    }[];
};

export interface AppliedPromotionDetails {
    promotion: PromotionDetails;
    validation?: PromotionValidationDetails;
}

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
});

export type PromotionValidationCartItemsSchema = z.infer<typeof cartItemSchema>[];

export const promotionValidationSchema = z.object({
    promotionId: z.string().min(1, 'Promotion is required'),
    items: z.array(cartItemSchema).min(1, 'At least one product must be selected'),
});

export type PromotionValidationSchema = z.infer<typeof promotionValidationSchema>;

export type PromotionValidationResponse = {
    success: boolean;
    data: AppliedPromotionDetails;
};

export async function validatePromotion(data: PromotionValidationSchema): Promise<PromotionValidationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.validate.url,
            method: apiUrls.promotions.validate.method,
            data,
        })
    ).data;
}

export const useValidatePromotion = () =>
    useMutation({
        mutationFn: validatePromotion,
    });

// Auto Apply Promotion

const autoApplyPromotionSchema = z.object({
    basketTotal: z.number().min(0, 'Invalid basket total'),
    items: z.array(cartItemSchema).min(1, 'At least one product must be selected'),
});

type AutoApplyPromotionSchema = z.infer<typeof autoApplyPromotionSchema>;

export type AutoApplyPromotionResponse = {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: PromotionDetails[];
    };
};

export async function autoApplyPromotion(data: AutoApplyPromotionSchema): Promise<AutoApplyPromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.autoApply.url,
            method: apiUrls.promotions.autoApply.method,
            data,
        })
    ).data;
}

export const useAutoApplyPromotion = () =>
    useMutation({
        mutationFn: autoApplyPromotion,
    });

// Promotion Change Status
//
// Separate from update: flips ACTIVE/INACTIVE (and other transitions) without
// resending the full promotion body.

export const PROMOTION_STATUSES = ['ACTIVE', 'INACTIVE', 'EXPIRED', 'PENDING'] as const;
export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const changePromotionStatusSchema = z.object({
    id: z.string().min(1, 'Promotion id is required'),
    status: z.enum(PROMOTION_STATUSES),
});

export type ChangePromotionStatusInput = z.infer<typeof changePromotionStatusSchema>;

export async function changePromotionStatus(data: ChangePromotionStatusInput): Promise<MutatePromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.changeStatus.url,
            method: apiUrls.promotions.changeStatus.method,
            data,
        })
    ).data;
}

export const useChangePromotionStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: changePromotionStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.promotions)] });
        },
    });
};

// Promotion Evaluate
//
// Server-side calculation of the promotions that apply to a candidate basket. The POS
// payment screen sends every cart line (identified by a client-generated lineKey) and uses
// the returned totals, discounts and free-item offers as the source of truth for what the
// customer pays.

export const PROMOTION_EVALUATE_TRANSACTION_TYPES = ['POS', 'ACCOUNT_SALE'] as const;

export const evaluatePromotionItemSchema = z.object({
    lineKey: z.string().min(1, 'Line key is required'),
    companyStockDetailId: z.string().min(1, 'Product is required'),
    quantity: z.number().min(0, 'Quantity must be 0 or greater'),
    companyStockPricingId: z.string().optional(),
    companyStockPricingTypeId: z.string().optional(),
    stockDispositionId: z.string().optional(),
    stockDispositionVersion: z.number().optional(),
    // Legacy automatic/quantity-wise discount. The manual discount is sent separately.
    discount: z.number().nonnegative().optional(),
    // Manual discount entered by the cashier. The backend applies this after promotions.
    manualDiscountAmount: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
});

export const evaluatePromotionSchema = z.object({
    transactionType: z.enum(PROMOTION_EVALUATE_TRANSACTION_TYPES),
    companyDebtorId: z.string().optional(),
    companyWarehouseId: z.string().optional().nullable(),
    customerId: z.string().optional().nullable(),
    loyaltyCardNumber: z.string().optional().nullable(),
    items: z.array(evaluatePromotionItemSchema).min(1, 'At least one product is required'),
});

export type EvaluatePromotionInput = z.infer<typeof evaluatePromotionSchema>;

// A priced cart line echoed back with the lineKey it was sent under, so the client can map
// the server's calculation back onto the matching cart row.
export type EvaluatePromotionLine = {
    lineKey: string;
    companyStockDetailId?: string;
    quantity: number;
    unitPrice: number;
    finalUnitPrice?: number;
    lineSubtotal: number;
    discountAmount: number;
    lineTotal: number;
    // Final server-computed line total after promotions and the manual discount. Use this
    // for display; do not derive it by adding discount fields on the client.
    lineTotalAfterDiscounts?: number;
    manualDiscountAmount?: number;
    discountPercentage?: number;
    isFree?: boolean;
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    promotionId?: string | null;
    promotionName?: string | null;
    promotionTypeCode?: string | null;
    quantityDiscountId?: string | null;
    requestedPromotionId?: string | null;
    allocations?: EvaluatePromotionAllocation[];
    promotionalPrice?: number;
};

export type EvaluatePromotionAllocation = {
    lineKey: string;
    companyStockDetailId?: string;
    promotionId?: string;
    promotionName?: string;
    promotionTypeCode?: string;
    rewardedQuantity?: number;
    qualifiedByLineKeys?: string[];
    thresholdQuantity?: number;
    evaluatedQuantity?: number;
    progressiveLevel?: string;
    discountAmount?: number;
    baseUnitPrice?: number;
    finalUnitPrice?: number;
};

// A free / reward line the offer entitles the customer to. It may reference a different
// product than the qualifying line (e.g. buy Figaro Oil, get Mahakosh Oil free).
export type EvaluatePromotionRewardItem = {
    companyStockDetailId: string;
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    companyTaxRateId?: string | null;
    itemCode?: string;
    description?: string;
    quantity: number;
    freeQuantity: number;
    isFree: boolean;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
};

export type EvaluatePromotionFreeItemOffer = {
    promotionId: string;
    promotionName: string;
    promotionBatchCode?: string;
    freeQuantityAvailable: number;
    qualifiedByLineKeys: string[];
    rewardItems: EvaluatePromotionRewardItem[];
};

export type EvaluatePromotionApplication = {
    ruleType?: string;
    ruleId?: string;
    promotionId?: string;
    promotionName?: string;
    promotionTypeCode?: string;
    priority?: number;
    allowStacking?: boolean;
    multiplier?: number;
    totalDiscount?: number;
    allocations?: EvaluatePromotionAllocation[];
    explanation?: string;
};

export type EvaluatePromotionData = {
    lines: EvaluatePromotionLine[];
    applications?: EvaluatePromotionApplication[];
    subtotal: number;
    totalDiscount: number;
    total: number;
    totalAfterDiscounts: number;
    lineTotalAfterDiscounts: number;
    freeItemOffers: EvaluatePromotionFreeItemOffer[];
    explanation?: string[];
    count?: number;
    rows?: PromotionDetails[];
    skippedLines?: { lineKey: string; reason: string; stockDispositionId?: string }[];
};

export type EvaluatePromotionResponse = {
    success: boolean;
    message: string;
    data: EvaluatePromotionData;
};

export async function evaluatePromotion(data: EvaluatePromotionInput): Promise<EvaluatePromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotions.evaluate.url,
            method: apiUrls.promotions.evaluate.method,
            data,
        })
    ).data;
}

export const useEvaluatePromotion = () => {
    const mutate = async (variables: any, options?: { onSuccess?: any; onError?: any }) => {
        try {
            const result = await evaluatePromotion(variables);
            if (options?.onSuccess) options.onSuccess(result);
            return result;
        } catch (error) {
            if (options?.onError) options.onError(error);
            throw error;
        }
    };
    return {
        mutate,
        isPending: false,
    };
};
