import { apiUrls, axiosDownloadCSV, axiosInstance, handleError, queryKeys } from '@/api-queries';
import { CompanyCreditor, CompanyCreditorAccountSaleSettings, CompanyCreditorBankingInfo } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface CreditorListResponse {
    success: boolean;
    data: {
        count: number;
        rows: CompanyCreditor[];
    };
}

export interface CreditorListPayload {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    isCsv?: boolean;
    csvLabel?: string;
}

export const creditorListFn = async (payload: CreditorListPayload): Promise<CreditorListResponse | void> => {
    if (payload?.isCsv) {
        axiosDownloadCSV({ filters: payload, key: 'debtors', label: payload?.csvLabel });
    } else {
        return (await axiosInstance.post(apiUrls.creditors.list.url, payload)).data;
    }
};

export const useCreditorList = (payload: CreditorListPayload) => {
    return useQuery({
        queryKey: [queryKeys.CREDITOR, payload],
        queryFn: async () => await creditorListFn(payload),
    });
};

export const getCreditorFn = async (creditorId: string) => {
    return (await axiosInstance.post(apiUrls.creditors.get.url, { creditorId })).data;
};

export function useCreditor(id: string, enabled = true) {
    return useQuery({
        queryKey: [queryKeys.CREDITOR, id],
        queryFn: async () => await getCreditorFn(id),
        enabled,
    });
}

export type CreateCreditorInput = Omit<Partial<CompanyCreditor>, 'settings'> & {
    creditorId?: string;
    bankingInfo?: Partial<CompanyCreditorBankingInfo> | null;
    settings?: Record<string, unknown> | CompanyCreditorAccountSaleSettings | null;
    status?: string | null;
};

export const createCreditorFn = async (payload: CreateCreditorInput) => {
    return (await axiosInstance.post(apiUrls.creditors.create.url, payload)).data;
};

export const useCreateCreditorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCreditorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.CREDITOR] });
        },
        onError: (error) => {
            handleError('Creditor Creation Failed', error);
        },
    });
};

export type UpdateCreditorInput = Omit<Partial<CompanyCreditor>, 'settings'> & {
    creditorId?: string;
    bankingInfo?: Partial<CompanyCreditorBankingInfo> | null;
    settings?: Record<string, unknown> | CompanyCreditorAccountSaleSettings | null;
    status?: string | null;
};

export const updateCreditorFn = async (payload: UpdateCreditorInput) => {
    return (await axiosInstance.post(apiUrls.creditors.update.url, payload)).data;
};

export const useUpdateCreditorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCreditorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.CREDITOR] });
        },
        onError: (error) => {
            handleError('Creditor Updation Failed', error);
        },
    });
};

export const deleteCreditorFn = async (data: { creditorId: string }) => {
    return (await axiosInstance.post('/api/company/creditor/delete', data)).data;
};

export const useDeleteCreditorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteCreditorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [queryKeys.CREDITOR] });
        },
        onError: (error) => {
            handleError('Creditor Deletion Failed', error);
        },
    });
};
