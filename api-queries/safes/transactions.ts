import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { TillDetails } from '../masters/tills';
import { SafeDetails } from '.';
import { VendorDetails } from './vendors';

// --------------------------------------- TRANSACTIONS ---------------------------------------

// Safe Transactions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface SafeTransactionDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';

    tillId: string;
    Till: TillDetails;

    vendorId: string;
    CashoutVendor: VendorDetails;

    safeId: string;
    Safe: SafeDetails;

    amount: number;
    referenceNumber: string;
    cashFlow: 'CASH-IN' | 'CASH-OUT';
}

export interface GetSafeTransactionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SafeTransactionDetails[];
    };
}

export async function getSafeTransactions(props: FilterProps): Promise<GetSafeTransactionResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'safeTransactions', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.safeTransactions.list.url,
                method: apiUrls.safeTransactions.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetSafeTransactions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.safeTransactions), props],
        queryFn: async () => await getSafeTransactions(props),
    });
};
