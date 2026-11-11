import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { CompanyCreditor } from '@/types';
import { WarehouseDetails } from '../warehouse';
import { StockDetails } from './stock-details';
import { UserDetails } from '../user';

// --------------------------------------- STOCK INVENTORY LOGS ---------------------------------------

// Stock Inventory Logs Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    companyStockDetailId?: string;
    companyStockInventoryId?: string;
    physicalCountOnly?: boolean;
    addedById?: string;
    createdBy?: string;
    startDate?: string;
    endDate?: string;
    warehouseId?: string;
    companyDebtorId?: string;
    sourceType?: string;
    movementSourceType?: string;
    transactionType?: string;
};

export interface StockInventoryLogDetails {
    id: string;
    companyId: string;
    domainId: string;
    companyStockDetailId: string;
    CompanyStockDetail: StockDetails;
    createdByUser: UserDetails;
    addedByUser?: string | UserDetails | null;
    transactionType: string;
    sourceType: string;
    remarks: string;
    newStock: number;
    previousStock: number;
    quantity: number;
    unitCost: number;
    totalValue: number;
    variance?: number;
    batchNumber?: string | null;
    // A count is scoped either to a warehouse or to a store, never both: the API
    // returns CompanyStockWarehouse with warehouseId set, or CompanyDebtor with a
    // null warehouseId. Exactly one of the two is null on any given row.
    warehouseId?: string | null;
    CompanyStockWarehouse?: WarehouseDetails | null;
    companyDebtorId?: string | null;
    CompanyDebtor?: CompanyCreditor | null;
    // Older payloads used these lower-camel keys; kept so both shapes resolve.
    warehouse?: WarehouseDetails | null;
    companyDebtor?: CompanyCreditor | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
}

export interface GetStockInventoryLogResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockInventoryLogDetails[];
    };
}

export async function getStockInventoryLogs(props: FilterProps): Promise<GetStockInventoryLogResponse> {
    return (
        await axiosInstance({
            url: apiUrls.stockInventoryLogs.list.url,
            method: apiUrls.stockInventoryLogs.list.method,
            data: props,
        })
    ).data;
}

export const useGetStockInventoryLogs = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stockInventoryLogs), props],
        queryFn: async () => await getStockInventoryLogs(props),
    });
};
