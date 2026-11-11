import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '@/api-queries/company/stock-details';

// --------------------------------------- STOCK ITEM TAGS ---------------------------------------
//
// Tags are code/value pairs attached to a stock item with an effective window. The
// save endpoint accepts either a single stockItemId or a bulk stockItemIds array.

export interface StockItemTag {
    id: string;
    stockItemId: string;
    stockItemName?: string;
    stockItemCode?: string;
    stockDetail?: StockDetails;
    createdByUser?: { id?: string; firstName?: string; surname?: string } | null;
    tagCode: string;
    tagValue: string;
    source?: string;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface SaveStockItemTagInput {
    id?: string;
    stockItemId?: string;
    stockItemIds?: string[];
    tagCode: string;
    tagValue: string;
    source?: string;
    effectiveFrom?: string;
    effectiveTo?: string | null;
}

export interface MutateStockItemTagResponse {
    success: boolean;
    message: string;
    data?: StockItemTag | StockItemTag[] | null;
}

export interface StockItemTagListProps {
    tagCode?: string;
    stockItemId?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
}

export interface GetStockItemTagListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockItemTag[];
    };
}

export async function saveStockItemTag(data: SaveStockItemTagInput): Promise<MutateStockItemTagResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockItemTag.save.url,
            method: apiUrls.stockItemTag.save.method,
            data,
        })
    ).data;
}

export const useSaveStockItemTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveStockItemTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockItemTag)] });
        },
    });
};

export async function getStockItemTagList(props: StockItemTagListProps): Promise<GetStockItemTagListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockItemTag.list.url,
            method: apiUrls.stockItemTag.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockItemTagList = (props: StockItemTagListProps, enabled: boolean = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockItemTag), 'list', props],
        queryFn: async () => await getStockItemTagList(props),
        enabled,
    });
};

export async function removeStockItemTag(id: string): Promise<MutateStockItemTagResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockItemTag.remove.url,
            method: apiUrls.stockItemTag.remove.method,
            data: { id },
        })
    ).data;
}

export const useRemoveStockItemTag = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeStockItemTag,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockItemTag)] });
        },
    });
};