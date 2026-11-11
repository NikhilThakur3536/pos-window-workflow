import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import moment from 'moment-timezone';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';
import { type GetPurchaseOrderByIdResponse } from '@/api-queries/purchase-orders';

// --------------------------------------- Replenishment Automation ---------------------------------------
//
// Scheduled replenishment (spec 3238). The backend runs the schedule, calculates the
// replenishment with the existing policies / usable stock / incoming orders and creates
// the matching draft documents:
//
//   POST /api/company/replenishment/automation/save    { ...schedule }  (id => update)
//   POST /api/company/replenishment/automation/all     { limit, offset }
//   POST /api/company/replenishment/automation/get     { id }
//   POST /api/company/replenishment/automation/history { scheduleId?, limit, offset }
//   POST /api/company/replenishment/automation/retry   { id }   (execution id, NOT schedule id)
//
// Rules the backend enforces (mirrored here so the UI can explain them up front):
//   - A store schedule (scopeType STORE, outputType STORE_ORDER) creates a Store Order
//     in REQUESTED state. It carries companyDebtorId + companyStockPricingTypeId and
//     never a warehouseId.
//   - A company / warehouse schedule (outputType PURCHASE_ORDER) creates draft Purchase
//     Orders grouped by supplier. It never carries a store id nor a store pricing type.
//   - The target (scopeType + location) and the output type cannot change on an existing
//     schedule: only the name, the timing, the supply source and the enabled flag can.
//   - Automation never creates debtor invoices, reserves stock, dispatches or receives
//     stock. The generated documents stay in draft / REQUESTED for the normal workflow.
//
// The FE never creates replacement orders itself and never calls an invoice endpoint.

// Target scope of a schedule. There is no store-group scope: a group replenishment is
// calculated by the backend from the company scope.
export const AUTOMATION_SCOPE_TYPES = ['STORE', 'COMPANY', 'WAREHOUSE'] as const;
export type AutomationScopeType = (typeof AUTOMATION_SCOPE_TYPES)[number];

// Document the backend creates for a schedule.
export const AUTOMATION_OUTPUT_TYPES = ['STORE_ORDER', 'PURCHASE_ORDER'] as const;
export type AutomationOutputType = (typeof AUTOMATION_OUTPUT_TYPES)[number];

export const AUTOMATION_FREQUENCIES = ['DAILY', 'WEEKLY'] as const;
export type AutomationFrequency = (typeof AUTOMATION_FREQUENCIES)[number];

// Execution statuses reported by the history endpoint.
export const AUTOMATION_EXECUTION_STATUSES = ['PENDING', 'SUCCEEDED', 'SKIPPED', 'FAILED'] as const;
export type AutomationExecutionStatus = (typeof AUTOMATION_EXECUTION_STATUSES)[number];

// Weekday numbering used by the backend: 0 = Sunday … 6 = Saturday.
export const AUTOMATION_WEEKDAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

// --------------------------------------- Types ---------------------------------------

export interface ReplenishmentAutomationSchedule {
    id?: string;
    name?: string;
    scopeType?: AutomationScopeType | string;
    outputType?: AutomationOutputType | string;
    // Target — store id for a STORE schedule, warehouse id for a WAREHOUSE schedule.
    companyDebtorId?: string | null;
    companyDebtorName?: string | null;
    warehouseId?: string | null;
    warehouseName?: string | null;
    // Supply source — the inventory owner and (optionally) the supplying warehouse.
    sourceCompanyId?: string | null;
    sourceCompanyName?: string | null;
    sourceWarehouseId?: string | null;
    sourceWarehouseName?: string | null;
    // Selling price type used when a store order is priced (store schedules only).
    companyStockPricingTypeId?: string | null;
    companyStockPricingTypeName?: string | null;
    frequency?: AutomationFrequency | string;
    weekday?: number | null;
    localTime?: string;
    timezone?: string;
    enabled?: boolean;
    nextRunAt?: string | null;
    lastRunAt?: string | null;
    lastStatus?: string | null;
    status?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface ReplenishmentAutomationDocument {
    documentType?: AutomationOutputType | string;
    documentId?: string;
    documentNumber?: string | null;
    [key: string]: unknown;
}

export interface ReplenishmentAutomationExecution {
    id?: string;
    scheduleId?: string;
    scheduleName?: string;
    status?: AutomationExecutionStatus | string;
    attemptCount?: number;
    // Human readable reason. SKIPPED explains why nothing was created, FAILED carries
    // the error that can be retried.
    reason?: string | null;
    errorMessage?: string | null;
    recommendationRunId?: string | null;
    documents?: ReplenishmentAutomationDocument[];
    startedAt?: string | null;
    finishedAt?: string | null;
    createdAt?: string | null;
    [key: string]: unknown;
}

// --------------------------------------- Schemas ---------------------------------------

const validTimezones = moment.tz.names();

const automationScopeChecks = (
    val: { scopeType?: AutomationScopeType; companyDebtorId?: string | null; warehouseId?: string | null },
    ctx: z.RefinementCtx,
) => {
    if (val.scopeType === 'STORE' && !val.companyDebtorId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['companyDebtorId'],
            message: 'Select the store this schedule replenishes.',
        });
    }
    if (val.scopeType === 'WAREHOUSE' && !val.warehouseId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['warehouseId'],
            message: 'Select the warehouse this schedule replenishes.',
        });
    }
};

