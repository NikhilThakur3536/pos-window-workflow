import { z } from 'zod';
import moment from 'moment-timezone';
import { apiUrls, axiosInstance } from '..';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StockDetails } from '../company/stock-details';

const validTimezones = moment.tz.names();

// --------------------------------------- Stock Contract Prices ---------------------------------------

// Stock Contract Prices Listing

export type DiscountTypesType =
    | 'Discount per Product per Debtor'
    | 'Discount per Department per Debtor'
    | "Discount per Product per Debtor's Group"
    | "Discount per Department per Debtor's group";

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    discountType?: DiscountTypesType | '';
};

export interface StockContractPrice {
    id?: string;
    discountType?: DiscountTypesType | undefined;
    latestCost: number;
    profit?: number;
    gpPercent?: number;
    discountPercent: number;
    startDate: string;
    endDate?: string;
    companyStockDetailId?: string;
    sellPriceExclusive: number;
    sellPriceInclusive: number;
    appliesAtPOS: boolean;
    companyDebtorId: string;
    groupId: string;
    majorDepartmentId: string;
    minorDepartmentId: string;
    CompanyStockDetail: StockDetails;
}

export interface GetStockContractPricesResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockContractPrice[];
    };
}

export async function getStockContractPrices(props: FilterProps): Promise<GetStockContractPricesResponse> {
    const response = await axiosInstance({
        url: apiUrls.contractPrices.list.url,
        method: apiUrls.contractPrices.list.method,
        data: props,
    });

    return response.data;
}

export const useGetStockContractPrices = (props: FilterProps) => {
    return useQuery({
        queryKey: ['stockContractPrices', props],
        queryFn: async () => await getStockContractPrices(props),
        staleTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
    });
};

// Stock Contract Price Get By Id

export interface GetStockContractPriceByIdResponse {
    success: boolean;
    data: StockContractPrice;
}

export async function getStockContractPriceById(id: string): Promise<GetStockContractPriceByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.contractPrices.get.url,
            method: apiUrls.contractPrices.get.method,
            data: { pricingId: id },
        })
    ).data;
}

export const useGetStockContractPriceById = (id: string) => {
    return useQuery({
        queryKey: ['stockContractPrices', id],
        queryFn: async () => await getStockContractPriceById(id),
    });
};

// Updated Schema Definitions
const baseObjectSchema = z.object({
    discountType: z.enum([
        'Discount per Product per Debtor',
        'Discount per Department per Debtor',
        "Discount per Product per Debtor's Group",
        "Discount per Department per Debtor's group",
    ]),
    sellPriceExclusive: z.number().min(0, 'Sell Price Excl. must be 0 or positive'),
    sellPriceInclusive: z.number().min(0, 'Sell Price Incl. must be 0 or positive'),
    latestCost: z.number().min(0, 'Latest Cost must be 0 or positive').default(0),
    profit: z.number().optional(),
    gpPercent: z.number().optional(),
    discountPercent: z
        .number()
        .min(0, 'Discount cannot be negative')
        .max(100, 'Discount cannot exceed 100%')
        .default(0),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid Start Date format' }),
    endDate: z
        .string()
        .optional()
        .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid End Date format' }),
    companyDebtorId: z.string().optional(),
    minorDepartmentId: z.string().optional(),
    majorDepartmentId: z.string().optional(),
    groupId: z.string().optional(),
    companyStockDetailId: z.string().optional(),
});

const contractPriceRefinement = (data: z.infer<typeof baseObjectSchema>) => {
    if (data.discountType === 'Discount per Product per Debtor') {
        return !!data.companyDebtorId && !!data.companyStockDetailId;
    }
    return true;
};

const contractPriceRefinementOptions = {
    message: 'For Discount per Product per debtors and products are required.',
    path: ['discountType'],
};

export const createPriceDiscountSchema = baseObjectSchema.refine(
    contractPriceRefinement,
    contractPriceRefinementOptions,
);

export const updatePriceDiscountSchema = baseObjectSchema
    .partial()
    .extend({
        contractPriceId: z.string({ error: 'ID is required' }),
    })
    .refine(
        (data) => {
            if (data.discountType === 'Discount per Product per Debtor') {
                return !!data.companyDebtorId && !!data.companyStockDetailId;
            }
            return true;
        },
        contractPriceRefinementOptions,
    );

export type CreatePriceDiscountSchema = z.infer<typeof createPriceDiscountSchema>;
export type UpdatePriceDiscountSchema = z.infer<typeof updatePriceDiscountSchema>;

export async function createStockContractPrice(
    data: CreatePriceDiscountSchema,
): Promise<MutateStockContractPriceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.contractPrices.create.url,
            method: apiUrls.contractPrices.create.method,
            data,
        })
    ).data;
}

export const useCreateStockContractPrice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStockContractPrice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockContractPrices'], exact: false });
        },
        retry: 1,
    });
};

export async function updateStockContractPrice(
    data: UpdatePriceDiscountSchema,
): Promise<MutateStockContractPriceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.contractPrices.update.url,
            method: apiUrls.contractPrices.update.method,
            data,
        })
    ).data;
}

export const useUpdateStockContractPrice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStockContractPrice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockContractPrices'], exact: false });
        },
        retry: 1,
    });
};

export type MutateStockContractPriceResponse = {
    success: boolean;
};

export async function deleteStockContractPrice(id: string): Promise<MutateStockContractPriceResponse> {
    return (
        await axiosInstance({
            url: apiUrls.contractPrices.delete.url,
            method: apiUrls.contractPrices.delete.method,
            data: { contractPriceId: id },
        })
    ).data;
}

export const useDeleteStockContractPrice = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStockContractPrice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stockContractPrices'], exact: false });
        },
        retry: 1,
    });
};