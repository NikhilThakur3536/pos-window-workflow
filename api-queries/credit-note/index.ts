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

// --------------------------------------- CREDIT NOTE ---------------------------------------

// Credit Notes Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyDebtorId?: string;
    isAllocationPending?: boolean;
};

export interface CartItemReponse {
    companyStockDetailId: string;
    companyStockPricingId: string;
    companyTaxRateId:string | null,
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discount: number;
    stockDispositionId?: string;
    stockDispositionVersion?: number;
}

export interface CreditNoteCartItemBase {
    quantity: number;
    selectedSerialNumber?: string;
    discount: number;
    lineTotal: number;
    unitPrice: number;
    isNewRow?: boolean;
    companyStockPricingId?: string;
    stockDispositionId?: string;
    stockDispositionVersion?: number;
    type: {
        name: string;
    };
    taxName?: string;
    taxPercent?: number;
    companyTaxRateId?: string|null;
}

export type CreditNoteCartItem = CreditNoteCartItemBase & StockDetails;

export type CreditNoteInvoiceCartItem = (CreditNoteCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface CreditNoteInvoiceType {
    creditNote: CreditNoteCreateSchema;
    cartItems: CreditNoteInvoiceCartItem;
    accountNumber: string;
}

export interface CreditNotesDetails extends CreditNoteCreateSchema {
    id: string;
    pdfUrl:string;
    CompanyDebtor: CompanyCreditor;
    creditNoteItems: CreditNoteInvoiceCartItem;
    unallocatedAmount: number;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
    creditNoteType?: 'STANDARD' | 'PRICE_MISMATCH';
}

export interface GetCreditNoteResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: CreditNotesDetails[] };
}

export async function getCreditNotes(props: FilterProps): Promise<GetCreditNoteResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotes.list.url,
            method: apiUrls.creditNotes.list.method,
            data: props,
        })
    ).data;
}

export const useGetCreditNotes = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotes), props],
        queryFn: async () => await getCreditNotes(props),
    });
};

// Credit Note Offline Listing

export async function getCreditNotesOffline(online: boolean): Promise<GetCreditNoteResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.creditNotes.list.url,
            method: apiUrls.creditNotes.list.method,
        });
        await setDBData(getIDBKey(apiUrls.creditNotes), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetCreditNoteResponse>(getIDBKey(apiUrls.creditNotes));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetCreditNotesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.creditNotes), online],
        queryFn: async () => await getCreditNotesOffline(online),
    });
};

// Credit Note Get By Id
export interface GetCreditNoteByIdResponse {
    success: boolean;
    data: CreditNotesDetails;
}

export async function getCreditNoteById(id: string): Promise<GetCreditNoteByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotes.get.url,
            method: apiUrls.creditNotes.get.method,
            data: { id },
        })
    ).data;
}

export const useGetCreditNoteById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditNotes), id],
        queryFn: async () => await getCreditNoteById(id),
    });
};

// Credit Note Create

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyStockPricingId: z.string().min(1, 'Pricing type is required'),
    companyTaxRateId:z.string().nullable().optional(),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    discount: z.number().optional(),
    lineTotal: z.number().nonnegative(),
    stockDispositionId: z.string().optional(),
    stockDispositionVersion: z.number().optional(),
});

export const creditNoteBaseSchema = z.object({
    // Document Details
    companyDebtorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),

    // Credit Note Details
    creditNoteDate: z.string().min(1, 'Credit Note date is required'),
    creditNoteNumber: z.string().min(1, 'Credit Note number is required'),
    creditNoteMemo: z.string().optional(),
    creditNoteInclusive: z.enum(['Yes', 'No']),

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

export const creditNoteCreateSchema = creditNoteBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CreditNoteCreateSchema = z.infer<typeof creditNoteCreateSchema>;

export type MutateCreditNoteResponse = {
    success: boolean;
    data: CreditNotesDetails;
};

export async function createCreditNote(data: CreditNoteCreateSchema): Promise<MutateCreditNoteResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotes.create.url,
            method: apiUrls.creditNotes.create.method,
            data,
        })
    ).data;
}

export const useCreateCreditNote = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async (data: CreditNoteCreateSchema) => {
            if (isOnline) {
                return await createCreditNote(data);
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.creditNotes), offlineData);
                return {
                    success: true,
                    data: data as CreditNotesDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Credit Notes

export type MutateCreditNotesSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedCreditNotesSyncSchema {
    syncData: CreditNoteCreateSchema[];
}

export async function syncCreatedCreditNotes(
    data: CreatedCreditNotesSyncSchema,
): Promise<MutateCreditNotesSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditNotes.syncCreated.url,
            method: apiUrls.creditNotes.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedCreditNotes = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncCreatedCreditNotes,
    });
};
