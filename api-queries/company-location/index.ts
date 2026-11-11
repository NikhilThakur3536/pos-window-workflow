import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// ---------------------------------------
// SHARED TYPES
// ---------------------------------------

export interface BaseLocationEntity {
    id: string;
    name: string;
    code: string;
    timezone: string;
    companyId: string | null;
    createdAt: string;
    updatedAt: string;
}

export type MutateLocationResponse<T> = {
    success: boolean;
    message?: string;
    data?: T;
};

export interface ListLocationResponse<T> {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: T[];
    };
}

export interface GetLocationResponse<T> {
    success: boolean;
    message?: string;
    data: T;
}


// ============================================================================
// 1. COUNTRY
// ============================================================================

export interface CompanyCountry extends BaseLocationEntity {
    regionId?: string | null;
    subRegionId?: string | null;
}

export const companyCountryAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    regionId: z.string().optional(),
    subRegionId: z.string().optional(),
    timezone: z.string(),
});

export type CompanyCountryAddSchema = z.infer<typeof companyCountryAddSchema>;

export const companyCountryEditSchema = companyCountryAddSchema.partial().extend({
    id: z.string(),
});

export type CompanyCountryEditSchema = z.infer<typeof companyCountryEditSchema>;

export async function getCompanyCountries(): Promise<ListLocationResponse<CompanyCountry>> {
    return (
        await axiosInstance({
            url: apiUrls.location.country.list.url,
            method: apiUrls.location.country.list.method,
            data: {},
        })
    ).data;
}

export const useGetCompanyCountries = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.country)],
        queryFn: async () => await getCompanyCountries(),
    });
};

export async function createCompanyCountry(
    data: CompanyCountryAddSchema
): Promise<MutateLocationResponse<CompanyCountry>> {
    return (
        await axiosInstance({
            url: apiUrls.location.country.create.url,
            method: apiUrls.location.country.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyCountry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.country)],
            });
        },
    });
};

export async function editCompanyCountry(
    data: CompanyCountryEditSchema
): Promise<MutateLocationResponse<CompanyCountry>> {
    return (
        await axiosInstance({
            url: apiUrls.location.country.update.url,
            method: apiUrls.location.country.update.method,
            data,
        })
    ).data;
}

export const useEditCompanyCountry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: editCompanyCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.country)],
            });
        },
    });
};

export async function removeCompanyCountry(
    id: string
): Promise<MutateLocationResponse<null>> {
    return (
        await axiosInstance({
            url: apiUrls.location.country.delete.url,
            method: apiUrls.location.country.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyCountry = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeCompanyCountry,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.country)],
            });
        },
    });
};


// ============================================================================
// 2. STATE (Province)
// ============================================================================

export interface CompanyState extends BaseLocationEntity {
    countryId: string;
}

export type CompanyStateFilterProps = {
    countryId: string;
};

export const companyStateAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    countryId: z.string(),
    timezone: z.string(),
});

export type CompanyStateAddSchema = z.infer<typeof companyStateAddSchema>;

export const companyStateEditSchema = companyStateAddSchema.partial().extend({
    id: z.string(),
});

export type CompanyStateEditSchema = z.infer<typeof companyStateEditSchema>;

export async function getCompanyStates(
    props: CompanyStateFilterProps
): Promise<ListLocationResponse<CompanyState>> {
    return (
        await axiosInstance({
            url: apiUrls.location.state.list.url,
            method: apiUrls.location.state.list.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyStates = (props: CompanyStateFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.state), props],
        queryFn: async () => await getCompanyStates(props),
        enabled: !!props.countryId,
    });
};

export async function createCompanyState(
    data: CompanyStateAddSchema
): Promise<MutateLocationResponse<CompanyState>> {
    return (
        await axiosInstance({
            url: apiUrls.location.state.create.url,
            method: apiUrls.location.state.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyState,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.state)],
            });
        },
    });
};

export async function editCompanyState(
    data: CompanyStateEditSchema
): Promise<MutateLocationResponse<CompanyState>> {
    return (
        await axiosInstance({
            url: apiUrls.location.state.update.url,
            method: apiUrls.location.state.update.method,
            data,
        })
    ).data;
}

export const useEditCompanyState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: editCompanyState,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.state)],
            });
        },
    });
};

export async function removeCompanyState(
    id: string
): Promise<MutateLocationResponse<null>> {
    return (
        await axiosInstance({
            url: apiUrls.location.state.delete.url,
            method: apiUrls.location.state.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyState = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeCompanyState,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.state)],
            });
        },
    });
};


// ============================================================================
// 3. DISTRICT
// ============================================================================

export interface CompanyDistrict extends BaseLocationEntity {
    stateId: string;
    countryId?: string;
}

export type CompanyDistrictFilterProps = {
    stateId: string;
};

export const companyDistrictAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    stateId: z.string(),
    timezone: z.string(),
});

