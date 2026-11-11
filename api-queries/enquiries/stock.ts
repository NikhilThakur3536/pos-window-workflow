import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { FilterProps, GetUserEnquiryResponse, InvoiceItem } from '.';

// --------------------------------------- STOCK ENQUIRIES ---------------------------------------

// Stock Enquiries Listing

export async function getStockEnquiries(props: FilterProps): Promise<GetUserEnquiryResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'stockEnquiries', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.stockEnquiries.list.url,
                method: apiUrls.stockEnquiries.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetStockEnquiries = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockEnquiries.list), props],
        queryFn: async () => await getStockEnquiries(props),
    });
};
