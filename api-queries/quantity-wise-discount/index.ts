import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';

const validTimezones = moment.tz.names();

// --------------------------------------- QUANTITY WISE DISCOUNT ---------------------------------------

// Quantity Wise Discounts Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    isGoodsDiscount: boolean;
};

export interface QuantityWiseDiscount {
    quantity: number;
    maximumQuantity?: number | null;
    discountPercent: number;
    priority?: number;
    allowStacking?: boolean;
}

export interface QuantityWiseDiscountDetails {
    id: string;
    companyStockDetailId?: string;
    // Present for goods discounts, null for debtor-scoped retail discounts.
    companyCreditorId?: string | null;
    companyDebtorId?: string | null;
    companyWarehouseId?: string | null;
    CompanyStockDetail: StockDetails;
    CompanyCreditor?: CompanyCreditor | null;
    CompanyDebtor?: CompanyCreditor | null;
    CompanyWarehouse?: { id?: string; name?: string | null } | null;
    discounts: QuantityWiseDiscount[];
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    isApplicableForCashSale: boolean;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetQuantityWiseDiscountResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: QuantityWiseDiscountDetails[];
    };
}

export async function getQuantityWiseDiscounts(props: FilterProps): Promise<GetQuantityWiseDiscountResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'quantityWiseDiscounts', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.quantityWiseDiscounts.list.url,
                method: apiUrls.quantityWiseDiscounts.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetQuantityWiseDiscounts = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.quantityWiseDiscounts), props],
        queryFn: async () => await getQuantityWiseDiscounts(props),
    });
};

// Quantity Wise Discount Get By Id
export interface GetQuantityWiseDiscountByIdResponse {
    success: boolean;
    data: QuantityWiseDiscountDetails;
}

export async function getQuantityWiseDiscountById(id: string): Promise<GetQuantityWiseDiscountByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quantityWiseDiscounts.get.url,
            method: apiUrls.quantityWiseDiscounts.get.method,
            data: { id },
        })
    ).data;
}

export const useGetQuantityWiseDiscountById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.quantityWiseDiscounts), id],
        queryFn: async () => await getQuantityWiseDiscountById(id),
    });
};

// Quantity Wise Discount Create

const quantityWiseDiscountBaseSchema = (isGoodsDiscount: boolean) =>
    z.object({
        companyStockDetailId: z.string().min(1, 'Stock item is required'),
        companyCreditorId: z.string().optional(),
        companyDebtorId: z.string().optional(),
        companyWarehouseId: z.string().optional(),
        isApplicableForCashSale: z.boolean(),
        discounts: z
            .array(
                z.object({
                    quantity: z.number().min(1, 'Quantity must be at least 1'),
                    maximumQuantity: z.number().nullish(),
                    discountPercent: z.number().min(0, 'Discount percent must be at least 0'),
                    priority: z.number().int().optional(),
                    allowStacking: z.boolean().optional(),
                }),
            )
            .min(1, 'At least one quantity discount is required'),
    });

export const quantityWiseDiscountCreateSchema = (isGoodsDiscount: boolean) =>
    quantityWiseDiscountBaseSchema(isGoodsDiscount)
        .extend({ timezone: z.string() })
        .superRefine((data, ctx) => {
            if (!validTimezones.includes(data.timezone)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['timezone'],
                    message: 'Invalid timezone',
                });
            }
            if (!data.isApplicableForCashSale) {
                if (isGoodsDiscount && !data.companyCreditorId) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['companyCreditorId'],
                        message: 'Creditor is required',
                    });
                }
                if (!isGoodsDiscount && !data.companyDebtorId) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['companyDebtorId'],
                        message: 'Debtor is required',
                    });
                }
            }
        });

export type QuantityWiseDiscountCreateSchema = z.infer<ReturnType<typeof quantityWiseDiscountCreateSchema>>;

export type MutateQuantityWiseDiscountResponse = {
    success: boolean;
};

export async function createQuantityWiseDiscount(
    data: QuantityWiseDiscountCreateSchema,
): Promise<MutateQuantityWiseDiscountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quantityWiseDiscounts.create.url,
            method: apiUrls.quantityWiseDiscounts.create.method,
            data,
        })
    ).data;
}

export const useCreateQuantityWiseDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createQuantityWiseDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.quantityWiseDiscounts)] });
        },
    });
};

// Quantity Wise Discount Update

export const quantityWiseDiscountUpdateSchema = (isGoodsDiscount: boolean) =>
    quantityWiseDiscountBaseSchema(isGoodsDiscount)
        .extend({
            timezone: z.string(),
            id: z.string().min(1, 'Discount id is required'),
        })
        .superRefine((data, ctx) => {
            if (!validTimezones.includes(data.timezone)) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['timezone'],
                    message: 'Invalid timezone',
                });
            }
            if (!data.isApplicableForCashSale) {
                if (isGoodsDiscount && !data.companyCreditorId) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['companyCreditorId'],
                        message: 'Creditor is required',
                    });
                }
                if (!isGoodsDiscount && !data.companyDebtorId) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['companyDebtorId'],
                        message: 'Debtor is required',
                    });
                }
            }
        });

export type QuantityWiseDiscountUpdateSchema = z.infer<ReturnType<typeof quantityWiseDiscountUpdateSchema>>;

export async function updateQuantityWiseDiscount(
    data: QuantityWiseDiscountUpdateSchema,
): Promise<MutateQuantityWiseDiscountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quantityWiseDiscounts.update.url,
            method: apiUrls.quantityWiseDiscounts.update.method,
            data,
        })
    ).data;
}

export const useUpdateQuantityWiseDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateQuantityWiseDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.quantityWiseDiscounts)] });
        },
    });
};

// Quantity Wise Discount Delete

export async function removeQuantityWiseDiscount(
    companyStockQtyDiscountId: string,
): Promise<MutateQuantityWiseDiscountResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quantityWiseDiscounts.delete.url,
            method: apiUrls.quantityWiseDiscounts.delete.method,
            data: { companyStockQtyDiscountId },
        })
    ).data;
}

export const useRemoveQuantityWiseDiscount = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeQuantityWiseDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.quantityWiseDiscounts)] });
        },
    });
};

// Applicable GRV Discount Percentage

interface GetPromotionResponse {
    success: boolean;
    message: string;
    data: {
        discountPercent: number;
    };
}

export type ApplicableDiscountFilterProps = {
    companyCreditorId?: string;
    companyDebtorId?: string;
    companyStockDetailId: string;
    // The same endpoint serves company, warehouse and retail-store scopes.
    companyWarehouseId?: string | null;
    isApplicableForCashSale?: boolean;
    quantity: number;
};

export async function getApplicableDiscount(props: ApplicableDiscountFilterProps): Promise<GetPromotionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quantityWiseDiscounts.applicable.url,
            method: apiUrls.quantityWiseDiscounts.applicable.method,
            data: props,
        })
    ).data;
}

export const useGetApplicableDiscount = (props: ApplicableDiscountFilterProps, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.quantityWiseDiscounts), props],
        queryFn: async () => await getApplicableDiscount(props),
        enabled: options?.enabled ?? true,
    });
};
