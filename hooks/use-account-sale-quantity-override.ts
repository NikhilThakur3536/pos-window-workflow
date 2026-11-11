import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    useQuantityRecommendation,
    useCreateAccountSaleWithOverride,
    type QuantityRecommendationItem,
    type AccountSaleApprovalTokens,
    type CreateAccountSaleWithOverrideInput,
    type AccountSaleCreateSchema,
} from '@/api-queries/point-of-sale/account-sales/account-sales';
import { useApprovalRequired, isApprovalRequiredError } from './use-approval-required';

const QUANTITY_APPROVAL_KEY = 'ACCOUNT_SALE_QUANTITY_OVERRIDE' as const;
const DISCOUNT_APPROVAL_KEY = 'ACCOUNT_SALE_DISCOUNT_OVERRIDE' as const;

export interface QuantityOverrideCartitem {
    id: string;
    itemCode: string;
    barcode: string;
    description: string;
    stockOnHand: number;
    companyStockPricingId: string;
    companyStockPricingTypeId: string;
    companyTaxRateId: string;
    unitPrice: number;
    quantity: number;
    requestedQuantity: number;
    discount: number;
    lineTotal: number;
    recommendedQuantity?: number;
    currentInventory?: number;
    dailySalesRate?: number;
    overrideRequired?: boolean;
}

export interface UseAccountSaleQuantityOverrideOptions {
    onSuccess?: (data: { success: boolean; message?: string }) => void;
    onError?: (error: unknown) => void;
}

export function useAccountSaleQuantityOverride(options?: UseAccountSaleQuantityOverrideOptions) {
    const recommendationMutation = useQuantityRecommendation();
    const createMutation = useCreateAccountSaleWithOverride();
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const [isPending, setIsPending] = useState(false);

    const pendingMetaRef = useRef<{
        payload: CreateAccountSaleWithOverrideInput;
        approvedTokens: AccountSaleApprovalTokens;
    } | null>(null);

    const getQuantityRecommendations = (
        companyDebtorId: string,
        items: { companyStockDetailId: string; quantity: number; description?: string; itemCode?: string }[],
        onItemsUpdate: (updatedItems: QuantityRecommendationItem[]) => void,
    ) => {
        if (!companyDebtorId) {
            toast.error('Select a debtor first');
            return;
        }
        if (!items.length) {
            toast.error('Add at least one product first');
            return;
        }

        recommendationMutation.mutate(
            { companyDebtorId, items },
            {
                onSuccess: (response) => {
                    const rows = Array.isArray(response?.data)
                        ? response.data
                        : response?.data?.rows || [];
                    if (!rows.length) {
                        toast.warning('No recommendations returned');
                        return;
                    }
                    onItemsUpdate(rows);
                    toast.success('Quantity recommendations applied');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Failed to get recommendations');
                },
            },
        );
    };

    const checkOverrideRequired = (items: QuantityOverrideCartitem[]): boolean => {
        return items.some(
            (item) => item.recommendedQuantity != null && item.quantity !== item.recommendedQuantity,
        );
    };

    const checkDiscountOverride = (items: QuantityOverrideCartitem[]): boolean => {
        return items.some((item) => item.discount > 0);
    };

    const generateSecurityReference = (): string => {
        return `ASQR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    };

    const submitAccountSale = (
        payload: AccountSaleCreateSchema,
        items: QuantityOverrideCartitem[],
    ) => {
        const hasQuantityOverride = checkOverrideRequired(items);
        const hasDiscountOverride = checkDiscountOverride(items);

        const createPayload: CreateAccountSaleWithOverrideInput = {
            ...payload,
            ...(hasQuantityOverride
                ? {
                    reason: 'Additional stock required',
                    securityRequestReference: generateSecurityReference(),
                }
                : {}),
        };

        setIsPending(true);
        createMutation
            .mutateAsync(createPayload)
            .then((data) => {
                setIsPending(false);
                options?.onSuccess?.(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = { payload: createPayload, approvedTokens: {} };
                    setApproval({ ...info, actionLabel: 'Create Account Sale' });
                } else {
                    options?.onError?.(error);
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleApproved = (token: string, items: QuantityOverrideCartitem[]) => {
        setIsPending(true);
        const meta = pendingMetaRef.current;
        if (!meta) {
            setIsPending(false);
            closeApproval();
            return;
        }

        const hasQuantityOverride = checkOverrideRequired(items);
        const hasDiscountOverride = checkDiscountOverride(items);

        const ruleKeys: string[] = [];
        if (hasQuantityOverride) ruleKeys.push(QUANTITY_APPROVAL_KEY);
        if (hasDiscountOverride) ruleKeys.push(DISCOUNT_APPROVAL_KEY);

        const usedKeys = Object.keys(meta.approvedTokens);
        const nextKey = ruleKeys.find((key) => !usedKeys.includes(key)) || ruleKeys[0] || QUANTITY_APPROVAL_KEY;

        const approvedTokens: AccountSaleApprovalTokens = { ...meta.approvedTokens, [nextKey]: token };
        const needsBodyTokens = usedKeys.length + 1 > 1;

        createMutation
            .mutateAsync({
                ...meta.payload,
                ...(needsBodyTokens ? { approvalTokens: approvedTokens } : {}),
                approvalToken: token,
            })
            .then((data) => {
                setIsPending(false);
                pendingMetaRef.current = null;
                closeApproval();
                options?.onSuccess?.(data);
            })
            .catch((error) => {
                setIsPending(false);
                const info = isApprovalRequiredError(error);
                if (info) {
                    pendingMetaRef.current = { payload: meta.payload, approvedTokens };
                    setApproval({ ...info, actionLabel: 'Create Account Sale' });
                } else {
                    closeApproval();
                    options?.onError?.(error);
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const resetPendingMeta = () => {
        pendingMetaRef.current = null;
    };

    return {
        recommendationMutation,
        createMutation,
        approval,
        openApproval,
        closeApproval,
        isPending,
        getQuantityRecommendations,
        checkOverrideRequired,
        checkDiscountOverride,
        submitAccountSale,
        handleApproved,
        resetPendingMeta,
    };
}
