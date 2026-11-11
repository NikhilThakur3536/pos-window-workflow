import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey, getMutateIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { StockDetails } from '../company/stock-details';
import { TenderDetails } from './tenders';
import { CompanyCreditor } from '@/types';
import { SalesRepresentativeDetails } from '../sales-representatives';
import { addToDBArray } from '@/offline/db';
import { useAuthUser } from '@/stores/auth-user.store';
import { CartItemPricingType } from '.';

const validTimezones = moment.tz.names();

// --------------------------------------- CASH SALES ---------------------------------------

// Cash Sales Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
    filters?: {
        status: string | undefined;
    };
};

export interface DiscountType {
    Voucher: TenderDetails;
    Coupon: TenderDetails;
}

export interface CashSalesDetails extends CashSaleCreateSchema, DiscountType {
    id: string;
    timezone: string;
    createdAt: string;
    updatedAt?: string;
    PosCashSaleOrderItems: CashSaleInvoiceCartItem;
    PosDebtor?: CompanyCreditor;
    PosTenderType: TenderDetails;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    notSynced?: boolean;
    invoiceDate: string;
    status: string;
}

// Invoice

export interface CashSaleCartItemBase {
    companyStockPricingId: string;
    availableStock?: number;
    quantity: number;
    selectedSerialNumber?: string;
    unitPrice: number;
    discount: number;
    // Manual discount entered after any automatic/promotion discount. Exactly one of
    // manualDiscountAmount / discountPercentage is the active input; the other is 0.
    manualDiscountAmount?: number;
    discountPercentage?: number;
    manualDiscountType?: 'AMOUNT' | 'PERCENT';
    lineTotal: number;
    comment?: string;
    promotionalPrice?: number;
    freeQuantity?: number;
    isFree?: boolean;
    lineComment?: string;
    selectedPricing: CartItemPricingType;
    taxName?: string;
    taxPercent?: number;
    companyTaxRateId?: string | null;
    taxRateId?: string;
    stockDispositionId?: string;
    stockDispositionVersion?: number;
    dispositionType?: string;
    originalUnitPrice?: number;
    dispositionDiscountAmount?: number;
    // Display-only details for the NST badge; never submitted with the sale.
    dispositionBatchNumber?: string;
    dispositionExpiryDate?: string;
    dispositionRemainingQuantity?: number;
    dispositionReason?: string;
    // Rule's allowPromotionStacking echoed onto the line so the promotion guard re-evaluates
    // when lines are added or removed instead of caching a sticky refusal.
    dispositionAllowPromotionStacking?: boolean;

    // Pricing matrix override flags (mirrors account sale cart items)
    isDiscountOverride?: boolean;
    discountOverride?: boolean;
    isPriceOverride?: boolean;
    priceOverride?: boolean;
}

export type CashSaleCartItem = CashSaleCartItemBase & StockDetails;

export type CashSaleInvoiceCartItem = (CashSaleCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface AppliedDiscountType {
    id: string;
    type: string;
    value: number;
    description: string;
}

export interface CashSaleInvoiceType {
    cashSales: CashSaleCreateSchema;
    cartItems: CashSaleInvoiceCartItem;
    paymentMethod: TenderDetails;
    appliedDiscount: AppliedDiscountType;
    debtor: CompanyCreditor | null;
    invoiceDate: string;
}

export interface GetCashSaleResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: CashSalesDetails[] };
}

export async function getCashSales(props: FilterProps): Promise<GetCashSaleResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'cashSales', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.cashSales.list.url,
                method: apiUrls.cashSales.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetCashSales = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashSales), props],
        queryFn: async () => await getCashSales(props),
    });
};

// Store Departments Offline Listing

export async function getCashSalesOffline(online: boolean): Promise<GetCashSaleResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.cashSales.list.url,
            method: apiUrls.cashSales.list.method,
        });
        await setDBData(getIDBKey(apiUrls.cashSales), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetCashSaleResponse>(getIDBKey(apiUrls.cashSales));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetCashSalesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.cashSales), online],
        queryFn: async () => await getCashSalesOffline(online),
    });
};

// Cash Sale Get By Id

export interface GetCashSaleByIdResponse {
    success: boolean;
    data: CashSalesDetails;
}

export async function getCashSaleById(id: string): Promise<GetCashSaleByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashSales.get.url,
            method: apiUrls.cashSales.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCashSaleById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashSales), id],
        queryFn: async () => await getCashSaleById(id),
    });
};

// Cash Sale Create

export const cashSaleCustomerSchema = z.object({
    orderNumber: z.string().min(1, 'Order number is required'),
    name: z.string().min(1, 'Name is required'),
    address1: z.string().min(1, 'Address 1 is required'),
    address2: z.string().optional(),
    address3: z.string().optional(),
    telNumber: z.string().min(1, 'Telephone number is required'),
    vatNumber: z.string().optional(),
    email: z.email('Invalid email').optional(),
});

