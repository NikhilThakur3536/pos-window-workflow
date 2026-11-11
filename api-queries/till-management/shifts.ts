import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- SHIFTS ---------------------------------------

export type ShiftFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    tillNumber?: string;
    storeId?: string;
};

export type ShiftDetails = {
    id: string;
    tillNumber: string;
    currentShiftNumber?: string | number;
    firstSaleNumber?: number | null;
    firstSaleDateTime?: string | null;
    lastSaleNumber?: number | null;
    lastSaleDateTime?: string | null;
    nextShiftNumber?: string | number;
    domainId?: string;
    storeId?: string;
    companyWarehouseId?: string | null;
    companyId?: string;
    status?: string;
    cashierUserId?: string | null;
    userSessionId?: string | null;
    cashier?: {
        id?: string;
        firstName?: string;
        surname?: string;
        staffNumber?: string | number;
    } | null;
    till?: {
        id?: string;
        name?: string;
        tillNumber?: string;
    } | null;
    createdAt: string;
    updatedAt: string;
    store?: {
        id: string;
        name?: string;
        accountNumber?: string;
    } | null;
    warehouse?: unknown;
};

export interface GetShiftResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: ShiftDetails[];
    };
}

export async function getShifts(props: ShiftFilterProps): Promise<GetShiftResponse> {
    return (
        await axiosInstance({
            url: apiUrls.shift.all.url,
            method: apiUrls.shift.all.method,
            data: props,
        })
    ).data;
}

export const useGetShifts = (props: ShiftFilterProps, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.shift), props],
        queryFn: async () => await getShifts(props),
        enabled,
    });
};

export const shiftBaseSchema = z.object({
    tillNumber: z.string().min(1, 'Till Number is required'),
    currentShiftNumber: z.string().optional(),
    storeId: z.string().optional(),
});

export const shiftCreateSchema = shiftBaseSchema;

export type ShiftCreateSchema = z.infer<typeof shiftCreateSchema>;

export type MutateShiftResponse = {
    success: boolean;
    message?: string;
};

export async function createShift(data: ShiftCreateSchema): Promise<MutateShiftResponse> {
    return (
        await axiosInstance({
            url: apiUrls.shift.create.url,
            method: apiUrls.shift.create.method,
            data,
        })
    ).data;
}

export const useCreateShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.shift)] });
        },
    });
};

export const shiftUpdateSchema = shiftBaseSchema.extend({ id: z.string() });

export type ShiftUpdateSchema = z.infer<typeof shiftUpdateSchema>;

export async function updateShift(data: ShiftUpdateSchema): Promise<MutateShiftResponse> {
    return (
        await axiosInstance({
            url: apiUrls.shift.update.url,
            method: apiUrls.shift.update.method,
            data,
        })
    ).data;
}

export const useUpdateShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.shift)] });
        },
    });
};

export async function removeShift(id: string): Promise<MutateShiftResponse> {
    return (
        await axiosInstance({
            url: apiUrls.shift.delete.url,
            method: apiUrls.shift.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeShift,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.shift)] });
        },
    });
};


export interface CurrentShiftResponse {
    success: boolean;
    message?: string;
    data?: ShiftDetails | { shift?: ShiftDetails | null; currentShift?: ShiftDetails | null } | null;
}

export async function getCurrentShift(): Promise<CurrentShiftResponse> {
    const res = await axiosInstance.post('/api/company/shift/current', {});
    return res.data;
}

export const useGetCurrentShift = () => {
    return useQuery({
        queryKey: ['shift', 'current'],
        queryFn: async () => await getCurrentShift(),
        refetchOnWindowFocus: true,
    });
};

export async function openShift(data: { tillId: string; openingFloat?: number }): Promise<any> {
    const res = await axiosInstance.post('/api/company/shift/open', data);
    return res.data;
}

export const useOpenShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { tillId: string; openingFloat?: number }) => openShift(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shift', 'current'] });
        },
    });
};

export async function shiftHandover(data: { cashUpId: string; handoverRequestId: string }): Promise<any> {
    const res = await axiosInstance.post('/api/company/shift/handover', data);
    return res.data;
}

export const useShiftHandover = () => {
    return useMutation({
        mutationFn: (data: { cashUpId: string; handoverRequestId: string }) => shiftHandover(data),
    });
};

export async function recoverShiftHandover(data: {
    shiftId: string;
    cashUpId: string;
    handoverRequestId: string;
    reason: string;
}): Promise<any> {
    const res = await axiosInstance.post('/api/company/shift/handover/recover', data);
    return res.data;
}

export const useRecoverShiftHandover = () => {
    return useMutation({
        mutationFn: (data: {
            shiftId: string;
            cashUpId: string;
            handoverRequestId: string;
            reason: string;
        }) => recoverShiftHandover(data),
    });
};