const automationTimingChecks = (val: { frequency?: AutomationFrequency; weekday?: number | null }, ctx: z.RefinementCtx) => {
    if (val.frequency === 'WEEKLY' && (val.weekday === null || val.weekday === undefined)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['weekday'],
            message: 'Select the day of the week for a weekly schedule.',
        });
    }
};

export const automationScheduleCreateSchema = z
    .object({
        name: z.string().min(1, 'Schedule name is required'),
        scopeType: z.enum(AUTOMATION_SCOPE_TYPES),
        outputType: z.enum(AUTOMATION_OUTPUT_TYPES),
        companyDebtorId: z.string().optional().nullable(),
        warehouseId: z.string().optional().nullable(),
        sourceCompanyId: z.string().optional().nullable(),
        sourceWarehouseId: z.string().optional().nullable(),
        companyStockPricingTypeId: z.string().optional().nullable(),
        frequency: z.enum(AUTOMATION_FREQUENCIES),
        weekday: z.number().min(0).max(6).optional().nullable(),
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Local time must be HH:mm'),
        timezone: z.string().refine((tz) => validTimezones.includes(tz), { message: 'Invalid timezone' }),
        enabled: z.boolean().optional(),
    })
    .superRefine(automationScopeChecks)
    .superRefine(automationTimingChecks);

export type AutomationScheduleCreateSchema = z.infer<typeof automationScheduleCreateSchema>;

// An update only carries the editable fields: name, timing, supply source and the
// enabled flag. The target and the output type are fixed for the life of a schedule.
export const automationScheduleUpdateSchema = z
    .object({
        id: z.string().min(1, 'Schedule id is required'),
        name: z.string().min(1, 'Schedule name is required').optional(),
        sourceCompanyId: z.string().optional().nullable(),
        sourceWarehouseId: z.string().optional().nullable(),
        frequency: z.enum(AUTOMATION_FREQUENCIES).optional(),
        weekday: z.number().min(0).max(6).optional().nullable(),
        localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Local time must be HH:mm').optional(),
        timezone: z.string().refine((tz) => validTimezones.includes(tz), { message: 'Invalid timezone' }).optional(),
        enabled: z.boolean().optional(),
    })
    .superRefine(automationTimingChecks);

export type AutomationScheduleUpdateSchema = z.infer<typeof automationScheduleUpdateSchema>;

// --------------------------------------- Responses ---------------------------------------

export interface MutateAutomationScheduleResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentAutomationSchedule;
}

export interface GetAutomationSchedulesResponse {
    success?: boolean;
    message?: string;
    count?: number;
    data?: { count?: number; rows?: ReplenishmentAutomationSchedule[] } | ReplenishmentAutomationSchedule[];
}

export interface GetAutomationScheduleResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentAutomationSchedule;
}

export interface GetAutomationHistoryResponse {
    success?: boolean;
    message?: string;
    count?: number;
    data?: { count?: number; rows?: ReplenishmentAutomationExecution[] } | ReplenishmentAutomationExecution[];
}

export interface MutateAutomationExecutionResponse {
    success?: boolean;
    message?: string;
    data?: ReplenishmentAutomationExecution;
}