export type CompanyDistrictAddSchema = z.infer<typeof companyDistrictAddSchema>;

export const companyDistrictEditSchema = companyDistrictAddSchema.partial().extend({
    id: z.string(),
});

export type CompanyDistrictEditSchema = z.infer<typeof companyDistrictEditSchema>;

export async function getCompanyDistricts(
    props: CompanyDistrictFilterProps
): Promise<ListLocationResponse<CompanyDistrict>> {
    return (
        await axiosInstance({
            url: apiUrls.location.district.list.url,
            method: apiUrls.location.district.list.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyDistricts = (props: CompanyDistrictFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.district), props],
        queryFn: async () => await getCompanyDistricts(props),
        enabled: !!props.stateId,
    });
};

export async function createCompanyDistrict(
    data: CompanyDistrictAddSchema
): Promise<MutateLocationResponse<CompanyDistrict>> {
    return (
        await axiosInstance({
            url: apiUrls.location.district.create.url,
            method: apiUrls.location.district.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyDistrict = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyDistrict,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.district)],
            });
        },
    });
};

export async function editCompanyDistrict(
    data: CompanyDistrictEditSchema
): Promise<MutateLocationResponse<CompanyDistrict>> {
    return (
        await axiosInstance({
            url: apiUrls.location.district.update.url,
            method: apiUrls.location.district.update.method,
            data,
        })
    ).data;
}

export const useEditCompanyDistrict = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: editCompanyDistrict,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.district)],
            });
        },
    });
};

export async function removeCompanyDistrict(
    id: string
): Promise<MutateLocationResponse<null>> {
    return (
        await axiosInstance({
            url: apiUrls.location.district.delete.url,
            method: apiUrls.location.district.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyDistrict = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeCompanyDistrict,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.district)],
            });
        },
    });
};


// ============================================================================
// 4. CITY
// ============================================================================

export interface CompanyCity extends BaseLocationEntity {
    districtId: string;
    stateId?: string;
    countryId?: string;
}

export type CompanyCityFilterProps = {
    districtId: string;
};

export const companyCityAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    districtId: z.string(),
    timezone: z.string(),
});

export type CompanyCityAddSchema = z.infer<typeof companyCityAddSchema>;

export const companyCityEditSchema = companyCityAddSchema.partial().extend({
    id: z.string(),
});

export type CompanyCityEditSchema = z.infer<typeof companyCityEditSchema>;

export async function getCompanyCities(
    props: CompanyCityFilterProps
): Promise<ListLocationResponse<CompanyCity>> {
    return (
        await axiosInstance({
            url: apiUrls.location.city.list.url,
            method: apiUrls.location.city.list.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyCities = (props: CompanyCityFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.city), props],
        queryFn: async () => await getCompanyCities(props),
        enabled: !!props.districtId,
    });
};

export async function createCompanyCity(
    data: CompanyCityAddSchema
): Promise<MutateLocationResponse<CompanyCity>> {
    return (
        await axiosInstance({
            url: apiUrls.location.city.create.url,
            method: apiUrls.location.city.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyCity = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyCity,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.city)],
            });
        },
    });
};

export async function editCompanyCity(
    data: CompanyCityEditSchema
): Promise<MutateLocationResponse<CompanyCity>> {
    return (
        await axiosInstance({
            url: apiUrls.location.city.update.url,
            method: apiUrls.location.city.update.method,
            data,
        })
    ).data;
}

export const useEditCompanyCity = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: editCompanyCity,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.city)],
            });
        },
    });
};

export async function removeCompanyCity(
    id: string
): Promise<MutateLocationResponse<null>> {
    return (
        await axiosInstance({
            url: apiUrls.location.city.delete.url,
            method: apiUrls.location.city.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyCity = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeCompanyCity,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.city)],
            });
        },
    });
};


// ============================================================================
// 5. AREA
// ============================================================================

export interface CompanyArea extends BaseLocationEntity {
    cityId: string;
    districtId?: string;
    stateId?: string;
    countryId?: string;
}

export type CompanyAreaFilterProps = {
    cityId: string;
};

export const companyAreaAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    cityId: z.string(),
    timezone: z.string(),
});

export type CompanyAreaAddSchema = z.infer<typeof companyAreaAddSchema>;

export const companyAreaEditSchema = companyAreaAddSchema.partial().extend({
    id: z.string(),
});

export type CompanyAreaEditSchema = z.infer<typeof companyAreaEditSchema>;

export async function getCompanyAreas(
    props: CompanyAreaFilterProps
): Promise<ListLocationResponse<CompanyArea>> {
    return (
        await axiosInstance({
            url: apiUrls.location.area.list.url,
            method: apiUrls.location.area.list.method,
            data: props,
        })
    ).data;
}

