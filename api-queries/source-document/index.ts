import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface DebtorSourceDocumentItem {
    id: string;
    name: string;
    description: string;
    timezone: string;
    status: string;
}

export interface DebtorSourceDocumentResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorSourceDocumentItem[];
    };
}

// ---------------------------------------
// SCHEMAS
// ---------------------------------------

export const debtorSourceDocumentSchema = z.object({
    name: z.string(),
    description: z.string(),
    timezone: z.string(),
    status: z.string(),
});

// ---------------------------------------
// GENERIC LIST
// ---------------------------------------

async function getDebtorSourceDocumentList(url: string, data: any = {}) {
    return (
        await axiosInstance({
            url,
            method: 'post',
            data,
        })
    ).data;
}

// ---------------------------------------
// DEBTOR SOURCE DOCUMENT
// ---------------------------------------

export const useGetDebtorSourceDocumentList = (data: any = {}) =>
    useQuery({
        queryKey: [getApiKey(apiUrls.debtorSourceDocument), data],
        queryFn: () => getDebtorSourceDocumentList(apiUrls.debtorSourceDocument.list.url, data),
    });

export const useGetDebtorSourceDocumentById = (enabled: boolean, id?: string) =>
    useQuery({
        enabled: enabled && !!id,
        queryKey: [getApiKey(apiUrls.debtorSourceDocument), id],
        queryFn: async () =>
            (
                await axiosInstance({
                    url: apiUrls.debtorSourceDocument.getById.url,
                    method: apiUrls.debtorSourceDocument.getById.method,
                    data: {
                        id,
                    },
                })
            ).data,
    });

export const useCreateDebtorSourceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: z.infer<typeof debtorSourceDocumentSchema>) =>
            axiosInstance({
                url: apiUrls.debtorSourceDocument.create.url,
                method: apiUrls.debtorSourceDocument.create.method,
                data,
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.debtorSourceDocument)],
            });
        },
    });
};

export const useUpdateDebtorSourceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<z.infer<typeof debtorSourceDocumentSchema>> & { id: string }) =>
            axiosInstance({
                url: apiUrls.debtorSourceDocument.update.url,
                method: apiUrls.debtorSourceDocument.update.method,
                data,
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.debtorSourceDocument)],
            });
        },
    });
};

export const useDeleteDebtorSourceDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            axiosInstance({
                url: apiUrls.debtorSourceDocument.delete.url,
                method: apiUrls.debtorSourceDocument.delete.method,
                data: {
                    id,
                },
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.debtorSourceDocument)],
            });
        },
    });
};
