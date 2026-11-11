import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import moment from 'moment-timezone';

const validTimezones = moment.tz.names();

// --------------------------------------- TILL TO SAFE ---------------------------------------

export type TillToSafeFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    tillId?: string;
    safeId?: string;
    companyDebtorId?: string;
    fromDate?: string;
    toDate?: string;
};

export type TillToSafeDetails = {
    id: string;
    tillId: string;
    safeId: string;
    amount: number;
    referenceNumber?: string;
    companyDebtorId?: string;
    reason?: string;
    status?: string;
    createdAt: string;
    updatedAt: string;
};

export interface GetTillToSafeResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: TillToSafeDetails[];
    };
}

export async function getTillToSafeTransfers(props: TillToSafeFilterProps): Promise<GetTillToSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tillToSafe.all.url,
            method: apiUrls.tillToSafe.all.method,
            data: props,
        })
    ).data;
}

export const useGetTillToSafeTransfers = (props: TillToSafeFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.tillToSafe), props],
        queryFn: async () => await getTillToSafeTransfers(props),
    });
};

export const tillToSafeSchema = z
    .object({
        tillId: z.string().min(1, 'Till is required'),
        safeId: z.string().min(1, 'Safe is required'),
        amount: z.number().min(0.01, 'Amount is required'),
        referenceNumber: z.string().optional(),
        companyDebtorId: z.string().optional(),
        reason: z.string().optional(),
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type TillToSafeSchema = z.infer<typeof tillToSafeSchema>;

export type MutateTillToSafeResponse = {
    success: boolean;
    message?: string;
};

export async function createTillToSafeTransfer(data: TillToSafeSchema): Promise<MutateTillToSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tillToSafe.create.url,
            method: apiUrls.tillToSafe.create.method,
            data,
        })
    ).data;
}

export const useCreateTillToSafeTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTillToSafeTransfer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tillToSafe)] });
        },
    });
};

export const reverseTillToSafeSchema = z.object({
    id: z.string().min(1, 'Transaction is required'),
    reversalReason: z.string().min(1, 'Reversal reason is required'),
});

export type ReverseTillToSafeSchema = z.infer<typeof reverseTillToSafeSchema>;

export async function reverseTillToSafeTransfer(data: ReverseTillToSafeSchema): Promise<MutateTillToSafeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tillToSafe.reverse.url,
            method: apiUrls.tillToSafe.reverse.method,
            data,
        })
    ).data;
}

export const useReverseTillToSafeTransfer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reverseTillToSafeTransfer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tillToSafe)] });
        },
    });
};
