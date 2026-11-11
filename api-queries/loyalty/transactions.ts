import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { CustomerLoyaltyCardDetails } from './customer-cards';
import { DebtorLoyaltyCardDetails } from './debtor-cards';

// --------------------------------------- LOYALTY TRANSACTIONS ---------------------------------------

// Loyalty Transactions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface LoyaltyTransactionDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    transactionType: string;
    debtorLoyaltyCardId: string | null;
    debtorLoyaltyCard: DebtorLoyaltyCardDetails;
    customerLoyaltyCardId: string | null;
    customerLoyaltyCard: CustomerLoyaltyCardDetails;
    points: string;
    transactionDate: string;
    referenceType: string;
    remarks: string;
}

export interface GetLoyaltyTransactionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: LoyaltyTransactionDetails[];
    };
}

export async function getLoyaltyTransactions(props: FilterProps): Promise<GetLoyaltyTransactionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.loyalty.transactions.list.url,
            method: apiUrls.loyalty.transactions.list.method,
            params: props,
        })
    ).data;
}

export const useGetLoyaltyTransactions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.transactions), props],
        queryFn: async () => await getLoyaltyTransactions(props),
    });
};
