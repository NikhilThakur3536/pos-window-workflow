import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosDownloadCSV, axiosInstance } from '../..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { StockDetails } from '@/api-queries/company/stock-details';
import { CompanyCreditor } from '@/types';

const validTimezones = moment.tz.names();

// --------------------------------------- SUPPLIER DEALS ---------------------------------------

// Supplier Deals Listing

export const SUPPLIER_DEAL_EXPIRY_WINDOW_MAX_DAYS = 365;

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
    isCsv?: boolean;
    csvLabel?: string;
    // Expiry filters: deals whose end date falls within the next N days (0-365)
    expiringWithinDays?: number;
    // Deals already past their end date
    expired?: boolean;
    // Only deals that have not expired yet
    activeOnly?: boolean;
    companyCreditorId?: string;
    companyStockId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
};

export interface SupplierDealDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    CompanyTaxRate?: {
        taxRatePercent: string;
    };
    companyStockId: string;
    companyCreditorId: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    CompanyStockDetail: StockDetails;
    CompanyCreditor: CompanyCreditor;
    unitCode: string;
    shrinkCode: string;
    caseCode: string;
    description: string;
    packdes: string;
    packSize: number;
    dealUnit: number;
    dealShrink: number;
    startDate: string;
    endDate: string;
    /** Days remaining until endDate. Negative once the deal has expired. */
    daysToExpiry?: number;
    isExpired?: boolean;
}

export interface GetSupplierDealResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SupplierDealDetails[];
    };
}

export async function getSupplierDeals(props: FilterProps): Promise<GetSupplierDealResponse | void> {
    if (props?.isCsv) {
        axiosDownloadCSV({ filters: props, key: 'supplierDeals', label: props?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.supplierDeals.list.url,
                method: apiUrls.supplierDeals.list.method,
                data: props,
            })
        ).data;
    }
}

export const useGetSupplierDeals = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierDeals), props],
        queryFn: async () => await getSupplierDeals(props),
    });
};

// Supplier Deal Get By Id
export interface GetSupplierDealByIdResponse {
    success: boolean;
    data: SupplierDealDetails;
}

export async function getSupplierDealById(id: string): Promise<GetSupplierDealByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDeals.get.url,
            method: apiUrls.supplierDeals.get.method,
            data: { id },
        })
    ).data;
}

export const useGetSupplierDealById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierDeals), id],
        queryFn: async () => await getSupplierDealById(id),
    });
};

// Supplier Deal Create

export const supplierDealBaseSchema = z.object({
    companyStockId: z.string().min(1, 'Stock Item is required'),
    companyCreditorId: z.string().min(1, 'Supplier is required'),
    // Optional scoping to a debtor and/or warehouse
    companyDebtorId: z.string().optional(),
    companyWarehouseId: z.string().optional(),
    unitCode: z.string().optional(),
    shrinkCode: z.string().optional(),
    caseCode: z.string().optional(),
    description: z.string().optional(),
    packdes: z.string().optional(),
    packSize: z.number().optional(),
    dealUnit: z.number().min(1, 'Deal Price is required'),
    dealShrink: z.number().optional(),
    startDate: z.string().min(1, 'Start Date is required'),
    endDate: z.string().min(1, 'End Date is required'),
});

export const supplierDealCreateSchema = supplierDealBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type SupplierDealCreateSchema = z.infer<typeof supplierDealCreateSchema>;

export type MutateSupplierDealResponse = {
    success: boolean;
};

export async function createSupplierDeal(data: SupplierDealCreateSchema): Promise<MutateSupplierDealResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDeals.create.url,
            method: apiUrls.supplierDeals.create.method,
            data,
        })
    ).data;
}

export const useCreateSupplierDeal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSupplierDeal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierDeals)] });
        },
    });
};

// Supplier Deal Update

export const supplierDealUpdateSchema = supplierDealBaseSchema.extend({ supplierDealId: z.string() });

export type SupplierDealUpdateSchema = z.infer<typeof supplierDealUpdateSchema>;

