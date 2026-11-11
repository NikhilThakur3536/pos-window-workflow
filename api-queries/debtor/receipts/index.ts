import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { TenderDetails } from '@/api-queries/point-of-sale/tenders';
import { SalesRepresentativeDetails } from '@/api-queries/sales-representatives';

const validTimezones = moment.tz.names();

// --------------------------------------- DEBTOR RECEIPTS ---------------------------------------

// Debtor Receipts Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyDebtorId?: string;
    isAllocationPending?: boolean;
};

export interface DiscountType {
    Voucher: TenderDetails;
    Coupon: TenderDetails;
}

export interface DebtorReceiptDetails extends DebtorReceiptCreateSchema, DiscountType {
    id: string;
    CompanyDebtor: CompanyCreditor;
    PosTenderType: TenderDetails;
    representativeId?: string;
    unallocatedAmount: number;
    SalesRepresentative?: SalesRepresentativeDetails;
    notSynced?: boolean;
    invoiceDate: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetDebtorReceiptResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorReceiptDetails[];
    };
}

export async function getDebtorReceipts(props: FilterProps): Promise<GetDebtorReceiptResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceipts.list.url,
            method: apiUrls.debtorReceipts.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorReceipts = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceipts), props],
        queryFn: async () => await getDebtorReceipts(props),
    });
};

// Debtor Receipt Get By Id
export interface GetDebtorReceiptByIdResponse {
    success: boolean;
    data: DebtorReceiptDetails;
}

export async function getDebtorReceiptById(id: string): Promise<GetDebtorReceiptByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceipts.get.url,
            method: apiUrls.debtorReceipts.get.method,
        })
    ).data;
}

export const useGetDebtorReceiptById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceipts), id],
        queryFn: async () => await getDebtorReceiptById(id),
    });
};

// Debtor Receipt Create

export const debtorReceiptDetailsSchema = z.object({
    companyDebtorId: z.string().min(1, 'Company Debtor ID is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    receiptDate: z.string().min(1, 'Receipt Date is required'),
    referenceNumber: z.string().min(1, 'Reference Number is required'),
    secondNarrative: z.string().optional(),
    salesRepresentativeId: z.string().optional(),
    amount: z.number().min(1, 'Amount is required'),
    discount: z.number().min(0).optional(),
    actualCreditOnAccount: z.number().min(1, 'Actual Credit on Account is required'),
    discountTaxTypeId: z.string().optional(),
});

export const debtorReceiptTenderPaymentSchema = z.object({
    tenderTypeId: z.string().min(1, 'Tender type is required'),
    tenderType: z.string().min(1, 'Tender type is required'),
    amount: z.number().min(0),
});

export type DebtorReceiptTenderPayment = z.infer<typeof debtorReceiptTenderPaymentSchema>;

export const debtorReceiptPaymentSchema = z.object({
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
    manualDiscount: z.number().optional(),
    couponId: z.string().optional(),
    couponAmount: z.number().optional(),
    voucherId: z.string().optional(),
    voucherAmount: z.number().optional(),
    payments: z.array(debtorReceiptTenderPaymentSchema).optional(),
});

export const debtorReceiptCreateSchema = debtorReceiptDetailsSchema.merge(debtorReceiptPaymentSchema).merge(
    z.object({
        timezone: z.string().refine((tz) => validTimezones.includes(tz), {
            message: 'Invalid timezone',
        }),
    }),
);

export type DebtorReceiptDetailsSchema = z.infer<typeof debtorReceiptDetailsSchema>;
export type DebtorReceiptPaymentSchema = z.infer<typeof debtorReceiptPaymentSchema>;
export type DebtorReceiptCreateSchema = z.infer<typeof debtorReceiptCreateSchema>;

// The backend totals only the CASH portion of a receipt and compares it against
// the active till's debtorReceiptCashThreshold. When it exceeds the threshold the
// receipt is routed to Cash Office automatically and the handover is returned here.
export interface DebtorReceiptCashOfficeHandover {
    id: string;
    cashOfficeSessionId?: string;
    cashOfficeId?: string;
    cashOfficeName?: string;
    handoverMode?: 'CASH_OFFICE_HANDOVER' | string;
    cashAmount?: number;
    thresholdAmount?: number;
    status?: string;
    clientDocumentId?: string;
    referenceNumber?: string;
    createdAt?: string;
}

export type MutateDebtorReceiptResponse = {
    success: boolean;
    message?: string;
    data?: {
        cashOfficeHandover?: DebtorReceiptCashOfficeHandover | null;
        handoverMode?: string;
        cashAmount?: number;
    } | null;
};

export async function createDebtorReceipt(data: DebtorReceiptCreateSchema): Promise<MutateDebtorReceiptResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceipts.create.url,
            method: apiUrls.debtorReceipts.create.method,
            data,
        })
    ).data;
}

export const useCreateDebtorReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorReceipt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
        },
    });
};

// Debtor Receipt Update
export const debtorReceiptUpdateSchema = debtorReceiptDetailsSchema.merge(debtorReceiptPaymentSchema).merge(
    z.object({
        id: z.string(),
    }),
);

export type DebtorReceiptUpdateSchema = z.infer<typeof debtorReceiptUpdateSchema>;

export async function updateDebtorReceipt(data: DebtorReceiptUpdateSchema): Promise<MutateDebtorReceiptResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceipts.update.url,
            method: apiUrls.debtorReceipts.update.method,
            data,
        })
    ).data;
}

export const useUpdateDebtorReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorReceipt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
        },
    });
};

// Debtor Receipt Delete

export async function removeDebtorReceipt(receiptId: string): Promise<MutateDebtorReceiptResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceipts.delete.url,
            method: apiUrls.debtorReceipts.delete.method,
            data: { receiptId },
        })
    ).data;
}

export const useRemoveDebtorReceipt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeDebtorReceipt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
        },
    });
};
