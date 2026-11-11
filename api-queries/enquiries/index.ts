import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { EnquiryTypesType } from './type';
import { DebitNotesDetails } from '../debit-note';
import { AccountSalesDetails } from '../point-of-sale/account-sales/account-sales';
import { CreditNotesDetails } from '../credit-note';
import { GoodsReceivingDetails } from '../goods-receiving';
import { SaleOrdersDetails } from '../point-of-sale/account-sales/sale-order';
import { QuotationsDetails } from '../point-of-sale/account-sales/quotations';
import { StockDetails } from '../company/stock-details';

// --------------------------------------- USER ENQUIRIES ---------------------------------------

// User Enquiries Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    companyDebtorId?: string;
    companyCreditorId?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyStockDetailId?: string;
    userType?: 'DEBTOR' | 'CREDITOR';
};

export interface InvoiceItem {
    companyStockDetailId: string;
    quantity: number;
    amountPerItem: number;
    lineTotal: number;
}

export interface UserEnquiryDetails {
    totalAmount: number;
    totalQuantity: number;
    transactionDate: string;
    documentId: string;
    documentNumber: string;
    companyDebtorId: string;
    companyCreditorId: string;
    companyCreditor: CompanyCreditor;
    companyStockDetail: StockDetails;
    companyDebtor: CompanyCreditor;
    transactionType: EnquiryTypesType;
}

export interface GetUserEnquiryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: UserEnquiryDetails[];
    };
}

export async function getUserEnquiries(props: FilterProps): Promise<GetUserEnquiryResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'userEnquiries', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.userEnquiries.list.url,
                method: apiUrls.userEnquiries.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetUserEnquiries = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userEnquiries.list), props],
        queryFn: async () => await getUserEnquiries(props),
    });
};

// --------------------------------------- USER ENQUIRIES INVOICE ---------------------------------------

export type EnquiriesInvoiceFilterProps = {
    userType?: FilterProps['userType'];
    documentId: string;
    transactionType: EnquiryTypesType;
};

export interface GetUserEnquiryInvoiceResponse {
    success: boolean;
    message: string;
    data:
        | AccountSalesDetails
        | SaleOrdersDetails
        | QuotationsDetails
        | CreditNotesDetails
        | DebitNotesDetails
        | GoodsReceivingDetails;
}

export async function getUserEnquiryInvoice(
    props: EnquiriesInvoiceFilterProps,
): Promise<GetUserEnquiryInvoiceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userEnquiries.get.url,
            method: apiUrls.userEnquiries.get.method,
            data: props,
        })
    ).data;
}

export const useGetUserEnquiryInvoice = (props: EnquiriesInvoiceFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userEnquiries.get), props],
        queryFn: async () => await getUserEnquiryInvoice(props),
    });
};
