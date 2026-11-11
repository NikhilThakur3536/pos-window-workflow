import { getApiKey } from '@/utils/helpers';
import { apiUrls, axiosInstance } from '..';
import { useQuery } from '@tanstack/react-query';
import { LoyaltyTransactionDetails } from './transactions';
import { DebtorLoyaltyCardDetails } from './debtor-cards';
import { CustomerLoyaltyCardDetails } from './customer-cards';

export interface LoyaltyReportsType {}

export interface TransactionSummaryType extends LoyaltyReportsType, LoyaltyTransactionDetails {}

export interface PointsComparisonType extends LoyaltyReportsType {
    type: 'EARN' | 'REDEEM';
    totalPoints: number;
}

export interface ExpiringDebtorCardsType extends LoyaltyReportsType, DebtorLoyaltyCardDetails {
    isExpired: boolean;
}

export interface ExpiringCustomerCardsType extends LoyaltyReportsType, CustomerLoyaltyCardDetails {
    isExpired: boolean;
}

export type LoyaltyReportColumnsType = PointsComparisonType &
    TransactionSummaryType &
    ExpiringDebtorCardsType &
    ExpiringCustomerCardsType;

// <------- Reports Listing and Downloading ------> /

export type FilterProps = {
    limit?: number;
    offset?: number;
    isCsv?: boolean;
    search?: string;
    fromDate?: string;
    toDate?: string;
};

export interface GetReportsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: LoyaltyReportColumnsType[];
    };
}

export type ReportsType = 'transactionSummary' | 'pointsComparison' | 'expiringDebtorCards' | 'expiringCustomerCards';

export interface GetReportsPayload {
    reportUrl: ReportsType;
    label: 'TRANSACTION_SUMMARY' | 'POINTS_COMPARISON' | 'EXPIRING_DEBTOR_CARDS' | 'EXPIRING_CUSTOMER_CARDS';
    payload: FilterProps;
}

export async function getReports({ reportUrl, label, payload }: GetReportsPayload): Promise<GetReportsResponse | void> {
    if (payload?.isCsv) {
        const response = await axiosInstance({
            url: apiUrls?.loyalty?.reports?.[reportUrl],
            method: 'get',
            params: payload,
            responseType: 'blob',
            headers: {
                Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

        const blob = new Blob([response?.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${label}_REPORT`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } else {
        return (
            await axiosInstance({
                url: apiUrls?.loyalty?.reports?.[reportUrl],
                method: 'get',
                params: payload,
            })
        ).data;
    }
}

export const useGetReports = ({ reportUrl, label, payload }: GetReportsPayload) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.loyalty.reports[reportUrl]), { reportUrl, label, ...payload }],
        queryFn: async () => await getReports({ reportUrl, label, payload }),
    });
};
