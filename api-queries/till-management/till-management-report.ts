import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- TILL MANAGEMENT REPORT ---------------------------------------

export type TillManagementReportFilterProps = {
    isCsv?: boolean;
    search?: string;
    fromDate?: string;
    toDate?: string;
    tillId?: string;
    companyDebtorId?: string;
};

export interface TillManagementReportSummary {
    openingFloat: number;
    cashSales: number;
    cashRefunds: number;
    safeDrops: number;
    expectedTillBalance: number;
    actualCountedCash: number;
    variance: number;
    varianceStatus: string;
}

export interface CashUpReportDenomination {
    id: string;
    cashUpId: string;
    denominationId: string;
    count: number;
    value: string;
}

export interface CashUpReportRecord {
    id: string;
    tillId: string;
    shiftId?: string | null;
    companyId?: string;
    domainId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string | null;
    cashUpDate: string;
    discountAmount?: string;
    couponAmount?: string;
    cashFloat?: string;
    cheques?: string | null;
    epos?: string | null;
    vouchersCashedIn?: string | null;
    other?: string | null;
    bankTransfers?: string | null;
    safeDrop?: string | null;
    createdAt: string;
    updatedAt: string;
    denominations?: CashUpReportDenomination[];
}

export interface TillToSafeTransferRecord {
    id?: string;
    tillId?: string;
    safeId?: string;
    amount?: number;
    referenceNumber?: string;
    reason?: string;
    status?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface TillManagementReportResponse {
    success: boolean;
    message?: string;
    summary: TillManagementReportSummary;
    transfers: TillToSafeTransferRecord[];
    cashUpRecords: CashUpReportRecord[];
}

export async function getTillManagementReport(
    props: TillManagementReportFilterProps,
): Promise<TillManagementReportResponse | void> {
    if (props?.isCsv) {
        const response = await axiosInstance({
            url: apiUrls.tillManagementReport.report.url,
            method: apiUrls.tillManagementReport.report.method,
            data: props,
            // The report endpoint answers with the raw xlsx (or csv) bytes. Without this
            // axios decodes the binary through its default JSON/utf8 transform, corrupting
            // the file; a blob preserves the bytes exactly as the server sent them.
            responseType: 'blob',
        });

        const contentDisposition = (response.headers?.['content-disposition'] as string) || '';
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
        const fileName = filenameMatch?.[1]?.replace(/"/g, '') || 'till-management-report.xlsx';

        const blob = new Blob([response.data as BlobPart], {
            type:
                (response.headers?.['content-type'] as string) ||
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } else {
        return (
            await axiosInstance({
                url: apiUrls.tillManagementReport.report.url,
                method: apiUrls.tillManagementReport.report.method,
                data: props,
            })
        ).data;
    }
}

export const useGetTillManagementReport = (props: TillManagementReportFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.tillManagementReport.report.url), props],
        queryFn: async () => await getTillManagementReport(props),
        enabled: !!(props.fromDate && props.toDate),
    });
};
