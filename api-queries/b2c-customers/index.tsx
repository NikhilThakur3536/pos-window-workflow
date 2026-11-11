import { useQuery } from '@tanstack/react-query';
import { apiUrls, axiosInstance } from '..';
import { getApiKey } from '@/utils/helpers';

// --------------------------------------- B2C CUSTOMERS ---------------------------------------

// B2C Customers Listing

export type FilterProps = {
    limit?: number;
    offset?: number;
    search?: string;
    status?: string;
};

export interface B2CCustomerDetails {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    companyId: string;
    domainId: string;
    timezone: string;
    createdAt: string;
    updatedAt: string;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface GetB2CCustomerResponse {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: B2CCustomerDetails[];
    };
}

export async function getB2CCustomers(props: FilterProps): Promise<GetB2CCustomerResponse> {
    return (
        await axiosInstance({
            url: apiUrls.b2cCustomers.list.url,
            method: apiUrls.b2cCustomers.list.method,
            params: props,
        })
    ).data;
}

export const useGetB2CCustomers = (props: FilterProps) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.b2cCustomers), props],
        queryFn: async () => await getB2CCustomers(props),
    });
};
