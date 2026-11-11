import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

export type BankAccountStatus = 'ACTIVE' | 'INACTIVE';

export interface BankAccountDetails {
    id: string;
    code: string;
    name: string;
    bankName: string;
    /** Always text - never coerce to a number (leading zeros). */
    accountNumber: string;
    accountHolder: string;
    branchCode?: string | null;
    accountType?: string | null;
    currencyCode?: string | null;
    status: BankAccountStatus;
    createdAt?: string;
    updatedAt?: string;
}

export interface BankAccountListResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: BankAccountDetails[] };
}

export interface BankAccountResponse {
    success: boolean;
    message: string;
    data?: BankAccountDetails;
}

export type BankAccountListInput = {
    search?: string;
    status?: BankAccountStatus;
    limit?: number;
    offset?: number;
};

export type BankAccountCreateInput = {
    code: string;
    name: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    branchCode?: string;
    accountType?: string;
    currencyCode?: string;
};

/** Only changed fields + id. */
export type BankAccountUpdateInput = Partial<BankAccountCreateInput> & { id: string };

const baseKey = () => getApiKey(apiUrls.bankAccount);

// ------------------------------- LIST -------------------------------
export async function getBankAccounts(props: BankAccountListInput): Promise<BankAccountListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.bankAccount.list.url,
            method: apiUrls.bankAccount.list.method,
            data: props,
        })
    ).data;
}

export const useGetBankAccounts = (props: BankAccountListInput) =>
    useQuery({
        queryKey: [baseKey(), 'list', props],
        queryFn: () => getBankAccounts(props),
    });

// ------------------------------- GET -------------------------------
export async function getBankAccountById(id: string): Promise<BankAccountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.bankAccount.get.url,
            method: apiUrls.bankAccount.get.method,
            data: { id },
        })
    ).data;
}

export const useGetBankAccountById = (id?: string) =>
    useQuery({
        queryKey: [baseKey(), 'get', id],
        queryFn: () => getBankAccountById(id as string),
        enabled: !!id,
    });

// ------------------------------- ELIGIBLE (Cash Office dropdown) -------------------------------
export type EligibleBankAccountInput = { search?: string; limit?: number; offset?: number };

export async function getEligibleBankAccounts(props: EligibleBankAccountInput): Promise<BankAccountListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.bankAccount.eligible.url,
            method: apiUrls.bankAccount.eligible.method,
            data: props,
        })
    ).data;
}

export const useGetEligibleBankAccounts = (props: EligibleBankAccountInput, enabled = true) =>
    useQuery({
        queryKey: [baseKey(), 'eligible', props],
        queryFn: () => getEligibleBankAccounts(props),
        enabled,
    });

// ------------------------------- MUTATIONS -------------------------------
export const useCreateBankAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: BankAccountCreateInput): Promise<BankAccountResponse> =>
            (
                await axiosInstance({
                    url: apiUrls.bankAccount.create.url,
                    method: apiUrls.bankAccount.create.method,
                    data,
                })
            ).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [baseKey()] }),
    });
};

export const useUpdateBankAccount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: BankAccountUpdateInput): Promise<BankAccountResponse> =>
            (
                await axiosInstance({
                    url: apiUrls.bankAccount.update.url,
                    method: apiUrls.bankAccount.update.method,
                    data,
                })
            ).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [baseKey()] }),
    });
};

export const useChangeBankAccountStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { id: string; status: BankAccountStatus }): Promise<BankAccountResponse> =>
            (
                await axiosInstance({
                    url: apiUrls.bankAccount.changeStatus.url,
                    method: apiUrls.bankAccount.changeStatus.method,
                    data,
                })
            ).data,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [baseKey()] }),
    });
};