export async function updateSupplierDeal(data: SupplierDealUpdateSchema): Promise<MutateSupplierDealResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDeals.update.url,
            method: apiUrls.supplierDeals.update.method,
            data,
        })
    ).data;
}

export const useUpdateSupplierDeal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSupplierDeal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierDeals)] });
        },
    });
};

// Supplier Deal Delete

export async function removeSupplierDeal(supplierDealId: string): Promise<MutateSupplierDealResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDeals.delete.url,
            method: apiUrls.supplierDeals.delete.method,
            data: { supplierDealId },
        })
    ).data;
}

export const useRemoveSupplierDeal = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeSupplierDeal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierDeals)] });
        },
    });
};

// --------------------------------------- SUPPLIER DEAL SUMMARY ---------------------------------------

export type SupplierDealSummaryFilters = {
    companyCreditorId?: string;
    companyStockId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    expiringWithinDays?: number;
};

export interface SupplierDealSummary {
    // Preferred (per spec): totals plus a nested 30/14/7/1 day expiry breakdown.
    total?: number;
    active?: number;
    expired?: number;
    expiring?: {
        within30Days?: number;
        within14Days?: number;
        within7Days?: number;
        within1Days?: number;
    };
    // Legacy flat aliases kept for backward compatibility.
    totalDeals?: number;
    activeDeals?: number;
    expiredDeals?: number;
    expiringSoon?: number;
    expiringWithinDays?: number;
    expiring30Days?: number;
    expiring14Days?: number;
    expiring7Days?: number;
    expiring1Day?: number;
    [key: string]: unknown;
}

// Normalises the summary so the cards read the same regardless of whether the
// backend returns the nested `expiring.withinXDays` shape or the flat aliases.
export function normaliseSupplierDealSummary(summary?: SupplierDealSummary) {
    return {
        total: summary?.total ?? summary?.totalDeals,
        active: summary?.active ?? summary?.activeDeals,
        expired: summary?.expired ?? summary?.expiredDeals,
        within30Days: summary?.expiring?.within30Days ?? summary?.expiring30Days,
        within14Days: summary?.expiring?.within14Days ?? summary?.expiring14Days,
        within7Days: summary?.expiring?.within7Days ?? summary?.expiring7Days,
        within1Days: summary?.expiring?.within1Days ?? summary?.expiring1Day,
    };
}

export interface GetSupplierDealSummaryResponse {
    success: boolean;
    message: string;
    data: SupplierDealSummary;
}

export async function getSupplierDealSummary(
    props: SupplierDealSummaryFilters,
): Promise<GetSupplierDealSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDeals.summary.url,
            method: apiUrls.supplierDeals.summary.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierDealSummary = (props: SupplierDealSummaryFilters) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierDeals), 'summary', props],
        queryFn: async () => await getSupplierDealSummary(props),
    });
};

// --------------------------------------- SUPPLIER DEAL EXPIRY ALERTS ---------------------------------------

export const SUPPLIER_DEAL_ALERT_TYPES = ['EXPIRING'] as const;
export type SupplierDealAlertType = (typeof SUPPLIER_DEAL_ALERT_TYPES)[number];

export const SUPPLIER_DEAL_ALERT_SEVERITIES = ['INFO', 'WARNING', 'CRITICAL'] as const;
export type SupplierDealAlertSeverity = (typeof SUPPLIER_DEAL_ALERT_SEVERITIES)[number];

export const SUPPLIER_DEAL_ALERT_SOURCES = ['MANUAL'] as const;
export type SupplierDealAlertSource = (typeof SUPPLIER_DEAL_ALERT_SOURCES)[number];

export const DEFAULT_SUPPLIER_DEAL_ALERT_WINDOWS = [30, 14, 7, 1] as const;

export const supplierDealAlertListSchema = z.object({
    alertType: z.enum(SUPPLIER_DEAL_ALERT_TYPES).optional(),
    acknowledged: z.boolean().optional(),
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
});

export type SupplierDealAlertListSchema = z.infer<typeof supplierDealAlertListSchema>;

