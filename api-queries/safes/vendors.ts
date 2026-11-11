import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import moment from 'moment-timezone';
import { getApiKey } from '@/utils/helpers';

const validTimezones = moment.tz.names();

// --------------------------------------- VENDORS ---------------------------------------

// Vendors Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface VendorDetails {
    id: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
    name: string;
    mobileNumber: string;
    companyName: string;
    companyAddress: string;
}

export interface GetVendorResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: VendorDetails[];
    };
}

export async function getVendors(props: FilterProps): Promise<GetVendorResponse> {
    return (
        await axiosInstance({
            url: apiUrls.vendors.list.url,
            method: apiUrls.vendors.list.method,
            data: props,
        })
    ).data;
}

export const useGetVendors = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.vendors), props],
        queryFn: async () => await getVendors(props),
    });
};

// Vendor Get By Id
export interface GetVendorByIdResponse {
    success: boolean;
    data: VendorDetails;
}

export async function getVendorById(id: string): Promise<GetVendorByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.vendors.get.url,
            method: apiUrls.vendors.get.method,
            data: { id },
        })
    ).data;
}

export const useGetVendorById = (id: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.vendors), id],
        queryFn: async () => await getVendorById(id),
    });
};

// Vendor Create

export const vendorBaseSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    companyName: z.string().min(1, 'Company Name is required'),
    companyAddress: z.string().optional(),
    mobileNumber: z.string().optional(),
});

export const vendorCreateSchema = vendorBaseSchema
    .extend({
        timezone: z.string(),
    })
    .refine((data) => validTimezones.includes(data.timezone), {
        path: ['timezone'],
        message: 'Invalid timezone',
    });

export type VendorCreateSchema = z.infer<typeof vendorCreateSchema>;

export type MutateVendorResponse = {
    success: boolean;
};

export async function createVendor(data: VendorCreateSchema): Promise<MutateVendorResponse> {
    return (
        await axiosInstance({
            url: apiUrls.vendors.create.url,
            method: apiUrls.vendors.create.method,
            data,
        })
    ).data;
}

export const useCreateVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.vendors)] });
        },
    });
};

// Vendor Update

export const vendorUpdateSchema = vendorBaseSchema.extend({ id: z.string() });

export type VendorUpdateSchema = z.infer<typeof vendorUpdateSchema>;

export async function updateVendor(data: VendorUpdateSchema): Promise<MutateVendorResponse> {
    return (
        await axiosInstance({
            url: apiUrls.vendors.update.url,
            method: apiUrls.vendors.update.method,
            data,
        })
    ).data;
}

export const useUpdateVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.vendors)] });
        },
    });
};

// Vendor Delete

export async function removeVendor(vendorId: string): Promise<MutateVendorResponse> {
    return (
        await axiosInstance({
            url: apiUrls.vendors.delete.url,
            method: apiUrls.vendors.delete.method,
            data: { vendorId },
        })
    ).data;
}

export const useRemoveVendor = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeVendor,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.vendors)] });
        },
    });
};
