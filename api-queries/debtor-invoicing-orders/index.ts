import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance, axiosDownloadCSV } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import {
    AccountSaleCreateSchema,
    AccountSalesDetails,
} from '@/api-queries/point-of-sale/account-sales/account-sales';

// --------------------------------------- DEBTOR INVOICING ORDERS ---------------------------------------
//
// Account Sale / Debtor Invoicing Order quantity-recommendation and protected create/update flow.
//
// Conventions:
//   - companyDebtorId identifies the store/retail account.
//   - Quantity recommendations are server-calculated; the FE must display the returned audit
//     fields and must not rely on client-calculated values.
//   - Discounts / quantity overrides are protected (fingerprint / password approval, rule 3007).
//     On 428 APPROVAL_REQUIRED the caller approves once and re-submits with X-Approval-Token.
//     When quantity AND discount overrides are present together, both tokens are sent in the
//     body as approvalTokens: { ACCOUNT_SALE_QUANTITY_OVERRIDE, ACCOUNT_SALE_DISCOUNT_OVERRIDE }.
//   - Multi-store variants (mt/create, mt/update) hit the mt endpoints.
//   - Company-Id is optional everywhere; the backend falls back to the authenticated user's company.

export const ACCOUNT_SALE_APPROVAL_TYPES = [
    'ACCOUNT_SALE_QUANTITY_OVERRIDE',
    'ACCOUNT_SALE_DISCOUNT_OVERRIDE',
] as const;
export type AccountSaleApprovalType = (typeof ACCOUNT_SALE_APPROVAL_TYPES)[number];
export type AccountSaleApprovalTokens = Partial<Record<AccountSaleApprovalType, string>>;

// Account Sale / Store settings (rule 3006)
export interface CompanyDebtorAccountSaleSettings {
    accountSaleQuantityControlEnabled?: boolean;
    accountSaleSalesLookbackDays?: number;
    accountSaleTargetStockDays?: number;
    accountSaleSeasonalUpliftPercent?: number;
    accountSaleSeasonStartMonth?: number;
    accountSaleSeasonEndMonth?: number;
}

// --------------------------------------- Quantity recommendation ---------------------------------------

export interface QuantityRecommendationLine {
    companyStockDetailId: string;
    quantity: number;
    description?: string;
    itemCode?: string;
}

export interface QuantityRecommendationRequest {
    companyDebtorId: string;
    items: QuantityRecommendationLine[];
}

export interface QuantityRecommendationItem extends QuantityRecommendationLine {
    companyStockDetailId: string;
    quantity: number;
    description?: string;
    itemCode?: string;
    companyStockPricingId?: string;
    companyStockPricingTypeId?: string;
    companyTaxRateId?: string;
    unitPrice?: number;
    discount?: number;
    lineTotal?: number;
    accountSaleCurrentInventory?: number;
    accountSaleDailySalesRate?: number;
    accountSaleWeeklySalesRate?: number;
    accountSaleMonthlySalesRate?: number;
    accountSaleTargetStockDays?: number;
    accountSaleSeasonalUpliftPercent?: number;
    accountSaleRecommendedQuantity?: number;
    accountSaleRequestedQuantity?: number;
    accountSaleQuantityOverride?: boolean;
}

export interface GetQuantityRecommendationResponse {
    success: boolean;
    message: string;
    data?: QuantityRecommendationItem[] | { count?: number; rows?: QuantityRecommendationItem[] } | null;
}

export async function getQuantityRecommendation(payload: QuantityRecommendationRequest) {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.quantityRecommendation.url,
            method: apiUrls.accountSales.quantityRecommendation.method,
            data: payload,
        })
    ).data;
}

export const useQuantityRecommendation = () => {
    return useMutation({
        mutationFn: getQuantityRecommendation,
    });
};

// --------------------------------------- Protected create / update ---------------------------------------

export interface CreateDebtorInvoicingOrderInput extends AccountSaleCreateSchema {
    approvalToken?: string;
    approvalTokens?: AccountSaleApprovalTokens;
}

export interface UpdateDebtorInvoicingOrderInput {
    id: string;
    saleOrderId?: string;
    [key: string]: unknown;
    approvalToken?: string;
    approvalTokens?: AccountSaleApprovalTokens;
}

export type MutateDebtorInvoicingOrderResponse = {
    success: boolean;
    message?: string;
    data?: AccountSalesDetails | null;
};

