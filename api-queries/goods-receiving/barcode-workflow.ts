import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- GRV BARCODE WORKFLOW ---------------------------------------
//
// 3075/3078 - scan-barcode   : resolve a scanned barcode to a product during GRV
//                              (send barcode + scannedPackageQuantity; unknown barcodes return unknown:true)
// 3067/3079 - add-temp-item  : create a temporary item for an unknown barcode against an existing GRV
//            - unresolved-temp-items : list unresolved temporary items for a GRV (3227)
// 3080/3081 - resolve-barcode: resolve temp items via LINK / CREATE / REPLACE actions
// 3144      - REPLACE        : re-map a barcode to a different product (create/update barcode mapping)
// 3224      - approvals      : on HTTP 428 APPROVAL_REQUIRED the requester approves once via
//                              security/approvals/approve, then RESENDS the SAME resolve-barcode request
//                              with the returned approvalToken (passed as the X-Approval-Token header).
// 3225      - barcode-approvals/list : review queue (status, executionStatus, search filters)
//            - barcode-approvals/action : supervisor approve/reject of a pending barcode approval
//
// Idempotency (3228): every temp item / resolution request carries a STABLE clientDocumentId.
// Retries resend the same id. Approval tokens are never persisted to offline storage - keep in memory only.

// --------------------------------------- 3078 Scan Barcode ---------------------------------------

export interface ScanBarcodeInput {
    barcode: string;
    scannedPackageQuantity?: number;
}

export interface ScanBarcodeResult {
    matchedStockDetailId?: string;
    companyStockDetailId?: string;
    found?: boolean;
    unknown?: boolean;
    replacedBarcode?: boolean;
    message?: string;
    barcode?: string;
    itemCode?: string;
    description?: string;
    isTemporary?: boolean;
    tempItemId?: string;
    // Packaging barcode conversion (from companyStockBarcodes): baseStockQuantity =
    // scannedPackageQuantity * baseQuantityPerScan. Use it as the item quantity.
    packageType?: string;
    scannedPackageQuantity?: number;
    baseQuantityPerScan?: number;
    baseStockQuantity?: number;
    [key: string]: unknown;
}

export interface ScanBarcodeResponse {
    success: boolean;
    message?: string;
    data?: ScanBarcodeResult | null;
}

export async function scanBarcode(data: ScanBarcodeInput): Promise<ScanBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.scanBarcode.url,
            method: apiUrls.creditorGoodsReceiving.scanBarcode.method,
            data,
        })
    ).data;
}

// --------------------------------------- 3079 Temporary Item ---------------------------------------

export interface AddTempItemInput {
    grvId: string;
    barcode: string;
    description?: string;
    quantity: number;
    unitPrice?: number;
    clientDocumentId?: string;
}

export interface TempItem {
    id?: string;
    grvId?: string;
    grvItemId?: string;
    barcode?: string;
    description?: string;
    itemCode?: string;
    quantity?: number;
    unitPrice?: number;
    resolved?: boolean;
    resolutionType?: string;
    clientDocumentId?: string;
    createdAt?: string;
    [key: string]: unknown;
}

export interface AddTempItemResponse {
    success: boolean;
    message?: string;
    data?: TempItem | null;
}

export async function addTempItem(data: AddTempItemInput): Promise<AddTempItemResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.addTempItem.url,
            method: apiUrls.creditorGoodsReceiving.addTempItem.method,
            data,
        })
    ).data;
}

// --------------------------------------- Unresolved Temp Items ---------------------------------------

export interface UnresolvedTempItemsInput {
    grvId: string;
}

export interface UnresolvedTempItemsResponse {
    success: boolean;
    message?: string;
    data?: {
        rows?: TempItem[];
        items?: TempItem[];
    } | null;
}

export async function getUnresolvedTempItems(data: UnresolvedTempItemsInput): Promise<UnresolvedTempItemsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.unresolvedTempItems.url,
            method: apiUrls.creditorGoodsReceiving.unresolvedTempItems.method,
            data,
        })
    ).data;
}

export function toUnresolvedTempItems(data: UnresolvedTempItemsResponse['data']): TempItem[] {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    return [];
}

// --------------------------------------- 3080/3081 Resolve Barcode ---------------------------------------

export type ResolveBarcodeAction = 'LINK' | 'CREATE' | 'REPLACE';

export interface CreateProductData {
    itemCode?: string;
    description?: string;
    companyTaxRateId?: string;
    companyStockPricingTypeId?: string;
    sellingPrice?: number;
    [key: string]: unknown;
}