export const useGetCompanyAreas = (props: CompanyAreaFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.area), props],
        queryFn: async () => await getCompanyAreas(props),
        enabled: !!props.cityId,
    });
};

export async function createCompanyArea(
    data: CompanyAreaAddSchema
): Promise<MutateLocationResponse<CompanyArea>> {
    return (
        await axiosInstance({
            url: apiUrls.location.area.create.url,
            method: apiUrls.location.area.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyArea = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyArea,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.area)],
            });
        },
    });
};

export async function editCompanyArea(
    data: CompanyAreaEditSchema
): Promise<MutateLocationResponse<CompanyArea>> {
    return (
        await axiosInstance({
            url: apiUrls.location.area.update.url,
            method: apiUrls.location.area.update.method,
            data,
        })
    ).data;
}

export const useEditCompanyArea = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: editCompanyArea,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.area)],
            });
        },
    });
};

export async function removeCompanyArea(
    id: string
): Promise<MutateLocationResponse<null>> {
    return (
        await axiosInstance({
            url: apiUrls.location.area.delete.url,
            method: apiUrls.location.area.delete.method,
            data: { id },
        })
    ).data;
}

export const useRemoveCompanyArea = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: removeCompanyArea,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.area)],
            });
        },
    });
};


// ============================================================================
// 6. REGION  (no company-privacy tier - top of hierarchy, domain-managed;
// company endpoint only exposes list + add)
// ============================================================================

export interface CompanyRegion extends BaseLocationEntity {}

export const companyRegionAddSchema = z.object({
    name: z.string(),
    code: z.string(),
    timezone: z.string(),
});

export type CompanyRegionAddSchema = z.infer<typeof companyRegionAddSchema>;

export async function getCompanyRegions(): Promise<ListLocationResponse<CompanyRegion>> {
    return (
        await axiosInstance({
            url: apiUrls.location.region.list.url,
            method: apiUrls.location.region.list.method,
            data: {},
        })
    ).data;
}

export const useGetCompanyRegions = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.region)],
        queryFn: async () => await getCompanyRegions(),
    });
};

export async function createCompanyRegion(
    data: CompanyRegionAddSchema
): Promise<MutateLocationResponse<CompanyRegion>> {
    return (
        await axiosInstance({
            url: apiUrls.location.region.create.url,
            method: apiUrls.location.region.create.method,
            data,
        })
    ).data;
}

export const useCreateCompanyRegion = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createCompanyRegion,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [getApiKey(apiUrls.location.region)],
            });
        },
    });
};


// ============================================================================
// 7. SUB REGION  (no company-privacy tier; company endpoint only exposes list)
// ============================================================================

export interface CompanySubRegion extends BaseLocationEntity {
    regionId: string;
}

export type CompanySubRegionFilterProps = {
    regionId: string;
};

export async function getCompanySubRegions(
    props: CompanySubRegionFilterProps
): Promise<ListLocationResponse<CompanySubRegion>> {
    return (
        await axiosInstance({
            url: apiUrls.location.subRegion.list.url,
            method: apiUrls.location.subRegion.list.method,
            data: props,
        })
    ).data;
}

export const useGetCompanySubRegions = (props: CompanySubRegionFilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.subRegion), props],
        queryFn: async () => await getCompanySubRegions(props),
        enabled: !!props.regionId,
    });
};


// ============================================================================
// 8. LOCATION CONFIGURATION  (company-scoped read-only view of the domain's
// single configuration record; company endpoint only exposes list + get)
// ============================================================================

export interface CompanyLocationConfiguration {
    id: string;
    showRegion: string;
    showSubRegion: string;
    showCountry: string;
    showState: string;
    showDistrict: string;
    showCity: string;
    showArea: string;
    createdAt: string;
    updatedAt: string;
}

export async function getCompanyLocationConfigurations(): Promise<
    ListLocationResponse<CompanyLocationConfiguration>
> {
    return (
        await axiosInstance({
            url: apiUrls.location.locationConfigurations.list.url,
            method: apiUrls.location.locationConfigurations.list.method,
            data: {},
        })
    ).data;
}

export const useGetCompanyLocationConfigurations = () => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.location.locationConfigurations)],
        queryFn: async () => await getCompanyLocationConfigurations(),
    });
};

// export async function getCompanyLocationConfigurationById(
//     id: string
// ): Promise<GetLocationResponse<CompanyLocationConfiguration>> {
//     return (
//         await axiosInstance({
//             url: apiUrls.location.locationConfigurations.get.url,
//             method: apiUrls.locationConfigurations.get.method,
//             data: { id },
//         })
//     ).data;
// }

// export const useGetCompanyLocationConfigurationById = (id: string) => {
//     return useQuery({
//         queryKey: [getApiKey(apiUrls.locationConfiguration), id],
//         queryFn: async () => await getCompanyLocationConfigurationById(id),
//         enabled: !!id,
//     });
// };