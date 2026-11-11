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

// --------------------------------------- ACCOUNT SALES ---------------------------------------

// Account Sales Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyDebtorId?: string;
    isCsv?: boolean;
    csvLabel?: string;
    isCreditNoteGenerated?: boolean;
};

export interface CartItemReponse {
    companyStockDetailId: string;
    companyTaxRateId?: string;
    companyStockPricingId: string;
    companyStockPricingTypeId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    // NST (near-expiry / damaged) allocation. The backend validates the allocation is
    // active and approved, that the version is current, and that unitPrice matches the
    // discounted price it computed. Normal discount fields are not used for these lines.
    stockDispositionId?: string;
    stockDispositionVersion?: number;
}

export interface AccountSaleCartItemBase {
    quantity: number;
    selectedSerialNumber?: string;
    discount: number;
    // Manual discount entered after any automatic/promotion discount. Exactly one of
    // manualDiscountAmount / discountPercentage is the active input; the other is 0.
    manualDiscountAmount?: number;
    discountPercentage?: number;
    manualDiscountType?: 'AMOUNT' | 'PERCENT';
    lineTotal: number;
    unitPrice: number;
    isNewRow?: boolean;
    availableStock?: number;
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
    stockDispositionId?: string;
    stockDispositionVersion?: number;
    dispositionType?: string;
    // Owner (selling store) of the NST record; undefined = Company/DC stock. NEVER the buyer.
    dispositionCompanyDebtorId?: string;
    originalUnitPrice?: number;
    dispositionDiscountAmount?: number;
    // Display-only NST details for the cart badge; not part of the submit payload.
    dispositionBatchNumber?: string;
    dispositionExpiryDate?: string;
    dispositionRemainingQuantity?: number;
    dispositionReason?: string;
    dispositionAllowPromotionStacking?: boolean;
    discountOverride?: boolean;
    isDiscountOverride?: boolean;
    priceOverride?: boolean;
    isPriceOverride?: boolean;
    // Set when the line was loaded from a POS sale order (Create Invoice flow) so the
    // submitted line carries the originating sale order item id.
    salesOrderItemId?: string;
}

export type AccountSaleCartItem = AccountSaleCartItemBase & StockDetails;

export type AccountSaleInvoiceCartItem = (AccountSaleCartItemBase & { CompanyStockDetail: StockDetails })[];

export interface AccountSaleInvoiceType {
    accountSales: AccountSaleCreateSchema;
    cartItems: AccountSaleInvoiceCartItem;
    accountNumber: string;
}

export interface AccountSalesDetails extends AccountSaleCreateSchema {
    id: string;
    pdfUrl?: string;
    CompanyDebtor: CompanyCreditor;
    DebtorInvoicingOrderItems: AccountSaleInvoiceCartItem;
    representativeId?: string;
    outstandingAmount: number;
    SalesRepresentative?: SalesRepresentativeDetails;
    createdAt: string;
    updatedAt?: string;
    notSynced?: boolean;
    isPriceMismatchCreditNoteGenerated?: boolean;
    canCreatePriceMismatchCredit?: boolean;
}

export interface GetAccountSaleResponse {
    success: boolean;
    message: string;
    data: { count: number; rows: AccountSalesDetails[] };
}

export async function getAccountSales(props: FilterProps): Promise<GetAccountSaleResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'accountSales', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.accountSales.list.url,
                method: apiUrls.accountSales.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetAccountSales = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), props],
        queryFn: async () => await getAccountSales(props),
    });
};

// Store Departments Offline Listing

export async function getAccountSalesOffline(online: boolean): Promise<GetAccountSaleResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.accountSales.list.url,
            method: apiUrls.accountSales.list.method,
        });
        await setDBData(getIDBKey(apiUrls.accountSales), response.data);
        return response.data;
    } else {
        const cached = await getDBData<GetAccountSaleResponse>(getIDBKey(apiUrls.accountSales));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useGetAccountSalesOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.accountSales), online],
        queryFn: async () => await getAccountSalesOffline(online),
    });
};

// Account Sale Get By Id
export interface GetAccountSaleByIdResponse {
    success: boolean;
    data: AccountSalesDetails;
}

export async function getAccountSaleById(id: string): Promise<GetAccountSaleByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.get.url,
            method: apiUrls.accountSales.get.method,
            data: { id },
        })
    ).data;
}

export const useGetAccountSaleById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.accountSales), id],
        queryFn: async () => await getAccountSaleById(id),
    });
};

// Account Sale Create

