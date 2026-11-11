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

// --------------------------------------- SALE ORDERS ---------------------------------------

// Sale Orders Listing

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

export interface SaleOrderCartItemBase {
    // The sale order item id. When a sale order is invoiced, this is sent as
    // salesOrderItemId on the matching invoice line so the backend can mark it invoiced.
    id?: string;
    salesOrderItemId?: string;
    quantity: number;
    selectedSerialNumber?: string;
    discount: number;
    manualDiscountAmount?: number;
    discountPercentage?: number;
    manualDiscountType?: 'AMOUNT' | 'PERCENT';
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

export type SaleOrderCartItem = SaleOrderCartItemBase & StockDetails;

export type SaleOrderInvoiceCartItem = (SaleOrderCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface SaleOrderInvoiceType {
    accountSales: SaleOrderCreateSchema;
    cartItems: SaleOrderInvoiceCartItem;
    accountNumber: string;
}

export interface SaleOrdersDetails extends SaleOrderCreateSchema {
    id: string;
    pdfUrl?: string;
    CompanyDebtor: CompanyCreditor;
    salesOrderItems: SaleOrderInvoiceCartItem;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
}

export interface GetSaleOrderResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: SaleOrdersDetails[] };
}

export async function getSaleOrders(props: FilterProps): Promise<GetSaleOrderResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'saleOrders', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.saleOrders.list.url,
                method: apiUrls.saleOrders.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetSaleOrders = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.saleOrders), props],
        queryFn: async () => await getSaleOrders(props),
    });
};

// Store Departments Offline Listing

export async function getSaleOrdersOffline(online: boolean): Promise<GetSaleOrderResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.saleOrders.list.url,
            method: apiUrls.saleOrders.list.method,
        });
        await setDBData(getIDBKey(apiUrls.saleOrders), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetSaleOrderResponse>(getIDBKey(apiUrls.saleOrders));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetSaleOrdersOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.saleOrders), online],
        queryFn: async () => await getSaleOrdersOffline(online),
    });
};

// Sale Order Get By Id
export interface GetSaleOrderByIdResponse {
    success: boolean;
    data: SaleOrdersDetails;
}

export async function getSaleOrderById(id: string): Promise<GetSaleOrderByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.saleOrders.get.url,
            method: apiUrls.saleOrders.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSaleOrderById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.saleOrders), id],
        queryFn: async () => await getSaleOrderById(id),
        enabled: !!id,
    });
};

// Sale Order Create

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

export const saleOrderBaseSchema = z.object({
    // Document Details
    companyDebtorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),
    approvedById: z.string().optional(),

    // Sale Order Details
    salesOrderDate: z.string().min(1, 'Sale Order date is required'),
    salesOrderNumber: z.string().min(1, 'Sale Order number is required'),
    salesOrderMemo: z.string().optional(),
    salesOrderInclusive: z.enum(['Yes', 'No']),
    salesOrderEstimatedDate: z.string({ error: 'Estimated date is required' }),
    companyTaxRateId: z.string().optional().nullable(),

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

export const saleOrderCreateSchema = saleOrderBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SaleOrderCreateSchema = z.infer<typeof saleOrderCreateSchema>;

export type MutateSaleOrderResponse = {
    success: boolean;
    data: SaleOrdersDetails;
};

export async function createSaleOrder(data: SaleOrderCreateSchema): Promise<MutateSaleOrderResponse> {
    return (
        await axiosInstance({
            url: apiUrls.saleOrders.create.url,
            method: apiUrls.saleOrders.create.method,
            data,
        })
    ).data;
}

export const useCreateSaleOrder = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: SaleOrderCreateSchema) => {
            if (isOnline) {
                return await createSaleOrder(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.saleOrders), offlineData);
                return {
                    success: true,
                    data: data as SaleOrdersDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.saleOrders)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.saleOrders)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Sale Orders

export type MutateSaleOrdersSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedSaleOrdersSyncSchema {
    syncData: SaleOrderCreateSchema[];
}

export async function syncCreatedSaleOrders(data: CreatedSaleOrdersSyncSchema): Promise<MutateSaleOrdersSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.saleOrders.syncCreated.url,
            method: apiUrls.saleOrders.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedSaleOrders = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncCreatedSaleOrders,
    });
};
