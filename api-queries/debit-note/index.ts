import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance, axiosNetworkInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey, getIDBKey, getMutateIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { CompanyCreditor } from '@/types';
import { StockDetails } from '../company/stock-details';
import { SalesRepresentativeDetails } from '../sales-representatives';

const validTimezones = moment.tz.names();

// --------------------------------------- DEBIT NOTE ---------------------------------------

// Debit Note Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface CartItemReponse {
    companyStockDetailId: string;
    quantity: number;
    freeStock?: number;
    unitPrice: number;
    lineTotal: number;
    discount: number;
}

export interface DebitNoteCartItemBase {
    quantity: number;
    freeStock?: number;
    selectedSerialNumber?: string;
    discount: number;
    lineTotal: number;
    unitPrice: number;
    isNewRow?: boolean;
    taxName?:string;
    taxPercent?:string;
}

export type DebitNoteCartItem = DebitNoteCartItemBase & StockDetails;

export type DebitNoteInvoiceCartItem = (DebitNoteCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface DebitNoteInvoiceType {
    debitNote: DebitNoteCreateSchema;
    cartItems: DebitNoteInvoiceCartItem;
    accountNumber: string;
}

export interface DebitNotesDetails extends DebitNoteCreateSchema {
    id: string;
    pdfUrl?:string;
    CompanyCreditor: CompanyCreditor;
    debitNoteItems: DebitNoteInvoiceCartItem;
    representativeId?: string;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
}

export interface GetDebitNoteResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: DebitNotesDetails[] };
}

export async function getDebitNotes(props: FilterProps): Promise<GetDebitNoteResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debitNote.list.url,
            method: apiUrls.debitNote.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebitNotes = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debitNote), props],
        queryFn: async () => await getDebitNotes(props),
    });
};

// Debit Note Offline Listing

export async function getDebitNotesOffline(online: boolean): Promise<GetDebitNoteResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.debitNote.list.url,
            method: apiUrls.debitNote.list.method,
        });
        await setDBData(getIDBKey(apiUrls.debitNote), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetDebitNoteResponse>(getIDBKey(apiUrls.debitNote));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetDebitNotesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.debitNote), online],
        queryFn: async () => await getDebitNotesOffline(online),
    });
};

// Debit Note Get By Id
export interface GetDebitNoteByIdResponse {
    success: boolean;
    data: DebitNotesDetails;
}

export async function getDebitNoteById(id: string): Promise<GetDebitNoteByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debitNote.get.url,
            method: apiUrls.debitNote.get.method,
            data: { id },
        })
    ).data;
}

export const useGetDebitNoteById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debitNote), id],
        queryFn: async () => await getDebitNoteById(id),
    });
};

// Debit Note Create

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().nonnegative(),
    discount: z.number().optional(),
    lineTotal: z.number().nonnegative(),
});

export const debitNoteBaseSchema = z.object({
    // Document Details
    companyCreditorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),

    // Debit Note Details
    debitNoteDate: z.string().min(1, 'Debit Note date is required'),
    debitNoteNumber: z.string().min(1, 'Debit Note number is required'),
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

export const debitNoteCreateSchema = debitNoteBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type DebitNoteCreateSchema = z.infer<typeof debitNoteCreateSchema>;
