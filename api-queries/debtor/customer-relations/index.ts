import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';

// --------------------------------------- CUSTOMER RELATIONS ---------------------------------------

// Customer Relations Listing

export type CustomerRelationsType = 'debtor' | 'creditor';

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    isCsv?: boolean;
    csvLabel?: string;
    type: CustomerRelationsType;
};

export interface TransactionSummary {
    number: number;
    amount: number;
    totalProducts: number;
}

export interface CustomerRelationDetails {
    accountId: string;
    debtorDetails: CompanyCreditor;
    creditorDetails: CompanyCreditor;
    firstTransactionDate: string;
    pendingAmount: number;
    totalBalance: number;
    totalNumberOfTimesPriceQuoted: number;
    totalInvoices: TransactionSummary;
    totalSalesOrders: TransactionSummary;
    yearsSinceFirstTransaction: number;
}

export interface GetCustomerRelationResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CustomerRelationDetails[];
    };
}

export async function getCustomerRelations(props: FilterProps): Promise<GetCustomerRelationResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'customerRelations', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.customerRelations.list.url,
                method: apiUrls.customerRelations.list.method,
                params: props,
            })
        ).data;
    }
}

export const useGetCustomerRelations = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.customerRelations.list), props],
        queryFn: async () => await getCustomerRelations(props),
    });
};
