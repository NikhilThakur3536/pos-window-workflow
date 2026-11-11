import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- EFT NOTIFICATION ---------------------------------------
//
// EFT Notification to Cash Office.
// A cashier processes an EFT (card) payment which raises a notification that the
// cash office must review. The cash office approves or rejects the notification,
// optionally attaching remarks.
//
// All endpoints live under /api/company/eftNotification and are POST.

export const EFT_NOTIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type EftNotificationStatus = (typeof EFT_NOTIFICATION_STATUSES)[number];

export interface EftNotificationFilters {
    status?: EftNotificationStatus;
    search?: string;
    terminalId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
}

export interface EftNotificationRecord {
    id: string;
    notificationId?: string;
    reference?: string;
    invoiceNumber?: string;
    amount?: number;
    currency?: string;
    cardType?: string;
    paymentMethod?: string;
    status: EftNotificationStatus;
    remarks?: string;
    cashierName?: string;
    cashierUserId?: string;
    terminalId?: string;
    terminalName?: string;
    companyStoreId?: string;
    processedAt?: string;
    createdAt?: string;
    resolvedAt?: string;
    resolvedByName?: string;
    resolvedByUserId?: string;
}

export interface GetEftNotificationsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: EftNotificationRecord[];
    };
}

export async function getEftNotifications(
    props: EftNotificationFilters,
): Promise<GetEftNotificationsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.eftNotification.all.url,
            method: apiUrls.eftNotification.all.method,
            data: props,
        })
    ).data;
}

export const useGetEftNotifications = (props: EftNotificationFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.eftNotification), 'all', props],
        queryFn: async () => await getEftNotifications(props),
    });
};

export const resolveEftNotificationSchema = z.object({
    id: z.string().min(1, 'Notification id is required'),
    status: z.enum(['APPROVED', 'REJECTED']),
    remarks: z.string().optional(),
});

export type ResolveEftNotificationInput = z.infer<typeof resolveEftNotificationSchema>;

export interface ResolveEftNotificationResponse {
    success: boolean;
    message: string;
}

export async function resolveEftNotification(
    data: ResolveEftNotificationInput,
): Promise<ResolveEftNotificationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.eftNotification.resolve.url,
            method: apiUrls.eftNotification.resolve.method,
            data,
        })
    ).data;
}

export const useResolveEftNotification = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveEftNotification,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.eftNotification)] });
        },
    });
};
