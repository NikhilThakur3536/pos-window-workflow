import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiUrls, axiosInstance } from "..";
import { getApiKey } from "@/utils/helpers";

// ---------------------------------------
// TYPES
// ---------------------------------------

export interface DebtorStoreDepartmentItem {
    id: string;
    name: string;
    description: string;
    companyDebtorId: string;
    timezone: string;
    status: string;
}

export interface DebtorStoreDepartmentResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorStoreDepartmentItem[];
    };
}

// ---------------------------------------
// SCHEMAS
// ---------------------------------------

export const debtorStoreDepartmentSchema = z.object({
    name: z.string(),
    description: z.string(),
    companyDebtorId: z.string(),
    timezone: z.string(),
    status: z.string(),
});

// ---------------------------------------
// GENERIC LIST
// ---------------------------------------

async function getDebtorStoreDepartmentList(
    url: string,
    data: any = {}
) {
    return (
        await axiosInstance({
            url,
            method: "post",
            data,
        })
    ).data;
}

// ---------------------------------------
// DEBTOR STORE DEPARTMENT
// ---------------------------------------

export const useGetDebtorStoreDepartmentList = (data: any = {}) =>
    useQuery({
        queryKey: [
            getApiKey(apiUrls.debtorStoreDepartment),
            data,
        ],
        queryFn: () =>
            getDebtorStoreDepartmentList(
                apiUrls.debtorStoreDepartment.list.url,
                data
            ),
    });

export const useGetDebtorStoreDepartmentById = (
    enabled: boolean,
    id?: string
) =>
    useQuery({
        enabled: enabled && !!id,
        queryKey: [
            getApiKey(apiUrls.debtorStoreDepartment),
            id,
        ],
        queryFn: async () =>
            (
                await axiosInstance({
                    url: apiUrls.debtorStoreDepartment.getById.url,
                    method: apiUrls.debtorStoreDepartment.getById.method,
                    data: {
                        id,
                    },
                })
            ).data,
    });

export const useCreateDebtorStoreDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            data: z.infer<typeof debtorStoreDepartmentSchema>
        ) =>
            axiosInstance({
                url: apiUrls.debtorStoreDepartment.create.url,
                method: apiUrls.debtorStoreDepartment.create.method,
                data,
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [
                    getApiKey(apiUrls.debtorStoreDepartment),
                ],
            });
        },
    });
};

export const useUpdateDebtorStoreDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            data: Partial<
                z.infer<typeof debtorStoreDepartmentSchema>
            > & { id: string }
        ) =>
            axiosInstance({
                url: apiUrls.debtorStoreDepartment.update.url,
                method: apiUrls.debtorStoreDepartment.update.method,
                data,
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [
                    getApiKey(apiUrls.debtorStoreDepartment),
                ],
            });
        },
    });
};

export const useDeleteDebtorStoreDepartment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            axiosInstance({
                url: apiUrls.debtorStoreDepartment.delete.url,
                method: apiUrls.debtorStoreDepartment.delete.method,
                data: {
                    id,
                },
            }),

        onSuccess() {
            queryClient.invalidateQueries({
                queryKey: [
                    getApiKey(apiUrls.debtorStoreDepartment),
                ],
            });
        },
    });
};