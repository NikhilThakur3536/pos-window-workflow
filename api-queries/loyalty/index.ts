import { useMutation } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { MembershipDetails } from './memberships';
import { LoyaltyCardDetails } from './loyalty-cards';

export type LoyaltyRedemptionPayload = {
    debtorId?: string;
    loyaltyCardNumber: string;
    totalAmount: number;
};

// --------------------------------------- ACCOUNT SALE LOYALTY ---------------------------------------

// Account Sales Loyalty Redemption

export interface LoyaltyPointRedemptionDetails {
    loyaltyCardNumber: string;
    loyaltyCardId: string;
    loyaltyCard: LoyaltyCardDetails;
    debtorLoyaltyCardId: string;
    availablePoints: number;
    redeemPointsApplied: number;
    redeemableValue: number;
    remainingPointsAfterRedemption: number;
    earnedPoints: number;
    finalPayableAmount: number;
    membership: MembershipDetails;
}

export interface GetAccountSaleLoyaltyResponse {
    success: boolean;
    message: string;
    data: LoyaltyPointRedemptionDetails;
}

export async function getAccountSaleLoyalty(data: LoyaltyRedemptionPayload): Promise<GetAccountSaleLoyaltyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.accountSaleLoyalty.checkout.url,
            method: apiUrls.loyalty.accountSaleLoyalty.checkout.method,
            data,
        })
    ).data;
}

export const useGetAccountSaleLoyalty = () => {
    return useMutation({
        mutationFn: getAccountSaleLoyalty,
    });
};

// --------------------------------------- CASH SALE LOYALTY ---------------------------------------

// Cash Sales Loyalty Redemption

export interface GetCashSaleLoyaltyResponse {
    success: boolean;
    message: string;
    data: LoyaltyPointRedemptionDetails;
}

export async function getCashSaleLoyalty(data: LoyaltyRedemptionPayload): Promise<GetCashSaleLoyaltyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.cashSaleLoyalty.checkout.url,
            method: apiUrls.loyalty.cashSaleLoyalty.checkout.method,
            data,
        })
    ).data;
}

export const useGetCashSaleLoyalty = () => {
    return useMutation({
        mutationFn: getCashSaleLoyalty,
    });
};
