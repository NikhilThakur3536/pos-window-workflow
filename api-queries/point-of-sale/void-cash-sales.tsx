import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '../company/stock-details';
import { CompanyCreditor } from '@/types';
import { CartItemPricingType } from '.';

const validTimezones = moment.tz.names();

// --------------------------------------- VOID SALES ---------------------------------------

// Void Sales Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
};

export interface VoidedSalesDetails extends VoidSaleCreateSchema {
    id: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    PosVoidSaleItems: VoidSaleInvoiceCartItem;
    PosDebtor: CompanyCreditor;
    SalesRepresentative:{
        id:string;
        name:string;
        email:string;
        cellNumber:string;
        repNumber?:number
    }
}

// Invoice

export interface VoidSaleCartItemBase {
    id: string;
    companyStockPricingId: string;
    quantity: number;
    selectedSerialNumber?: string;
    unitPrice: number;
    discount: number;
    reason: string;
    lineTotal: number;
    comment?: string;
    lineComment?: string;
    selectedPricing: CartItemPricingType;
    taxName?: string;
    taxPercent?: number;
    companyTaxRateId?: string | null;
}

export type VoidSaleCartItem = VoidSaleCartItemBase & StockDetails;

export type VoidSaleInvoiceCartItem = (VoidSaleCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface VoidSaleInvoiceType {
    voidSales: VoidSaleCreateSchema;
    cartItems: VoidSaleInvoiceCartItem;
    debtor: CompanyCreditor | null;
    invoiceDate: string;
}

export interface GetVoidSaleResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: VoidedSalesDetails[] };
}

export async function getVoidedSales(props: FilterProps): Promise<GetVoidSaleResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'voidedSales', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.voidedSales.list.url,
                method: apiUrls.voidedSales.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetVoidedSales = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.voidedSales), props],
        queryFn: async () => await getVoidedSales(props),
    });
};

// Suspended Sale Get By Id
export interface GetVoidSaleByIdResponse {
    success: boolean;
    data: VoidedSalesDetails;
}

export async function getVoidSaleById(id: string): Promise<GetVoidSaleByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.voidedSales.get.url,
            method: apiUrls.voidedSales.get.method,
            data: { id },
        })
    ).data;
}

export const useGetVoidSaleById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.voidedSales), id],
        queryFn: async () => await getVoidSaleById(id),
    });
};

// Void Sale Create

export const voidedSaleCustomerSchema = z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
    name: z.string().min(1, 'Name is required'),
    address1: z.string().min(1, 'Address 1 is required'),
    address2: z.string().optional(),
    address3: z.string().optional(),
    telNumber: z.string().min(1, 'Telephone number is required'),
    vatNumber: z.string().optional(),
    email: z.email('Invalid email').optional(),
});

export type VoidSaleCustomerSchema = z.infer<typeof voidedSaleCustomerSchema>;

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    description: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    discount: z.number().nonnegative(),
    lineTotal: z.number().nonnegative(),
});

export const voidedSalesBaseSchema = z.object({
    companyDebtorId: z.string().optional(),
    items: z.array(cartItemSchema),
    reason: z.string().optional(),
    customer: voidedSaleCustomerSchema.optional(),
});

export const voidedSalesCreateSchema = voidedSalesBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type VoidSaleCreateSchema = z.infer<typeof voidedSalesCreateSchema>;

export type MutateVoidSaleResponse = {
    success: boolean;
    message: string;
    data: VoidedSalesDetails;
};

export async function createVoidedSales(data: VoidSaleCreateSchema): Promise<MutateVoidSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.voidedSales.create.url,
            method: apiUrls.voidedSales.create.method,
            data,
        })
    ).data;
}

export const useCreateVoidedSales = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createVoidedSales,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.voidedSales)] });
        },
    });
};
