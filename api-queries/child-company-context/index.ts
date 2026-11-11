import { useQuery } from '@tanstack/react-query';
import { axiosInstance, apiUrls } from '..';
import { getApiKey } from '@/utils/helpers';

// ------------------------------- TYPES -----------------------------
export interface PermissionGroup {
    id: string;
    name?: string;
    groupCode?: string;
    description?: string;
    status?: string;
    permissions?: any[];
    [key: string]: any;
}

export interface CompanyContext {
    companyId?: string;
    inventoryCompanyId?: string;
    isChildCompany?: boolean;
    parentCompanyId?: string;
    parentCompanyName?: string;
    childPermissionGroupId?: string;
    permissionGroup?: PermissionGroup;
    [key: string]: any;
}

export interface GetCompanyContextResponse {
    success: boolean;
    data: CompanyContext;
    message?: string;
}

export type CompanyContextOptions = {
    /** Child company UUID — sent as Company-Id header */
    companyId?: string;
};

// --------------------------------------- COMPANY CONTEXT ---------------------------------------
export const getCompanyContextFn = async (
    options?: CompanyContextOptions
): Promise<GetCompanyContextResponse> => {
    const headers: Record<string, string> = {};
    if (options?.companyId) {
        headers['Company-Id'] = options.companyId;
    }

    return (
        await axiosInstance({
            url: apiUrls.companyContext.url,
            method: apiUrls.companyContext.method,
            headers,
        })
    ).data;
};

export const useGetCompanyContext = (
    enabled: boolean = true,
    options?: CompanyContextOptions
) => {
    return useQuery({
        queryKey: [
            getApiKey(apiUrls.companyContext),
            options?.companyId,
        ],
        queryFn: () => getCompanyContextFn(options),
        enabled,
    });
};