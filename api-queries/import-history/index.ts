import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

export const IMPORT_HISTORY_TYPES = {
    COMPANY_STOCK_DETAILS: 'COMPANY_STOCK_DETAILS',
    COMPANY_STOCK_INVENTORY: 'COMPANY_STOCK_INVENTORY',
    GOODS_RECEIVED_VALUE: 'GOODS_RECEIVED_VALUE',
    SUPPLIER_MARKUP: 'SIMPLE_PRICING',
    COMPANY_STORE_STOCK_QUANTITY: 'COMPANY_STORE_STOCK_QUANTITY',

    SUPPLIERS: 'SUPPLIERS', // creditors
    ALL_SHOPS: 'ALL_SHOPS', // debtors

    COMPANY_STOCK_TAX_RATES: 'COMPANY_STOCK_TAX_RATES',
    COMPANY_STOCK_PRICING:'COMPANY_STOCK_PRICING',
    PROMOTIONAL_PRICE_WHOLESALE: 'PROMOTIONAL_PRICE_WHOLESALE',
    SIMPLE_PRICING_RETAIL: 'SIMPLE_PRICING_RETAIL',
    PRODUCT_WISE_QTY_DISCOUNT: 'PRODUCT_WISE_QTY_DISCOUNT',
    PRODUCT_WISE_QTY_DISCOUNT_DEBTOR: 'PRODUCT_WISE_QTY_DISCOUNT_DEBTOR',
    SUPPLIER_DEALS: 'SUPPLIER_DEALS',
} as const;

export type ImportHistoryTypesType = (typeof IMPORT_HISTORY_TYPES)[keyof typeof IMPORT_HISTORY_TYPES];

export type FilterProps = {
    limit?: number;
    offset?: number;
    importType: ImportHistoryTypesType;
    isCsv?: boolean;
    csvLabel?: string;
};

export type ImportUserType = {
    id: string;
    name: string;
};

export interface ImportHistoryDetails {
    id: string;
    importType?: ImportHistoryTypesType;
    status?: string;
    totalRows: number;
    validRows: number;
    invalidRows: number;
    completedAt:string;
    errorMessage:string;
    flushedRows?: number;
    fileName: string;
    s3FileUrl: string;
    createdAt: string;
    createdBy: ImportUserType;
    approvedAt?: string | null;
    approvedBy?: string | null;
}

export interface GetImportHistoryResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: ImportHistoryDetails[];
    };
}

export async function getImportHistory(props: FilterProps): Promise<GetImportHistoryResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({
            filters: props,
            key: 'importHistory',
            label: props?.csvLabel,
        });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.importHistory.list.url,
                method: apiUrls.importHistory.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetImportHistory = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.importHistory), props],
        queryFn: async () => await getImportHistory(props),
    });
};
