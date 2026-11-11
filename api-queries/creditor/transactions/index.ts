import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';

// --------------------------------------- CREDITOR TRANSACTIONS ---------------------------------------

// Creditor Transactions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyCreditorId?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface InvoiceItem {
    companyStockDetailId: string;
    quantity: number;
    amountPerItem: number;
    lineTotal: number;
}

export interface CreditorTransactionDetails {
    amount: number;
    date: string;
    documentId: string;
    documentNumber: string;
    items: InvoiceItem[];
    creditorDetails: CompanyCreditor;
    partyId: string;
    partyName: string;
    quantity: number;
    type: string;
}

export interface GetCreditorTransactionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CreditorTransactionDetails[];
    };
}

export async function getCreditorTransactions(data: FilterProps): Promise<GetCreditorTransactionResponse | void> {
    if (data?.isCsv) {
        axiosDownloadCSV({ filters: data, key: 'creditorTransactions', label: data?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.creditorTransactions.list.url,
                method: apiUrls.creditorTransactions.list.method,
                data,
            })
        ).data;
    }
}

export const useGetCreditorTransactions = (data: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditorTransactions.list), data],
        queryFn: async () => await getCreditorTransactions(data),
    });
};