async function submitDebtorInvoicingOrder(
    url: string,
    method: string,
    data: CreateDebtorInvoicingOrderInput | UpdateDebtorInvoicingOrderInput,
): Promise<MutateDebtorInvoicingOrderResponse> {
    const { approvalToken, approvalTokens, ...payload } = data as Record<string, unknown>;
    const approvalTokenStr = typeof approvalToken === 'string' && approvalToken ? approvalToken : undefined;
    const approvalTokensObj: AccountSaleApprovalTokens | undefined =
        approvalTokens && typeof approvalTokens === 'object'
            ? (approvalTokens as AccountSaleApprovalTokens)
            : undefined;
    return (
        await axiosInstance({
            url,
            method,
            data: {
                ...payload,
                ...(approvalTokensObj && Object.keys(approvalTokensObj).length
                    ? { approvalTokens: approvalTokensObj }
                    : {}),
            },
            ...(approvalTokenStr ? { headers: { 'X-Approval-Token': approvalTokenStr } } : {}),
        })
    ).data;
}

export async function createDebtorInvoicingOrder(data: CreateDebtorInvoicingOrderInput) {
    return submitDebtorInvoicingOrder(
        apiUrls.accountSales.create.url,
        apiUrls.accountSales.create.method,
        data,
    );
}

export async function updateDebtorInvoicingOrder(data: UpdateDebtorInvoicingOrderInput) {
    return submitDebtorInvoicingOrder(
        apiUrls.accountSales.update.url,
        apiUrls.accountSales.update.method,
        data,
    );
}

export async function createDebtorInvoicingOrderMt(data: CreateDebtorInvoicingOrderInput) {
    return submitDebtorInvoicingOrder(
        apiUrls.accountSales.mtCreate.url,
        apiUrls.accountSales.mtCreate.method,
        data,
    );
}

export async function updateDebtorInvoicingOrderMt(data: UpdateDebtorInvoicingOrderInput) {
    return submitDebtorInvoicingOrder(
        apiUrls.accountSales.mtUpdate.url,
        apiUrls.accountSales.mtUpdate.method,
        data,
    );
}

export const useCreateDebtorInvoicingOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorInvoicingOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

export const useUpdateDebtorInvoicingOrder = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorInvoicingOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

export const useCreateDebtorInvoicingOrderMt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorInvoicingOrderMt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

export const useUpdateDebtorInvoicingOrderMt = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorInvoicingOrderMt,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.debtors)] });
        },
    });
};

// --------------------------------------- List / Get ---------------------------------------

export type DebtorInvoicingOrderFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyDebtorId?: string;
    isCsv?: boolean;
    csvLabel?: string;
};

export interface GetDebtorInvoicingOrderListResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: AccountSalesDetails[] };
}

export async function getDebtorInvoicingOrders(props: DebtorInvoicingOrderFilterProps) {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'accountSales', label: props?.csvLabel });
        return;
    }
    return (
        await axiosInstance({
            url: apiUrls.accountSales.list.url,
            method: apiUrls.accountSales.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorInvoicingOrders = (props: DebtorInvoicingOrderFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), props],
        queryFn: async () => await getDebtorInvoicingOrders(props),
    });
};

export async function getDebtorInvoicingOrderById(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.get.url,
            method: apiUrls.accountSales.get.method,
            data: { id },
        })
    ).data;
}

export const useGetDebtorInvoicingOrderById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), id],
        queryFn: async () => await getDebtorInvoicingOrderById(id),
        enabled: !!id,
    });
};

// --------------------------------------- Cash Office payment collection ---------------------------------------
//
// The Cash Office Payment Collection screen reads only unpaid invoices (ACTIVE +
// isAmountOutstanding) for the selected debtor and loads a single invoice by its order id.
// The `{ orderId }` and `filters` bodies mirror the backend contract; they are intentionally
// kept separate from the POS account-sales list/get so the two flows cannot drift.

export type UnpaidDebtorInvoicingOrderFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    companyDebtorId?: string;
    dateFrom?: string;
    dateTo?: string;
    filters?: {
        status?: string;
        isAmountOutstanding?: boolean;
    };
};

export interface GetUnpaidDebtorInvoicingOrdersResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: AccountSalesDetails[] };
}

export async function getUnpaidDebtorInvoicingOrders(
    props: UnpaidDebtorInvoicingOrderFilterProps,
): Promise<GetUnpaidDebtorInvoicingOrdersResponse> {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.list.url,
            method: apiUrls.accountSales.list.method,
            data: props,
        })
    ).data;
}

export const useUnpaidDebtorInvoicingOrders = (
    props: UnpaidDebtorInvoicingOrderFilterProps,
    enabled: boolean = true,
) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), 'unpaid', props],
        queryFn: async () => await getUnpaidDebtorInvoicingOrders(props),
        enabled,
    });
};

export interface GetDebtorInvoicingOrderByOrderIdResponse {
    success: boolean;
    message: string;
    data: AccountSalesDetails;
}

export async function getDebtorInvoicingOrderByOrderId(orderId: string) {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.get.url,
            method: apiUrls.accountSales.get.method,
            data: { orderId },
        })
    ).data;
}

export const useDebtorInvoicingOrderByOrderId = (orderId: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), 'order-by-id', orderId],
        queryFn: async () => await getDebtorInvoicingOrderByOrderId(orderId),
        enabled: !!orderId,
    });
};