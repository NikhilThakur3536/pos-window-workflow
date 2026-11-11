import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- UNITS OF MEASURE ---------------------------------------
//
// A UOM is a REST resource rather than the usual /all + /get + /update master in this
// codebase, so GET calls pass filters as query `params` and the id travels in the path.
//
//   GET    /api/company/uom?limit&offset
//   POST   /api/company/uom                    { name, code, description, status }
//   GET    /api/company/uom/{id}
//   PUT    /api/company/uom/{id}               { name, code, description, status }
//   DELETE /api/company/uom/{id}
//
// A conversion expresses how many child units make up one main unit, e.g. 1 UNIT = 6 SHRINK:
//
//   GET    /api/company/uom/conversion?limit&offset
//   POST   /api/company/uom/conversion        { mainUomId, childUomId, conversionFactor }

export const UOM_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
export type UomStatus = (typeof UOM_STATUSES)[number];

export interface UomDetails {
  id: string;
  name: string;
  code: string;
  description?: string;
  categoryId: string;
  dimensionType: string;
  isMain: boolean;
  rounding: number;
  status: string;
  domainId: string;
  companyId: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface UomConversionDetails {
    id: string;
    mainUomId: string;
    childUomId: string;
    conversionFactor: number;
    companyId?: string;
    domainId?: string;
    createdAt?: string;
    updatedAt?: string;
    // Joined UOMs, when the endpoint expands them for display.
    mainUom?: UomDetails | null;
    childUom?: UomDetails | null;
    [key: string]: unknown;
}

export type UomFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: UomStatus;
};

export interface GetUomResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: UomDetails[];
    };
}

export async function getUoms(props: UomFilterProps): Promise<GetUomResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.list.url,
            method: apiUrls.uom.list.method,
            params: props,
        })
    ).data;
}

export const useGetUoms = (props: UomFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.uom), props],
        queryFn: async () => await getUoms(props),
    });
};

// Cap the page size so the whole UOM set arrives in one call for dropdowns.

export const useGetActiveUoms = (enabled = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.uom), { status: 'ACTIVE', limit: 100 }],
        queryFn: async () => await getUoms({ status: 'ACTIVE', limit: 100, offset: 0 }),
        enabled,
        staleTime: 60_000,
    });
};

export interface GetUomByIdResponse {
    success: boolean;
    message?: string;
    data: UomDetails | null;
}

export async function getUomById(id: string): Promise<GetUomByIdResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.get.url(id),
            method: apiUrls.uom.get.method,
        })
    ).data;
}

export const useGetUomById = (id?: string) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.uom.get), id],
        queryFn: async () => await getUomById(id as string),
        enabled: !!id,
    });
};

const uomBaseSchema = z.object({
    name: z.string().min(1, 'UOM name is required'),
    code: z.string().min(1, 'UOM code is required'),
    description: z.string().optional(),
    status: z.enum(UOM_STATUSES).optional(),
});

// Create and update take the same body; the update only differs in carrying the id in
// the PUT path, so one schema serves both.
export const uomCreateSchema = uomBaseSchema;
export const uomUpdateSchema = uomBaseSchema;

export type UomCreateSchema = z.infer<typeof uomCreateSchema>;
export type UomUpdateSchema = UomCreateSchema;

export type MutateUomResponse = {
    success: boolean;
    message?: string;
    data?: UomDetails | null;
};

export async function createUom(data: UomCreateSchema): Promise<MutateUomResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.create.url,
            method: apiUrls.uom.create.method,
            data,
        })
    ).data;
}

export const useCreateUom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUom,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.uom)] });
        },
    });
};

export async function updateUom(id: string, data: UomUpdateSchema): Promise<MutateUomResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.update.url(id),
            method: apiUrls.uom.update.method,
            data,
        })
    ).data;
}

export const useUpdateUom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...data }: UomUpdateSchema & { id: string }) => updateUom(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.uom)] });
        },
    });
};

export async function removeUom(id: string): Promise<MutateUomResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.delete.url(id),
            method: apiUrls.uom.delete.method,
        })
    ).data;
}

export const useRemoveUom = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeUom,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.uom)] });
        },
    });
};

// --------------------------------------- UOM CONVERSIONS ---------------------------------------

export type UomConversionFilterProps = {
    limit?: number;
    offset?: number;
};

export interface GetUomConversionResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: UomConversionDetails[];
    };
}

export async function getUomConversions(props: UomConversionFilterProps): Promise<GetUomConversionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.conversionList.url,
            method: apiUrls.uom.conversionList.method,
            params: props,
        })
    ).data;
}

export const useGetUomConversions = (props: UomConversionFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.uom.conversionList), props],
        queryFn: async () => await getUomConversions(props),
    });
};

// The factor is kept as a plain number (the form converts the input) rather than
// z.coerce, so the schema's input and output types stay identical and the resolver
// types line up. The self-conversion rule is enforced in the form, which can also
// filter the UOM out of the child dropdown.
export const uomConversionBaseSchema = z.object({
    mainUomId: z.string().min(1, 'Main UOM is required'),
    childUomId: z.string().min(1, 'Child UOM is required'),
    conversionFactor: z.number().positive('Conversion factor must be greater than zero'),
});

export const uomConversionCreateSchema = uomConversionBaseSchema;

export type UomConversionCreateSchema = z.infer<typeof uomConversionCreateSchema>;

export type MutateUomConversionResponse = {
    success: boolean;
    message?: string;
    data?: UomConversionDetails | null;
};

export async function createUomConversion(data: UomConversionCreateSchema): Promise<MutateUomConversionResponse> {
    return (
        await axiosInstance({
            url: apiUrls.uom.conversionCreate.url,
            method: apiUrls.uom.conversionCreate.method,
            data,
        })
    ).data;
}

export const useCreateUomConversion = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createUomConversion,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.uom.conversionList)] });
        },
    });
};

// Prefer the code, then the name, then the primary key.

export const uomLabel = (uom?: UomDetails | null): string => {
    if (!uom) return '';
    return uom.code || uom.name || uom.id;
};