export type CashSaleCustomerSchema = z.infer<typeof cashSaleCustomerSchema>;

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    companyTaxRateId: z.string().nullable().optional(),
    description: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    freeQuantity: z.number().optional(),
    unitPrice: z.number().nonnegative(),
    promotionalPrice: z.number().nonnegative().optional(),
    isFree: z.boolean().optional(),
    discount: z.number().nonnegative(),
    // Manual discount is sent separately from promotion/automatic savings so the backend
    // can apply it after the promotion result. Always send 0 for the unused mode.
    manualDiscountAmount: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    lineTotal: z.number().nonnegative(),
    stockDispositionId: z.string().optional(),
    stockDispositionVersion: z.number().optional(),
});

export const cashSalesBaseSchema = z.object({
    // Totals
    companyDebtorId: z.string().optional(),
    representativeId: z.string().optional(),
    suspendedSaleId: z.string().optional(),
    totalPrice: z.number(),
    manualDiscount: z.number().optional(),
    approvedById: z.string().optional(),

    // Pricing matrix discount / price override (mirrors account sales)
    reason: z.string().optional(),
    securityRequestReference: z.string().optional(),

    // Payment Methods
    tenderTypeId: z.string(),
    tenderType: z.string(),
    tenderValue: z.number(),
    // For Cash
    changeDue: z.number().optional(),
    // For Card
    cardNumber: z.string().length(16, 'Card number must be exactly 16 digits').optional(),
    cardExpiryDate: z.string().optional(),
    // For Cheque
    reference: z.string().optional(),
    bankAccountNumber: z.string().optional(),

    // Discounts
    couponId: z.string().optional(),
    couponAmount: z.number().optional(),
    voucherId: z.string().optional(),
    voucherAmount: z.number().optional(),
    loyaltyCardNumber: z.string().optional(),
    loyaltyDiscountAmount: z.number().optional(),

    promotionId: z.string().optional(),
    promotionName: z.string().optional(),
    promotionDiscountAmount: z.number().optional(),

    // Cart Items
    items: z.array(cartItemSchema),

    // Customer
    customer: cashSaleCustomerSchema.optional(),
});

export const cashSalesCreateSchema = cashSalesBaseSchema
    .extend({
        timezone: z.string(),
        // Set when the cashier explicitly chose to sell below available stock. The
        // backend still validates it against ALLOW_CASH_SALE_NEGATIVE_STOCK and may
        // reject with the stock-block message when the company setting is off.
        negativeStockOverride: z.boolean().optional(),
        // Mandatory only when the POS_NEGATIVE_STOCK_OVERRIDE security action is
        // configured with requireReason: true.
        reason: z.string().optional(),
        // One entry per action the security policy required. The 428 tells us which
        // action code applies, and the granted token is resent under that same key.
        //   POS_DISCOUNT_OVERRIDE    pricing matrix flagged a discount / price override
        //   POS_NEGATIVE_STOCK_OVERRIDE  the sale would drive stock negative
        approvalTokens: z.record(z.string(), z.string()).optional(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CashSaleCreateSchema = z.infer<typeof cashSalesCreateSchema>;

export type MutateCashSaleResponse = {
    success: boolean;
    message: string;
    data: CashSalesDetails;
};

export async function createCashSales(data: CashSaleCreateSchema): Promise<MutateCashSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashSales.create.url,
            method: apiUrls.cashSales.create.method,
            data,
        })
    ).data;
}

export async function mtCreateCashSales(data: CashSaleCreateSchema): Promise<MutateCashSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashSales.mtCreate.url,
            method: apiUrls.cashSales.mtCreate.method,
            data,
        })
    ).data;
}

export async function updateCashSales(
    data: CashSaleCreateSchema & { posCashSaleOrderId: string },
): Promise<MutateCashSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashSales.update.url,
            method: apiUrls.cashSales.update.method,
            data,
        })
    ).data;
}

export const useCreateCashSales = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: CashSaleCreateSchema) => {
            if (isOnline) {
                return await createCashSales(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.cashSales), offlineData);
                return {
                    success: true,
                    data: data as CashSalesDetails,
                };
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashSales)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.cashSales)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
            if (variables.suspendedSaleId) {
                queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.suspendedSales)] });
            }
        },
        networkMode: 'always',
    });
};

// Sync Offline Cash Sales

export type MutateCashSalesSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedCashSalesSyncSchema {
    syncData: CashSaleCreateSchema[];
}

export async function syncCreatedCashSales(data: CreatedCashSalesSyncSchema): Promise<MutateCashSalesSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashSales.syncCreated.url,
            method: apiUrls.cashSales.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedCashSales = () => {
    return useMutation({
        mutationFn: syncCreatedCashSales,
    });
};
