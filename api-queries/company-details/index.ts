import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { boolean, z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';
import { useNetworkStore } from '@/stores/network.store';

const validTimezones = moment.tz.names();

// --------------------------------------- COMPANIES ---------------------------------------

// Companies Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface Company {
    id: string;
    timezone: string;
    status: string;
    companyIdentificationNumber: number;
    interCompanyTransferDestinationCompanyIds: string[];
    companyName: string;
    addressLineOne: string;
    addressLineTwo: string;
    addressLineThree: string;
    addressLineFour: string;
    postalCode: string;
    stateId: string;
    telephone: string;
    faxNumber: string;
    emailAddress: string;
    taxNumber: string;
    companyRegistrationNumber: string;
    bankAccountNumber: string;
    bankName: string;
    bankBranchCode: string;
    bankAccountType: string;
    characterSetId: string;
    languageId: string;
    customsCode: string;
    allowInterCompanyTransfers: boolean,
    // storeId: string;
    // storeContactName: string;
    // storeRegion: string;
    // storeCategory: string;
    // storeSize: string;
    createdAt: string;
    updatedAt: string;
}

export interface GetCompaniesResponse {
    success: boolean;
    message: string;
    count: number;
    data: Company[];
}

export async function getCompanies(props: FilterProps, token?: string): Promise<GetCompaniesResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companies.list.url,
            method: apiUrls.companies.list.method,
            params: props,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
    ).data;
}

export const useGetCompanies = (props: FilterProps, token?: string, enabled?: boolean) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companies), props, token, enabled],
        queryFn: async () => await getCompanies(props, token),
        enabled: enabled || !!token || true,
    });
};

// Company Get By Id
export interface GetCompanyByIdResponse {
    success: boolean;
    data: Company;
}

export async function getCompanyById(id: string): Promise<GetCompanyByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companies.get.url(id),
            method: apiUrls.companies.get.method,
        })
    ).data;
}

export const useGetCompanyById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.companies), id],
        queryFn: async () => await getCompanyById(id),
    });
};

// Company Create

export const companyBaseSchema = z.object({
    interCompanyTransferDestinationCompanyIds: z.array(z.string()).optional().default([]),    
    companyIdentificationNumber: z.number().min(1, 'Company Identification Number is required'),
    companyName: z.string().min(1, 'Company Name is required'),
    addressLineOne: z.string().min(1, 'Address Line 1 is required'),
    addressLineTwo: z.string().optional(),
    addressLineThree: z.string().optional(),
    addressLineFour: z.string().optional(),
    postalCode: z.string().min(1, 'Postal Code is required'),
    stateId: z.string(),
    telephone: z.string().min(1, 'Telephone is required'),
    faxNumber: z.string().optional(),
    emailAddress: z.email(),
    taxNumber: z.string().optional(),
    customsCode: z.string().optional(),
    companyRegistrationNumber: z.string().optional(),

    // Bank Account Details
    bankAccountNumber: z.string().min(1, 'Bank Account Number is required'),
    bankName: z.string().min(1, 'Bank Name is required'),
    bankBranchCode: z.string().min(1, 'Bank Branch Code is required'),
    bankAccountType: z.string().min(1, 'Bank Account Type is required'),
    allowInterCompanyTransfers: z.boolean().optional(),
    // System settings
    characterSetId: z.string().min(1, 'Character Set is required'),
    languageId: z.string().min(1, 'Language is required'),

    // Store Details
    // storeId: z.string().optional(),
    // storeContactName: z.string().optional(),
    // storeRegion: z.string().optional(),
    // storeCategory: z.string().optional(),
    // storeSize: z.string().optional(),
});

export const companyCreateSchema = companyBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type CompanyCreateSchema = z.infer<typeof companyCreateSchema>;
export type CompanyCreateInput = z.input<typeof companyCreateSchema>;

export type MutateCompanyResponse = {
    success: boolean;
};

export async function createCompany(data: CompanyCreateSchema): Promise<MutateCompanyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companies.create.url,
            method: apiUrls.companies.create.method,
            data,
        })
    ).data;
}

export const useCreateCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companies)] });
        },
    });
};

// Company Update

export const companyUpdateSchema = companyBaseSchema.extend({ id: z.string() });

export type CompanyUpdateSchema = z.infer<typeof companyUpdateSchema>;
// Input type equivalent for the update schema (see CompanyCreateInput above).
export type CompanyUpdateInput = z.input<typeof companyUpdateSchema>;

export async function updateCompany(data: CompanyUpdateSchema): Promise<MutateCompanyResponse> {
    const { id, ...payload } = data;
    return (
        await axiosInstance({
            url: apiUrls.companies.update.url(id),
            method: apiUrls.companies.update.method,
            data: payload,
        })
    ).data;
}

export const useUpdateCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companies)] });
        },
    });
};

// Company Delete

export async function removeCompany(id: string): Promise<MutateCompanyResponse> {
    return (
        await axiosInstance({
            url: apiUrls.companies.delete.url(id),
            method: apiUrls.companies.delete.method,
        })
    ).data;
}

export const useRemoveCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeCompany,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.companies)] });
        },
    });
};