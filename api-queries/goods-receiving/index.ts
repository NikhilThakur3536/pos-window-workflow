import { apiUrls, axiosDownloadCSV, axiosInstance } from '@/api-queries';
import { getApiKey } from '@/utils/helpers';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import moment from 'moment-timezone';
import { z } from 'zod';
import { StockDetails } from '../company/stock-details';
import { useAuthUser } from '@/stores/auth-user.store';
// 3044/3047/3141: rebate + price-match result fields shared with the supplier
// allowance/commitment modules. Type-only imports so no runtime cycle is created.
import type { RebateBreakdown } from './supplier-allowances';
import type { GrvPriceMatchStatus, GrvPriceMatchSource } from './supplier-commitments';

const validTimezones = moment.tz.names();

// --------------------------------------- Goods Receiving ---------------------------------------

export const goodsReceivingBaseSchema = z.object({
    companyCreditorId: z.string(),
    name: z.string().min(1, 'Supplier name is required'),
    transactionType: z.string().min(1, 'Transaction type is required'),
    address: z.string().optional(),
    telephone: z.string().optional(),
    originalInvoiceDate: z.string().optional(),
    grvCaptureDate: z.string().optional(),
    receivedDate: z.string().optional(),
    deliverToName: z.string().optional(),
    deliverToAddress: z.string().optional(),
    totalClaimInclusive: z.boolean(),
    email: z
        .string()
        .optional()
        .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
            message: 'Invalid email address',
        }),
    taxNumber: z.string().optional(),
    invoiceDiscountPercentage: z.number().min(0).max(100).optional(),
    grvDate: z.string().min(1, 'GRV date is required'),
    supplierInvoiceId: z.string().min(1, 'Supplier invoice is required'),
    supplierInvoiceNumber: z.string().optional(),
    deliveryMethod: z.string().optional(),
    orderNumber: z.string().optional(),
    grvMemo: z.string().optional(),
    deliveryNoteNumber: z.string().optional(),
    sourceDocument: z.string().optional(),
    invoiceInclusive: z.boolean(),
    warehouseId: z.string().optional(),
    internalOrderNo: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    documentGpPercentage: z.number().min(0).max(100).optional(),
    goodsTotal: z.number().min(0),
    discountAmount: z.number().min(0),
    taxAmount: z.number().min(0),
    totalQuantity: z.number().min(0),
    items: z
        .array(
            z
                .object({
                    companyStockDetailId: z.string(),
                    description: z.string().min(1, 'Description is required'),
                    companyTaxRateId: z.string().optional(),
                    purchaseOrderItemId: z.string().optional(),
                    originalUnitPrice: z.number().min(0),
                    unitPrice: z.number().min(0),
                    quantity: z
                        .number()
                        .int('Quantity cannot have decimal values')
                        .min(1, 'Quantity must be at least 1'),
                    freeStock: z
                        .number()
                        .int('Free stock cannot have decimal values')
                        .min(0, 'Free stock can not be less than 0'),
                    discountPercentage: z.number().min(0).max(100),
                    discount: z.number().min(0),
                    lineTotal: z.number().min(0),
                    isPriceLocked: z.boolean(),
                    companyStockPricingTypeId: z.string().optional(),
                    sellingPrice: z.number().optional(),
                    markup: z.number().optional(),
                    gp: z.number().optional(),
                })
                .refine(
                    (item) => {
                        if (item.companyStockPricingTypeId && !item.sellingPrice) {
                            return false;
                        }
                        return true;
                    },
                    {
                        message: 'Selling price is required since set selling price is checked.',
                        path: ['sellingPrice'],
                    },
                ),
        )
        .min(1, 'At least one item is required'),
});

export const goodsReceivingSchema = goodsReceivingBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type GoodsReceivingSchema = z.infer<typeof goodsReceivingSchema>;

export interface GoodsReceivingFilter {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    isReturned?: boolean;
    companyCreditorId?: string;
    isClaimCreate?: boolean;
}

export interface GoodsReceivingCartItem {
    companyStockDetailId: string;
    companyTaxRateId?: string;
    companyStockPricingId?: string;
    description: string;
    unitPrice: number;
    originalUnitPrice: number;
    quantity: number;
    freeStock: number;
    discount: number;
    discountPercentage: number;
    lineTotal: number;
    code?: string;
    additionalCost?: number;
    isPriceLocked: boolean;

    // Pricing Type
    companyStockPricingTypeId?: string;
    sellingPrice?: number;
    gp?: number;
    markup?: number;

    taxRateId?: string;
    taxName?: string;
    taxPercent?: number;
    taxAmount?: number;
    taxableAmount?: number;

    purchaseOrderItemId?: string;

    // Supplier invoice origin (read-only product lines; only quantity/variance editable).
    sourceSupplierInvoiceId?: string;
    supplierInvoiceItemId?: string;
    invoicedQuantity?: number;

    // 3044/3047/3141: rebate + price-match result returned per GRV line. The original
    // captured cost (unitPrice) and tax are never modified; the rebate-adjusted cost
    // is stored separately.
    rebateAmount?: number;
    effectiveUnitCost?: number;
    rebateBreakdown?: RebateBreakdown[];
    expectedUnitCost?: number | null;
    matchSource?: GrvPriceMatchSource;
    costVarianceAmount?: number;
    costVariancePercent?: number;
    priceMatchStatus?: GrvPriceMatchStatus;
    priceMatchNotes?: string | null;
    supplierDealId?: string | null;
}

export interface GoodsReceivingItem extends GoodsReceivingCartItem {
    CompanyStockDetail: StockDetails;
}

