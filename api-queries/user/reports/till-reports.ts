import { getApiKey } from '@/utils/helpers';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const validTimezones = moment.tz.names();

export type UserTillReportDetails = {
    cashierName: string;
    netDrawerBalance: number;
    openingFloat: number;
    tillId: string;
    tillName: string;
    totalCashSales: number;
    totalDropsToSafe: number;
    totalPayouts: number;
    totalRefunds: number;
    transactionCount: number;
};

// <------- Reports Listing and Downloading ------> /

export type FilterProps = {
    limit?: number;
    offset?: number;
    isCsv?: boolean;
    search?: string;
    fromDate?: string;
    toDate?: string;
    tillId?: string;
    userId?: string;
    sortOrder?: string;
    companyDebtorId?: string;
};

export interface GetReportsResponse {
    success: boolean;
    message: string;
    // data: {
    //     count: number;
    //     rows: UserTillReportDetails[];
    // };
    count: number;
    data: UserTillReportDetails[];
    summary: {
        totalCashSales: number;
        totalDropsToSafe: number;
        totalRefunds: number;
        totalCashCurrentlyInTills: number;
    };
}

export async function getUserTillReports(props: FilterProps): Promise<GetReportsResponse | void> {
    if (props?.isCsv) {
        const response = await axiosInstance({
            url: apiUrls.userTills.report.url,
            method: apiUrls.userTills.report.method,
            data: props,
        });

        const blob = new Blob([response?.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'CASHIER_TILL_REPORT';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } else {
        return (
            await axiosInstance({
                url: apiUrls.userTills.report.url,
                method: apiUrls.userTills.report.method,
                data: props,
            })
        ).data;
    }
}

export const useGetReports = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.userTills.report.url), props],
        queryFn: async () => await getUserTillReports(props),
    });
};

// User Till To Safe

export const tillToSafeSchema = z
    .object({
        tillId: z.string().min(1, 'Till is required'),
        referenceNumber: z.string().min(1, 'Reference Number is required'),
        safeId: z.string().min(1, 'Safe is required'),
        amount: z.number().min(1, 'Amount is required'),
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type TillToSafeSchema = z.infer<typeof tillToSafeSchema>;

export type MutateTillToSafeResponse = {
    success: boolean;
};

export async function transferTillCashToSafe(data: TillToSafeSchema): Promise<MutateTillToSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.userTills.cashToSafe.url,
            method: apiUrls.userTills.cashToSafe.method,
            data,
        })
    ).data;
}

export const useTransferTillCashToSafe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: transferTillCashToSafe,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.userTills.report.url)] });
        },
    });
};
