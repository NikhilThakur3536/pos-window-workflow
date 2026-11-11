import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- PACKAGING BARCODES ---------------------------------------
//
// A product (companyStockDetail) can carry multiple package barcodes:
//   UNIT (1 base unit), SHRINK (e.g. 6), CASE (e.g. 24), PALLET (e.g. 960).
// Scanning a package barcode resolves to the product plus a converted base quantity:
//   baseStockQuantity = scannedPackageQuantity * baseQuantityPerScan.
// The FE then uses companyStockDetailId + baseStockQuantity in the POS / Account Sale /
// GRV / inventory payload. Every update is captured in the barcode history endpoint.

export const PACKAGE_TYPES = ['UNIT', 'SHRINK', 'CASE', 'PALLET'] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
    UNIT: 'UNIT (1 base unit)',
    SHRINK: 'SHRINK (pack)',
    CASE: 'CASE (case)',
    PALLET: 'PALLET (pallet)',
};

export interface StockBarcodeRecord {
    id: string;
    companyStockDetailId?: string;
    barcode: string;
    barcodeType?: string;
    packageType?: PackageType | string;
    companyUomId?: string | null;
    baseQuantityPerScan?: number;
    isPrimary?: boolean;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    status?: 'ACTIVE' | 'INACTIVE' | string;
    itemCode?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export type StockBarcodeFilterProps = {
    companyStockDetailId?: string;
    barcode?: string;
    packageType?: string;
    status?: string;
    limit?: number;
    offset?: number;
};

export interface GetStockBarcodeListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockBarcodeRecord[];
    };
}

export interface MutateStockBarcodeResponse {
    success: boolean;
    message: string;
    data?: StockBarcodeRecord | Record<string, unknown> | null;
}

// --------------------------------------- Save (create) ---------------------------------------

export interface SaveStockBarcodeInput {
    companyStockDetailId: string;
    barcode: string;
    barcodeType?: string;
    packageType: string;
    companyUomId?: string;
    baseQuantityPerScan: number;
    isPrimary?: boolean;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    clientDocumentId?: string;
}

export async function saveStockBarcode(data: SaveStockBarcodeInput): Promise<MutateStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.save.url,
            method: apiUrls.stockBarcodes.save.method,
            data,
        })
    ).data;
}

export const useSaveStockBarcode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveStockBarcode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockBarcodes)] });
        },
    });
};

// --------------------------------------- List ---------------------------------------

export async function getStockBarcodes(props: StockBarcodeFilterProps): Promise<GetStockBarcodeListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.list.url,
            method: apiUrls.stockBarcodes.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockBarcodes = (props: StockBarcodeFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockBarcodes), 'list', props],
        queryFn: async () => await getStockBarcodes(props),
    });
};

// --------------------------------------- Get by id ---------------------------------------

export async function getStockBarcode(id: string): Promise<MutateStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.get.url,
            method: apiUrls.stockBarcodes.get.method,
            data: { id },
        })
    ).data;
}

export const useGetStockBarcode = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockBarcodes), 'get', id],
        queryFn: async () => await getStockBarcode(id as string),
        enabled: !!id,
    });
};

// --------------------------------------- Update ---------------------------------------

export interface UpdateStockBarcodeInput {
    id: string;
    packageType?: string;
    baseQuantityPerScan?: number;
    companyUomId?: string | null;
    isPrimary?: boolean;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    reason?: string;
}

export async function updateStockBarcode(data: UpdateStockBarcodeInput): Promise<MutateStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.update.url,
            method: apiUrls.stockBarcodes.update.method,
            data,
        })
    ).data;
}

export const useUpdateStockBarcode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStockBarcode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockBarcodes)] });
        },
    });
};

// --------------------------------------- Resolve scan ---------------------------------------

export interface ResolveStockBarcodeInput {
    barcode: string;
    scannedPackageQuantity: number;
    // Warehouse logins resolve the scan against that warehouse's inventory. The
    // conversion itself is unchanged: baseStockQuantity = qty * baseQuantityPerScan.
    warehouseId?: string;
}

export interface ResolveStockBarcodeResult {
    companyStockBarcodeId?: string;
    companyStockDetailId?: string;
    warehouseId?: string;
    packageType?: string;
    scannedPackageQuantity?: number;
    baseQuantityPerScan?: number;
    baseStockQuantity?: number;
    itemCode?: string;
    description?: string;
    [key: string]: unknown;
}

export interface ResolveStockBarcodeResponse {
    success: boolean;
    message: string;
    data?: ResolveStockBarcodeResult | null;
}

export async function resolveStockBarcode(data: ResolveStockBarcodeInput): Promise<ResolveStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.resolve.url,
            method: apiUrls.stockBarcodes.resolve.method,
            data,
        })
    ).data;
}

export const useResolveStockBarcode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resolveStockBarcode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockBarcodes)] });
        },
    });
};

// --------------------------------------- History ---------------------------------------

export interface StockBarcodeHistoryEntry {
    id?: string;
    companyStockBarcodeId?: string;
    field?: string;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
    changedBy?: {
        id?: string;
        name?: string;
    } | null;
    createdAt?: string;
    [key: string]: unknown;
}

export async function getStockBarcodeHistory(companyStockBarcodeId: string): Promise<MutateStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.history.url,
            method: apiUrls.stockBarcodes.history.method,
            data: { companyStockBarcodeId },
        })
    ).data;
}

export const useGetStockBarcodeHistory = (companyStockBarcodeId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockBarcodes), 'history', companyStockBarcodeId],
        queryFn: async () => await getStockBarcodeHistory(companyStockBarcodeId as string),
        enabled: !!companyStockBarcodeId,
    });
};

// --------------------------------------- Deactivate ---------------------------------------

export async function deactivateStockBarcode(data: {
    id: string;
    reason?: string;
}): Promise<MutateStockBarcodeResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockBarcodes.deactivate.url,
            method: apiUrls.stockBarcodes.deactivate.method,
            data,
        })
    ).data;
}

export const useDeactivateStockBarcode = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deactivateStockBarcode,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockBarcodes)] });
        },
    });
};