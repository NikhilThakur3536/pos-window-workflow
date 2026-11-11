import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- DENOMINATIONS ---------------------------------------

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    type?: DenominationType;
};

export const DENOMINATION_TYPES = ['NOTE', 'COIN'] as const;
export type DenominationType = (typeof DENOMINATION_TYPES)[number];

export type DenominationCurrency = {
    id: string;
    name: string;
    code: string;
    symbol: string;
    description?: string;
    conversionRate?: number;
    status?: string;
};

export type DenominationDetails = {
    id: string;
    companyId: string;
    domainId?: string;
    label: string;
    value?: string | number;
    conversionValue: string;
    currencyId: string;
    type?: DenominationType;
    status: string;
    createdAt: string;
    updatedAt: string;
    currency?: DenominationCurrency | null;
};

export interface GetDenominationResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DenominationDetails[];
    };
}

export async function getDenominations(props: FilterProps): Promise<GetDenominationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.denominations.all.url,
            method: apiUrls.denominations.all.method,
            data: props,
        })
    ).data;
}

export const useGetDenominations = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.denominations), props],
        queryFn: async () => await getDenominations(props),
    });
};

export const denominationBaseSchema = z.object({
    label: z.string().min(1, 'Label is required'),
    value: z.number().min(1, 'Value must be at least 1'),
    conversionValue: z.number().min(1, 'Conversion Value must be at least 1'),
    currencyId: z.string().min(1, 'Currency is required'),
    type: z.enum(DENOMINATION_TYPES).default('NOTE'),
});

export const denominationCreateSchema = denominationBaseSchema;

export type DenominationCreateSchema = z.infer<typeof denominationCreateSchema>;

export type MutateDenominationResponse = {
    success: boolean;
    message?: string;
};

export async function createDenomination(data: DenominationCreateSchema): Promise<MutateDenominationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.denominations.create.url,
            method: apiUrls.denominations.create.method,
            data,
        })
    ).data;
}

export const useCreateDenomination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDenomination,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.denominations)] });
        },
    });
};

export const denominationUpdateSchema = denominationBaseSchema.extend({ id: z.string() });

export type DenominationUpdateSchema = z.infer<typeof denominationUpdateSchema>;

export async function updateDenomination(data: DenominationUpdateSchema): Promise<MutateDenominationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.denominations.update.url,
            method: apiUrls.denominations.update.method,
            data,
        })
    ).data;
}

export const useUpdateDenomination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDenomination,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.denominations)] });
        },
    });
};

export async function removeDenomination(id: string): Promise<MutateDenominationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.denominations.delete.url,
            method: apiUrls.denominations.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveDenomination = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeDenomination,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.denominations)] });
        },
    });
};
