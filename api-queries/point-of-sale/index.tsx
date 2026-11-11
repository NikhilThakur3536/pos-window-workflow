import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyStockCostType } from '../company/stock-pricing';

const validTimezones = moment.tz.names();

// --------------------------------------- Stock Prices ---------------------------------------

// Stock Prices Listing

export type FilterProps = {
    companyStockDetailId?: string;
    companyDebtorId?: string;
};

export interface CartItemPricingType {
    id: string;
    companyStockPricingTypeId: string;
    isDefault?: boolean;
    priceInclusive: number;
    priceExclusive: number;
    type: {
        id?: string;
        name: string;
    };
}

export interface GetStockPriceResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: { pricingTypes: CartItemPricingType[] }[];
    };
}

export async function getStockPrices(props: FilterProps): Promise<GetStockPriceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockDefaultPrice.list.url,
            method: apiUrls.stockDefaultPrice.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockPrices = (props: FilterProps, enabled?: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockDefaultPrice), props],
        queryFn: async () => await getStockPrices(props),
        enabled,
    });
};
