import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { axiosInstance, apiUrls } from '..';
import { getApiKey } from '@/utils/helpers';

export const LOCATION_TYPES = ['ZONE', 'AISLE', 'RACK', 'LEVEL', 'BIN'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export interface WarehouseLocation {
    id: string;
    parentId?: string | null;
    warehouseId?: string | null;
    companyDebtorId?: string | null;
    locationType: LocationType;
    code: string;
    name?: string;
    barcode?: string;
    pickSequence?: number;
    status?: 'ACTIVE' | 'INACTIVE';
    displayPath?: string;
    codePath?: string;
    children?: WarehouseLocation[];
    createdBy?: string;
    updatedBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export const SCOPE_TYPES = ['COMPANY', 'WAREHOUSE', 'STORE'] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

export interface WarehouseLocationScope {
    scopeType?: ScopeType;
    warehouseId?: string | null;
    companyDebtorId?: string | null;
    /** Restrict the tree to this location and its descendants (Assign Inventory popup). */
    rootLocationId?: string;
}

/**
 * Builds the scope payload. COMPANY omits both ownership ids; WAREHOUSE/STORE send only
 * their own id (Company/DC is NOT "all warehouses and stores").
 */
export const buildLocationScope = (
    scopeType: ScopeType,
    warehouseId?: string | null,
    companyDebtorId?: string | null,
): WarehouseLocationScope => {
    if (scopeType === 'WAREHOUSE') return { scopeType, warehouseId: warehouseId || undefined };
    if (scopeType === 'STORE') return { scopeType, companyDebtorId: companyDebtorId || undefined };
    return { scopeType: 'COMPANY' };
};

export interface SaveWarehouseLocationInput extends WarehouseLocationScope {
    id?: string;
    parentId?: string | null;
    locationType: LocationType;
    code: string;
    name?: string;
    barcode?: string;
    pickSequence?: number;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface WarehouseLocationListResponse {
    success: boolean;
    message?: string;
    data?: { count?: number; rows?: WarehouseLocation[] };
}

export async function saveWarehouseLocation(
    data: SaveWarehouseLocationInput,
): Promise<{ success: boolean; message: string; data?: WarehouseLocation }> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.save.url,
            method: apiUrls.warehouseLocation.save.method,
            data,
        })
    ).data;
}

export const useSaveWarehouseLocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveWarehouseLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouseLocation)] });
        },
    });
};

export async function getWarehouseLocationTree(
    data: WarehouseLocationScope,
): Promise<{ success: boolean; message: string; data?: WarehouseLocation[] }> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.tree.url,
            method: apiUrls.warehouseLocation.tree.method,
            data,
        })
    ).data;
}

export const useGetWarehouseLocationTree = (scope: WarehouseLocationScope, enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouseLocation), 'tree', scope],
        queryFn: async () => await getWarehouseLocationTree(scope),
        enabled,
    });
};

export interface ListWarehouseLocationInput {
    scopeType?: ScopeType;
    warehouseId?: string | null;
    companyDebtorId?: string | null;
    locationType?: LocationType;
    search?: string;
    limit?: number;
    offset?: number;
}

export async function listWarehouseLocations(data: ListWarehouseLocationInput): Promise<WarehouseLocationListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.all.url,
            method: apiUrls.warehouseLocation.all.method,
            data,
        })
    ).data;
}

export const useWarehouseLocationList = (input: ListWarehouseLocationInput, enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouseLocation), 'all', input],
        queryFn: async () => await listWarehouseLocations(input),
        enabled,
    });
};

export async function getWarehouseLocationById(
    id: string,
): Promise<{ success: boolean; message: string; data?: WarehouseLocation }> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.get.url,
            method: apiUrls.warehouseLocation.get.method,
            data: { id },
        })
    ).data;
}

export const useGetWarehouseLocationById = (id: string, enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouseLocation), 'get', id],
        queryFn: async () => await getWarehouseLocationById(id),
        enabled: enabled && !!id,
    });
};

export interface WarehouseAssignmentRow {
    companyStockInventoryId: string;
    warehouseLocationId: string | null;
}

export interface AssignInventoryInput {
    rootLocationId?: string;
    clientEventId: string;
    assignments: WarehouseAssignmentRow[];
}

export async function assignInventoryToLocation(
    data: AssignInventoryInput,
): Promise<{ success: boolean; message: string; data?: unknown }> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.assignInventory.url,
            method: apiUrls.warehouseLocation.assignInventory.method,
            data,
        })
    ).data;
}

