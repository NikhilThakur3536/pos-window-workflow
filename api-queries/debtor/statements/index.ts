import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '../..';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';

// --------------------------------------- DEBTOR STATEMENTS ---------------------------------------

export type StatementFilterProps = {
    companyDebtorId?: string;
    dateFrom?: string;
    dateTo?: string;
    asOfDate?: string;
    includeCashSales?: boolean;
};

export interface StatementTenderBreakdown {
    tenderTypeId: string;
    tenderType: string;
    amount: number;
    referenceNumber: string | null;
    terminalId: string;
}

export interface StatementTransactionRow {
    id?: string;
    sourceDocumentId?: string;
    sourceType?: string;
    transactionDate: string;
    dueDate: string | null;
    reference: string;
    type: 'IN' | 'PM' | 'CN' | 'DP' | 'RF' | 'CS' | string;
    description: string;
    debit: number;
    credit: number;
    amountDue: number;
    balance: number;
    tenderBreakdown?: StatementTenderBreakdown[];
    companyId?: string;
    billingCompanyId?: string;
    sortOrder?: number;
}

export interface AgeBuckets {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    days120: number;
    days150: number;
    days180: number;
}

export interface StatementPeriod {
    dateFrom?: string;
    dateTo?: string;
}

export interface StatementTotals {
    periodDebits?: number;
    periodCredits?: number;
    totalOutstandingInvoices?: number;
    unallocatedCredits?: number;
    totalDue?: number;
}

export interface StatementDebtor {
    id?: string;
    accountNumber?: string | null;
    name?: string | null;
    tradingAs?: string | null;
    taxNumber?: string | null;
    address?: string[];
    terms?: string | null;
    paymentMode?: 'COD' | 'CREDIT' | string;
    creditTermDays?: number;
    creditLimit?: number;
    postalAddress?: string;
}

export interface StatementCompany {
    id?: string;
    companyName?: string;
    name?: string;
    companyRegistrationNumber?: string;
    taxNumber?: string;
    emailAddress?: string;
    telephoneNumberOne?: string;
    postalAddress?: string;
}

export interface StatementData {
    statementDate?: string;
    period?: StatementPeriod;
    debtor?: StatementDebtor | null;
    company?: StatementCompany;
    issuerCompany?: StatementCompany;
    billingCompany?: StatementCompany;
    broughtForward?: number;
    totalDue?: number;
    rows?: StatementTransactionRow[];
    ageing?: AgeBuckets;
    totals?: StatementTotals;
    payments?: StatementTenderBreakdown[];
}

export interface DebtorStatementResponse {
    success: boolean;
    message: string;
    data: StatementData;
}

// Statement (JSON)

export async function getDebtorStatement(props: StatementFilterProps): Promise<DebtorStatementResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.statement.url,
            method: apiUrls.debtorStatements.statement.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorStatement = (props: StatementFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.statement), props],
        queryFn: async () => await getDebtorStatement(props),
    });
};

// Statement (PDF Blob — isPdf: true streams PDF directly)

export async function getDebtorStatementPdfBlob(
    props: StatementFilterProps & { download?: boolean },
): Promise<Blob> {
    const response = await axiosInstance({
        url: apiUrls.debtorStatements.statement.url,
        method: apiUrls.debtorStatements.statement.method,
        data: { ...props, isPdf: true, download: props.download ?? false },
        responseType: 'blob',
    });
    return response.data;
}

// Statement Transactions / Ledger

export interface StatementTransactionsFilter extends StatementFilterProps {
    limit?: number;
    offset?: number;
}

export interface GetDebtorStatementTransactionsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StatementTransactionRow[];
    };
}

export async function getDebtorStatementTransactions(
    props: StatementTransactionsFilter,
): Promise<GetDebtorStatementTransactionsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.transactions.url,
            method: apiUrls.debtorStatements.transactions.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorStatementTransactions = (props: StatementTransactionsFilter) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.transactions), props],
        queryFn: async () => await getDebtorStatementTransactions(props),
    });
};

// Age Analysis

export interface AgeAnalysisData extends AgeBuckets {
    outstandingInvoiceAmount: number;
    unallocatedCredits: number;
    totalDue: number;
}

export interface GetDebtorAgeAnalysisResponse {
    success: boolean;
    message: string;
    data: AgeAnalysisData;
}

export async function getDebtorAgeAnalysis(props: StatementFilterProps): Promise<GetDebtorAgeAnalysisResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.ageAnalysis.url,
            method: apiUrls.debtorStatements.ageAnalysis.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorAgeAnalysis = (props: StatementFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.ageAnalysis), props],
        queryFn: async () => await getDebtorAgeAnalysis(props),
    });
};

// Account Summary

