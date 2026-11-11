import { getApiKey } from '@/utils/helpers';
import { apiUrls, axiosInstance } from '..';
import { useQuery } from '@tanstack/react-query';

export interface SalesFieldsType {
    invoiceQuantity: number;
    invoiceValue: number;
    posQuantity: number;
    posValue: number;
    totalItems: number;
    totalQuantitySold: number;
    totalSalesValue: number;
}

export interface CategoryWiseType extends SalesFieldsType {
    averageSellingPrice: number;
    categoryId: string;
    categoryCode: string;
    categoryName: string;
}

export interface DebtorWiseType extends SalesFieldsType {
    averageOrderValue: number;
    debtorId: string;
    accountNumber: string;
    debtorName: string;
}

export interface StockWiseType extends SalesFieldsType {
    averageSellingPrice: number;
    companyStockDetailId: string;
    itemCode: string;
    description: string;
}

export type SalesReportColumnsType = DebtorWiseType | CategoryWiseType | StockWiseType;

// <------- Reports Listing and Downloading ------> /

export type FilterProps = {
    limit?: number;
    offset?: number;
    isCsv?: boolean;
    isPdf?: boolean;
    search?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: 'asc' | 'desc';
    // Multi-select array filters (new)
    companyIds?: string[];
    companyDebtorIds?: string[];
    warehouseIds?: string[];
};

export interface GetReportsResponse {
    success: boolean;
    count: number;
    totalRevenue: number;
    totalQuantity: number;
    totalDistribution: {
        posPercentage: number;
        invoicePercentage: number;
    };
    data: SalesReportColumnsType[];
}

export type ReportsType = 'categoryWiseSales' | 'stockWiseSales' | 'debtorWiseSales';

export interface GetReportsPayload {
    label: ReportsType;
    payload: FilterProps;
}

export async function getReports({
    label,
    payload,
}: GetReportsPayload): Promise<GetReportsResponse> {

    return (
        await axiosInstance({
            url: apiUrls?.reports?.[label],
            method: 'post',
            data: payload,
        })
    ).data;
}

export async function downloadCsvReport({
    label,
    payload,
}: GetReportsPayload): Promise<void> {

    const response = await axiosInstance({
        url: apiUrls?.reports?.[label],
        method: 'post',
        data: {
            ...payload,
            isCsv: true,
        },
        responseType: 'blob',
        headers: {
            Accept:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });

    const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);

    const a = document.createElement('a');

    a.href = url;

    a.download = `${label
        ?.replace('WiseSales', '')
        ?.toUpperCase()}-WISE SALES REPORT.xlsx`;

    document.body.appendChild(a);

    a.click();

    window.URL.revokeObjectURL(url);
}

export async function getPdfReport({
    label,
    payload,
}: GetReportsPayload): Promise<Blob> {

    const response = await axiosInstance({
        url: apiUrls?.reports?.[label],
        method: 'post',
        data: {
            ...payload,
            isPdf: true,
        },
        responseType: 'blob',
        headers: {
            Accept: 'application/pdf',
        },
    });

    return new Blob([response.data], {
        type: 'application/pdf',
    });
}

export const useGetReports = ({ label, payload }: GetReportsPayload) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.reports[label]), { label, ...payload }],
        queryFn: async () => await getReports({ label, payload }),
    });
};