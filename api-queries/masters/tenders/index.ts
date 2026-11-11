import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- TENDER MASTERS (Payment Methods) ---------------------------------------

export type TenderTypeOption = 'CASH' | 'CARD' | 'EFT' | 'CHEQUE' | 'COUPON' | 'VOUCHER';
export type FixedDiscountType = 'PERCENTAGE' | 'FIXED_VALUE';

export interface TenderMaster {
    id: string;
    code: string;
    type: string;
    description: string;
    category: boolean;
    isMainType: boolean;
    isBankable: boolean;
    isStockDiscount: boolean;
    isDiscountParent: boolean;
    parentTenderId: string | null;
    fixedDiscountType: FixedDiscountType | null;
    fixedDiscountValue: string | number | null;
    status: 'ACTIVE' | 'INACTIVE';
    companyId: string;
    domainId: string;
    createdAt: string;
    updatedAt: string;
}

export type TenderMasterFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    type?: string;
    isParentNull?: boolean;
    isDiscountParent?: boolean;
    parentTenderId?: string;
};

export interface GetTenderMasterResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: TenderMaster[];
    };
}

export async function getTenderMasters(props: TenderMasterFilterProps): Promise<GetTenderMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.list.url,
            method: apiUrls.tenders.list.method,
            data: props,
        })
    ).data;
}

export const useGetTenderMasters = (props: TenderMasterFilterProps, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.tenders), props],
        queryFn: async () => await getTenderMasters(props),
        enabled,
    });
};

// Tender Master Create

export const tenderMasterCreateSchema = z.object({
    code: z.string().min(1, 'Code is required'),
    type: z.string().min(1, 'Tender type is required'),
    description: z.string().min(1, 'Description is required'),
    category: z.boolean(),
    isMainType: z.boolean(),
    isBankable: z.boolean(),
    isStockDiscount: z.boolean(),
    isDiscountParent: z.boolean(),
    parentTenderId: z.string().nullable().optional(),
    fixedDiscountType: z.string().nullable().optional(),
    fixedDiscountValue: z.number().nullable().optional(),
});

export type TenderMasterCreateSchema = z.infer<typeof tenderMasterCreateSchema>;

export const tenderMasterUpdateSchema = tenderMasterCreateSchema.extend({
    tenderTypeId: z.string().min(1, 'Tender id is required'),
});

export type TenderMasterUpdateSchema = z.infer<typeof tenderMasterUpdateSchema>;

export type TenderMasterFormValues = TenderMasterCreateSchema & { tenderTypeId?: string };

export type MutateTenderMasterResponse = {
    success: boolean;
};

export async function createTenderMaster(data: TenderMasterCreateSchema): Promise<MutateTenderMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.create.url,
            method: apiUrls.tenders.create.method,
            data,
        })
    ).data;
}

export const useCreateTenderMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTenderMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
        },
    });
};

// Tender Master Update

export async function updateTenderMaster(data: TenderMasterUpdateSchema): Promise<MutateTenderMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.update.url,
            method: apiUrls.tenders.update.method,
            data,
        })
    ).data;
}

export const useUpdateTenderMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateTenderMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
        },
    });
};

// Tender Master Delete

export async function removeTenderMaster(id: string): Promise<MutateTenderMasterResponse> {
    return (
        await axiosInstance({
            url: apiUrls.tenders.delete.url,
            method: apiUrls.tenders.delete.method,
            data: { tenderTypeId: id },
        })
    ).data;
}

export const useRemoveTenderMaster = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeTenderMaster,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.tenders)] });
        },
    });
};