export interface StatementAccountSummary extends StatementData {
    debtor?: StatementDebtor | null;
    paymentMode?: 'COD' | 'CREDIT' | string;
    creditTermDays?: number;
    creditLimit?: number;
    billingCompany?: StatementCompany;
    issuerCompany?: StatementCompany;
    broughtForward?: number;
    ageing?: AgeBuckets;
    totalDue?: number;
    outstandingInvoiceAmount?: number;
    unallocatedCredits?: number;
}

export interface GetDebtorAccountSummaryResponse {
    success: boolean;
    message: string;
    data: StatementAccountSummary;
}

export async function getDebtorAccountSummary(props: StatementFilterProps): Promise<GetDebtorAccountSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.accountSummary.url,
            method: apiUrls.debtorStatements.accountSummary.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorAccountSummary = (props: StatementFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.accountSummary), props],
        queryFn: async () => await getDebtorAccountSummary(props),
    });
};

// --------------------------------------- DEBTOR STATEMENT ADJUSTMENTS ---------------------------------------

export const DEBTOR_ADJUSTMENT_TYPES = ['DEBIT', 'CREDIT'] as const;
export type DebtorAdjustmentType = (typeof DEBTOR_ADJUSTMENT_TYPES)[number];

export interface DebtorAdjustment {
    id: string;
    companyDebtorId: string;
    referenceNumber: string;
    adjustmentDate: string;
    adjustmentType: DebtorAdjustmentType;
    amount: number;
    description?: string;
    timezone?: string;
    CompanyDebtor?: CompanyCreditor;
    createdAt: string;
    updatedAt: string;
}

export interface GetDebtorAdjustmentsResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DebtorAdjustment[];
    };
}

export interface GetDebtorAdjustmentResponse {
    success: boolean;
    message: string;
    data: DebtorAdjustment;
}

export type AdjustmentFilterProps = {
    companyDebtorId?: string;
    adjustmentType?: DebtorAdjustmentType | '';
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
};

export const debtorAdjustmentCreateSchema = z.object({
    companyDebtorId: z.string().optional(),
    referenceNumber: z.string().min(1, 'Reference number is required'),
    adjustmentDate: z.string().min(1, 'Adjustment date is required'),
    adjustmentType: z.enum(DEBTOR_ADJUSTMENT_TYPES),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    description: z.string().optional(),
    timezone: z.string(),
});

export type DebtorAdjustmentCreateSchema = z.infer<typeof debtorAdjustmentCreateSchema>;

export const debtorAdjustmentUpdateSchema = debtorAdjustmentCreateSchema.extend({
    id: z.string().min(1, 'Adjustment id is required'),
});

export type DebtorAdjustmentUpdateSchema = z.infer<typeof debtorAdjustmentUpdateSchema>;

// List

export async function getDebtorAdjustments(props: AdjustmentFilterProps): Promise<GetDebtorAdjustmentsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.adjustmentAll.url,
            method: apiUrls.debtorStatements.adjustmentAll.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorAdjustments = (props: AdjustmentFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentAll), props],
        queryFn: async () => await getDebtorAdjustments(props),
    });
};

// Get by id

export async function getDebtorAdjustment(id: string): Promise<GetDebtorAdjustmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.adjustmentGet.url,
            method: apiUrls.debtorStatements.adjustmentGet.method,
            data: { id },
        })
    ).data;
}

export const useGetDebtorAdjustment = (id: string, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentGet), id],
        queryFn: async () => await getDebtorAdjustment(id),
        enabled: !!id && enabled,
    });
};

// Create

export type MutateDebtorAdjustmentResponse = {
    success: boolean;
    message: string;
    data?: DebtorAdjustment;
};

export async function createDebtorAdjustment(
    data: DebtorAdjustmentCreateSchema,
): Promise<MutateDebtorAdjustmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.adjustmentCreate.url,
            method: apiUrls.debtorStatements.adjustmentCreate.method,
            data,
        })
    ).data;
}

export const useCreateDebtorAdjustment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentAll)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.statement)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.transactions)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.ageAnalysis)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.accountSummary)] });
        },
    });
};

// Update

export async function updateDebtorAdjustment(data: DebtorAdjustmentUpdateSchema): Promise<MutateDebtorAdjustmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.adjustmentUpdate.url,
            method: apiUrls.debtorStatements.adjustmentUpdate.method,
            data,
        })
    ).data;
}

export const useUpdateDebtorAdjustment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentAll)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentGet)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.statement)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.transactions)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.ageAnalysis)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.accountSummary)] });
        },
    });
};

// Delete

export async function deleteDebtorAdjustment(id: string): Promise<MutateDebtorAdjustmentResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtorStatements.adjustmentDelete.url,
            method: apiUrls.debtorStatements.adjustmentDelete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteDebtorAdjustment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteDebtorAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.adjustmentAll)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.statement)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.transactions)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.ageAnalysis)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtorStatements.accountSummary)] });
        },
    });
};