export const supplierDealAlertGenerateSchema = z.object({
    alertWindows: z.array(z.coerce.number().int().min(0)).optional(),
    includeExpired: z.boolean().optional(),
    source: z.enum(SUPPLIER_DEAL_ALERT_SOURCES).optional(),
});

export type SupplierDealAlertGenerateSchema = z.infer<typeof supplierDealAlertGenerateSchema>;

export const supplierDealAlertAcknowledgeSchema = z.object({
    id: z.string().min(1, 'Alert is required'),
});

export type SupplierDealAlertAcknowledgeSchema = z.infer<typeof supplierDealAlertAcknowledgeSchema>;

export interface SupplierDealAlert {
    id: string;
    companyId?: string;
    companyCreditorId?: string;
    companyStockId?: string;
    companyDebtorId?: string;
    companyWarehouseId?: string;
    alertType: SupplierDealAlertType;
    alertWindowDays?: number;
    severity: SupplierDealAlertSeverity;
    message?: string;
    source?: SupplierDealAlertSource;
    acknowledged: boolean;
    acknowledgedAt?: string | null;
    acknowledgedBy?: string | null;
    dealEndDate?: string;
    daysToExpiry?: number;
    createdAt?: string;
    updatedAt?: string;
    CompanyCreditor?: Partial<CompanyCreditor>;
    CompanyStockDetail?: Partial<StockDetails>;
}

export interface GetSupplierDealAlertListResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: SupplierDealAlert[];
    };
}

export interface GetSupplierDealAlertSummaryResponse {
    success: boolean;
    message: string;
    data: {
        total?: number;
        unacknowledged?: number;
        acknowledged?: number;
        byWindow?: Record<string, number>;
        bySeverity?: Record<string, number>;
    };
}

export async function getSupplierDealAlerts(
    props: SupplierDealAlertListSchema,
): Promise<GetSupplierDealAlertListResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDealAlerts.list.url,
            method: apiUrls.supplierDealAlerts.list.method,
            data: props,
        })
    ).data;
}

export const useGetSupplierDealAlerts = (props: SupplierDealAlertListSchema) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierDealAlerts), 'list', props],
        queryFn: async () => await getSupplierDealAlerts(props),
    });
};

export async function getSupplierDealAlertSummary(): Promise<GetSupplierDealAlertSummaryResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDealAlerts.summary.url,
            method: apiUrls.supplierDealAlerts.summary.method,
            data: {},
        })
    ).data;
}

export const useGetSupplierDealAlertSummary = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.supplierDealAlerts), 'summary'],
        queryFn: async () => await getSupplierDealAlertSummary(),
    });
};

export interface GenerateSupplierDealAlertsResponse {
    success: boolean;
    message: string;
    data?: {
        created?: number;
        skipped?: number;
        total?: number;
    };
}

// Alert generation is idempotent: existing unacknowledged alerts are not duplicated.
export async function generateSupplierDealAlerts(
    props: SupplierDealAlertGenerateSchema,
): Promise<GenerateSupplierDealAlertsResponse> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDealAlerts.generate.url,
            method: apiUrls.supplierDealAlerts.generate.method,
            data: props,
        })
    ).data;
}

export const useGenerateSupplierDealAlerts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (props: SupplierDealAlertGenerateSchema) => generateSupplierDealAlerts(props),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierDealAlerts)] });
        },
    });
};

export async function acknowledgeSupplierDealAlert(
    props: SupplierDealAlertAcknowledgeSchema,
): Promise<{ success: boolean; message: string }> {
    return (
        await axiosInstance({
            url: apiUrls.supplierDealAlerts.acknowledge.url,
            method: apiUrls.supplierDealAlerts.acknowledge.method,
            data: props,
        })
    ).data;
}

export const useAcknowledgeSupplierDealAlert = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (props: SupplierDealAlertAcknowledgeSchema) => acknowledgeSupplierDealAlert(props),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.supplierDealAlerts)] });
        },
    });
};
