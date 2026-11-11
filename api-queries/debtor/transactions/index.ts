import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';

// --------------------------------------- DEBTOR TRANSACTIONS ---------------------------------------

// Debtor Transactions Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    companyDebtorId?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface InvoiceItem {
    companyStockDetailId: string;
    quantity: number;
    amountPerItem: number;
    lineTotal: number;
}

export interface DebtorTransactionDetails {
    amount: number;
    date: string;
    documentId: string;
    documentNumber: string;
    items: InvoiceItem[];
    debtorDetails: CompanyCreditor;
    partyId: string;
    partyName: string;
    quantity: number;
    type: string;
}

export interface GetDebtorTransactionResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorTransactionDetails[];
    };
}

export async function getDebtorTransactions(props: FilterProps): Promise<GetDebtorTransactionResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'debtorTransactions', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.debtorTransactions.list.url,
                method: apiUrls.debtorTransactions.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetDebtorTransactions = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorTransactions.list), props],
        queryFn: async () => await getDebtorTransactions(props),
    });
};
