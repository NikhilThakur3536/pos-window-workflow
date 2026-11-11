import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '../';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- DOMAINS ---------------------------------------

// Domains Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface DomainDetails {
    id: string;
    name: string;
    domainName: string;
    organisationName: string;
    contactPerson: string;
    designation: string;
    email: string;
    phone: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetDomainResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: DomainDetails[];
    };
}

export async function getDomains(props: FilterProps): Promise<GetDomainResponse> {
    return (
        await axiosInstance({
            url: apiUrls.auth.domains.list.url,
            method: apiUrls.auth.domains.list.method,
            data: props,
        })
    ).data;
}

export const useGetDomains = (props: FilterProps, enabled: boolean = true) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.auth.domains), props],
        queryFn: async () => await getDomains(props),
        enabled,
    });
};
