import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import moment from 'moment-timezone';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- DEBTOR GROUPS (companyDebtorGroup) ---------------------------------------
//
// A debtor group is the master that lets one receipt be allocated across the invoices
// of several debtors (3022 group payment allocation). The allocation backend resolves
// the group from the receipt's debtor, so a group is only useful once debtors have
// been assigned a companyDebtorGroupId.
//
//   POST /api/company/companyDebtorGroup/create  { groupId, description, timezone }
//   POST /api/company/companyDebtorGroup/all     { limit, offset, status }
//   POST /api/company/companyDebtorGroup/get     { id }
//   POST /api/company/companyDebtorGroup/update  { id, groupId, description, status, timezone }
//   POST /api/company/companyDebtorGroup/delete  { id }
//
// Note the two identifiers: `groupId` is the human-readable code the user types
// ("GROUP-TEST") and is unique per company, while `id` is the generated primary key.
// Assignments to debtors use `id`, not `groupId`.

export const DEBTOR_GROUP_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type DebtorGroupStatus = (typeof DEBTOR_GROUP_STATUSES)[number];

export interface CompanyDebtorGroupDetails {
    id: string;
    groupId: string;
    description?: string;
    status?: DebtorGroupStatus | string;
    timezone?: string;
    companyId?: string;
    domainId?: string;
    createdAt?: string;
    updatedAt?: string;
    // Populated by some list/get responses so the group can be labelled in a dropdown.
    CompanyDebtorGroups?: { id: string; groupId: string; description?: string }[];
    [key: string]: unknown;
}

export type DebtorGroupFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: DebtorGroupStatus;
};

export interface GetDebtorGroupResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: CompanyDebtorGroupDetails[];
    };
}

export async function getDebtorGroups(props: DebtorGroupFilterProps): Promise<GetDebtorGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyDebtorGroup.list.url,
            method: apiUrls.companyDebtorGroup.list.method,
            data: props,
        })
    ).data;
}

export const useGetDebtorGroups = (props: DebtorGroupFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyDebtorGroup), props],
        queryFn: async () => await getDebtorGroups(props),
    });
};

// The "all" endpoint is used to populate the debtor group's dropdown on the debtor
// master. Cap the page size so the whole active set arrives in one call.

export const useGetActiveDebtorGroups = (enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyDebtorGroup), { status: 'ACTIVE', limit: 500 }],
        queryFn: async () => await getDebtorGroups({ status: 'ACTIVE', limit: 500, offset: 0 }),
        enabled,
        staleTime: 60_000,
    });
};

export interface GetDebtorGroupByIdResponse {
    success: boolean;
    message?: string;
    data: CompanyDebtorGroupDetails | null;
}

export async function getDebtorGroupById(id: string): Promise<GetDebtorGroupByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyDebtorGroup.get.url,
            method: apiUrls.companyDebtorGroup.get.method,
            data: { id },
        })
    ).data;
}

export const useGetDebtorGroupById = (id?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companyDebtorGroup.get.url), id],
        queryFn: async () => await getDebtorGroupById(id as string),
        enabled: !!id,
    });
};

const debtorGroupBaseSchema = z.object({
    groupId: z.string().min(1, 'Group ID is required'),
    description: z.string().min(1, 'Description is required'),
    timezone: z
        .string()
        .min(1, 'Timezone is required')
        .refine((tz) => validTimezones.includes(tz), { message: 'Invalid timezone' }),
});

export const debtorGroupCreateSchema = debtorGroupBaseSchema;

export const debtorGroupUpdateSchema = debtorGroupBaseSchema.extend({
    id: z.string().min(1, 'Debtor group ID is required'),
    status: z.enum(DEBTOR_GROUP_STATUSES).optional(),
});

export type DebtorGroupCreateSchema = z.infer<typeof debtorGroupCreateSchema>;
export type DebtorGroupUpdateSchema = z.infer<typeof debtorGroupUpdateSchema>;

export type MutateDebtorGroupResponse = {
    success: boolean;
    message?: string;
    data?: CompanyDebtorGroupDetails | null;
};

export async function createDebtorGroup(data: DebtorGroupCreateSchema): Promise<MutateDebtorGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyDebtorGroup.create.url,
            method: apiUrls.companyDebtorGroup.create.method,
            data,
        })
    ).data;
}

export const useCreateDebtorGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createDebtorGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorGroup)] });
        },
    });
};

export async function updateDebtorGroup(data: DebtorGroupUpdateSchema): Promise<MutateDebtorGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyDebtorGroup.update.url,
            method: apiUrls.companyDebtorGroup.update.method,
            data,
        })
    ).data;
}

export const useUpdateDebtorGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateDebtorGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorGroup)] });
        },
    });
};

export async function removeDebtorGroup(id: string): Promise<MutateDebtorGroupResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companyDebtorGroup.delete.url,
            method: apiUrls.companyDebtorGroup.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveDebtorGroup = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeDebtorGroup,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companyDebtorGroup)] });
        },
    });
};

// Prefer the typed code, then the description, then the primary key.

export const debtorGroupLabel = (group?: CompanyDebtorGroupDetails | null): string => {
    if (!group) return '';
    return group.groupId || group.description || group.id;
};