export const cartItemSchema = z.object({
    companyStockDetailId: z.string().min(1, 'Product is required'),
    companyTaxRateId: z.string().optional(),
    companyStockPricingId: z.string().min(1, 'Invalid or no pricing found'),
    companyStockPricingTypeId: z.string().min(1, 'Invalid or no pricing found'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    // The un-discounted list price. Kept separate from unitPrice so the header goodsTotal
    // stays gross when a server-evaluated promotion reduces the payable line price.
    baseUnitPrice: z.number().nonnegative().optional(),
    unitPrice: z.number().nonnegative(),
    promotionalPrice: z.number().nonnegative().optional(),
    isFree: z.boolean().optional(),
    freeQuantity: z.number().optional(),
    discount: z.number().optional(),
    // Manual discount is sent separately from promotion/automatic savings so the backend
    // can apply it after the promotion result. Always send 0 for the unused mode.
    manualDiscountAmount: z.number().nonnegative().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    lineTotal: z.number().nonnegative(),
    stockDispositionId: z.string().optional(),
    stockDispositionVersion: z.number().optional(),
    // When this invoice line was created from a POS sale order, the originating sale order
    // item id links the invoiced line back so the backend can mark it invoiced.
    salesOrderItemId: z.string().optional(),
});

// The promotion applications returned by /promotions/evaluate, forwarded verbatim to the
// create endpoint so the backend records exactly what was applied. passthrough keeps any
// engine-only fields the client does not model.
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

export const paymentSchema = z.object({
    tenderTypeId: z.string().min(1, 'Tender type is required'),
    tenderType: z.string().min(1, 'Tender type is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    remarks: z.string().optional(),
});

export const accountSaleBaseSchema = z.object({
    // Document Details
    companyDebtorId: z.string().min(1, 'Account selection is required'),
    name: z.string().min(1, 'Name is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    email: z.email('Invalid email format').optional().or(z.literal('')),
    taxNumber: z.number().optional(),
    approvedById: z.string().optional(),
    companyTaxRateId: z.string().optional().nullable(),
    changeDue: z.number().optional(),

    // Invoice Details
    invoiceDiscountPercentage: z.number().min(0, 'Invoice discount cannot be negative'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceMemo: z.string().optional(),
    invoiceInclusive: z.enum(['Yes', 'No']),

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
    loyaltyCardNumber: z.string().optional(),
    loyaltyDiscountAmount: z.number().optional(),
    discountAmount: z.number().min(0, 'Discount amount cannot be negative'),
    promotionId: z.string().optional(),
    promotionName: z.string().optional(),
    promotionDiscountAmount: z.number().optional(),
    promotionApplications: z.array(promotionApplicationSchema).optional(),
    taxAmount: z.number().min(0, 'Tax amount cannot be negative'),
    totalQuantity: z.number().min(0, 'Total quantity cannot be negative'),
    totalFreeQuantity: z.number().min(0, 'Total quantity cannot be negative'),
    items: z.array(cartItemSchema).min(1, 'At least one product must be selected'),
    payments: z.array(paymentSchema).optional(),
});

export const accountSaleCreateSchema = accountSaleBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type AccountSaleCreateSchema = z.infer<typeof accountSaleCreateSchema>;

export type MutateAccountSaleResponse = {
    success: boolean;
    data: AccountSalesDetails;
};

export async function createAccountSale(
    data: AccountSaleCreateSchema,
    options?: { headers?: Record<string, string> },
): Promise<MutateAccountSaleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.create.url,
            method: apiUrls.accountSales.create.method,
            data,
            ...(options?.headers ? { headers: options.headers } : {}),
        })
    ).data;
}

export const useCreateAccountSale = (isOnline: boolean) => {
    const queryClient = useQueryClient();
    const authData = useAuthUser.getState();
    const companyId = authData?.company?.id;
    const userId = authData?.user?.id;

    return useMutation({
        mutationFn: async ({ data, headers }: { data: AccountSaleCreateSchema; headers?: Record<string, string> }) => {
            if (isOnline) {
                return await createAccountSale(data, { headers });
            } else {
                const offlineData = {
                    companyId,
                    userId,
                    ...data,
                    createdAt: new Date().toISOString(),
                };
                await addToDBArray(getMutateIDBKey(apiUrls.accountSales), offlineData);
                return {
                    success: true,
                    data: data as AccountSalesDetails,
                };
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.accountSales)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        networkMode: 'always',
    });
};

// Sync Offline Account Sales

export type MutateAccountSalesSyncResponse = {
    success: boolean;
    data: null;
};

export interface CreatedAccountSalesSyncSchema {
    syncData: AccountSaleCreateSchema[];
}

export async function syncCreatedAccountSales(
    data: CreatedAccountSalesSyncSchema,
): Promise<MutateAccountSalesSyncResponse> {
    return (
        await axiosInstance({
            url: apiUrls.accountSales.syncCreated.url,
            method: apiUrls.accountSales.syncCreated.method,
            data,
        })
    ).data;
}

export const useSyncCreatedAccountSales = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: syncCreatedAccountSales,
    });
};