export interface ResolveBarcodeInput {
    action: ResolveBarcodeAction;
    grvItemId?: string;
    companyStockDetailId?: string;
    oldBarcode?: string;
    newBarcode?: string;
    reason?: string;
    replacementReason?: string;
    productData?: CreateProductData;
    clientDocumentId?: string;
    approvalToken?: string;
}

export interface ResolveBarcodeResponse {
    success: boolean;
    message?: string;
    data?: {
        resolved?: boolean;
        approvalRequired?: boolean;
        approvalRequestId?: string;
        tempItemId?: string;
        companyStockDetailId?: string;
        [key: string]: unknown;
    } | null;
}

export async function resolveBarcode(data: ResolveBarcodeInput): Promise<ResolveBarcodeResponse> {
    const { approvalToken, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.resolveBarcode.url,
            method: apiUrls.creditorGoodsReceiving.resolveBarcode.method,
            data: payload,
            ...(approvalToken ? { headers: { 'X-Approval-Token': approvalToken } } : {}),
        })
    ).data;
}

// --------------------------------------- Barcode Approvals ---------------------------------------

export type BarcodeApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BarcodeApprovalExecutionStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface BarcodeApproval {
    id?: string;
    grvId?: string;
    grvItemId?: string;
    action?: ResolveBarcodeAction;
    status?: BarcodeApprovalStatus;
    executionStatus?: BarcodeApprovalExecutionStatus;
    failureReason?: string;
    barcode?: string;
    reason?: string;
    oldBarcode?: string;
    newBarcode?: string;
    companyStockDetailId?: string;
    supplierName?: string;
    supplierId?: string;
    warehouseName?: string;
    warehouseId?: string;
    description?: string;
    clientDocumentId?: string;
    requestedBy?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    } | null;
    approvedBy?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    } | null;
    rejectedBy?: {
        id?: string;
        firstName?: string;
        lastName?: string;
    } | null;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface ListBarcodeApprovalsInput {
    status?: BarcodeApprovalStatus;
    executionStatus?: BarcodeApprovalExecutionStatus;
    grvId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}

export interface ListBarcodeApprovalsResponse {
    success: boolean;
    message?: string;
    data?: {
        count?: number;
        rows?: BarcodeApproval[];
        items?: BarcodeApproval[];
    } | null;
}

export async function getBarcodeApprovals(data: ListBarcodeApprovalsInput): Promise<ListBarcodeApprovalsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.barcodeApprovals.list.url,
            method: apiUrls.creditorGoodsReceiving.barcodeApprovals.list.method,
            data,
        })
    ).data;
}

export function toBarcodeApprovals(data: ListBarcodeApprovalsResponse['data']): BarcodeApproval[] {
    if (!data) return [];
    if (Array.isArray(data.rows)) return data.rows;
    if (Array.isArray(data.items)) return data.items;
    return [];
}

// --------------------------------------- 3144 Barcode Approval Action ---------------------------------------

export type BarcodeApprovalAction = 'APPROVE' | 'REJECT';

export interface BarcodeApprovalActionInput {
    id: string;
    action: BarcodeApprovalAction;
    reason?: string;
}

export interface BarcodeApprovalActionResponse {
    success: boolean;
    message?: string;
    data?: unknown;
}

export async function barcodeApprovalAction(data: BarcodeApprovalActionInput): Promise<BarcodeApprovalActionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.creditorGoodsReceiving.barcodeApprovals.action.url,
            method: apiUrls.creditorGoodsReceiving.barcodeApprovals.action.method,
            data,
        })
    ).data;
}

// --------------------------------------- Hooks ---------------------------------------

const invalidateBarcodeQueries = (queryClient: ReturnType<typeof useQueryClient>) => {
    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.creditorGoodsReceiving)] });
    queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stocks)] });
};

export const useScanBarcode = () => useMutation({ mutationFn: scanBarcode });

export const useAddTempItem = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addTempItem,
        onSuccess: () => invalidateBarcodeQueries(queryClient),
    });
};

export const useGetUnresolvedTempItems = (grvId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditorGoodsReceiving.unresolvedTempItems.url), grvId],
        enabled: !!grvId,
        queryFn: async () => await getUnresolvedTempItems({ grvId: grvId as string }),
    });
};

export const useResolveBarcode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveBarcode,
        onSuccess: () => invalidateBarcodeQueries(queryClient),
    });
};

export const useGetBarcodeApprovals = (props: ListBarcodeApprovalsInput) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.creditorGoodsReceiving.barcodeApprovals.list.url), props],
        queryFn: async () => await getBarcodeApprovals(props),
    });
};

export const useBarcodeApprovalAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: barcodeApprovalAction,
        onSuccess: () => invalidateBarcodeQueries(queryClient),
    });
};
