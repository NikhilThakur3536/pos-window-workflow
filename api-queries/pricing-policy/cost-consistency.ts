import { useMutation, useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- CATEGORY / SKU COST CONSISTENCY ---------------------------------------

export const PRICING_POLICY_OUTCOMES = ['WITHIN_POLICY', 'WARNING', 'APPROVAL_REQUIRED', 'BLOCKED'] as const;
export type PricingPolicyOutcome = (typeof PRICING_POLICY_OUTCOMES)[number];

export const PRICING_POLICY_RULE_SOURCES = ['SKU', 'CATEGORY', 'COMPANY_DEFAULT', 'NONE'] as const;
export type PricingPolicyRuleSource = (typeof PRICING_POLICY_RULE_SOURCES)[number];

export const PRICING_POLICY_COST_BASIS_TYPES = [
    'DEAL',
    'CURRENT_COST',
    'LATEST_COST',
    'LAST_PURCHASE',
    'FUTURE_COST',
    'NONE',
] as const;
export type PricingPolicyCostBasisType = (typeof PRICING_POLICY_COST_BASIS_TYPES)[number];

/** Effective GP limits resolved for a SKU, along with where those limits came from. */
export interface PricingPolicyRule {
    companyStockDetailId?: string;
    companyStockCategoryId?: string | null;
    ruleSource: PricingPolicyRuleSource;
    minGpPercent?: number | null;
    maxGpPercent?: number | null;
    targetGpPercent?: number | null;
    tolerancePercent?: number | null;
    blockingVariancePercent?: number | null;
    enforceGpPolicy?: boolean;
    overrideCategoryGpPolicy?: boolean;
    isCompanyGpDefault?: boolean;
}

export interface PricingPolicyValidationResult {
    companyStockDetailId: string;
    priceExclusive?: number | null;
    useFutureCost?: boolean;
    costBasis?: number | null;
    costBasisType?: PricingPolicyCostBasisType | null;
    calculatedGpPercent?: number | null;
    calculatedMarkupPercent?: number | null;
    varianceFromTargetPercent?: number | null;
    minGpPercent?: number | null;
    maxGpPercent?: number | null;
    targetGpPercent?: number | null;
    tolerancePercent?: number | null;
    blockingVariancePercent?: number | null;
    appliedRule?: PricingPolicyRule | null;
    ruleSource: PricingPolicyRuleSource;
    outcome: PricingPolicyOutcome;
    warning?: string | null;
    requiresApproval: boolean;
    blocked: boolean;
}

export const pricingPolicyValidateSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    priceExclusive: z.coerce.number().min(0, 'Selling price must be 0 or greater'),
    useFutureCost: z.boolean().optional(),
});

export type PricingPolicyValidateSchema = z.infer<typeof pricingPolicyValidateSchema>;

export const PRICING_POLICY_PREVIEW_MAX_ITEMS = 500;

export const pricingPolicyPreviewSchema = z.object({
    items: z
        .array(
            z.object({
                companyStockDetailId: z.string().min(1),
                priceExclusive: z.coerce.number().min(0),
                useFutureCost: z.boolean().optional(),
            }),
        )
        .min(1, 'At least one product is required')
        .max(
            PRICING_POLICY_PREVIEW_MAX_ITEMS,
            `A maximum of ${PRICING_POLICY_PREVIEW_MAX_ITEMS} items can be previewed at once`,
        ),
});

export type PricingPolicyPreviewSchema = z.infer<typeof pricingPolicyPreviewSchema>;

export const pricingPolicyRuleSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
});

export type PricingPolicyRuleSchema = z.infer<typeof pricingPolicyRuleSchema>;

// --------------------------------------- Validate ---------------------------------------

export interface PricingPolicyValidateResponse {
    success: boolean;
    message: string;
    data: PricingPolicyValidationResult;
}

export async function validatePricingPolicy(data: PricingPolicyValidateSchema): Promise<PricingPolicyValidateResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingPolicy.validate.url,
            method: apiUrls.pricingPolicy.validate.method,
            data,
        })
    ).data;
}

export const useValidatePricingPolicy = () => {
    return useMutation({
        mutationFn: (data: PricingPolicyValidateSchema) => validatePricingPolicy(data),
    });
};

// --------------------------------------- Preview ---------------------------------------

export interface PricingPolicyPreviewResponse {
    success: boolean;
    message: string;
    data: {
        count?: number;
        rows: PricingPolicyValidationResult[];
    };
}

export async function previewPricingPolicy(data: PricingPolicyPreviewSchema): Promise<PricingPolicyPreviewResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingPolicy.preview.url,
            method: apiUrls.pricingPolicy.preview.method,
            data,
        })
    ).data;
}

export const usePreviewPricingPolicy = () => {
    return useMutation({
        mutationFn: (data: PricingPolicyPreviewSchema) => previewPricingPolicy(data),
    });
};

// --------------------------------------- Rule ---------------------------------------

export interface PricingPolicyRuleResponse {
    success: boolean;
    message: string;
    data: PricingPolicyRule;
}

export async function getPricingPolicyRule(data: PricingPolicyRuleSchema): Promise<PricingPolicyRuleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.pricingPolicy.rule.url,
            method: apiUrls.pricingPolicy.rule.method,
            data,
        })
    ).data;
}

export const useGetPricingPolicyRule = (data: PricingPolicyRuleSchema | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.pricingPolicy), 'rule', data],
        enabled: !!data?.companyStockDetailId,
        queryFn: async () => await getPricingPolicyRule(data as PricingPolicyRuleSchema),
    });
};

export const OUTCOME_LABELS: Record<PricingPolicyOutcome, string> = {
    WITHIN_POLICY: 'Within Policy',
    WARNING: 'Warning',
    APPROVAL_REQUIRED: 'Approval Required',
    BLOCKED: 'Blocked',
};

export const OUTCOME_BADGE_CLASS: Record<PricingPolicyOutcome, string> = {
    WITHIN_POLICY: 'bg-emerald-100 text-emerald-800',
    WARNING: 'bg-amber-100 text-amber-800',
    APPROVAL_REQUIRED: 'bg-orange-100 text-orange-800',
    BLOCKED: 'bg-red-100 text-red-700',
};

export const RULE_SOURCE_LABELS: Record<PricingPolicyRuleSource, string> = {
    SKU: 'SKU',
    CATEGORY: 'Category',
    COMPANY_DEFAULT: 'Company Default',
    NONE: 'No Rule',
};
