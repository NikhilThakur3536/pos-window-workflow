import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '@/api-queries';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { AccountSalesDetails } from '@/api-queries/point-of-sale/account-sales/account-sales';
import { CreditNotesDetails } from '@/api-queries/credit-note';
import { DebtorReceiptDetails } from '../receipts';
import { UserDetails } from '@/api-queries/user';

const validTimezones = moment.tz.names();

// --------------------------------------- DEBTOR ALLOCATIONS ---------------------------------------

// Debtor Allocations Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyDebtorId?: string;
};

export interface DebtorAllocationDetails {
    id: string;
    DebtorReceipt: DebtorReceiptDetails | null;
    CreditNote: CreditNotesDetails | null;
    DebtorInvoicingOrder: AccountSalesDetails | null;
    AllocatedByUser: UserDetails | null;
    allocatedAmount: number;
    allocationDate: string;
    allocatedBy: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    // REVERSAL rows are audit history only - they must never be rendered or
    // actioned as a normal active allocation.
    allocationType?: 'SINGLE' | 'GROUP' | 'REVERSAL';
}

export interface GetDebtorAllocationResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorAllocationDetails[];
    };
}

export async function getDebtorAllocations(props: FilterProps): Promise<GetDebtorAllocationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.list.url,
            method: apiUrls.debtorReceiptAllocations.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorAllocations = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocations), props],
        queryFn: async () => await getDebtorAllocations(props),
    });
};

// Debtor Allocation Get By Id
export interface GetDebtorAllocationByIdResponse {
    success: boolean;
    data: DebtorAllocationDetails;
}

export async function getDebtorAllocationById(id: string): Promise<GetDebtorAllocationByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.get.url,
            method: apiUrls.debtorReceiptAllocations.get.method,
        })
    ).data;
}

export const useGetDebtorAllocationById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocations), id],
        queryFn: async () => await getDebtorAllocationById(id),
    });
};

// Debtor Allocation Create

export const allocationTypeEnum = z.enum(['CREDIT_NOTE', 'DEBTOR_RECEIPT']);
export type AllocationTypesType = z.infer<typeof allocationTypeEnum>;

export const debtorAllocationBaseSchema = z.object({
    companyDebtorId: z.string().min(1, 'Debtor is required'),
    allocationType: allocationTypeEnum,
    debtorInvoicingOrderId: z.string().min(1, 'Invoice is required'),
    debtorReceiptId: z.string().optional(),
    creditNoteId: z.string().optional(),
    allocatedAmount: z.number().min(1, 'Allocated Amount is required'),
    allocationDate: z.string().min(1, 'Allocation Date is required'),
});

export const debtorAllocationCreateSchema = debtorAllocationBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    })
    .refine((data) => data.allocationType !== 'CREDIT_NOTE' || !!data.creditNoteId, {
        message: 'Credit Note ID is required when Allocation Type is CREDIT_NOTE',
        path: ['creditNoteId'],
    })
    .refine((data) => data.allocationType !== 'DEBTOR_RECEIPT' || !!data.debtorReceiptId, {
        message: 'Debtor Invoicing Order ID is required when Allocation Type is DEBTOR_RECEIPT',
        path: ['debtorReceiptId'],
    });

export type DebtorAllocationCreateSchema = z.infer<typeof debtorAllocationCreateSchema>;

export type MutateDebtorAllocationResponse = {
    success: boolean;
};

export async function createDebtorAllocation(
    data: DebtorAllocationCreateSchema,
): Promise<MutateDebtorAllocationResponse> {
    const { allocationType, companyDebtorId, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.create.url,
            method: apiUrls.debtorReceiptAllocations.create.method,
            data: payload,
        })
    ).data;
}

export const useCreateDebtorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorAllocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceiptAllocations)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
        },
    });
};

// Debtor Allocation Update

export const debtorAllocationUpdateSchema = debtorAllocationBaseSchema.extend({ id: z.string() });

export type DebtorAllocationUpdateSchema = z.infer<typeof debtorAllocationUpdateSchema>;

export async function updateDebtorAllocation(
    data: DebtorAllocationUpdateSchema,
): Promise<MutateDebtorAllocationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.update.url,
            method: apiUrls.debtorReceiptAllocations.update.method,
            data,
        })
    ).data;
}

export const useUpdateDebtorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorAllocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceiptAllocations)] });
        },
    });
};

// Debtor Allocation Delete

export async function removeDebtorAllocation(allocationId: string): Promise<MutateDebtorAllocationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.delete.url,
            method: apiUrls.debtorReceiptAllocations.delete.method,
            data: { allocationId },
        })
    ).data;
}

export const useRemoveDebtorAllocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeDebtorAllocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceiptAllocations)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditNotes)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorReceipts)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
        },
    });
};

// Debtor Allocation Get By Id

export interface DebtorAllocationSummaryDetails {
    amountLastPayment: number;
    current: number;
    dateLastPayment?: string;
    ninetyDays: number;
    oneEightyDays: number;
    oneFiftyDays: number;
    oneTwentyDays: number;
    paymentsUnallocated: number;
    sixtyDays: number;
    thirtyDays: number;
    totalBalance: number;
    settlementDiscountAmount?: number;
    settlementDiscountPercentage?: number;
    lastReceiptNumber: string;
    receiptDate: string;
}

export interface GetDebtorAllcoationSummary {
    success: boolean;
    data: DebtorAllocationSummaryDetails;
}

export async function getDebtorAllocationSummary(companyDebtorId: string): Promise<GetDebtorAllcoationSummary> {
    return (
        await axiosInstance({
            url: apiUrls.debtorReceiptAllocations.summary.url,
            method: apiUrls.debtorReceiptAllocations.summary.method,
            data: { companyDebtorId },
        })
    ).data;
}

export const useGetDebtorAllocationSummary = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorReceiptAllocations), id],
        queryFn: async () => await getDebtorAllocationSummary(id),
        enabled: !!id,
    });
};
