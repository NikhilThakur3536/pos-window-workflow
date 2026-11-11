import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- STORE ASSETS & MAINTENANCE ---------------------------------------
// Asset register (companyAsset) plus the event/maintenance log. Naming mirrors the
// backend: POST /api/company/companyAsset/{save|get|list|delete} and
// POST /api/company/companyAsset/event/{create|list}.

export const ASSET_CATEGORIES = [
    'COMPUTER',
    'PRINTER',
    'BARCODE_SCANNER',
    'MOBILE_DEVICE',
    'VEHICLE',
    'FURNITURE',
    'RACK',
    'OTHER',
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR'] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_STATUSES = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'LOST', 'DELETED'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_EVENT_TYPES = [
    'ASSIGN',
    'RETURN',
    'TRANSFER',
    'SERVICE',
    'BREAKDOWN',
    'REPAIR_OUT',
    'REPAIR_IN',
    'WARRANTY_CLAIM',
    'RETIRE',
    'LOST',
] as const;
export type AssetEventType = (typeof ASSET_EVENT_TYPES)[number];

// REPAIR_IN only: whether the asset goes back into the pool or to its assignee.
export const ASSET_RETURN_STATUSES = ['AVAILABLE', 'ASSIGNED'] as const;
export type AssetReturnStatus = (typeof ASSET_RETURN_STATUSES)[number];

// Read-only reference for where an asset sits physically; the register UI does not
// edit it yet.
export const ASSET_LOCATION_TYPES = ['ZONE', 'AISLE', 'RACK', 'LEVEL', 'BIN'] as const;
export type AssetLocationType = (typeof ASSET_LOCATION_TYPES)[number];

// Security action codes (backend security-actions registry). The frontend enforces the
// module RBAC permissions instead; these are kept for documentation/dispatch:
export const ASSET_ACTION_CODES = {
    VIEW: 'ASSET_VIEW',
    MANAGE: 'ASSET_MANAGE',
    EVENT: 'ASSET_EVENT',
} as const;

export interface AssetEvent {
    id: string;
    companyAssetId: string;
    eventType: AssetEventType;
    fromUserId?: string | null;
    toUserId?: string | null;
    fromCompanyDebtorId?: string | null;
    toCompanyDebtorId?: string | null;
    fromWarehouseId?: string | null;
    toWarehouseId?: string | null;
    toHeadOffice?: boolean;
    conditionBefore?: AssetCondition | null;
    conditionAfter?: AssetCondition | null;
    scheduledFor?: string | null;
    completedAt?: string | null;
    cost?: number | null;
    vendorName?: string | null;
    externalReference?: string | null;
    isWarrantyCovered?: boolean;
    returnStatus?: AssetReturnStatus | null;
    notes?: string | null;
    clientEventId: string;
    createdBy?: string | null;
    createdAt: string;
}

export interface CompanyAsset {
    id: string;
    version: number;
    companyDebtorId?: string | null;
    warehouseId?: string | null;
    assetCode?: string | null;
    name: string;
    category: AssetCategory;
    brand?: string | null;
    model?: string | null;
    serialNumber?: string | null;
    purchaseDate?: string | null;
    purchaseCost?: number | null;
    supplierName?: string | null;
    warrantyStartDate?: string | null;
    warrantyExpiryDate?: string | null;
    warrantyProvider?: string | null;
    serviceIntervalDays?: number | null;
    lastServiceDate?: string | null;
    condition: AssetCondition;
    status: AssetStatus;
    locationType?: AssetLocationType | null;
    eventCount?: number;
    events?: AssetEvent[];
    createdAt: string;
    updatedAt?: string;
}

export interface AssetListResponse {
    success: boolean;
    message?: string;
    count?: number;
    data: CompanyAsset[] | { count?: number; rows?: CompanyAsset[] };
    [key: string]: unknown;
}

export interface EventListResponse {
    success: boolean;
    message?: string;
    count?: number;
    data: AssetEvent[] | { count?: number; rows?: AssetEvent[] };
    [key: string]: unknown;
}

// The backend list endpoints return either a flat array or a { count, rows } envelope
// depending on the deployment shape; normalise both.
export const getAssetRows = (res: AssetListResponse | undefined): { rows: CompanyAsset[]; count: number } => {
    const data = res?.data;
    const rows = Array.isArray(data) ? data : data?.rows ?? [];
    const count =
        typeof res?.count === 'number'
            ? res.count
            : !Array.isArray(data) && typeof data?.count === 'number'
              ? data.count
              : rows.length;
    return { rows, count };
};

export const getEventRows = (res: EventListResponse | undefined): { rows: AssetEvent[]; count: number } => {
    const data = res?.data;
    const rows: AssetEvent[] = Array.isArray(data) ? data : data?.rows ?? [];
    const count =
        typeof res?.count === 'number'
            ? res.count
            : !Array.isArray(data) && typeof data?.count === 'number'
              ? data.count
              : rows.length;
    return { rows, count };
};

// ------------------------- List -------------------------

export interface GetAssetListProps {
    companyDebtorId?: string;
    warehouseId?: string;
    category?: AssetCategory | '';
    status?: AssetStatus | '';
    search?: string;
    serviceDueBefore?: string;
    warrantyExpiringBefore?: string;
    headOfficeOnly?: boolean;
    page?: number;
    limit?: number;
}

export async function getAssetList(props?: GetAssetListProps): Promise<AssetListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.list.url,
            method: apiUrls.companyAsset.list.method,
            data: props || {},
        })
    ).data;
}

