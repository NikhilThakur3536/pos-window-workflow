import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance, axiosNetworkInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey, getMutateIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { CompanyCreditor } from '@/types';
import { StockDetails } from '../../company/stock-details';
import { SalesRepresentativeDetails } from '../../sales-representatives';
import { addToDBArray } from '@/offline/db';
import { useAuthUser } from '@/stores/auth-user.store';
import { CartItemPricingType } from '..';

const validTimezones = moment.tz.names();

// --------------------------------------- PRICE QUOTATIONS ---------------------------------------

// Quotations Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface CartItemReponse {
    companyStockDetailId: string;
    companyStockPricingId: string;
    companyStockPricingTypeId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
}

export interface QuotationCartItemBase {
    quantity: number;
    selectedSerialNumber?: string;
    discount: number;
    lineTotal: number;
    unitPrice: number;
    isNewRow?: boolean;
    promotionalPrice?: number;
    freeQuantity?: number;
    isFree?: boolean;
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    type: {
        name: string;
    };
    selectedPricing: CartItemPricingType;
    taxRateId?: string;
    taxName?: string;
    taxPercent?: number;
    taxAmount?: number;
    taxableAmount?: number;
}

export type QuotationCartItem = QuotationCartItemBase & StockDetails;

export type QuotationInvoiceCartItem = (QuotationCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface QuotationInvoiceType {
    accountSales: QuotationCreateSchema;
    cartItems: QuotationInvoiceCartItem;
    accountNumber: string;
}

export interface QuotationsDetails extends QuotationCreateSchema {
    id: string;
    pdfUrl?:string;
    CompanyDebtor: CompanyCreditor;
    priceQuotationItems: QuotationInvoiceCartItem;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
}

export interface GetQuotationResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: QuotationsDetails[] };
}

export async function getQuotations(props: FilterProps): Promise<GetQuotationResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'quotations', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.quotations.list.url,
                method: apiUrls.quotations.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetQuotations = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.quotations), props],
        queryFn: async () => await getQuotations(props),
    });
};

// Store Departments Offline Listing

export async function getQuotationsOffline(online: boolean): Promise<GetQuotationResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.quotations.list.url,
            method: apiUrls.quotations.list.method,
        });
        await setDBData(getIDBKey(apiUrls.quotations), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetQuotationResponse>(getIDBKey(apiUrls.quotations));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetQuotationsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.quotations), online],
        queryFn: async () => await getQuotationsOffline(online),
    });
};

// Quotation Get By Id
export interface GetQuotationByIdResponse {
    success: boolean;
    data: QuotationsDetails;
}

export async function getQuotationById(id: string): Promise<GetQuotationByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quotations.get.url,
            method: apiUrls.quotations.get.method,
            data: { id },
        })
    ).data;
}

export const useGetQuotationById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.quotations), id],
        queryFn: async () => await getQuotationById(id),
    });
};

// Quotation Create

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    companyStockPricingTypeId: z.string().min(1, 'Invalid or no pricing found'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    baseUnitPrice: z.number().nonnegative().optional(),
    unitPrice: z.number().nonnegative(),
    promotionalPrice: z.number().nonnegative().optional(),
    isFree: z.boolean().optional(),
    freeQuantity: z.number().optional(),
    discount: z.number().optional(),
    lineTotal: z.number().nonnegative(),
});

export const promotionApplicationSchema = z
    .object({
        ruleType: z.string().optional(),
        ruleId: z.string().optional(),
        promotionId: z.string().optional(),
        promotionName: z.string().optional(),
        promotionTypeCode: z.string().optional(),
        priority: z.number().optional(),
        allowStacking: z.boolean().optional(),
        multiplier: z.number().optional(),
        totalDiscount: z.number().optional(),
        explanation: z.string().optional(),
    })
    .passthrough();

export const quotationBaseSchema = z.object({
    // Document Details
    companyDebtorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),
    approvedById: z.string().optional(),
    companyTaxRateId: z.string().optional().nullable(),

    // Quotation Details
    quotationDate: z.string().min(1, 'Quotation date is required'),
    quotationNumber: z.string().min(1, 'Quotation number is required'),
    quotationMemo: z.string().optional(),
    quotationInclusive: z.enum(['Yes', 'No']),

    deliveryMethod: z.string().optional(),
    orderNumber: z.string().optional(),
    internalOrderNo: z.string().optional(),
    representativeId: z.string().optional(),
    deliveryNoteNumber: z.string().optional(),

    // Additional Details
    storeDepartmentId: z.string().optional(),
    sourceDocumentId: z.string().optional(),
    warehouseId: z.string().optional(),
    documentGpPercentage: z.number().min(0, 'Document GP cannot be negative'),

    // Cart Details
    goodsTotal: z.number().min(0, 'Goods total cannot be negative'),
    discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
    promotionId: z.string().optional(),
    promotionName: z.string().optional(),
    promotionDiscountAmount: z.number().optional(),
    promotionApplications: z.array(promotionApplicationSchema).optional(),
    taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
    totalQuantity: z.number().min(0, 'Total quantity cannot be negative'),
    items: z.array(cartItemSchema).min(1, 'At least one product must be selected'),
});

export const quotationCreateSchema = quotationBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type QuotationCreateSchema = z.infer<typeof quotationCreateSchema>;

export type MutateQuotationResponse = {
    success: boolean;
    data: QuotationsDetails;
};

export async function createQuotation(data: QuotationCreateSchema): Promise<MutateQuotationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quotations.create.url,
            method: apiUrls.quotations.create.method,
            data,
        })
    ).data;
}

export const useCreateQuotation = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: QuotationCreateSchema) => {
            if (isOnline) {
                return await createQuotation(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.quotations), offlineData);
                return {
                    success: true,
                    data: data as QuotationsDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.quotations)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.quotations)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Quotations

export type MutateQuotationsSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedQuotationsSyncSchema {
    syncData: QuotationCreateSchema[];
}

export async function syncCreatedQuotations(data: CreatedQuotationsSyncSchema): Promise<MutateQuotationsSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.quotations.syncCreated.url,
            method: apiUrls.quotations.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedQuotations = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncCreatedQuotations,
    });
};
