import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- PROMOTION GROUPS ---------------------------------------

// PromotionGroups Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface PromotionGroupsDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    groupName: string;
    groupDescription: string;
    colorCode: string;
    sequenceNumber: number;
}

export interface GetPromotionGroupResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: PromotionGroupsDetails[];
    };
}

export async function getPromotionGroups(props: FilterProps): Promise<GetPromotionGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.promotionGroups.list.url,
            method: apiUrls.promotionGroups.list.method,
            data: props,
        })
    ).data;
}

export const useGetPromotionGroups = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.promotionGroups), props],
        queryFn: async () => await getPromotionGroups(props),
    });
};
