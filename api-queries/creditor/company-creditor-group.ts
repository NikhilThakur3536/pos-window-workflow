import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

export interface CompanyCreditorGroupDetails {
    id: string;
    groupId?: string;
    description?: string;
    status?: string;
    timezone?: string;
    companyId?: string;
    domainId?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export type CreditorGroupFilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface GetCreditorGroupResponse {
    success: boolean;
    message?: string;
    data: {
        count: number;
        rows: CompanyCreditorGroupDetails[];
    };
}

export async function getCreditorGroups(props: CreditorGroupFilterProps): Promise<GetCreditorGroupResponse> {
    return (
        await axiosInstance({
            url: (apiUrls as any).companyCreditorGroup?.list?.url || '/api/company/companyCreditorGroups/all',
            method: 'post',
            data: props,
        })
    ).data;
}

export const useGetCreditorGroups = (props: CreditorGroupFilterProps) => {
    return useQuery({
        queryKey: [(apiUrls as any).companyCreditorGroup ? getApiKey((apiUrls as any).companyCreditorGroup) : 'companyCreditorGroup', props],
        queryFn: async () => await getCreditorGroups(props),
    });
};

export const useGetActiveCompanyCreditorGroups = (enabled = true) => {
    return useQuery({
        queryKey: [(apiUrls as any).companyCreditorGroup ? getApiKey((apiUrls as any).companyCreditorGroup) : 'companyCreditorGroup', { status: 'ACTIVE', limit: 500 }],
        queryFn: async () => await getCreditorGroups({ status: 'ACTIVE', limit: 500, offset: 0 }),
        enabled,
        staleTime: 60_000,
    });
};

export const companyCreditorGroupLabel = (group?: CompanyCreditorGroupDetails | null): string => {
    if (!group) return '';
    return (group as any).groupId || (group as any).description || (group as any).name || group.id;
};
