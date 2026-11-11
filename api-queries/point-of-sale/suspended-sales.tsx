import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';
import { SalesRepresentativeDetails } from '../sales-representatives';
import { CartItemPricingType } from '.';

const validTimezones = moment.tz.names();

// --------------------------------------- SUSPENDED SALES ---------------------------------------

// Suspended Sales Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isPlaced?: boolean;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
};

export interface SuspendedSalesDetails extends SuspendedSaleCreateSchema {
    id: string;
    timezone: string;
    createdAt: string;
    customerSuspendedAt: string;
    updatedAt: string;
    companySuspendedSaleItems: SuspendedSaleInvoiceCartItem;
    PosDebtor: CompanyCreditor;
    isPlaced: boolean;
    representativeId: string;
    SalesRepresentative: SalesRepresentativeDetails;
}

// Invoice

export interface SuspendedSaleCartItemBase {
    id: string;
    companyStockPricingId: string;
    companyTaxRateId?: string | null;
    quantity: number;
    selectedSerialNumber?: string;
    unitPrice: number;
    discount: number;
    manualDiscountAmount?: number;
    discountPercentage?: number;
    manualDiscountType?: 'AMOUNT' | 'PERCENT';
    reason: string;
    lineTotal: number;
    comment?: string;
    lineComment?: string;
    selectedPricing: CartItemPricingType;
    taxName?: string;
    taxRateId?:string | null,
    taxPercent?: number;
    // companyTaxRateId?: string |null;
}

export type SuspendedSaleCartItem = SuspendedSaleCartItemBase & StockDetails;

export type SuspendedSaleInvoiceCartItem = (SuspendedSaleCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface SuspendedSaleInvoiceType {
    suspendedSales: SuspendedSaleCreateSchema;
    cartItems: SuspendedSaleInvoiceCartItem;
    debtor: CompanyCreditor | null;
    invoiceDate: string;
}

export interface GetSuspendedSaleResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: SuspendedSalesDetails[] };
}

export async function getSuspendedSales(props: FilterProps): Promise<GetSuspendedSaleResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'suspendedSales', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.suspendedSales.list.url,
                method: apiUrls.suspendedSales.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetSuspendedSales = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.suspendedSales), props],
        queryFn: async () => await getSuspendedSales(props),
    });
};

// Suspended Sale Get By Id
export interface GetSuspendedSaleByIdResponse {
    success: boolean;
    data: SuspendedSalesDetails;
}

export async function getSuspendedSaleById(id: string): Promise<GetSuspendedSaleByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.suspendedSales.get.url,
            method: apiUrls.suspendedSales.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSuspendedSaleById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.suspendedSales), id],
        queryFn: async () => await getSuspendedSaleById(id),
    });
};

// Suspended Sale Create

export const suspendedSaleCustomerSchema = z.object({
    customerName: z.string().min(1, 'Name is required'),
    customerPhoneNumber: z.string().min(1, 'Telephone number is required'),
    representativeId:z.string()
});

export type SuspendedSaleCustomerSchema = z.infer<typeof suspendedSaleCustomerSchema>;

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    description: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    manualDiscountAmount: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    lineTotal: z.number().nonnegative(),
});

export const suspendedSalesBaseSchema = suspendedSaleCustomerSchema.extend({
    companyDebtorId: z.string().optional(),
    representativeId: z.string().optional(),
    items: z.array(cartItemSchema),
});

export const suspendedSalesCreateSchema = suspendedSalesBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SuspendedSaleCreateSchema = z.infer<typeof suspendedSalesCreateSchema>;

export type MutateSuspendedSaleResponse = {
    success: boolean;
    message: string;
    data: SuspendedSalesDetails;
};

export async function createSuspendedSale(data: SuspendedSaleCreateSchema): Promise<MutateSuspendedSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.suspendedSales.create.url,
            method: apiUrls.suspendedSales.create.method,
            data,
        })
    ).data;
}

export const useCreateSuspendedSale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSuspendedSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.suspendedSales)] });
        },
    });
};

// Suspended Sales Delete

export async function removeSuspendedSale(suspendedSaleId: string): Promise<MutateSuspendedSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.suspendedSales.delete.url,
            method: apiUrls.suspendedSales.delete.method,
            data: { suspendedSaleId },
        })
    ).data;
}

export const useRemoveSuspendedSale = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSuspendedSale,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.suspendedSales)] });
        },
    });
};