export interface DebtorListFilterProps {
    limit?: number;
    offset?: number;
    search?: string;
}

export interface GetDebtorListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: CompanyCreditor[];
    };
}

export async function getDebtorList(props: DebtorListFilterProps): Promise<GetDebtorListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.debtors.list.url,
            method: apiUrls.debtors.list.method,
            data: props,
        })
    ).data;
}

export const useSearchDebtors = (props: DebtorListFilterProps) => {
    return useQuery({
        queryKey: ['search-debtors', props],
        queryFn: async () => await getDebtorList(props),
        enabled: !!props.search,
    });
};

// --------------------------------------- QUANTITY OVERRIDE ---------------------------------------

export const ACCOUNT_SALE_APPROVAL_TYPES = [
    'ACCOUNT_SALE_QUANTITY_OVERRIDE',
    'ACCOUNT_SALE_DISCOUNT_OVERRIDE',
] as const;
export type AccountSaleApprovalType = (typeof ACCOUNT_SALE_APPROVAL_TYPES)[number];
export type AccountSaleApprovalTokens = Partial<Record<AccountSaleApprovalType, string>>;

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

export interface QuantityRecommendationItem {
    companyStockDetailId: string;
    destinationCompanyStockDetailId?: string;
    destinationCompanyId?: string;
    retailUnitFactor?: number;
    currentInventory: number;
    salesLast7Days?: number;
    salesLast30Days?: number;
    dailySalesRate: number;
    lookbackDays?: number;
    targetStockDays?: number;
    seasonalUpliftPercent?: number;
    targetInventory?: number;
    recommendedQuantity: number;
    requestedQuantity: number;
    overrideRequired: boolean;
}

export interface GetQuantityRecommendationResponse {
    success: boolean;
    message: string;
    data?: {
        applicable: boolean;
        companyDebtorId: string;
        storeCompanyId?: string;
        storeName?: string;
        policy?: {
            lookbackDays?: number;
            targetStockDays?: number;
            seasonalUpliftPercent?: number;
            startMonth?: number;
            endMonth?: number;
            isSeasonal?: boolean;
        };
        items: QuantityRecommendationItem[];
    } | null;
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

// Protected create with approval token support

export interface CreateAccountSaleWithOverrideInput extends AccountSaleCreateSchema {
    approvalToken?: string;
    approvalTokens?: AccountSaleApprovalTokens;
    reason?: string;
    securityRequestReference?: string;
}

export type MutateAccountSaleWithOverrideResponse = {
    success: boolean;
    message?: string;
    data?: AccountSalesDetails | null;
};

async function submitAccountSaleWithOverride(
    data: CreateAccountSaleWithOverrideInput,
): Promise<MutateAccountSaleWithOverrideResponse> {
    const { approvalToken, approvalTokens, reason, securityRequestReference, ...payload } = data;
    const approvalTokenStr = typeof approvalToken === 'string' && approvalToken ? approvalToken : undefined;
    const approvalTokensObj: AccountSaleApprovalTokens | undefined =
        approvalTokens && typeof approvalTokens === 'object'
            ? (approvalTokens as AccountSaleApprovalTokens)
            : undefined;

    const requestData: Record<string, unknown> = {
        ...payload,
        ...(reason ? { reason } : {}),
        ...(securityRequestReference ? { securityRequestReference } : {}),
        ...(approvalTokensObj && Object.keys(approvalTokensObj).length ? { approvalTokens: approvalTokensObj } : {}),
    };

    return (
        await axiosInstance({
            url: apiUrls.accountSales.create.url,
            method: apiUrls.accountSales.create.method,
            data: requestData,
            ...(approvalTokenStr ? { headers: { 'X-Approval-Token': approvalTokenStr } } : {}),
        })
    ).data;
}

export async function createAccountSaleWithOverride(data: CreateAccountSaleWithOverrideInput) {
    return submitAccountSaleWithOverride(data);
}

export const useCreateAccountSaleWithOverride = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAccountSaleWithOverride,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.accountSales)] });
        },
    });
};
