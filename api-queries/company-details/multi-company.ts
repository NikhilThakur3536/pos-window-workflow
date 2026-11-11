import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// ======================================= COMPANY DATA / MASTER =======================================

export interface Company {
    id: string;
    timezone: string;
    status: string;
    companyIdentificationNumber: number;
    companyName: string;
    addressLineOne: string;
    addressLineTwo?: string;
    addressLineThree?: string;
    addressLineFour?: string;
    postalCode: string;
    stateId: string;
    telephone: string;
    faxNumber?: string;
    emailAddress: string;
    taxNumber?: string;
    companyRegistrationNumber?: string;
    bankAccountNumber: string;
    bankName: string;
    bankBranchCode: string;
    bankAccountType: string;
    characterSetId: string;
    languageId: string;
    customsCode?: string;
    allowInterCompanyTransfers?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface GetCompaniesResponse {
    success: boolean;
    message: string;
    count: number;
    data: Company[];
}

export interface GetCompanyByIdResponse {
    success: boolean;
    data: Company;
}

export type MutateCompanyResponse = {
    success: boolean;
};

// Schemas
export const companyBaseSchema = z.object({
    companyIdentificationNumber: z.number().min(1),
    companyName: z.string().min(1),
    addressLineOne: z.string().min(1),
    addressLineTwo: z.string().optional(),
    addressLineThree: z.string().optional(),
    addressLineFour: z.string().optional(),
    postalCode: z.string().min(1),
    stateId: z.string(),
    telephone: z.string().min(1),
    faxNumber: z.string().optional(),
    emailAddress: z.string().email(),
    taxNumber: z.string().optional(),
    companyRegistrationNumber: z.string().optional(),
    bankAccountNumber: z.string().min(1),
    bankName: z.string().min(1),
    bankBranchCode: z.string().min(1),
    bankAccountType: z.string().min(1),
    allowInterCompanyTransfers: z.boolean().optional(),
    characterSetId: z.string().min(1),
    languageId: z.string().min(1),
    customsCode: z.string().optional(),
});

export const companyCreateSchema = companyBaseSchema.extend({
    timezone: z.string().refine((tz) => validTimezones.includes(tz), {
        message: 'Invalid timezone',
    }),
});

export const companyUpdateSchema = companyBaseSchema.extend({
    id: z.string(),
});

export type CompanyCreateSchema = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateSchema = z.infer<typeof companyUpdateSchema>;

// Company Data - Create
export async function createCompanyData(data: CompanyCreateSchema): Promise<MutateCompanyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.company.data.create.url,
            method: apiUrls.company.data.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyData = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyData,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.company.data)] }),
    });
};

// Company Data - Update
export async function updateCompanyData(data: CompanyUpdateSchema): Promise<MutateCompanyResponse> {
    const { id, bankAccountNumber, ...payload } = data;
    void bankAccountNumber;
    return (
        await axiosInstance({
            url: apiUrls.company.data.update.url(id),
            method: apiUrls.company.data.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateCompanyData = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompanyData,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.company.data)] }),
    });
};

// Company Data - Get One
export async function getCompanyData(id: string): Promise<GetCompanyByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.company.data.get.url(id),
            method: apiUrls.company.data.get.method,
        })
    ).data;
}

export const useGetCompanyData = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.company.data), id],
        queryFn: () => getCompanyData(id),
        enabled: !!id,
    });
};

// Company Data - List All
export async function getAllCompanyData(props: { limit?: number; offset?: number; search?: string; status?: string } = {}) {
    return (
        await axiosInstance({
            url: apiUrls.company.data.all.url,
            method: apiUrls.company.data.all.method,
            params: props,
        })
    ).data;
}

export const useGetAllCompanyData = (props = {}) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.company.data), 'all', props],
        queryFn: () => getAllCompanyData(props),
    });
};

// ================================= INTER-COMPANY MAPPINGS =================================

export interface InterCompanyTransfer {
    id: string;
    sourceCompanyId: string;
    destinationCompanyId: string;
    childPermissionGroupId?: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    sourceCompany?: { id: string; companyName: string };
    destinationCompany?: { id: string; companyName: string };
    childPermissionGroup?: { id: string; name: string } | null;
}

export interface CreateInterCompanyTransferPayload {
    sourceCompanyId: string;
    destinationCompanyId: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface UpdateInterCompanyTransferPayload {
    id: string;
    destinationCompanyId?: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

// Create Mapping
export async function createInterCompanyMapping(data: CreateInterCompanyTransferPayload) {
    return (
        await axiosInstance({
            url: apiUrls.company.interCompanyTransfers.create.url,
            method: apiUrls.company.interCompanyTransfers.create.method,
            data,
        })
    ).data;
}

export const useCreateInterCompanyMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createInterCompanyMapping,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.company.interCompanyTransfers)] }),
    });
};

// Update Mapping
export async function updateInterCompanyMapping(data: UpdateInterCompanyTransferPayload) {
    return (
        await axiosInstance({
            url: apiUrls.company.interCompanyTransfers.update.url,
            method: apiUrls.company.interCompanyTransfers.update.method,
            data,
        })
    ).data;
}

export const useUpdateInterCompanyMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateInterCompanyMapping,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.company.interCompanyTransfers)] }),
    });
};

// Get One Mapping
export async function getInterCompanyMapping(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.company.interCompanyTransfers.get.url,
            method: apiUrls.company.interCompanyTransfers.get.method,
            data: { id },
        })
    ).data;
}

export const useGetInterCompanyMapping = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.company.interCompanyTransfers), id],
        queryFn: () => getInterCompanyMapping(id),
    });
};

// List Mappings
export async function listInterCompanyMappings(sourceCompanyId?: string) {
    return (
        await axiosInstance({
            url: apiUrls.company.interCompanyTransfers.list.url,
            method: apiUrls.company.interCompanyTransfers.list.method,
            data: {sourceCompanyId} ,
        })
    ).data;
}

export const useListInterCompanyMappings = (sourceCompanyId?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.company.interCompanyTransfers), sourceCompanyId],
        queryFn: () => listInterCompanyMappings(sourceCompanyId),
    });
};

// Delete Mapping
export async function deleteInterCompanyMapping(id: string) {
    return (
        await axiosInstance({
            url: apiUrls.company.interCompanyTransfers.delete.url,
            method: apiUrls.company.interCompanyTransfers.delete.method,
            data: { id },
        })
    ).data;
}

export const useDeleteInterCompanyMapping = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteInterCompanyMapping,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.company.interCompanyTransfers)] }),
    });
};

// ======================================= REPORT =======================================

export async function getInventorySummaryReport(payload: any) {
    return (
        await axiosInstance({
            url: apiUrls.company.reports.inventorySummary.url,
            method: apiUrls.company.reports.inventorySummary.method,
            data: payload,
        })
    ).data;
}

export const useInventorySummaryReport = (payload: any, enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.company.reports.inventorySummary), payload],
        queryFn: () => getInventorySummaryReport(payload),
        enabled,
    });
};