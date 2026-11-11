import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey, getMutateIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { CompanyCreditor } from '@/types';
import { StockDetails } from '../company/stock-details';
import { SalesRepresentativeDetails } from '../sales-representatives';
import { addToDBArray } from '@/offline/db';
import { useAuthUser } from '@/stores/auth-user.store';

const validTimezones = moment.tz.names();

// --------------------------------------- GOODS RETURN ---------------------------------------

// Goods Return Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CartItemReponse {
    companyStockDetailId: string;
    companyTaxRateId?: string;
    quantity: number;
    freeStock?: number;
    unitPrice: number;
    lineTotal: number;
    discount: number;
}

export interface GoodsReturnCartItemBase {
    quantity: number;
    freeStock?: number;
    selectedSerialNumber?: string;
    discount: number;
    lineTotal: number;
    unitPrice: number;
    isNewRow?: boolean;

    taxRateId?: string;
    taxName?: string;
    taxPercent?: number;
    taxAmount?: number;
    taxableAmount?: number;
}

export type GoodsReturnCartItem = GoodsReturnCartItemBase & StockDetails;

export type GoodsReturnInvoiceCartItem = (GoodsReturnCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface GoodsReturnInvoiceType {
    goodsReturn: GoodsReturnCreateSchema;
    cartItems: GoodsReturnInvoiceCartItem;
    accountNumber: string;
}

export interface GoodsReturnsDetails extends GoodsReturnCreateSchema {
    id: string;
    pdfUrl?:string;
    CompanyCreditor: CompanyCreditor;
    debitNoteItems: GoodsReturnInvoiceCartItem;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
}

export interface GetGoodsReturnResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: GoodsReturnsDetails[] };
}

export async function getGoodsReturns(props: FilterProps): Promise<GetGoodsReturnResponse> {
    return (
        await axiosInstance({
            url: apiUrls.goodsReturn.list.url,
            method: apiUrls.goodsReturn.list.method,
            data: props,
        })
    ).data;
}

export const useGetGoodsReturns = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.goodsReturn), props],
        queryFn: async () => await getGoodsReturns(props),
    });
};

// Goods Return Offline Listing

export async function getGoodsReturnsOffline(online: boolean): Promise<GetGoodsReturnResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.goodsReturn.list.url,
            method: apiUrls.goodsReturn.list.method,
        });
        await setDBData(getIDBKey(apiUrls.goodsReturn), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetGoodsReturnResponse>(getIDBKey(apiUrls.goodsReturn));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetGoodsReturnsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.goodsReturn), online],
        queryFn: async () => await getGoodsReturnsOffline(online),
    });
};

// Goods Return Get By Id
export interface GetGoodsReturnByIdResponse {
    success: boolean;
    data: GoodsReturnsDetails;
}

export async function getGoodsReturnById(id: string): Promise<GetGoodsReturnByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.goodsReturn.get.url,
            method: apiUrls.goodsReturn.get.method,
            data: { id },
        })
    ).data;
}

export const useGetGoodsReturnById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.goodsReturn), id],
        queryFn: async () => await getGoodsReturnById(id),
    });
};

// Goods Return Create

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyTaxRateId: z.string().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    discount: z.number().optional(),
    lineTotal: z.number().nonnegative(),
});

export const goodsReturnBaseSchema = z.object({
    // Document Details
    companyCreditorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),

    // Goods Return Details
    debitNoteDate: z.string().min(1, 'Goods Return date is required'),
    debitNoteNumber: z.string().min(1, 'Goods Return number is required'),
    debitNoteMemo: z.string().optional(),
    debitNoteInclusive: z.enum(['Yes', 'No']),

    deliveryMethod: z.string().optional(),
    orderNumber: z.string().optional(),
    originalDocumentId: z.string().optional(),
    representativeId: z.string().optional(),
    deliveryNoteNumber: z.string().optional(),

    // Additional Details
    storeDepartmentId: z.string().optional(),
    warehouseId: z.string().optional(),
    documentGpPercentage: z.number().min(0, 'Document GP cannot be negative'),

    // Cart Details
    goodsTotal: z.number().min(0, 'Goods total cannot be negative'),
    discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
    taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
    totalQuantity: z.number().min(0, 'Total quantity cannot be negative'),
    items: z.array(cartItemSchema).min(1, 'At least one product must be selected'),
});

export const goodsReturnCreateSchema = goodsReturnBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type GoodsReturnCreateSchema = z.infer<typeof goodsReturnCreateSchema>;

export type MutateGoodsReturnResponse = {
    success: boolean;
    data: GoodsReturnsDetails;
};

export async function createGoodsReturn(data: GoodsReturnCreateSchema): Promise<MutateGoodsReturnResponse> {
    return (
        await axiosInstance({
            url: apiUrls.goodsReturn.create.url,
            method: apiUrls.goodsReturn.create.method,
            data,
        })
    ).data;
}

export const useCreateGoodsReturn = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: GoodsReturnCreateSchema) => {
            if (isOnline) {
                return await createGoodsReturn(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.goodsReturn), offlineData);
                return {
                    success: true,
                    data: data as GoodsReturnsDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.goodsReturn)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.goodsReturn)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Goods Returns

export type MutateGoodsReturnsSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedGoodsReturnsSyncSchema {
    syncData: GoodsReturnCreateSchema[];
}

export async function syncCreatedGoodsReturns(
    data: CreatedGoodsReturnsSyncSchema,
): Promise<MutateGoodsReturnsSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.goodsReturn.syncCreated.url,
            method: apiUrls.goodsReturn.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedGoodsReturns = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncCreatedGoodsReturns,
    });
};