export interface GoodsReceivingClaimItem {
    id: string;
    companyStockDetailId?: string;
    itemCode?: string;
    description?: string;
    CompanyStockDetail?: StockDetails;
    quantity: number;
    unitCost: number;
    unitClaimExclusive: number;
    dealAmount: number;
    totalClaimExclusive: number;
    totalClaimInclusive: number;
    dealDateFrom?: string;
    dealDateTo?: string;
}

export interface GoodsReceivingClaim {
    id: string;
    invoiceNumber?: string;
    claimNumber?: string;
    claimDate?: string;
    claimReason?: string;
    sourceType?: string;
    status?: string;
    totalClaimExclusive: number;
    taxAmount: number;
    totalClaimInclusive: number;
    GoodsReceivingClaimItems: GoodsReceivingClaimItem[];
}

export interface ClaimPrintDocument {
    claimId?: string;
    claimNumber: string;
    total: number;
    pdfUrl: string | null;
}

export interface GoodsReceivingDetails {
    id: string;
    createdAt: string;
    updatedAt: string;
    pdfUrl: string;
    companyId: string;
    domainId: string;
    timezone: string;
    companyCreditorId: string;
    name: string;
    transactionType: string;
    address: string;
    telephone: string;
    email: string;
    taxNumber: string;
    invoiceDiscountPercentage: number;
    grvDate: string;
    supplierInvoiceNumber: string;
    deliveryMethod: string;
    orderNumber: string;
    grvMemo: string;
    deliveryNoteNumber: string;
    sourceDocument: string;
    invoiceInclusive: boolean;
    warehouseId: string;
    internalOrderNo: string;
    documentGpPercentage: number;
    goodsTotal: number;
    discountAmount: number;
    taxAmount: number;
    totalQuantity: number;
    CreditorGoodsReceivingOrderItems: GoodsReceivingItem[];
    DebtorGoodsReceivingOrderItems: GoodsReceivingItem[];
    isReturned: boolean;
    isClaimCreate?: boolean;
    purchaseOrderId?: string;
    GoodsReceivingClaims?: GoodsReceivingClaim[];
    claimPrintDocuments?: ClaimPrintDocument[];

    // 3044/3047: rebate-adjusted values calculated automatically on GRV create/update.
    // The original goodsTotal / taxAmount are left unchanged.
    grossValue?: number;
    rebateValue?: number;
    netPayableValue?: number;
    rebateBreakdown?: RebateBreakdown[];
    rebateCalculatedAt?: string;
    // 3141: price-match result + linked purchase commitment for this GRV.
    priceMatchStatus?: GrvPriceMatchStatus;
    supplierPurchaseCommitmentId?: string | null;
}

export interface GetGoodsReceivingListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: GoodsReceivingDetails[];
    };
}

export interface GetGoodsReceivingByIdResponse {
    success: boolean;
    data: GoodsReceivingDetails;
}

export interface MutateGoodsReceivingResponse {
    success: boolean;
    message: string;
    data: GoodsReceivingDetails;
}

export async function getGoodsReceivingList(
    props: GoodsReceivingFilter,
): Promise<GetGoodsReceivingListResponse | void> {
    const userType = useAuthUser.getState().user?.userType;
    if (props?.isCsv) {
        axiosDownloadCSV({
            filters: props,
            key: userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving',
            label: props?.csvLabel,
        });
    } else {
        return (
            await axiosInstance({
                url: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                    .list.url,
                method: apiUrls?.[
                    userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'
                ].list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetGoodsReceivingList = (props: GoodsReceivingFilter) => {
    const userType = useAuthUser.getState().user?.userType;
    return useQuery({
        queryKey: [
            getApiKey(
                apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'],
            ),
            props,
        ],
        queryFn: async () => await getGoodsReceivingList(props),
    });
};

export async function getGoodsReceivingById(
    orderId: string,
    isClaimCreate?: boolean,
): Promise<GetGoodsReceivingByIdResponse> {
    const userType = useAuthUser.getState().user?.userType;
    return (
        await axiosInstance({
            url: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'].get
                .url,
            method: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                .get.method,
            data: isClaimCreate === undefined ? { orderId } : { orderId, isClaimCreate },
        })
    ).data;
}

export const useGetGoodsReceivingById = (id: string) => {
    const userType = useAuthUser.getState().user?.userType;
    return useQuery({
        queryKey: [
            getApiKey(
                apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'],
            ),
            id,
        ],
        queryFn: async () => await getGoodsReceivingById(id),
        enabled: !!id,
    });
};

export async function createGoodsReceiving(data: GoodsReceivingSchema): Promise<MutateGoodsReceivingResponse> {
    const userType = useAuthUser.getState().user?.userType;
    return (
        await axiosInstance({
            url: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                .create.url,
            method: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                .create.method,
            data,
        })
    ).data;
}

export const useCreateGoodsReceiving = () => {
    const userType = useAuthUser.getState().user?.userType;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createGoodsReceiving,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    getApiKey(
                        apiUrls?.[
                            userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'
                        ],
                    ),
                ],
            });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stocks)] });
        },
    });
};

export async function removeGoodsReceiving(orderId: string): Promise<MutateGoodsReceivingResponse> {
    const userType = useAuthUser.getState().user?.userType;
    return (
        await axiosInstance({
            url: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                .delete.url,
            method: apiUrls?.[userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving']
                .delete.method,
            data: { orderId },
        })
    ).data;
}

export const useRemoveGoodsReceiving = () => {
    const userType = useAuthUser.getState().user?.userType;
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeGoodsReceiving,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    getApiKey(
                        apiUrls?.[
                            userType === 'COMPANY-DEBTOR-USER' ? 'debtorGoodsReceiving' : 'creditorGoodsReceiving'
                        ],
                    ),
                ],
            });
        },
    });
};
