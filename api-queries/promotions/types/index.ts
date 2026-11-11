import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- PROMOTION TYPES ---------------------------------------

// PromotionTypes Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface PromotionTypesDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    typeName: string;
    typeDescription: string;
    code: string;
    typeNumber?: number;
    sequenceNumber?: number;
    // Requirement flags: when a flag is true the matching field MUST be shown in the form;
    // when false the field is omitted entirely.
    requiresQuantityToBuy?: boolean;
    requiresFreeQuantity?: boolean;
    requiresDiscountPercent?: boolean;
    requiresDiscountValue?: boolean;
    requiresMaximumDiscount?: boolean;
    requiresTotalToPay?: boolean;
    requiresMinimumSpend?: boolean;
    requiresPromotionalPrice?: boolean;
    requiresProgressiveLevel?: boolean;
    requiresQualifyingItems?: boolean;
    requiresRewardItems?: boolean;
}

export interface GetPromotionTypeResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: PromotionTypesDetails[];
    };
}

export async function getPromotionTypes(props: FilterProps): Promise<GetPromotionTypeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotionTypes.list.url,
            method: apiUrls.promotionTypes.list.method,
            data: props,
        })
    ).data;
}

export const useGetPromotionTypes = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.promotionTypes), props],
        queryFn: async () => await getPromotionTypes(props),
    });
};
