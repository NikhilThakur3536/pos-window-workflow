import { apiUrls, axiosDownloadCSV, axiosInstance, axiosNetworkInstance, handleError } from '@/api-queries';
import {
    CompanyCreditor,
    CompanyDebtor,
    CompanyDebtorBankingInfo,
    CompanyDebtorSetting,
    CompanyDebtorType,
} from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    companyDebtorType?: CompanyDebtorType;
    csvLabel?: string;
    promotionBatchCode?: string;
};

export interface CreditorListResponse {
    success: boolean;
    data: {
        count: number;
        rows: CompanyCreditor[];
    };
}

export const debtorListFn = async (payload: FilterProps): Promise<CreditorListResponse | void> => {
    if (payload?.isCsv) {
        axiosDownloadCSV({ filters: payload, key: 'debtors', label: payload?.csvLabel });
    } else {
        return (await axiosInstance.post(apiUrls.debtors.list.url, payload)).data;
    }
};

export const useDebtorList = (payload: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtors), payload],
        queryFn: async () => await debtorListFn(payload),
    });
};

// Debtors Offline Listing

export async function getDebtorsOffline(online: boolean): Promise<CreditorListResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.debtors.list.url,
            method: apiUrls.debtors.list.method,
        });
        await setDBData(getIDBKey(apiUrls.debtors), response.data);
        return response.data;
    } else {
        const cached = await getDBData<CreditorListResponse>(getIDBKey(apiUrls.debtors));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetDebtorsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.debtors), online],
        queryFn: async () => await getDebtorsOffline(online),
    });
};

// Debtor Get By Id

export const getDebtorFn = async (debtorId: string) => {
    return (await axiosInstance.post(apiUrls.debtors.get.url, { debtorId })).data;
};

export function useDebtor(id: string, enabled = true) {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtors), id],
        queryFn: async () => await getDebtorFn(id),
        enabled,
    });
}

// Debtor Create
// The create endpoint mirrors the debtor record returned by /debtor/get, so it is
// typed against CompanyDebtor rather than the older CompanyCreditor shape.
export type CreateDebtorInput = Omit<
    Partial<CompanyDebtor>,
    'CompanyDebtorBankingInfo' | 'CompanyDebtorSetting' | 'bankingInfo'
> & {
    // Banking details are read/written through `bankingInfo`.
    bankingInfo?: Partial<CompanyDebtorBankingInfo> | null;
    // Accepted for older callers; new code should send `bankingInfo`.
    CompanyDebtorBankingInfo?: Partial<CompanyDebtorBankingInfo> | null;
    CompanyDebtorSetting?: Partial<CompanyDebtorSetting> | null;
    // The create/update DTOs read the additional settings block under `settings`
    // (the same key the update endpoint uses), not the GET association name.
    settings?: Partial<CompanyDebtorSetting> | null;
};

export const createDebtorFn = async (payload: CreateDebtorInput) => {
    return (await axiosInstance.post(apiUrls.debtors.create.url, payload)).data;
};

export const useCreateDebtorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.debtors)] });
        },
        onError: (error) => {
            handleError('Debtor Creation Failed', error);
        },
    });
};

// Debtor Update

export const updateDebtorFn = async (payload: any) => {
    return (await axiosInstance.post(apiUrls.debtors.update.url, payload)).data;
};

// 3022 - Assign a debtor to a debtor group for group payment allocation.
// /api/company/debtor/update accepts `companyDebtorGroupId` on the Company Debtor.
export interface UpdateDebtorGroupInput {
    debtorId: string;
    companyDebtorGroupId: string | null;
}

export const updateDebtorGroupFn = async (payload: UpdateDebtorGroupInput) => {
    return (await axiosInstance.post(apiUrls.debtors.update.url, payload)).data;
};

export const useUpdateDebtorGroupFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorGroupFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.debtors)] });
        },
        onError: (error) => {
            handleError('Debtor Group Update Failed', error);
        },
    });
};

export const updateDebtorAccountSaleSettingsFn = async (payload: {
    debtorId: string;
    settings: CompanyCreditor['settings'];
}) => {
    return (await axiosInstance.post(apiUrls.debtors.update.url, payload)).data;
};

export const useUpdateDebtorAccountSaleSettingsFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorAccountSaleSettingsFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.debtors)] });
        },
        onError: (error) => {
            handleError('Debtor Settings Update Failed', error);
        },
    });
};

export const useUpdateDebtorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.debtors)] });
        },
        onError: (error) => {
            handleError('Debtor Updation Failed', error);
        },
    });
};

// Debtor Delete

export const deleteDebtorFn = async (data: { debtorId: string }) => {
    return (await axiosInstance.post(apiUrls.debtors.delete.url, data)).data;
};

export const useDeleteDebtorFn = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDebtorFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.debtors)] });
        },
        onError: (error) => {
            handleError('Debtor Deletion Failed', error);
        },
    });
};