// The list endpoints answer with data.rows / data.count. A bare array is accepted too
// so a backend that returns the collection directly still renders.
export const getAutomationSchedules = (res?: GetAutomationSchedulesResponse): ReplenishmentAutomationSchedule[] => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    return data?.rows || [];
};

export const getAutomationScheduleCount = (res?: GetAutomationSchedulesResponse): number => {
    const data = res?.data;
    if (data && !Array.isArray(data) && typeof data.count === 'number') return data.count;
    if (typeof res?.count === 'number') return res.count;
    return getAutomationSchedules(res).length;
};

export const getAutomationExecutions = (res?: GetAutomationHistoryResponse): ReplenishmentAutomationExecution[] => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    return data?.rows || [];
};

export const getAutomationExecutionCount = (res?: GetAutomationHistoryResponse): number => {
    const data = res?.data;
    if (data && !Array.isArray(data) && typeof data.count === 'number') return data.count;
    if (typeof res?.count === 'number') return res.count;
    return getAutomationExecutions(res).length;
};

export const getAutomationExecutionStatus = (execution?: ReplenishmentAutomationExecution | null): string =>
    (execution?.status || 'PENDING').toUpperCase();

export const getAutomationExecutionDocuments = (
    execution?: ReplenishmentAutomationExecution | null,
): ReplenishmentAutomationDocument[] => {
    const docs = execution?.documents;
    return Array.isArray(docs) ? docs : [];
};

// --------------------------------------- Endpoints ---------------------------------------

export interface AutomationScheduleListProps {
    limit?: number;
    offset?: number;
}

export const useGetAutomationSchedules = (props: AutomationScheduleListProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentAutomation), 'all', props],
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentAutomation.all.url,
                method: apiUrls.replenishmentAutomation.all.method,
                data: props,
            })).data as GetAutomationSchedulesResponse,
    });
};

export const useGetAutomationSchedule = (id: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentAutomation), 'get', id],
        enabled: !!id,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentAutomation.get.url,
                method: apiUrls.replenishmentAutomation.get.method,
                data: { id },
            })).data as GetAutomationScheduleResponse,
    });
};

export async function saveAutomationSchedule(
    data: AutomationScheduleCreateSchema | AutomationScheduleUpdateSchema,
): Promise<MutateAutomationScheduleResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishmentAutomation.save.url,
            method: apiUrls.replenishmentAutomation.save.method,
            data,
        })
    ).data;
}

export const useSaveAutomationSchedule = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: AutomationScheduleCreateSchema | AutomationScheduleUpdateSchema) => saveAutomationSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishmentAutomation)] });
        },
    });
};

export interface AutomationHistoryProps {
    scheduleId?: string | null;
    limit?: number;
    offset?: number;
}

export const useGetAutomationHistory = (props: AutomationHistoryProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.replenishmentAutomation), 'history', props],
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.replenishmentAutomation.history.url,
                method: apiUrls.replenishmentAutomation.history.method,
                data: {
                    ...(props.scheduleId ? { scheduleId: props.scheduleId } : {}),
                    limit: props.limit,
                    offset: props.offset,
                },
            })).data as GetAutomationHistoryResponse,
    });
};

// Retry re-runs a FAILED execution. The id is the execution id, not the schedule id.
// The backend re-runs the same execution, so no replacement order is created by the FE.
export async function retryAutomationExecution(id: string): Promise<MutateAutomationExecutionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.replenishmentAutomation.retry.url,
            method: apiUrls.replenishmentAutomation.retry.method,
            data: { id },
        })
    ).data;
}

export const useRetryAutomationExecution = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => retryAutomationExecution(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.replenishmentAutomation)] });
        },
    });
};

// --------------------------------------- Generated documents ---------------------------------------
//
// The automation history returns the id of the document it created. The documents are
// read only here: the user continues in the existing authorised order workflow.

export const useGetAutomationPurchaseOrder = (documentId: string | null) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.purchaseOrder), 'automation', documentId],
        enabled: !!documentId,
        queryFn: async () =>
            (await axiosInstance({
                url: apiUrls.purchaseOrder.get.url,
                method: apiUrls.purchaseOrder.get.method,
                // The endpoint resolves the purchase order by `id`; `orderId` is sent as
                // well so both contracts point at the same document.
                data: { id: documentId, orderId: documentId },
            })).data as GetPurchaseOrderByIdResponse,
    });
};
