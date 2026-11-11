import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance, axiosNetworkInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey, getMutateIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { StockDetails } from '@/api-queries/company/stock-details';
import { TenderDetails } from '../tenders';
import { CompanyCreditor } from '@/types';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';
import { addToDBArray } from '@/offline/db';
import { useAuthUser } from '@/stores/auth-user.store';
import { CartItemPricingType } from '..';

const validTimezones = moment.tz.names();

// --------------------------------------- CASH REFUND ---------------------------------------

// Cash Refund Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    companyDebtorId?: string;
};

export interface CashRefundsDetails extends CashRefundCreateSchema {
    id: string;
    timezone: string;
    createdAt: string;
    updatedAt?: string;
    PosCashRefundItems: CashRefundInvoiceCartItem;
    PosTenderType: TenderDetails;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    notSynced?: boolean;
    invoiceDate: string;
}

// Invoice

export interface CashRefundCartItemBase {
    companyStockPricingId: string;
    posCashSaleOrderItemId?: string;
    quantity: number;
    selectedSerialNumber?: string;
    unitPrice: number;
    lineTotal: number;
    comment?: string;
    lineComment?: string;
    isRestocked: boolean;
    selectedPricing: CartItemPricingType;
    taxName?: string;
    taxPercent?: number;
    companyTaxRateId?: string |null;
}

export type CashRefundCartItem = CashRefundCartItemBase & StockDetails;

export type CashRefundInvoiceCartItem = (CashRefundCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface CashRefundInvoiceType {
    cashRefund: CashRefundCreateSchema;
    cartItems: CashRefundInvoiceCartItem;
    paymentMethod: TenderDetails;
    invoiceDate: string;
}

export interface GetCashRefundResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: CashRefundsDetails[] };
}

export async function getCashRefunds(props: FilterProps): Promise<GetCashRefundResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'cashRefund', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.cashRefund.list.url,
                method: apiUrls.cashRefund.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetCashRefunds = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashRefund), props],
        queryFn: async () => await getCashRefunds(props),
    });
};

// Cash Refund Offline Listing

export async function getCashRefundsOffline(online: boolean): Promise<GetCashRefundResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.cashRefund.list.url,
            method: apiUrls.cashRefund.list.method,
        });
        await setDBData(getIDBKey(apiUrls.cashRefund), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetCashRefundResponse>(getIDBKey(apiUrls.cashRefund));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetCashRefundsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.cashRefund), online],
        queryFn: async () => await getCashRefundsOffline(online),
    });
};

// Cash Refund Get By Id

export interface GetCashRefundByIdResponse {
    success: boolean;
    data: CashRefundsDetails;
}

export async function getCashRefundById(id: string): Promise<GetCashRefundByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashRefund.get.url,
            method: apiUrls.cashRefund.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCashRefundById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.cashRefund), id],
        queryFn: async () => await getCashRefundById(id),
    });
};

// Cash Refund Create

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

export type CashRefundCustomerSchema = z.infer<typeof cashSaleCustomerSchema>;

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    posCashSaleOrderItemId: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    lineTotal: z.number().nonnegative(),
});

export const cashRefundBaseSchema = z.object({
    // Totals
    representativeId: z.string().optional(),
    posCashSaleOrderId: z.string().optional(),

    // Payment Methods
    // tenderTypeId: z.string(),
    // tenderType: z.string(),
    // tenderValue: z.number(),
    totalPrice:z.number().optional(),
    refundReason: z.string().min(1, 'RETURN REASON IS REQUIRED'),

    // For Cash
    changeDue: z.number().optional(),
    // For Card
    cardNumber: z.string().length(16, 'Card number must be exactly 16 digits').optional(),
    cardExpiryDate: z.string().optional(),
    // For Cheque
    reference: z.string().optional(),
    bankAccountNumber: z.string().optional(),

    // Cart Items
    items: z.array(cartItemSchema),

    // Customer
    customer: cashSaleCustomerSchema.optional(),
});

export const cashRefundCreateSchema = cashRefundBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CashRefundCreateSchema = z.infer<typeof cashRefundCreateSchema>;

export type MutateCashRefundResponse = {
    success: boolean;
    message: string;
    data: CashRefundsDetails;
};

export async function createCashRefunds(data: CashRefundCreateSchema): Promise<MutateCashRefundResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashRefund.create.url,
            method: apiUrls.cashRefund.create.method,
            data,
        })
    ).data;
}

export const useCreateCashRefunds = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: CashRefundCreateSchema) => {
            if (isOnline) {
                return await createCashRefunds(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.cashRefund), offlineData);
                return {
                    success: true,
                    data: data as CashRefundsDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.cashRefund)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.cashRefund)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.cashSales)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Cash Refund

export type MutateCashRefundsSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedCashRefundsSyncSchema {
    syncData: CashRefundCreateSchema[];
}

export async function syncCreatedCashRefunds(
    data: CreatedCashRefundsSyncSchema,
): Promise<MutateCashRefundsSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.cashRefund.syncCreated.url,
            method: apiUrls.cashRefund.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedCashRefunds = () => {
    return useMutation({
        mutationFn: syncCreatedCashRefunds,
    });
};