export const useGetAssetList = (props: GetAssetListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyAsset), 'list', props],
        queryFn: async () => await getAssetList(props),
    });
};

// ------------------------- Get one + history -------------------------

export interface GetAssetByIdProps {
    id: string;
    includeEvents?: boolean;
}

export async function getAssetById(props: GetAssetByIdProps): Promise<{ success: boolean; data: CompanyAsset }> {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.get.url,
            method: apiUrls.companyAsset.get.method,
            data: props,
        })
    ).data;
}

export const useGetAssetById = (props: GetAssetByIdProps | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyAsset), 'get', props],
        enabled: !!props?.id,
        queryFn: async () => await getAssetById(props as GetAssetByIdProps),
    });
};

// ------------------------- Save (create + update share /save) -------------------------

export const assetBaseSchema = z.object({
    assetCode: z.string().min(1, 'Asset code is required'),
    name: z.string().min(1, 'Asset name is required'),
    category: z.enum(ASSET_CATEGORIES),
    companyDebtorId: z.string().optional(),
    warehouseId: z.string().optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    serialNumber: z.string().optional(),
    purchaseDate: z.string().optional(),
    purchaseCost: z.number().nonnegative().optional(),
    supplierName: z.string().optional(),
    warrantyStartDate: z.string().optional(),
    warrantyExpiryDate: z.string().optional(),
    warrantyProvider: z.string().optional(),
    serviceIntervalDays: z.number().nonnegative().optional(),
    lastServiceDate: z.string().optional(),
    condition: z.enum(ASSET_CONDITIONS),
    status: z.enum(ASSET_STATUSES).optional(),
});

export type AssetCreateSchema = z.infer<typeof assetBaseSchema>;

export const assetUpdateSchema = assetBaseSchema.partial().extend({
    id: z.string().min(1, 'Asset id is required'),
    version: z.number().min(0),
});

export type AssetUpdateSchema = z.infer<typeof assetUpdateSchema>;

export async function saveAsset(data: AssetCreateSchema | AssetUpdateSchema) {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.save.url,
            method: apiUrls.companyAsset.save.method,
            data,
        })
    ).data;
}

export const useSaveAsset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyAsset)] });
        },
    });
};

// ------------------------- Delete -------------------------

export async function deleteAsset(data: { id: string; version: number }) {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.delete.url,
            method: apiUrls.companyAsset.delete.method,
            data,
        })
    ).data;
}

export const useDeleteAsset = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyAsset)] });
        },
    });
};

// ------------------------- Events -------------------------

export const assetEventSchema = z
    .object({
        companyAssetId: z.string().min(1, 'Asset is required'),
        eventType: z.enum(ASSET_EVENT_TYPES),
        toUserId: z.string().optional(),
        toCompanyDebtorId: z.string().optional(),
        toWarehouseId: z.string().optional(),
        toHeadOffice: z.boolean().optional(),
        conditionBefore: z.enum(ASSET_CONDITIONS).optional(),
        conditionAfter: z.enum(ASSET_CONDITIONS).optional(),
        scheduledFor: z.string().optional(),
        completedAt: z.string().optional(),
        cost: z.number().nonnegative().optional(),
        vendorName: z.string().optional(),
        externalReference: z.string().optional(),
        isWarrantyCovered: z.boolean().optional(),
        returnStatus: z.enum(ASSET_RETURN_STATUSES).optional(),
        notes: z.string().optional(),
        clientEventId: z.string().min(1, 'clientEventId is required'),
    })
    .superRefine((val, ctx) => {
        const require = (field: keyof typeof val, label: string, fire?: boolean) => {
            const value = val[field];
            const present = typeof value === 'string' ? value.trim() !== '' : value != null && value !== false;
            if (fire && !present) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: [field as string],
                    message: `${label} is required for ${val.eventType}`,
                });
            }
        };

        switch (val.eventType) {
            case 'ASSIGN':
                require('toUserId', 'User');
                break;
            case 'RETURN':
                require('toWarehouseId', 'Warehouse');
                break;
            case 'TRANSFER':
                require('toCompanyDebtorId', 'Store', !val.toHeadOffice);
                require('toHeadOffice', 'Head office', !val.toCompanyDebtorId);
                break;
            case 'SERVICE':
                require('vendorName', 'Vendor');
                require('scheduledFor', 'Scheduled date', !val.completedAt);
                require('completedAt', 'Completed date', !val.scheduledFor);
                break;
            case 'REPAIR_OUT':
                require('vendorName', 'Vendor');
                break;
            case 'REPAIR_IN':
                require('returnStatus', 'Return status');
                break;
            case 'WARRANTY_CLAIM':
                require('externalReference', 'Reference');
                break;
            default:
                break;
        }
    });

export type AssetEventCreateSchema = z.infer<typeof assetEventSchema>;

export async function createAssetEvent(data: AssetEventCreateSchema) {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.event.create.url,
            method: apiUrls.companyAsset.event.create.method,
            data,
        })
    ).data;
}

export const useCreateAssetEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createAssetEvent,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyAsset)] });
        },
    });
};

export interface GetAssetEventsProps {
    companyAssetId?: string;
    pendingScheduleOnly?: boolean;
    scheduledTo?: string;
    page?: number;
    limit?: number;
}

export async function getAssetEvents(props?: GetAssetEventsProps): Promise<EventListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyAsset.event.list.url,
            method: apiUrls.companyAsset.event.list.method,
            data: props || {},
        })
    ).data;
}

export const useGetAssetEvents = (props: GetAssetEventsProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyAsset), 'events', props],
        queryFn: async () => await getAssetEvents(props),
    });
};
