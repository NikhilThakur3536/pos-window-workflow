import { axiosInstance } from '@/api-queries';
import { useMutation } from '@tanstack/react-query';
import { UserDetails } from '../user';
import { Company } from '../company-details';
import type { AxiosRequestConfig } from 'axios';
import { getConfiguredTerminalId, getOrCreateInstallationId } from '@/stores/terminal.store';

export type LoginFnPayload = {
    email?: string;
    staffNumber?: number;
    password: string;
    domainId?: string;
    deviceType?: string;
    posLogin?: boolean;
    requestHeaders?: AxiosRequestConfig['headers'];
};

export interface User extends UserDetails {
    company: Company;
    currency: { code: string; symbol: string };
    terminalId?: string;
}

export interface EligibleTill {
    id: string;
    name?: string;
    terminalId?: string;
    rosterAssignmentId?: string;
    companyDebtorId?: string | null;
}

export interface UserLoginResponse {
    message?: string;
    data: {
        token: string;
        user: User;
        terminalId?: string;
        sessionId?: string;
        clientType?: string;
        installationId?: string;
        eligibleTills?: EligibleTill[];
        message?: string;
        rosterAssignmentId?: string;
        sessionExpiresAt?: string;
        expiryAt?: string;
    };
    success: boolean;
}

function getDefaultLoginHeaders(): AxiosRequestConfig['headers'] {
    const isDesktop = process.env.NEXT_PUBLIC_IS_ELECTRON_APP === 'true';
    const clientType = isDesktop ? 'DESKTOP' : process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP' ? 'APP' : 'WEB';
    const headers: Record<string, string> = { 'X-Client-Type': clientType };
    if (isDesktop) {
        const terminalId = getConfiguredTerminalId();
        const installationId = getOrCreateInstallationId();
        if (terminalId) headers['Terminal-Id'] = terminalId;
        if (installationId) headers['X-Installation-Id'] = installationId;
    }
    return headers;
}

export const userLoginFn = async (data: LoginFnPayload): Promise<UserLoginResponse> => {
    const { requestHeaders, posLogin, ...payload } = data;
    const loginPayload = posLogin ? { ...payload, posLogin } : payload;
    return (
        await axiosInstance.post('/api/company/users/login', loginPayload, {
            headers: { ...getDefaultLoginHeaders(), ...requestHeaders },
        })
    ).data;
};

export const useUserLogin = () => {
    return useMutation({
        mutationFn: userLoginFn,
    });
};
