import { useMutation } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '../';

// --------------------------------------- INVENTORY SUMMARY REPORT ---------------------------------------

export type InventorySummaryReportType = 'COMPANY' | 'STORES' | 'COMBINED' | undefined;

export type InventoryStatus = 'ACTIVE' | 'INACTIVE';

export type InventorySortBy =
    | 'itemCode'
    | 'description'
    | 'expiryDate'
    | 'batchNumber'
    | 'warehouse'
    | 'debtor'
    | 'stockOnHand'
    | 'availableStock'
    | 'reservedStock'
    | 'freeStock'
    | 'unitCost'
    | 'totalValue'
    | 'lastRestockDate'
    | 'lastSaleDate';

export interface InventorySummaryReportPayload {
    // Report
    reportType?: InventorySummaryReportType;

    // Search
    search?: string;

    // Company-owned stores
    includeCompanyOwnedStores?: boolean;

    // Warehouse filters
    warehouseId?: string;
    warehouseIds?: string[];

    // Store / Debtor filters
    companyDebtorId?: string;
    companyDebtorIds?: string[];

    // Product filters
    companyStockDetailId?: string;
    itemCode?: string;
    description?: string;
    barcode?: string;
    categoryId?: string;
    subCategoryId?: string;
    brandId?: string;
    departmentId?: string;
    majorDepartmentId?: string;
    packSize?: string;

    // Batch filters
    batchNumber?: string;
    batchNumbers?: string[];
    batchExists?: boolean;
    batchMissing?: boolean;

    // Expiry filters
    expiryFrom?: string;
    expiryTo?: string;
    expiredOnly?: boolean;
    nonExpiredOnly?: boolean;
    noExpiry?: boolean;
    expiringWithinDays?: number;
    expiringThisWeek?: boolean;
    expiringThisMonth?: boolean;

    // Quantity ranges
    stockOnHandMin?: number;
    stockOnHandMax?: number;
    availableStockMin?: number;
    availableStockMax?: number;
    reservedStockMin?: number;
    reservedStockMax?: number;
    freeStockMin?: number;
    freeStockMax?: number;

    // Value ranges
    unitCostMin?: number;
    unitCostMax?: number;
    totalValueMin?: number;
    totalValueMax?: number;

    // Date filters
    lastRestockFrom?: string;
    lastRestockTo?: string;
    lastSaleFrom?: string;
    lastSaleTo?: string;

    // Inventory status flags
    negativeStock?: boolean;
    zeroStock?: boolean;
    availableStockPositive?: boolean;
    reservedStockPositive?: boolean;
    freeStockPositive?: boolean;
    lowStock?: boolean;
    overMaximumStock?: boolean;

    // Status
    status?: InventoryStatus;

    // Sorting
    sortBy?: InventorySortBy;
    sortOrder?: 'asc' | 'desc';

    // Pagination
    limit?: number;
    offset?: number;

    // Export
    isCsv?: boolean;
    selectedFields?: string[];
}

export interface InventorySummaryItem {
    [key: string]: any;
}

export interface InventorySummaryCards {
    totalProducts?: number;
    totalSkus?: number;
    totalStockOnHand?: number;
    totalAvailableStock?: number;
    totalReservedStock?: number;
    totalFreeStock?: number;
    totalInventoryValue?: number;
    totalExpiredStockValue?: number;
    totalExpiringWithin30Days?: number;
    totalNegativeStockItems?: number;
    totalLowStockItems?: number;
}

export interface InventorySummaryReportResponse {
    success: boolean;
    message: string;
    data: {
        items: InventorySummaryItem[];
        summary?: InventorySummaryCards;
        total?: number;
        limit?: number;
        offset?: number;
        rows
    };
}

export async function getInventorySummaryReport(
    data: InventorySummaryReportPayload,
): Promise<InventorySummaryReportResponse> {
    return (
        await axiosInstance({
            url: apiUrls.reports.inventorySummary.url,
            method: apiUrls.reports.inventorySummary.method,
            data,
        })
    ).data;
}

export const useInventorySummaryReport = () => {
    return useMutation({
        mutationFn: getInventorySummaryReport,
    });
};