export const useAssignInventoryToLocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: assignInventoryToLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouseLocation)] });
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stockInventories)] });
        },
    });
};

export interface AssignmentInventoryInput {
    warehouseLocationId: string;
    includeUnassigned?: boolean;
    companyStockDetailId?: string;
    limit?: number;
    offset?: number;
}

export interface AssignmentInventoryRow {
    id: string;
    companyStockDetailId?: string;
    itemCode?: string;
    productName?: string;
    batchNumber?: string;
    expiryDate?: string;
    warehouseId?: string | null;
    companyDebtorId?: string | null;
    stockOnHand?: number;
    reservedStock?: number;
    availableStock?: number;
    warehouseLocationId?: string | null;
    locationPath?: string | null;
    [key: string]: unknown;
}

export interface AssignmentInventoryResponse {
    success: boolean;
    message?: string;
    data?: { count: number; rows: AssignmentInventoryRow[] };
}

/** Rack-scoped inventory for the Assign Inventory popup. BE derives the scope from the rack. */
export async function getAssignmentInventory(data: AssignmentInventoryInput): Promise<AssignmentInventoryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.assignmentInventory.url,
            method: apiUrls.warehouseLocation.assignmentInventory.method,
            data,
        })
    ).data;
}

export const useGetAssignmentInventory = (input: AssignmentInventoryInput, enabled: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.warehouseLocation), 'assignment-inventory', input],
        queryFn: async () => await getAssignmentInventory(input),
        enabled: enabled && !!input.warehouseLocationId,
    });
};

export async function deleteWarehouseLocation(
    id: string,
): Promise<{ success: boolean; message: string; data?: unknown }> {
    return (
        await axiosInstance({
            url: apiUrls.warehouseLocation.delete.url,
            method: apiUrls.warehouseLocation.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteWarehouseLocation = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteWarehouseLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehouseLocation)] });
        },
    });
};

// --------------------------------------- WAREHOUSE PICKLIST ---------------------------------------

export const PICKLIST_SORT_OPTIONS = ['AISLE', 'ALPHABETICAL'] as const;
export type PicklistSortBy = (typeof PICKLIST_SORT_OPTIONS)[number];

export interface WarehousePicklistLine {
    saleOrderItemId?: string;
    companyStockDetailId?: string;
    itemCode?: string;
    productName?: string;
    description?: string;
    requestedQuantity?: number;
    allocatedQuantity?: number;
    pickedQuantity?: number;
    dispatchedQuantity?: number;
    shortageQuantity?: number;
    companyStockInventoryId?: string | null;
    batchNumber?: string;
    expiryDate?: string;
    stockDispatchAllocationId?: string;
    warehouseLocationId?: string | null;
    locationType?: string;
    locationCode?: string;
    locationName?: string;
    locationPath?: string;
    locationCodePath?: string;
    displayPath?: string;
    codePath?: string;
    locationSequence?: Array<{ locationType?: string; code?: string; name?: string; id?: string } | string>;
    [key: string]: unknown;
}

export interface PicklistSummary {
    lineCount: number;
    requestedQuantity: number;
    allocatedQuantity: number;
    pickedQuantity: number;
    shortageQuantity: number;
    unassignedLocationLines: number;
}

export interface GeneratePicklistInput {
    sourceDocumentType: string;
    sourceDocumentId: string;
    sortBy: PicklistSortBy;
}

export interface GeneratePicklistData {
    sourceDocumentType?: string;
    sourceDocumentId?: string;
    sourceDocumentNumber?: string;
    companyDebtorId?: string;
    warehouseId?: string;
    lifecycleStatus?: string;
    lifecycleVersion?: number;
    sortBy?: PicklistSortBy;
    summary?: PicklistSummary;
    rows?: WarehousePicklistLine[];
}

export interface GeneratePicklistResponse {
    success: boolean;
    message: string;
    data?: GeneratePicklistData | WarehousePicklistLine[] | null;
}

export async function generateWarehousePicklist(
    data: GeneratePicklistInput,
): Promise<GeneratePicklistResponse> {
    return (
        await axiosInstance({
            url: apiUrls.warehousePicklist.generate.url,
            method: apiUrls.warehousePicklist.generate.method,
            data,
        })
    ).data;
}

export const useGenerateWarehousePicklist = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: generateWarehousePicklist,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.warehousePicklist)] });
        },
    });
};
