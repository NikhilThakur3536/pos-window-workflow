import { useAuthUser } from '@/stores/auth-user.store';
import { apiUrls, axiosInstance } from '..';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

export type LocationFieldDisplayType = 'dropdown' | 'text' | 'hidden';

const locationConfigurationBaseSchema = z.object({
    showRegion: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showSubRegion: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showCountry: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showState: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showDistrict: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showCity: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
    showArea: z.enum(['dropdown', 'text', 'hidden']).default('dropdown'),
});

export const locationConfigurationCreateSchema = locationConfigurationBaseSchema.extend({
    timezone: z.string().min(1, 'Timezone is required'),
});

export type LocationConfigurationCreateSchema = z.infer<typeof locationConfigurationCreateSchema>;

export const locationConfigurationUpdateSchema = locationConfigurationBaseSchema.extend({
    id: z.uuid('Invalid location configuration ID'),
});

export type LocationConfigurationUpdateSchema = z.infer<typeof locationConfigurationUpdateSchema>;

export interface LocationConfigurationDetails {
    id: string;
    showRegion: LocationFieldDisplayType;
    showSubRegion: LocationFieldDisplayType;
    showCountry: LocationFieldDisplayType;
    showState: LocationFieldDisplayType;
    showDistrict: LocationFieldDisplayType;
    showCity: LocationFieldDisplayType;
    showArea: LocationFieldDisplayType;
    timezone: string;
    status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
    domainId: string;
    createdAt: string;
    updatedAt: string;
}

export type LocationConfigurationFilterProps = {
    limit?: number;
    offset?: number;
    status?: string;
};

export interface GetLocationConfigurationsResponse {
    success: boolean;
    data: {
        count: number;
        rows: LocationConfigurationDetails[];
    };
}

export async function getLocationConfigurations(
    props: LocationConfigurationFilterProps,
): Promise<GetLocationConfigurationsResponse> {
    const isDomain = useAuthUser.getState().user?.companyUserGroups?.[0]?.group?.name?.toLowerCase() === 'domain';

    return (
        await axiosInstance({
            url: apiUrls.locationConfigurations[isDomain ? 'list' : 'listForCompany'].url,
            method: apiUrls.locationConfigurations[isDomain ? 'list' : 'listForCompany'].method,
            data: props,
        })
    ).data;
}

export const useGetLocationConfigurations = (props: LocationConfigurationFilterProps) => {
    return useQuery({
        queryKey: ['locationConfigurations', props],
        queryFn: async () => await getLocationConfigurations(props),
    });
};

export type CreateLocationConfigurationResponse = {
    success: boolean;
    data: LocationConfigurationDetails;
};

export async function createLocationConfiguration(
    data: LocationConfigurationCreateSchema,
): Promise<CreateLocationConfigurationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.locationConfigurations.create.url,
            method: apiUrls.locationConfigurations.create.method,
            data,
        })
    ).data;
}

export const useCreateLocationConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createLocationConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locationConfigurations'] });
        },
    });
};

export type UpdateLocationConfigurationResponse = {
    success: boolean;
    data: LocationConfigurationDetails;
};

export async function updateLocationConfiguration(
    data: LocationConfigurationUpdateSchema,
): Promise<UpdateLocationConfigurationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.locationConfigurations.update.url,
            method: apiUrls.locationConfigurations.update.method,
            data,
        })
    ).data;
}

export const useUpdateLocationConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateLocationConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locationConfigurations'] });
        },
    });
};

export type RemoveLocationConfigurationResponse = {
    success: boolean;
    data: LocationConfigurationDetails;
};

export async function removeLocationConfiguration(id: string): Promise<RemoveLocationConfigurationResponse> {
    return (
        await axiosInstance({
            url: apiUrls.locationConfigurations.delete.url,
            method: apiUrls.locationConfigurations.delete.method,
        })
    ).data;
}

export const useRemoveLocationConfiguration = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: removeLocationConfiguration,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locationConfigurations'] });
        },
    });
};
