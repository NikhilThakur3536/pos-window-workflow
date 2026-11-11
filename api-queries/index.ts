import { getApiBaseUrl } from '@/lib/constant';
import { useAuthUser } from '@/stores/auth-user.store';
import { useNetworkStore } from '@/stores/network.store';
import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// Only Online

export const axiosInstance = axios.create();

axiosInstance.interceptors.request.use((config) => {
    // const { online } = useNetworkStore.getState();
    // if (!online) {
    //     return Promise.reject(new Error('Offline mode — API call skipped'));
    // }

    config.baseURL = getApiBaseUrl();

    // When Online
    const isLoginRequest = config.url?.includes('/api/company/users/login');
    const token = isLoginRequest ? undefined : useAuthUser.getState().user?.token;
    const companyId = isLoginRequest ? undefined : useAuthUser.getState().company?.id;
    const terminalId = useAuthUser.getState().user?.terminalId;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (companyId) config.headers['Company-Id'] = companyId;
    // Terminal-Id identifies a till for POS / till requests only. NST endpoints resolve
    // their own store scope from Company-Id, so the header is left off them.
    const isTillScoped = !config.url?.includes('/api/company/stockDisposition');
    if (token && isTillScoped) {
        if (terminalId) config.headers['Terminal-Id'] = terminalId;
        else delete config.headers['Terminal-Id'];
    }
    return config;
});

export const axiosNetworkInstance = axios.create();

axiosNetworkInstance.interceptors.request.use((config) => {
    config.baseURL = getApiBaseUrl();

    const isLoginRequest = config.url?.includes('/api/company/users/login');
    const token = isLoginRequest ? undefined : useAuthUser.getState().user?.token;
    const companyId = isLoginRequest ? undefined : useAuthUser.getState().company?.id;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (companyId) config.headers['Company-Id'] = companyId;
    const terminalId = useAuthUser.getState().user?.terminalId;
    const isTillScoped = !config.url?.includes('/api/company/stockDisposition');
    if (token && isTillScoped) {
        if (terminalId) config.headers['Terminal-Id'] = terminalId;
        else delete config.headers['Terminal-Id'];
    }
    return config;
});

// Form Data

// No Content-Type default: the browser must set the multipart/form-data boundary
// itself for FormData requests (e.g. NST photo upload) when sending a File body.
export const axiosFormDataInstance = axios.create();

axiosFormDataInstance.interceptors.request.use((config) => {
    config.baseURL = `${getApiBaseUrl()}/api`;

    const { online } = useNetworkStore.getState();
    if (!online) {
        return Promise.reject(new Error('Offline mode — API call skipped'));
    }

    const isLoginRequest = config.url?.includes('company/users/login');
    const token = isLoginRequest ? undefined : useAuthUser.getState().user?.token;
    const companyId = isLoginRequest ? undefined : useAuthUser.getState().company?.id;
    const terminalId = useAuthUser.getState().user?.terminalId;

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (companyId) config.headers['Company-Id'] = companyId;
    // Terminal-Id identifies a till for POS / till requests only. NST endpoints resolve
    // their own store scope from Company-Id, so the header is left off them.
    const isTillScoped = !config.url?.includes('company/stockDisposition');
    if (token && isTillScoped) {
        if (terminalId) config.headers['Terminal-Id'] = terminalId;
        else delete config.headers['Terminal-Id'];
    }

    return config;
});

// Handle Error

export const handleError = (message: string, error: unknown) => {
    if (error instanceof Error) toast.error(message, { description: error.message });
    else if (error instanceof AxiosError) toast.error(message, { description: error.response?.data?.error });
    else toast.error(message, { description: 'An unknown error occurred' });
};
// Query Keys & API Urls

export const queryKeys = {
    CREDITOR: 'creditor',
    COMPANY: {
        STOCK_DETAILS: 'stock-details',
        STOCK_PRICING: 'stock-pricing',
        STOCK_PRICING_TYPE: 'stock-pricing-type',
        STOCK_LEVEL: 'stock-level',
    },
    DEBTOR: 'debtor',
} as const;

export const apiUrls = {
    auth: {
        company: {
            users: {
                login: {
                    url: '/api/company/users/login',
                    method: 'post',
                },
            },
        },
        domains: {
            list: {
                url: '/api/domain/all',
                method: 'post',
            },
        },
    },
    DocumentPrint: {
        url: 'api/company/documentPrint/print',
        method: 'POST',
    },

    // Locations
    locationConfigurations: {
        list: {
            url: '/api/domain/locationConfiguration/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/locationConfiguration/list',
            method: 'post',
        },
        create: {
            url: '/api/domain/locationConfiguration/create',
            method: 'post',
        },
        update: {
            url: '/api/domain/locationConfiguration/update',
            method: 'post',
        },
        delete: {
            url: '/api/domain/locationConfiguration/remove',
            method: 'post',
        },
    },
    regions: {
        list: {
            url: '/api/domain/region/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/region/list',
            method: 'post',
        },
    },
    subRegions: {
        list: {
            url: '/api/domain/subRegion/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/subRegion/list',
            method: 'post',
        },
    },
    debtorSourceDocument: {
        list: {
            url: '/api/company/debtorSourceDocuments/all',
            method: 'post',
        },
        getById: {
            url: '/api/company/debtorSourceDocuments/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorSourceDocuments/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtorSourceDocuments/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtorSourceDocuments/delete',
            method: 'post',
        },
    },
    countries: {
        list: {
            url: '/api/domain/country/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/country/list',
            method: 'post',
        },
    },
    states: {
        list: {
            url: '/api/domain/state/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/state/list',
            method: 'post',
        },
    },
    districts: {
        list: {
            url: '/api/domain/district/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/district/list',
            method: 'post',
        },
    },
    areas: {
        list: {
            url: '/api/domain/area/list',
            method: 'post',
        },
        listForCompany: {
            url: '/api/company/area/list',
            method: 'post',
        },
    },

    // Masters
    masters: {
        tills: {
            list: {
                url: '/api/company/till/list',
                method: 'post',
            },
            get: {
                url: '/api/company/till/get',
                method: 'post',
            },
            create: {
                url: '/api/company/till/create',
                method: 'post',
            },
            update: {
                url: '/api/company/till/update',
                method: 'post',
            },
            delete: {
                url: '/api/company/till/delete',
                method: 'post',
            },
            balanceStatus: {
                url: '/api/company/till/balance-status',
                method: 'post',
            },
            cashCustodyStatus: {
                url: '/api/company/till/cash-custody-status',
                method: 'post',
            },
        },
        pricingTypes: {
            all: {
                url: '/api/company/companyStockPricingTypes/all',
                method: 'get',
            },
            list: {
                url: '/api/company/companyStockPricingTypes/list',
                method: 'post',
            },
            get: {
                url: (id: string) => `/api/company/companyStockPricingTypes/${id}`,
                method: 'get',
            },
            create: {
                url: '/api/company/companyStockPricingTypes/create',
                method: 'post',
            },
            update: {
                url: `/api/company/companyStockPricingTypes/edit`,
                method: 'post',
            },
            delete: {
                url: (id: string) => `/api/company/companyStockPricingTypes/delete/${id}`,
                method: 'delete',
            },
        },
        costLevels: {
            all: {
                url: '/api/company/companyStockPricingCostLevelTypes/all',
                method: 'get',
            },
            list: {
                url: '/api/company/companyStockPricingCostLevelTypes/list',
                method: 'post',
            },
            get: {
                url: (id: string) => `/api/company/companyStockPricingCostLevelTypes/${id}`,
                method: 'get',
            },
            create: {
                url: '/api/company/companyStockPricingCostLevelTypes/create',
                method: 'post',
            },
            update: {
                url: (id: string) => `/api/company/companyStockPricingCostLevelTypes/update/${id}`,
                method: 'put',
            },
            delete: {
                url: (id: string) => `/api/company/companyStockPricingCostLevelTypes/delete/${id}`,
                method: 'delete',
            },
        },
    },

    safes: {
        list: {
            url: '/api/company/safes/all',
            method: 'post',
        },
        get: {
            url: '/api/company/safes/get',
            method: 'post',
        },
        create: {
            url: '/api/company/safes/add',
            method: 'post',
        },
        update: {
            url: '/api/company/safes/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/safes/delete',
            method: 'post',
        },
        cashout: {
            url: '/api/company/safe-cashout',
            method: 'post',
        },
    },
    safeTransactions: {
        list: {
            url: '/api/company/safe-transactions',
            method: 'post',
        },
    },
    company: {
        data: {
            create: {
                url: '/api/company/data/create',
                method: 'POST' as const,
            },
            update: {
                url: (id: string) => `/api/company/data/update/${id}`,
                method: 'PUT' as const,
            },
            get: {
                url: (id: string) => `/api/company/data/${id}`,
                method: 'GET' as const,
            },
            all: {
                url: '/api/company/data/all',
                method: 'GET' as const,
            },
        },
        interCompanyTransfers: {
            create: {
                url: '/api/company/interCompanyTransfers/create',
                method: 'POST' as const,
            },
            update: {
                url: '/api/company/interCompanyTransfers/update',
                method: 'POST' as const,
            },

            get: {
                url: '/api/company/interCompanyTransfers/get',
                method: 'POST' as const,
            },

            list: {
                url: '/api/company/interCompanyTransfers/list',
                method: 'POST' as const,
            },

            delete: {
                url: '/api/company/interCompanyTransfers/delete',
                method: 'POST' as const,
            },
        },

        reports: {
            inventorySummary: {
                url: '/api/company/reports/inventory-summary',
                method: 'POST' as const,
            },
            xReport: {
                url: '/api/company/reports/x-report',
                method: 'POST',
            },
            posReports: {
                url: '/api/company/reports/pos-reports',
                method: 'POST',
            },
        },
    } as const,
    vendors: {
        list: {
            url: '/api/company/cashout-vendors/all',
            method: 'post',
        },
        get: {
            url: '/api/company/cashout-vendors/get',
            method: 'post',
        },
        create: {
            url: '/api/company/cashout-vendors/add',
            method: 'post',
        },
        update: {
            url: '/api/company/cashout-vendors/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/cashout-vendors/delete',
            method: 'post',
        },
    },

    debtors: {
        list: {
            url: '/api/company/debtor/all',
            method: 'post',
        },
        get: {
            url: '/api/company/debtor/get',
            method: 'post',
        },
        create: {
            url: '/api/company/debtor/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtor/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtor/delete',
            method: 'post',
        },
    },
    // Debtor Groups master - the group a debtor belongs to, resolved by 3022
    // group payment allocation when allocating a receipt across invoices.
    companyDebtorGroup: {
        create: {
            url: '/api/company/companyDebtorGroup/create',
            method: 'post',
        },
        list: {
            url: '/api/company/companyDebtorGroup/all',
            method: 'post',
        },
        get: {
            url: '/api/company/companyDebtorGroup/get',
            method: 'post',
        },
        update: {
            url: '/api/company/companyDebtorGroup/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/companyDebtorGroup/delete',
            method: 'post',
        },
    },
    // Creditor Groups master
    companyCreditorGroup: {
        create: {
            url: '/api/company/companyCreditorGroups/create',
            method: 'post',
        },
        list: {
            url: '/api/company/companyCreditorGroups/all',
            method: 'post',
        },
        get: {
            url: '/api/company/companyCreditorGroups/get',
            method: 'post',
        },
        update: {
            url: '/api/company/companyCreditorGroups/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/companyCreditorGroups/delete',
            method: 'post',
        },
    },
    debtorReceipts: {
        list: {
            url: '/api/company/debtorReceipts/all',
            method: 'post',
        },
        get: {
            url: '/api/company/debtorReceipts/get',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorReceipts/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtorReceipts/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtorReceipts/remove',
            method: 'post',
        },
    },
    debtorReceiptAllocations: {
        list: {
            url: '/api/company/debtorReceiptAllocation/all',
            method: 'post',
        },
        get: {
            url: '/api/company/debtorReceiptAllocation/get',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorReceiptAllocation/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtorReceiptAllocation/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtorReceiptAllocation/remove',
            method: 'post',
        },
        summary: {
            url: '/api/company/debtorReceiptAllocation/balanceSummary',
            method: 'post',
        },
    },
    b2cCustomers: {
        list: {
            url: '/api/company/customer/all',
            method: 'post',
        },
        get: {
            url: '/api/company/customer/get',
            method: 'post',
        },
        create: {
            url: '/api/company/customer/add',
            method: 'post',
        },
        update: {
            url: '/api/company/customer/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/customer/delete',
            method: 'post',
        },
    },
    bankAccount: {
        list: { url: '/api/company/bankAccount/list', method: 'post' },
        get: { url: '/api/company/bankAccount/get', method: 'post' },
        create: { url: '/api/company/bankAccount/create', method: 'post' },
        update: { url: '/api/company/bankAccount/update', method: 'post' },
        changeStatus: { url: '/api/company/bankAccount/changeStatus', method: 'post' },
        eligible: { url: '/api/company/bankAccount/eligible', method: 'post' },
    },
    bankAccountType: {
        all: {
            url: '/api/company/bankAccountType/all',
            method: 'post',
        },
        get: {
            url: '/api/company/bankAccountType/get',
            method: 'post',
        },
        create: {
            url: '/api/company/bankAccountType/add',
            method: 'post',
        },
        update: {
            url: '/api/company/bankAccountType/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/bankAccountType/delete',
            method: 'post',
        },
    },
    languageMaster: {
        all: {
            url: '/api/company/languageMaster/all',
            method: 'post',
        },
        get: {
            url: '/api/company/languageMaster/get',
            method: 'post',
        },
        create: {
            url: '/api/company/languageMaster/add',
            method: 'post',
        },
        update: {
            url: '/api/company/languageMaster/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/languageMaster/delete',
            method: 'post',
        },
    },
    currency: {
        all: {
            url: '/api/company/currencies/all',
            method: 'post',
        },
        get: {
            url: '/api/company/currencies/get',
            method: 'post',
        },
        create: {
            url: '/api/company/currencies/create',
            method: 'post',
        },
        update: {
            url: '/api/company/currencies/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/currencies/delete',
            method: 'post',
        },
    },
    characterSetMaster: {
        all: {
            url: '/api/company/characterSetMaster/all',
            method: 'post',
        },
        get: {
            url: '/api/company/characterSetMaster/get',
            method: 'post',
        },
        create: {
            url: '/api/company/characterSetMaster/add',
            method: 'post',
        },
        update: {
            url: '/api/company/characterSetMaster/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/characterSetMaster/delete',
            method: 'post',
        },
    },
    stateMaster: {
        all: {
            url: '/api/company/stateMaster/all',
            method: 'post',
        },
        get: {
            url: '/api/company/stateMaster/get',
            method: 'post',
        },
        create: {
            url: '/api/company/stateMaster/add',
            method: 'post',
        },
        update: {
            url: '/api/company/stateMaster/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/stateMaster/delete',
            method: 'post',
        },
    },
    userTypeMaster: {
        all: {
            url: '/api/company/userTypeMaster/all',
            method: 'post',
        },
        get: {
            url: '/api/company/userTypeMaster/get',
            method: 'post',
        },
        create: {
            url: '/api/company/userTypeMaster/add',
            method: 'post',
        },
        update: {
            url: '/api/company/userTypeMaster/edit',
            method: 'post',
        },
        delete: {
            url: '/api/company/userTypeMaster/delete',
            method: 'post',
        },
    },
    taxAgency: {
        all: {
            url: '/api/company/taxAgency/all',
            method: 'get',
        },
        get: {
            url: '/api/company/taxAgency',
            method: 'get',
        },
        create: {
            url: '/api/company/taxAgency/create',
            method: 'post',
        },
        update: {
            url: '/api/company/taxAgency/update',
            method: 'put',
        },
        delete: {
            url: '/api/company/taxAgency/delete',
            method: 'delete',
        },
    },

    taxReportPosition: {
        all: {
            url: '/api/company/taxReportPosition/all',
            method: 'get',
        },
        get: {
            url: '/api/company/taxReportPosition',
            method: 'get',
        },
        create: {
            url: '/api/company/taxReportPosition/create',
            method: 'post',
        },
        update: {
            url: '/api/company/taxReportPosition/update',
            method: 'put',
        },
        delete: {
            url: '/api/company/taxReportPosition/delete',
            method: 'delete',
        },
    },

    taxControlAccount: {
        all: {
            url: '/api/company/tax-control-account/all',
            method: 'get',
        },
        get: {
            url: '/api/company/tax-control-account',
            method: 'get',
        },
        create: {
            url: '/api/company/tax-control-account/create',
            method: 'post',
        },
        update: {
            url: '/api/company/tax-control-account/update',
            method: 'put',
        },
        delete: {
            url: '/api/company/tax-control-account/delete',
            method: 'delete',
        },
    },
    companyTaxRate: {
        all: {
            url: '/api/company/companyTaxRate',
            method: 'get',
        },
        get: {
            url: '/api/company/companyTaxRate',
            method: 'get',
        },
        create: {
            url: '/api/company/companyTaxRate',
            method: 'post',
        },
        update: {
            url: '/api/company/companyTaxRate',
            method: 'put',
        },
        delete: {
            url: '/api/company/companyTaxRate',
            method: 'delete',
        },
    },
    salesRepresentative: {
        list: {
            url: '/api/company/salesRepresentatives/all',
            method: 'post',
        },
        getById: {
            url: '/api/company/salesRepresentatives/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/salesRepresentatives/create',
            method: 'post',
        },
        update: {
            url: '/api/company/salesRepresentatives/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/salesRepresentatives/delete',
            method: 'post',
        },
    },
    debtorStoreDepartment: {
        list: {
            url: '/api/company/debtorStoreDepartments/all',
            method: 'post',
        },
        getById: {
            url: '/api/company/debtorStoreDepartments/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorStoreDepartments/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtorStoreDepartments/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtorStoreDepartments/delete',
            method: 'post',
        },
    },
    companyTaxRegistration: {
        all: {
            url: '/api/company/companyTaxRegistration/all',
            method: 'get',
        },
        get: {
            url: '/api/company/companyTaxRegistration',
            method: 'get',
        },
        create: {
            url: '/api/company/companyTaxRegistration',
            method: 'post',
        },
        update: {
            url: '/api/company/companyTaxRegistration',
            method: 'put',
        },
        delete: {
            url: '/api/company/companyTaxRegistration',
            method: 'delete',
        },
    },
    locationMaster: {
        country: {
            list: {
                url: '/api/company/location/country/list',
                method: 'post',
            },
        },
        state: {
            list: {
                url: '/api/company/location/state/list',
                method: 'post',
            },
        },
        region: {
            list: {
                url: '/api/company/location/region/list',
                method: 'post',
            },
        },
        city: {
            list: {
                url: '/api/company/location/city/list',
                method: 'post',
            },
        },
        area: {
            list: {
                url: '/api/company/location/area/list',
                method: 'post',
            },
        },
        district: {
            list: {
                url: '/api/company/location/district/list',
                method: 'post',
            },
        },
        subRegion: {
            list: {
                url: '/api/company/location/subRegion/list',
                method: 'post',
            },
        },
    },
    domainLocation: {
        country: {
            list: {
                url: '/api/domain/country/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/country/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/country/edit',
                method: 'post',
            },
        },

        region: {
            list: {
                url: '/api/domain/region/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/region/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/region/edit',
                method: 'post',
            },
        },

        state: {
            list: {
                url: '/api/domain/state/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/state/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/state/edit',
                method: 'post',
            },
        },

        district: {
            list: {
                url: '/api/domain/district/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/district/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/district/edit',
                method: 'post',
            },
        },

        city: {
            list: {
                url: '/api/domain/city/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/city/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/city/edit',
                method: 'post',
            },
        },

        area: {
            list: {
                url: '/api/domain/area/list',
                method: 'post',
            },
            create: {
                url: '/api/domain/area/add',
                method: 'post',
            },
            update: {
                url: '/api/domain/area/edit',
                method: 'post',
            },
        },
    },
    companies: {
        list: {
            url: '/api/domain/company/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/domain/company/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/domain/company/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/domain/company/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/domain/company/delete/${id}`,
            method: 'delete',
        },
        companyDefaultSettingsOnes: {
            list: {
                url: '/api/company/companyDefaultSettingsOnes/list',
                method: 'post',
            },

            edit: {
                url: '/api/company/companyDefaultSettingsOnes/edit',
                method: 'post',
            },
        },
    },
    creditors: {
        list: {
            url: '/api/company/creditor/all',
            method: 'post',
        },
        get: {
            url: '/api/company/creditor/get',
            method: 'post',
        },
        create: {
            url: '/api/company/creditor/create',
            method: 'post',
        },
        update: {
            url: '/api/company/creditor/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/creditor/delete',
            method: 'post',
        },
    },

    debtorTransactions: {
        list: {
            url: '/api/company/reports/debtor-transactions',
            method: 'post',
        },
    },
    creditorTransactions: {
        list: {
            url: '/api/company/reports/creditor-transactions',
            method: 'post',
        },
    },
    debtorStatements: {
        statement: {
            url: '/api/company/debtor/statement',
            method: 'post',
        },
        transactions: {
            url: '/api/company/debtor/statement/transactions',
            method: 'post',
        },
        ageAnalysis: {
            url: '/api/company/debtor/statement/age-analysis',
            method: 'post',
        },
        accountSummary: {
            url: '/api/company/debtor/statement/account-summary',
            method: 'post',
        },
        adjustmentCreate: {
            url: '/api/company/debtor/statement/adjustment/create',
            method: 'post',
        },
        adjustmentUpdate: {
            url: '/api/company/debtor/statement/adjustment/update',
            method: 'post',
        },
        adjustmentDelete: {
            url: '/api/company/debtor/statement/adjustment/delete',
            method: 'post',
        },
        adjustmentGet: {
            url: '/api/company/debtor/statement/adjustment/get',
            method: 'post',
        },
        adjustmentAll: {
            url: '/api/company/debtor/statement/adjustment/all',
            method: 'post',
        },
    },

    userEnquiries: {
        list: {
            url: '/api/company/transactions/all',
            method: 'post',
        },

        get: {
            url: '/api/company/transactions/detail',
            method: 'post',
        },
    },

    stockEnquiries: {
        list: {
            url: '/api/company/transactions/stock',
            method: 'post',
        },
    },

    customerRelations: {
        list: {
            url: '/api/company/reports/years-since-first-transaction',
            method: 'get',
        },
    },

    warehouses: {
        list: {
            url: '/api/company/companyStockWareHouse/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/companyStockWareHouse/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/companyStockWareHouse/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/companyStockWareHouse/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/companyStockWareHouse/delete/${id}`,
            method: 'delete',
        },
    },
    salesRepresentatives: {
        list: {
            url: '/api/company/salesRepresentatives/all',
            method: 'post',
        },
        get: {
            url: '/api/company/salesRepresentatives/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/salesRepresentatives/create',
            method: 'post',
        },
        update: {
            url: '/api/company/salesRepresentatives/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/salesRepresentatives/delete',
            method: 'post',
        },
    },
    storeDepartments: {
        list: {
            url: '/api/company/creditorStoreDepartments/all',
            method: 'post',
        },
        get: {
            url: '/api/company/creditorStoreDepartments/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/creditorStoreDepartments/create',
            method: 'post',
        },
        update: {
            url: '/api/company/creditorStoreDepartments/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/creditorStoreDepartments/delete',
            method: 'post',
        },
    },
    import: {
        uploadToS3: {
            url: '/api/company/import/upload-to-s3',
            method: 'POST',
        },
    },
    stocks: {
        list: {
            url: '/api/company/companyStockDetails',
            method: 'get',
        },
        offlineList: {
            url: '/api/company/companyStockDetails/offline',
            method: 'get',
        },
        get: {
            url: (stockId: string) => `/api/company/companyStockDetails/${stockId}`,
            method: 'get',
        },
        create: {
            url: '/api/company/companyStockDetails',
            method: 'post',
        },
        update: {
            url: (stockId: string) => `/api/company/companyStockDetails/${stockId}`,
            method: 'put',
        },
        delete: {
            url: (stockId: string) => `/api/company/companyStockDetails/${stockId}`,
            method: 'delete',
        },
        updateImages: {
            url: '/api/company/companyStockDetails/update',
            method: 'post',
        },
    },
    stockInventories: {
        list: {
            url: '/api/company/companyStockInventory',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/companyStockInventory/${id}`,
            method: 'get',
        },
        getByStock: {
            url: '/api/company/companyStockInventory/getByStock',
            method: 'post',
        },
        create: {
            url: '/api/company/companyStockInventory',
            method: 'post',
        },
        update: {
            url: '/api/company/companyStockInventory/update',
            method: 'post',
        },
        delete: {
            url: (id: string) => `/api/company/companyStockInventory/${id}`,
            method: 'delete',
        },
        physicalCount: {
            url: '/api/company/companyStockInventory/physical-count',
            method: 'post',
        },
    },
    markup: {
        list: {
            url: '/api/company/export/markup',
            method: 'get',
        },
    },
    stockInventoryLogs: {
        list: {
            url: '/api/company/companyStockInventory/logs',
            method: 'post',
        },
    },
    stockBarcodes: {
        save: {
            url: '/api/company/companyStockBarcodes/save',
            method: 'post',
        },
        list: {
            url: '/api/company/companyStockBarcodes/list',
            method: 'post',
        },
        get: {
            url: '/api/company/companyStockBarcodes/get',
            method: 'post',
        },
        update: {
            url: '/api/company/companyStockBarcodes/update',
            method: 'post',
        },
        resolve: {
            url: '/api/company/companyStockBarcodes/resolve',
            method: 'post',
        },
        history: {
            url: '/api/company/companyStockBarcodes/history',
            method: 'post',
        },
        deactivate: {
            url: '/api/company/companyStockBarcodes/deactivate',
            method: 'post',
        },
    },
    stockVariants: {
        list: {
            url: '/api/company/companyStockVariant/all',
            method: 'post',
        },
        get: {
            url: '/api/company/companyStockVariant/get',
            method: 'post',
        },
        create: {
            url: '/api/company/companyStockVariant/create',
            method: 'post',
        },
        update: {
            url: '/api/company/companyStockVariant/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/companyStockVariant/delete',
            method: 'post',
        },
    },
    contractPrices: {
        list: {
            url: '/api/company/companyStockContractPrice/all',
            method: 'post',
        },
        get: {
            url: '/api/company/companyStockContractPrice',
            method: 'post',
        },
        create: {
            url: '/api/company/companyStockContractPrice/create',
            method: 'post',
        },
        update: {
            url: '/api/company/companyStockContractPrice/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/companyStockContractPrice/delete',
            method: 'post',
        },
    },
    taxRates: {
        list: {
            url: '/api/company/companyTaxRate',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/companyTaxRate/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/companyTaxRate',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/companyTaxRate/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/companyTaxRate/${id}`,
            method: 'delete',
        },
    },
    categories: {
        list: {
            url: '/api/company/stockCategory/list',
            method: 'post',
        },
        get: {
            url: '/api/company/stockCategory/get',
            method: 'post',
        },
        create: {
            url: '/api/company/stockCategory/create',
            method: 'post',
        },
        update: {
            url: '/api/company/stockCategory/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/stockCategory/delete/',
            method: 'post',
        },
    },
    subCategories: {
        list: {
            url: '/api/company/stockSubCategory/list',
            method: 'post',
        },
        get: {
            url: '/api/company/stockSubCategory/get',
            method: 'post',
        },
        create: {
            url: '/api/company/stockSubCategory/create',
            method: 'post',
        },
        update: {
            url: '/api/company/stockSubCategory/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/stockSubCategory/delete/',
            method: 'post',
        },
    },
    productImages: {
        upload: {
            url: '/api/company/productImages/upload',
            method: 'post',
        },
        list: {
            url: '/api/company/productImages/list',
            method: 'post',
        },
        updateOrder: {
            url: '/api/company/productImages/update-order',
            method: 'post',
        },
        delete: {
            url: '/api/company/productImages/delete',
            method: 'post',
        },
    },
    categoryImages: {
        upload: {
            url: '/api/company/categoryImages/upload',
            method: 'post',
        },
        list: {
            url: '/api/company/categoryImages/list',
            method: 'post',
        },
        updateOrder: {
            url: '/api/company/categoryImages/update-order',
            method: 'post',
        },
        get: {
            url: '/api/company/categoryImages/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/categoryImages/delete',
            method: 'post',
        },
    },
    spVariantGroups: {
        list: {
            url: '/api/company/sell-price-variant-groups/all',
            method: 'post',
        },
        get: {
            url: '/api/company/sell-price-variant-groups/get',
            method: 'post',
        },
        create: {
            url: '/api/company/sell-price-variant-groups/create',
            method: 'post',
        },
        update: {
            url: '/api/company/sell-price-variant-groups/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/sell-price-variant-groups/delete/',
            method: 'post',
        },
    },
    cpVariantGroups: {
        list: {
            url: '/api/company/cost-price-variant-groups/all',
            method: 'post',
        },
        get: {
            url: '/api/company/cost-price-variant-groups/get',
            method: 'post',
        },
        create: {
            url: '/api/company/cost-price-variant-groups/create',
            method: 'post',
        },
        update: {
            url: '/api/company/cost-price-variant-groups/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/cost-price-variant-groups/delete/',
            method: 'post',
        },
    },
    taxReportPositions: {
        list: {
            url: '/api/company/taxReportPosition/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/taxReportPosition/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/taxReportPosition/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/taxReportPosition/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/taxReportPosition/delete/${id}`,
            method: 'delete',
        },
    },
    taxAgencies: {
        list: {
            url: '/api/company/taxAgency/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/taxAgency/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/taxAgency/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/taxAgency/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/taxAgency/delete/${id}`,
            method: 'delete',
        },
    },
    taxControlAccounts: {
        list: {
            url: '/api/company/tax-control-account/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/tax-control-account/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/tax-control-account/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/tax-control-account/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/taxAgency/delete/${id}`,
            method: 'delete',
        },
    },
    reportAccessLevels: {
        list: {
            url: '/api/domain/reportAccessLevel/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/domain/reportAccessLevel/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/domain/reportAccessLevel/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/domain/reportAccessLevel/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/domain/reportAccessLevel/delete/${id}`,
            method: 'delete',
        },
    },
    characterSets: {
        list: {
            url: '/api/company/character-sets/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/character-sets/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/character-sets/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/character-sets/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/character-sets/delete/${id}`,
            method: 'delete',
        },
    },
    languages: {
        list: {
            url: '/api/company/language/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/language/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/language/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/language/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/language/delete/${id}`,
            method: 'delete',
        },
    },
    userGroups: {
        list: {
            url: '/api/domain/group/all',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/domain/group/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/domain/group/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/domain/group/update/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/domain/group/delete/${id}`,
            method: 'delete',
        },
    },
    users: {
        list: {
            url: '/api/company/users',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/users/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/users/create',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/users/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/users/${id}`,
            method: 'delete',
        },
    },
    userTills: {
        eligibleTills: {
            url: '/api/company/tillAssign/eligible-tills',
            method: 'post',
        },
        eligibleUsers: {
            url: '/api/company/tillAssign/eligible-users',
            method: 'post',
        },
        list: {
            url: '/api/company/tillAssign/list',
            method: 'post',
        },
        get: {
            url: '/api/company/tillAssign/get',
            method: 'post',
        },
        create: {
            url: '/api/company/tillAssign/create',
            method: 'post',
        },
        // No `update` entry on purpose: tillAssign/update must never be used to change
        // a till assignment's userId/tillId. Reassignment goes through `create`.
        delete: {
            url: '/api/company/tillAssign/delete',
            method: 'post',
        },
        report: {
            url: '/api/company/reports/till-cashier',
            method: 'post',
        },
        cashToSafe: {
            url: '/api/company/till-to-safe-transfer',
            method: 'post',
        },
        session: {
            active: {
                url: '/api/company/tillAssign/session/active',
                method: 'post',
            },
            open: {
                url: '/api/company/tillAssign/session/open',
                method: 'post',
            },
            close: {
                url: '/api/company/tillAssign/session/close',
                method: 'post',
            },
        },
    },
    userGroupPermissions: {
        list: {
            url: '/api/company/companyUserGroupPermissions',
            method: 'get',
        },
        get: {
            url: (id: string) => `/api/company/companyUserGroupPermissions/${id}`,
            method: 'get',
        },
        create: {
            url: '/api/company/companyUserGroupPermissions',
            method: 'post',
        },
        update: {
            url: (id: string) => `/api/company/companyUserGroupPermissions/${id}`,
            method: 'put',
        },
        delete: {
            url: (id: string) => `/api/company/companyUserGroupPermissions/${id}`,
            method: 'delete',
        },
    },
    userGroupModules: {
        list: {
            url: '/api/company/companyUserGroupPermissions/children',
            method: 'get',
        },
    },
    creditorGoodsReceiving: {
        list: {
            url: '/api/company/creditorGoodsReceivingOrder/all',
            method: 'post',
        },
        create: {
            url: '/api/company/creditorGoodsReceivingOrder/create',
            method: 'post',
        },
        get: {
            url: '/api/company/creditorGoodsReceivingOrder/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/creditorGoodsReceivingOrder/delete/',
            method: 'post',
        },
        scanBarcode: {
            url: '/api/company/creditorGoodsReceivingOrder/scan-barcode',
            method: 'post',
        },
        addTempItem: {
            url: '/api/company/creditorGoodsReceivingOrder/add-temp-item',
            method: 'post',
        },
        unresolvedTempItems: {
            url: '/api/company/creditorGoodsReceivingOrder/unresolved-temp-items',
            method: 'post',
        },
        resolveBarcode: {
            url: '/api/company/creditorGoodsReceivingOrder/resolve-barcode',
            method: 'post',
        },
        barcodeApprovals: {
            list: {
                url: '/api/company/creditorGoodsReceivingOrder/barcode-approvals/list',
                method: 'post',
            },
            action: {
                url: '/api/company/creditorGoodsReceivingOrder/barcode-approvals/action',
                method: 'post',
            },
        },
        // GRV price matching. The create/update response also carries the
        // price-match result inline, so this is only needed to re-read it.
        priceMatch: {
            get: {
                url: '/api/company/creditorGoodsReceivingOrder/priceMatch/get',
                method: 'post',
            },
            approve: {
                url: '/api/company/creditorGoodsReceivingOrder/priceMatch/approve',
                method: 'post',
            },
            dispute: {
                url: '/api/company/creditorGoodsReceivingOrder/priceMatch/dispute',
                method: 'post',
            },
        },
    },
    purchaseOrder: {
        list: {
            url: '/api/company/purchaseOrder/list',
            method: 'post',
        },
        create: {
            url: '/api/company/purchaseOrder/create',
            method: 'post',
        },
        createMultiSupplier: {
            url: '/api/company/purchaseOrder/createMultiSupplier',
            method: 'post',
        },
        get: {
            url: '/api/company/purchaseOrder/get',
            method: 'post',
        },
        update: {
            url: '/api/company/purchaseOrder/update',
            method: 'post',
        },
        productHistory: {
            url: '/api/company/purchaseOrder/productHistory',
            method: 'post',
        },
        generatePdf: {
            url: '/api/company/purchaseOrder/generatePdf',
            method: 'post',
        },
        trace: {
            url: '/api/company/purchaseOrder/trace',
            method: 'post',
        },
        approve: {
            url: '/api/company/purchaseOrder/approve',
            method: 'post',
        },
        send: {
            url: '/api/company/purchaseOrder/send',
            method: 'post',
        },
        supplierConfirm: {
            url: '/api/company/purchaseOrder/supplierConfirm',
            method: 'post',
        },
        cancelPo: {
            url: '/api/company/purchaseOrder/cancel',
            method: 'post',
        },
    },
    purchaseRequest: {
        create: { url: '/api/company/purchaseRequest/create', method: 'post' },
        get: { url: '/api/company/purchaseRequest/get', method: 'post' },
        update: { url: '/api/company/purchaseRequest/update', method: 'post' },
        list: { url: '/api/company/purchaseRequest/list', method: 'post' },
        close: { url: '/api/company/purchaseRequest/close', method: 'post' },
        cancel: { url: '/api/company/purchaseRequest/cancel', method: 'post' },
    },
    supplierQuotation: {
        create: { url: '/api/company/supplierQuotation/create', method: 'post' },
        get: { url: '/api/company/supplierQuotation/get', method: 'post' },
        update: { url: '/api/company/supplierQuotation/update', method: 'post' },
        list: { url: '/api/company/supplierQuotation/list', method: 'post' },
        cancel: { url: '/api/company/supplierQuotation/cancel', method: 'post' },
        compareQuotes: { url: '/api/company/supplierQuotation/compareQuotes', method: 'post' },
        convertToPurchaseOrders: { url: '/api/company/supplierQuotation/convertToPurchaseOrders', method: 'post' },
    },
    supplierInvoice: {
        create: { url: '/api/company/supplierInvoice/create', method: 'post' },
        get: { url: '/api/company/supplierInvoice/get', method: 'post' },
        update: { url: '/api/company/supplierInvoice/update', method: 'post' },
        list: { url: '/api/company/supplierInvoice/list', method: 'post' },
        post: { url: '/api/company/supplierInvoice/post', method: 'post' },
        cancel: { url: '/api/company/supplierInvoice/cancel', method: 'post' },
    },
    supplierPricing: {
        create: { url: '/api/company/supplierPricing/create', method: 'post' },
        update: { url: '/api/company/supplierPricing/update', method: 'post' },
        list: { url: '/api/company/supplierPricing/list', method: 'post' },
        get: { url: '/api/company/supplierPricing/get', method: 'post' },
        delete: { url: '/api/company/supplierPricing/delete', method: 'post' },
        compare: { url: '/api/company/supplierPricing/compare', method: 'post' },
        setPrimary: { url: '/api/company/supplierPricing/setPrimary', method: 'post' },
    },
    replenishment: {
        recommend: { url: '/api/company/replenishment/recommend', method: 'post' },
        save: { url: '/api/company/replenishment/save', method: 'post' },
        get: { url: '/api/company/replenishment/get', method: 'post' },
        all: { url: '/api/company/replenishment/all', method: 'post' },
        approve: { url: '/api/company/replenishment/approve', method: 'post' },
        conversionPayload: { url: '/api/company/replenishment/conversionPayload', method: 'post' },
    },
    replenishmentAutomation: {
        save: { url: '/api/company/replenishment/automation/save', method: 'post' },
        all: { url: '/api/company/replenishment/automation/all', method: 'post' },
        get: { url: '/api/company/replenishment/automation/get', method: 'post' },
        history: { url: '/api/company/replenishment/automation/history', method: 'post' },
        retry: { url: '/api/company/replenishment/automation/retry', method: 'post' },
    },
    replenishmentPolicy: {
        create: { url: '/api/company/replenishmentPolicy/create', method: 'post' },
        resolve: { url: '/api/company/replenishmentPolicy/resolve', method: 'post' },
        all: { url: '/api/company/replenishmentPolicy/all', method: 'post' },
        get: { url: '/api/company/replenishmentPolicy/get', method: 'post' },
        update: { url: '/api/company/replenishmentPolicy/update', method: 'post' },
        delete: { url: '/api/company/replenishmentPolicy/delete', method: 'post' },
    },
    invoiceChecking: {
        all: {
            url: '/api/company/invoiceChecking/all',
            method: 'post',
        },
        get: {
            url: '/api/company/invoiceChecking/get',
            method: 'post',
        },
        open: {
            url: '/api/company/invoiceChecking/open',
            method: 'post',
        },
        check: {
            url: '/api/company/invoiceChecking/check',
            method: 'post',
        },
        resolve: {
            url: '/api/company/invoiceChecking/resolve',
            method: 'post',
        },
        approve: {
            url: '/api/company/invoiceChecking/approve',
            method: 'post',
        },
        post: {
            url: '/api/company/invoiceChecking/post',
            method: 'post',
        },
        cancel: {
            url: '/api/company/invoiceChecking/cancel',
            method: 'post',
        },
        validateSource: {
            url: '/api/company/invoiceChecking/validate-source',
            method: 'post',
        },
        report: {
            url: '/api/company/invoiceChecking/report',
            method: 'post',
        },
        shortageReport: {
            url: '/api/company/invoiceChecking/shortageReport',
            method: 'post',
        },
        goodsReturnReport: {
            url: '/api/company/invoiceChecking/goodsReturnReport',
            method: 'post',
        },
        barcodeMismatchReport: {
            url: '/api/company/invoiceChecking/barcodeMismatchReport',
            method: 'post',
        },
        reasonMasterList: {
            url: '/api/company/invoiceChecking/reasonMaster/list',
            method: 'post',
        },
        reasonMasterCreate: {
            url: '/api/company/invoiceChecking/reasonMaster/create',
            method: 'post',
        },
        reasonMasterUpdate: {
            url: '/api/company/invoiceChecking/reasonMaster/update',
            method: 'post',
        },
        reasonMasterDelete: {
            url: '/api/company/invoiceChecking/reasonMaster/delete',
            method: 'post',
        },
    },
    stockAdjustmentReason: {
        all: {
            url: '/api/company/stockAdjustmentReason/all',
            method: 'post',
        },
        create: {
            url: '/api/company/stockAdjustmentReason/create',
            method: 'post',
        },
        update: {
            url: '/api/company/stockAdjustmentReason/update',
            method: 'post',
        },
        get: {
            url: '/api/company/stockAdjustmentReason/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/stockAdjustmentReason/delete',
            method: 'post',
        },
    },
    stockRange: {
        list: {
            url: '/api/company/stockRange/list',
            method: 'post',
        },
        get: {
            url: '/api/company/stockRange/getById',
            method: 'post',
        },
        create: {
            url: '/api/company/stockRange/create',
            method: 'post',
        },
        update: {
            url: '/api/company/stockRange/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/stockRange/delete',
            method: 'post',
        },
    },
    debtorGoodsReceiving: {
        list: {
            url: '/api/company/debtorGoodsReceivingOrder/all',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorGoodsReceivingOrder/create',
            method: 'post',
        },
        get: {
            url: '/api/company/debtorGoodsReceivingOrder/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/debtorGoodsReceivingOrder/delete/',
            method: 'post',
        },
    },
    goodsReturn: {
        list: {
            url: '/api/company/debitNote/list',
            method: 'post',
        },
        create: {
            url: '/api/company/debitNote/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/debitNote/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/debitNote/get',
            method: 'post',
        },
    },
    debitNote: {
        list: {
            url: '/api/company/debitNote/list',
            method: 'post',
        },
        create: {
            url: '/api/company/debitNote/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/debitNote/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/debitNote/get',
            method: 'post',
        },
    },
    quantityWiseDiscounts: {
        list: {
            url: '/api/company/companyStockQtyDiscounts/all',
            method: 'post',
        },
        get: {
            url: `/api/company/companyStockQtyDiscounts/get`,
            method: 'post',
        },
        create: {
            url: '/api/company/companyStockQtyDiscounts/create',
            method: 'post',
        },
        update: {
            url: `/api/company/companyStockQtyDiscounts/update`,
            method: 'post',
        },
        delete: {
            url: `/api/company/companyStockQtyDiscounts/delete`,
            method: 'post',
        },
        applicable: {
            url: '/api/company/companyStockQtyDiscounts/applicable',
            method: 'post',
        },
    },
    creditNotes: {
        list: {
            url: '/api/company/creditNote/list',
            method: 'post',
        },
        create: {
            url: '/api/company/creditNote/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/creditNote/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/creditNote/get',
            method: 'post',
        },
    },
    supplierDeals: {
        list: {
            url: '/api/company/supplierDeal/list',
            method: 'post',
        },
        get: {
            url: `/api/company/supplierDeal/get`,
            method: 'post',
        },
        create: {
            url: '/api/company/supplierDeal/add',
            method: 'post',
        },
        update: {
            url: `/api/company/supplierDeal/edit`,
            method: 'post',
        },
        delete: {
            url: `/api/company/supplierDeal/remove`,
            method: 'post',
        },
        summary: {
            url: '/api/company/supplierDeal/summary',
            method: 'post',
        },
    },

    // Supplier allowances and incentives (rebates, advertising, settlement, swell).
    // GRV-earned amounts are posted automatically; movements are only for manual
    // adjustments such as supplier claims.
    supplierAllowance: {
        list: {
            url: '/api/company/supplierAllowance/all',
            method: 'post',
        },
        get: {
            url: '/api/company/supplierAllowance/get',
            method: 'post',
        },
        create: {
            url: '/api/company/supplierAllowance/create',
            method: 'post',
        },
        update: {
            url: '/api/company/supplierAllowance/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/supplierAllowance/delete',
            method: 'post',
        },
        calculate: {
            url: '/api/company/supplierAllowance/calculate',
            method: 'post',
        },
        summary: {
            url: '/api/company/supplierAllowance/summary',
            method: 'post',
        },
        movementPost: {
            url: '/api/company/supplierAllowance/movement/post',
            method: 'post',
        },
        movementReverse: {
            url: '/api/company/supplierAllowance/movement/reverse',
            method: 'post',
        },
    },

    // Supplier purchase commitments. GRV RECEIVED consumption is automatic,
    // including direct GRVs raised without a purchase order.
    supplierCommitment: {
        list: {
            url: '/api/company/supplierCommitment/all',
            method: 'post',
        },
        get: {
            url: '/api/company/supplierCommitment/get',
            method: 'post',
        },
        create: {
            url: '/api/company/supplierCommitment/create',
            method: 'post',
        },
        update: {
            url: '/api/company/supplierCommitment/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/supplierCommitment/delete',
            method: 'post',
        },
        consume: {
            url: '/api/company/supplierCommitment/consume',
            method: 'post',
        },
        summary: {
            url: '/api/company/supplierCommitment/summary',
            method: 'post',
        },
        movementReverse: {
            url: '/api/company/supplierCommitment/movement/reverse',
            method: 'post',
        },
    },

    // Point of sale

    accountSales: {
        list: {
            url: '/api/company/debtorInvoicingOrder/all',
            method: 'post',
        },
        create: {
            url: '/api/company/debtorInvoicingOrder/create',
            method: 'post',
        },
        update: {
            url: '/api/company/debtorInvoicingOrder/update',
            method: 'post',
        },
        mtCreate: {
            url: '/api/company/debtorInvoicingOrder/mt/create',
            method: 'post',
        },
        mtUpdate: {
            url: '/api/company/debtorInvoicingOrder/mt/update',
            method: 'post',
        },
        quantityRecommendation: {
            url: '/api/company/debtorInvoicingOrder/quantity-recommendation',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/debtorInvoicingOrder/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/debtorInvoicingOrder/get',
            method: 'post',
        },
    },

    saleOrders: {
        list: {
            url: '/api/company/saleOrders/list',
            method: 'post',
        },
        create: {
            url: '/api/company/saleOrders/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/saleOrders/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/saleOrders/get',
            method: 'post',
        },
    },

    quotations: {
        list: {
            url: '/api/company/priceQuotations/list',
            method: 'post',
        },
        create: {
            url: '/api/company/priceQuotations/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/priceQuotations/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/priceQuotations/get',
            method: 'post',
        },
    },

    cashSales: {
        list: {
            url: '/api/company/posCashSaleOrder/all',
            method: 'post',
        },
        create: {
            url: '/api/company/posCashSaleOrder/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/cashSale/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/posCashSaleOrder/get',
            method: 'post',
        },
        mtCreate: {
            url: '/api/company/posCashSaleOrder/mt/create',
            method: 'post',
        },
        update: {
            url: '/api/company/posCashSaleOrder/update',
            method: 'post',
        },
        mtUpdate: {
            url: '/api/company/posCashSaleOrder/mt/update',
            method: 'post',
        },
    },

    cashRefund: {
        list: {
            url: '/api/company/posCashSaleRefund/all',
            method: 'post',
        },
        create: {
            url: '/api/company/posCashSaleRefund/create',
            method: 'post',
        },
        syncCreated: {
            url: '/api/company/pos/cashRefund/sync',
            method: 'post',
        },
        get: {
            url: '/api/company/posCashSaleRefund/get',
            method: 'post',
        },
    },

    voidedSales: {
        list: {
            url: '/api/company/posVoidSale/all',
            method: 'post',
        },
        create: {
            url: '/api/company/posVoidSale/create',
            method: 'post',
        },
        get: {
            url: '/api/company/posVoidSale/get',
            method: 'post',
        },
    },

    // Near-Stock / NST (stock disposition)

    stockDisposition: {
        rules: {
            create: { url: '/api/company/stockDisposition/rule/create', method: 'post' },
            update: { url: '/api/company/stockDisposition/rule/update', method: 'post' },
            get: { url: '/api/company/stockDisposition/rule/get', method: 'post' },
            list: { url: '/api/company/stockDisposition/rule/list', method: 'post' },
            delete: { url: '/api/company/stockDisposition/rule/delete', method: 'post' },
        },
        candidates: {
            list: { url: '/api/company/stockDisposition/candidates', method: 'post' },
        },
        create: { url: '/api/company/stockDisposition/create', method: 'post' },
        get: { url: '/api/company/stockDisposition/get', method: 'post' },
        list: { url: '/api/company/stockDisposition/list', method: 'post' },
        label: { url: '/api/company/stockDisposition/label', method: 'post' },
        approve: { url: '/api/company/stockDisposition/approve', method: 'post' },
        photoUpload: { url: '/company/stockDisposition/photo/upload', method: 'post' },
        cancel: { url: '/api/company/stockDisposition/cancel', method: 'post' },
        writeOff: { url: '/api/company/stockDisposition/writeOff', method: 'post' },
        returnToSupplier: { url: '/api/company/stockDisposition/returnToSupplier', method: 'post' },
        report: { url: '/api/company/stockDisposition/report', method: 'post' },
        reportExport: { url: '/api/company/stockDisposition/report/export', method: 'post' },
    },

    // Store Assets & Maintenance

    companyAsset: {
        list: { url: '/api/company/companyAsset/list', method: 'post' },
        get: { url: '/api/company/companyAsset/get', method: 'post' },
        save: { url: '/api/company/companyAsset/save', method: 'post' },
        delete: { url: '/api/company/companyAsset/delete', method: 'post' },
        event: {
            create: { url: '/api/company/companyAsset/event/create', method: 'post' },
            list: { url: '/api/company/companyAsset/event/list', method: 'post' },
        },
    },

    location: {
        country: {
            list: {
                url: '/api/company/location/country/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/country/add',
                method: 'post',
            },
            get: {
                url: '/api/company/location/country/get',
                method: 'post',
            },
            update: {
                url: '/api/company/location/country/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/location/country/remove',
                method: 'post',
            },
        },

        state: {
            list: {
                url: '/api/company/location/state/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/state/add',
                method: 'post',
            },
            get: {
                url: '/api/company/location/state/get',
                method: 'post',
            },
            update: {
                url: '/api/company/location/state/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/location/state/remove',
                method: 'post',
            },
        },

        district: {
            list: {
                url: '/api/company/location/district/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/district/add',
                method: 'post',
            },
            get: {
                url: '/api/company/location/district/get',
                method: 'post',
            },
            update: {
                url: '/api/company/location/district/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/location/district/remove',
                method: 'post',
            },
        },

        city: {
            list: {
                url: '/api/company/location/city/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/city/add',
                method: 'post',
            },
            get: {
                url: '/api/company/location/city/get',
                method: 'post',
            },
            update: {
                url: '/api/company/location/city/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/location/city/remove',
                method: 'post',
            },
        },

        area: {
            list: {
                url: '/api/company/location/area/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/area/add',
                method: 'post',
            },
            get: {
                url: '/api/company/location/area/get',
                method: 'post',
            },
            update: {
                url: '/api/company/location/area/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/location/area/remove',
                method: 'post',
            },
        },

        region: {
            list: {
                url: '/api/company/location/region/list',
                method: 'post',
            },
            create: {
                url: '/api/company/location/region/add',
                method: 'post',
            },
        },

        subRegion: {
            list: {
                url: '/api/company/location/subRegion/list',
                method: 'post',
            },
        },

        locationConfigurations: {
            list: {
                url: '/api/company/locationConfiguration/list',
                method: 'post',
            },
        },
    },

    suspendedSales: {
        list: {
            url: '/api/company/suspendedSale/list',
            method: 'post',
        },
        create: {
            url: '/api/company/suspendedSale/create',
            method: 'post',
        },
        get: {
            url: '/api/company/suspendedSale/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/suspendedSale/delete',
            method: 'post',
        },
    },

    stockDefaultPrice: {
        list: {
            url: '/api/company/companyStockDetails/defaultPrice',
            method: 'post',
        },
    },
    goodsReceivingClaims: {
        all: {
            url: '/api/company/goodsReceivingClaims/all',
            method: 'POST',
        },
        get: {
            url: '/api/company/goodsReceivingClaims/get',
            method: 'POST',
        },
        create: {
            url: '/api/company/goodsReceivingClaims/create',
            method: 'POST',
        },
    },

    stockMovements: {
        all: {
            url: '/api/company/stockMovement/all',
            method: 'POST',
        },
        create: {
            url: '/api/company/stockMovement/create',
            method: 'POST',
        },
    },

    // Over-supply approvals raised when a requested quantity exceeds remaining stock
    // (store order allocation or stock transfer). The backend creates a pending
    // approval request and returns HTTP 428 OVER_SUPPLY_APPROVAL_REQUIRED.
    overSupplyApproval: {
        pending: { url: '/api/company/overSupplyApproval/pending', method: 'post' },
        get: { url: '/api/company/overSupplyApproval/get', method: 'post' },
        decide: { url: '/api/company/overSupplyApproval/decide', method: 'post' },
    },

    labelTemplate: {
        generateImportBatchLabels: {
            url: '/api/company/labelTemplate/generateImportBatchLabels',
            method: 'POST',
        },
        printUpdatedLabels: {
            url: '/api/company/labelTemplate/printUpdatedLabels',
            method: 'POST',
        },
        printByBarcode: {
            url: '/api/company/labelTemplate/printByBarcode',
            method: 'post',
        },
        create: {
            url: '/api/company/labelTemplate/create',
            method: 'post',
        },
        edit: {
            url: '/api/company/labelTemplate/update',
            method: 'post',
        },
        all: {
            url: '/api/company/labelTemplate/all',
            method: 'post',
        },
        get: {
            url: '/api/company/labelTemplate/get',
            method: 'post',
        },
        delete: {
            url: '/api/company/labelTemplate/delete',
            method: 'delete',
        },
        preview: {
            url: '/api/company/labelTemplate/preview',
            method: 'post',
        },
        print: {
            url: '/api/company/labelTemplate/print',
            method: 'post',
        },
        pendingLabels: {
            url: '/api/company/labelTemplate/pendingLabels',
            method: 'post',
        },
        printPending: {
            url: '/api/company/labelTemplate/printPending',
            method: 'post',
        },
    },

    tenders: {
        list: {
            url: '/api/company/posTenderType/all',
            method: 'post',
        },
        get: {
            url: '/api/company/posTenderType',
            method: 'post',
        },
        create: {
            url: '/api/company/posTenderType/create',
            method: 'post',
        },
        update: {
            url: '/api/company/posTenderType/update',
            method: 'put',
        },
        delete: {
            url: '/api/company/posTenderType/delete',
            method: 'delete',
        },
    },

    // Reports

    reports: {
        inventorySummary: {
            url: '/api/company/reports/inventory-summary',
            method: 'POST',
        },
        stockWiseSales: '/api/company/report/stock-wise',
        categoryWiseSales: '/api/company/report/category-wise-sales',
        debtorWiseSales: '/api/company/report/debtor-wise-sales',
    },

    // Loyalty
    loyalty: {
        memberships: {
            list: {
                url: '/api/company/loyalty/membership/all',
                method: 'post',
            },
            get: {
                url: '/api/company/loyalty/membership/get',
                method: 'post',
            },
            create: {
                url: '/api/company/loyalty/membership/add',
                method: 'post',
            },
            update: {
                url: '/api/company/loyalty/membership/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/loyalty/membership/delete',
                method: 'post',
            },
        },
        loyaltyCards: {
            list: {
                url: '/api/company/loyalty/loyaltyCard/all',
                method: 'post',
            },
            get: {
                url: '/api/company/loyalty/loyaltyCard/get',
                method: 'post',
            },
            create: {
                url: '/api/company/loyalty/loyaltyCard/add',
                method: 'post',
            },
            update: {
                url: '/api/company/loyalty/loyaltyCard/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/loyalty/loyaltyCard/delete',
                method: 'post',
            },
        },
        debtorLoyaltyCards: {
            list: {
                url: '/api/company/loyalty/debtorLoyaltyCard/all',
                method: 'post',
            },
            get: {
                url: '/api/company/loyalty/debtorLoyaltyCard/get',
                method: 'post',
            },
            create: {
                url: '/api/company/loyalty/debtorLoyaltyCard/add',
                method: 'post',
            },
            update: {
                url: '/api/company/loyalty/debtorLoyaltyCard/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/loyalty/debtorLoyaltyCard/delete',
                method: 'post',
            },
        },
        customerLoyaltyCards: {
            list: {
                url: '/api/company/loyalty/customerLoyaltyCard/all',
                method: 'post',
            },
            get: {
                url: '/api/company/loyalty/customerLoyaltyCard/get',
                method: 'post',
            },
            create: {
                url: '/api/company/loyalty/customerLoyaltyCard/add',
                method: 'post',
            },
            update: {
                url: '/api/company/loyalty/customerLoyaltyCard/edit',
                method: 'post',
            },
            delete: {
                url: '/api/company/loyalty/customerLoyaltyCard/delete',
                method: 'post',
            },
        },
        transactions: {
            list: {
                url: '/api/company/loyalty/loyaltyTransaction',
                method: 'get',
            },
        },
        reports: {
            transactionSummary: '/api/company/loyalty/report/transaction-summary',
            pointsComparison: '/api/company/loyalty/report/points-comparison',
            expiringDebtorCards: '/api/company/loyalty/report/expiringDebtorCards',
            expiringCustomerCards: '/api/company/loyalty/report/expiringCustomerCards',
        },
        accountSaleLoyalty: {
            checkout: {
                url: '/api/company/debtorInvoicingOrder/checkout-loyalty',
                method: 'post',
            },
        },
        cashSaleLoyalty: {
            checkout: {
                url: '/api/company/posCashSaleOrder/checkout-loyalty',
                method: 'post',
            },
        },
    },
    promotions: {
        list: {
            url: '/api/company/promotions/all',
            method: 'post',
        },
        eligibleList: {
            url: '/api/company/promotions/eligible/all',
            method: 'post',
        },
        get: {
            url: '/api/company/promotions/get',
            method: 'post',
        },
        create: {
            url: '/api/company/promotions/create',
            method: 'post',
        },
        update: {
            url: '/api/company/promotions/update',
            method: 'post',
        },
        delete: {
            url: '/api/company/promotions/delete',
            method: 'post',
        },
        validate: {
            url: '/api/company/promotions/getForItems',
            method: 'post',
        },
        autoApply: {
            url: '/api/company/promotions/eligible/all',
            method: 'post',
        },
        // Preview which promotions would apply to a candidate basket, without saving.
        evaluate: {
            url: '/api/company/promotions/evaluate',
            method: 'post',
        },
        changeStatus: {
            url: '/api/company/promotions/changeStatus',
            method: 'post',
        },
    },
    promotionTypes: {
        list: {
            url: '/api/company/promotionTypes/all',
            method: 'post',
        },
    },
    promotionGroups: {
        list: {
            url: '/api/company/promotionGroups/all',
            method: 'post',
        },
    },
    importHistory: {
        list: {
            url: '/api/company/importLogs/list-batches',
            method: 'post',
        },
        details: {
            url: '/api/company/importLogs/list-rows',
            method: 'post',
        },
        logs: {
            url: '/api/company/importLogs/list-logs',
            method: 'post',
        },
    },
    companyContext: {
        url: '/api/company/users/company-context',
        method: 'GET',
    },
    companyReports: {
        // Data Sources
        listDataSources: {
            url: '/api/company/reports/designer/data-sources',
            method: 'GET',
        },
        getDataSource: {
            url: '/api/company/reports/designer/data-sources/',
            method: 'GET',
        },
        availableDataSources: {
            url: '/api/company/reports/designer/data-sources/available',
            method: 'POST',
        },
        // Templates
        listTemplates: {
            url: '/api/company/reports/templates',
            method: 'GET',
        },
        createTemplate: {
            url: '/api/company/reports/templates',
            method: 'POST',
        },
        getTemplate: {
            url: '/api/company/reports/templates/',
            method: 'GET',
        },
        updateTemplate: {
            url: '/api/company/reports/templates/',
            method: 'PUT',
        },
        deleteTemplate: {
            url: '/api/company/reports/templates/',
            method: 'DELETE',
        },
        // Versions
        listVersions: {
            url: '/api/company/reports/templates/',
            method: 'GET',
        },
        publishTemplate: {
            url: '/api/company/reports/templates/',
            method: 'POST',
        },
        rollbackTemplate: {
            url: '/api/company/reports/templates/',
            method: 'POST',
        },
        // Preview / Export
        previewTemplate: {
            url: '/api/company/reports/templates/',
            method: 'POST',
        },
        exportTemplate: {
            url: '/api/company/reports/templates/',
            method: 'POST',
        },
        // Report Designer Document
        designerDocument: {
            url: '/api/company/reports/designer/',
            method: 'GET',
        },
        designerSelectObject: {
            url: '/api/company/reports/designer/',
            method: 'POST',
        },
        designerUpdateProperty: {
            url: '/api/company/reports/designer/',
            method: 'PATCH',
        },
        designerSave: {
            url: '/api/company/reports/designer/',
            method: 'POST',
        },
    },
    security: {
        actions: { url: '/api/company/security/actions', method: 'post' },
        actionsTree: { url: '/api/company/security/actions/tree', method: 'post' },
        actionPolicy: { url: '/api/company/security/actions/policy', method: 'post' },
        groupActions: { url: '/api/company/security/groups/actions', method: 'post' },
        groupActionsUpdate: { url: '/api/company/security/groups/actions/update', method: 'post' },
        groupEffectivePermissions: {
            url: '/api/company/security/groups/effective-permissions',
            method: 'post',
        },
        authorize: { url: '/api/company/security/authorize', method: 'post' },
        approvalRoutingCreate: { url: '/api/company/security/approval-routing/create', method: 'post' },
        approvalRoutingList: { url: '/api/company/security/approval-routing/list', method: 'post' },
        approvalRoutingUpdate: { url: '/api/company/security/approval-routing/update', method: 'post' },
        approvalRoutingDelete: { url: '/api/company/security/approval-routing/delete', method: 'post' },
        approvalsApprove: { url: '/api/company/security/approvals/approve', method: 'post' },
        approvalsGet: { url: '/api/company/security/approvals/get', method: 'post' },
        approvalsReject: { url: '/api/company/security/approvals/reject', method: 'post' },
        approvalsCancel: { url: '/api/company/security/approvals/cancel', method: 'post' },
        approvalsList: { url: '/api/company/security/approvals/list', method: 'post' },
        approvalsSummary: { url: '/api/company/security/approvals/summary', method: 'post' },
        // Supervisor desk (3241/3242/3243) and requester token claim (3244).
        inboxSummary: { url: '/api/company/security/approvals/inbox/summary', method: 'post' },
        inboxList: { url: '/api/company/security/approvals/inbox/list', method: 'post' },
        inboxGet: { url: '/api/company/security/approvals/inbox/get', method: 'post' },
        inboxApprove: { url: '/api/company/security/approvals/inbox/approve', method: 'post' },
        inboxReject: { url: '/api/company/security/approvals/inbox/reject', method: 'post' },
        historyList: { url: '/api/company/security/approvals/history/list', method: 'post' },
        claimToken: { url: '/api/company/security/approvals/claim-token', method: 'post' },
    },
    storeCategory: {
        save: { url: '/api/company/storeCategory/save', method: 'post' },
        list: { url: '/api/company/storeCategory/list', method: 'post' },
        get: { url: '/api/company/storeCategory/get', method: 'post' },
        assign: { url: '/api/company/storeCategory/assign', method: 'post' },
        assignmentsList: { url: '/api/company/storeCategory/assignments/list', method: 'post' },
        assignmentsGet: { url: '/api/company/storeCategory/assignments/get', method: 'post' },
        assignmentsEdit: { url: '/api/company/storeCategory/assignments/edit', method: 'post' },
        assignmentsDelete: { url: '/api/company/storeCategory/assignments/delete', method: 'post' },
    },
    stockItemTag: {
        save: { url: '/api/company/stockItemTag/save', method: 'post' },
        list: { url: '/api/company/stockItemTag/list', method: 'post' },
        remove: { url: '/api/company/stockItemTag/remove', method: 'post' },
    },
    discountOverrides: {
        notifications: { url: '/api/company/security/discount-overrides/notifications', method: 'post' },
        notificationsSummary: {
            url: '/api/company/security/discount-overrides/notifications/summary',
            method: 'post',
        },
        notificationsRead: {
            url: '/api/company/security/discount-overrides/notifications/read',
            method: 'post',
        },
        notificationsAcknowledge: {
            url: '/api/company/security/discount-overrides/notifications/acknowledge',
            method: 'post',
        },
    },
    eftNotification: {
        all: { url: '/api/company/eftNotification/all', method: 'post' },
        resolve: { url: '/api/company/eftNotification/resolve', method: 'post' },
    },
    storeInventorySalesConfiguration: {
        save: { url: '/api/company/storeInventorySalesConfiguration/save', method: 'post' },
    },
    companyDebtorOrder: {
        configurationSave: { url: '/api/company/companyDebtorOrder/configuration/save', method: 'post' },
        configurationGet: { url: '/api/company/companyDebtorOrder/configuration/get', method: 'post' },
        configurationAll: { url: '/api/company/companyDebtorOrder/configuration/all', method: 'post' },
        configurationDelete: { url: '/api/company/companyDebtorOrder/configuration/delete', method: 'post' },
        create: { url: '/api/company/companyDebtorOrder/create', method: 'post' },
        update: { url: '/api/company/companyDebtorOrder/update', method: 'post' },
        get: { url: '/api/company/companyDebtorOrder/get', method: 'post' },
        all: { url: '/api/company/companyDebtorOrder/all', method: 'post' },
        report: { url: '/api/company/companyDebtorOrder/report', method: 'post' },
        schedule: { url: '/api/company/companyDebtorOrder/schedule', method: 'post' },
        allocationPreview: { url: '/api/company/companyDebtorOrder/allocation-preview', method: 'post' },
        allocate: { url: '/api/company/companyDebtorOrder/allocate', method: 'post' },
        pick: { url: '/api/company/companyDebtorOrder/pick', method: 'post' },
        checkingTemplate: { url: '/api/company/companyDebtorOrder/checking-template', method: 'post' },
        dispatch: { url: '/api/company/companyDebtorOrder/dispatch', method: 'post' },
        confirmDelivery: { url: '/api/company/companyDebtorOrder/confirm-delivery', method: 'post' },
        inventoryPostingStatus: {
            url: '/api/company/companyDebtorOrder/inventory-posting/status',
            method: 'post',
        },
        invoicePreview: { url: '/api/company/companyDebtorOrder/invoice-preview', method: 'post' },
        createAccountSale: { url: '/api/company/companyDebtorOrder/create-account-sale', method: 'post' },
        cancel: { url: '/api/company/companyDebtorOrder/cancel', method: 'post' },
    },
    warehouseLocation: {
        save: { url: '/api/company/warehouseLocation/save', method: 'post' },
        tree: { url: '/api/company/warehouseLocation/tree', method: 'post' },
        all: { url: '/api/company/warehouseLocation/all', method: 'post' },
        get: { url: '/api/company/warehouseLocation/get', method: 'post' },
        assignInventory: { url: '/api/company/warehouseLocation/assign-inventory', method: 'post' },
        assignmentInventory: { url: '/api/company/warehouseLocation/assignment-inventory', method: 'post' },
        delete: { url: '/api/company/warehouseLocation/delete', method: 'post' },
    },
    warehousePicklist: {
        generate: { url: '/api/company/warehousePicklist/generate', method: 'post' },
    },
    companyStockPricing: {
        schedule: { url: '/api/company/companyStockPricing/schedule', method: 'post' },
        scheduled: { url: '/api/company/companyStockPricing/scheduled', method: 'post' },
        cancelSchedule: { url: '/api/company/companyStockPricing/schedule/cancel', method: 'post' },
    },
    pricingMatrix: {
        save: { url: '/api/company/pricingMatrix/save', method: 'post' },
        get: { url: '/api/company/pricingMatrix/get', method: 'post' },
        all: { url: '/api/company/pricingMatrix/all', method: 'post' },
        delete: { url: '/api/company/pricingMatrix/delete', method: 'post' },
        resolve: { url: '/api/company/pricingMatrix/resolve', method: 'post' },
    },
    pricingPolicy: {
        validate: { url: '/api/company/pricingPolicy/validate', method: 'post' },
        preview: { url: '/api/company/pricingPolicy/preview', method: 'post' },
        rule: { url: '/api/company/pricingPolicy/rule', method: 'post' },
    },
    supplierDealAlerts: {
        list: { url: '/api/company/supplierDeal/alert/list', method: 'post' },
        summary: { url: '/api/company/supplierDeal/alert/summary', method: 'post' },
        generate: { url: '/api/company/supplierDeal/alert/generate', method: 'post' },
        acknowledge: { url: '/api/company/supplierDeal/alert/acknowledge', method: 'post' },
    },

    uom: {
        list: { url: '/api/company/uom', method: 'get' },
        create: { url: '/api/company/uom', method: 'post' },
        get: { url: (id: string) => `/api/company/uom/${id}`, method: 'get' },
        update: { url: (id: string) => `/api/company/uom/${id}`, method: 'put' },
        delete: { url: (id: string) => `/api/company/uom/${id}`, method: 'delete' },
        conversionList: { url: '/api/company/uom/conversion', method: 'get' },
        conversionCreate: { url: '/api/company/uom/conversion', method: 'post' },
    },
    denominations: {
        create: { url: '/api/company/denominations/create', method: 'post' },
        all: { url: '/api/company/denominations/all', method: 'post' },
        get: { url: '/api/company/denominations/get', method: 'post' },
        update: { url: '/api/company/denominations/update', method: 'post' },
        delete: { url: '/api/company/denominations/delete', method: 'post' },
    },
    cashUp: {
        create: { url: '/api/company/cashUp/create', method: 'post' },
        all: { url: '/api/company/cashUp/all', method: 'post' },
        get: { url: '/api/company/cashUp/get', method: 'post' },
        update: { url: '/api/company/cashUp/update', method: 'post' },
        delete: { url: '/api/company/cashUp/delete', method: 'post' },
        tenders: { url: '/api/company/cashUp/tenders', method: 'post' },
    },
    shift: {
        create: { url: '/api/company/shift/create', method: 'post' },
        all: { url: '/api/company/shift/all', method: 'post' },
        get: { url: '/api/company/shift/get', method: 'post' },
        update: { url: '/api/company/shift/update', method: 'post' },
        delete: { url: '/api/company/shift/delete', method: 'post' },
    },
    tillToSafe: {
        create: { url: '/api/company/till-to-safe-transfer', method: 'post' },
        all: { url: '/api/company/till-to-safe-transfer/all', method: 'post' },
        get: { url: '/api/company/till-to-safe-transfer/get', method: 'post' },
        reverse: { url: '/api/company/tillToSafeTransactions/reverse', method: 'post' },
    },
    tillManagementReport: {
        report: { url: '/api/company/reports/till-management', method: 'post' },
    },
    // 3020 - Z-Report & Trading-Day Close (endOfDay, keyed by tradingDate)
    endOfDay: {
        preview: { url: '/api/company/endOfDay/preview', method: 'post' },
        close: { url: '/api/company/endOfDay/close', method: 'post' },
        get: { url: '/api/company/endOfDay/get', method: 'post' },
        all: { url: '/api/company/endOfDay/all', method: 'post' },
        reopen: { url: '/api/company/endOfDay/reopen', method: 'post' },
    },
    // 3022 - Group Debtor Payment Allocation (one receipt allocated across invoices of a debtor group)
    debtorReceiptAllocationGroup: {
        eligible: { url: '/api/company/debtorReceiptAllocation/group/eligible', method: 'post' },
        allocate: { url: '/api/company/debtorReceiptAllocation/group/allocate', method: 'post' },
        get: { url: '/api/company/debtorReceiptAllocation/group/get', method: 'post' },
        list: { url: '/api/company/debtorReceiptAllocation/group/list', method: 'post' },
        reverse: { url: '/api/company/debtorReceiptAllocation/group/reverse', method: 'post' },
    },
    // 3045 / 3046 - Debtor Payment Reconciliation & Invoice Ageing / Credit Allocation
    debtorReconciliation: {
        summary: { url: '/api/company/debtorReconciliation/summary', method: 'post' },
        unmatched: { url: '/api/company/debtorReconciliation/unmatched', method: 'post' },
        mismatches: { url: '/api/company/debtorReconciliation/mismatches', method: 'post' },
        eligible: { url: '/api/company/debtorReconciliation/eligible', method: 'post' },
        reconcile: { url: '/api/company/debtorReconciliation/reconcile', method: 'post' },
        get: { url: '/api/company/debtorReconciliation/get', method: 'post' },
        reverse: { url: '/api/company/debtorReconciliation/reverse', method: 'post' },
        ageing: { url: '/api/company/debtorReconciliation/ageing', method: 'post' },
    },
    // 3143 - Price Mismatch Credit Note
    creditNotePriceMismatch: {
        preview: { url: '/api/company/creditNote/priceMismatch/preview', method: 'post' },
        create: { url: '/api/company/creditNote/create', method: 'post' },
        createMt: { url: '/api/company/creditNote/mt/create', method: 'post' },
        list: { url: '/api/company/creditNote/list', method: 'post' },
        listMt: { url: '/api/company/creditNote/mt/list', method: 'post' },
        get: { url: '/api/company/creditNote/get', method: 'post' },
        getMt: { url: '/api/company/creditNote/mt/get', method: 'post' },
    },
    syncMonitoring: {
        overview: { url: '/api/company/sync/overview', method: 'post' },
        list: { url: '/api/company/sync/list', method: 'post' },
    },
    // 3200-3208 - Cash Office Management
    cashOffice: {
        configurationCreate: { url: '/api/company/cashOffice/configuration/create', method: 'post' },
        configurationUpdate: { url: '/api/company/cashOffice/configuration/update', method: 'post' },
        configurationGet: { url: '/api/company/cashOffice/configuration/get', method: 'post' },
        configurationList: { url: '/api/company/cashOffice/configuration/list', method: 'post' },
        configurationChangeStatus: { url: '/api/company/cashOffice/configuration/changeStatus', method: 'post' },
        paymentMethodList: { url: '/api/company/cashOffice/payment-method/list', method: 'post' },
        paymentRoutingCheck: { url: '/api/company/cashOffice/payment-routing/check', method: 'post' },
        sessionOpenPreview: { url: '/api/company/cashOffice/session/openPreview', method: 'post' },
        sessionOpen: { url: '/api/company/cashOffice/session/open', method: 'post' },
        sessionCurrent: { url: '/api/company/cashOffice/session/current', method: 'post' },
        sessionGet: { url: '/api/company/cashOffice/session/get', method: 'post' },
        sessionList: { url: '/api/company/cashOffice/session/list', method: 'post' },
        sessionClose: { url: '/api/company/cashOffice/session/close', method: 'post' },
        sessionReopen: { url: '/api/company/cashOffice/session/reopen', method: 'post' },
        handoverRequest: { url: '/api/company/cashOffice/handover/request', method: 'post' },
        handoverList: { url: '/api/company/cashOffice/handover/list', method: 'post' },
        handoverClaim: { url: '/api/company/cashOffice/handover/claim', method: 'post' },
        handoverCount: { url: '/api/company/cashOffice/handover/count', method: 'post' },
        handoverReceive: { url: '/api/company/cashOffice/handover/receive', method: 'post' },
        handoverApproveVariance: { url: '/api/company/cashOffice/handover/approveVariance', method: 'post' },
        handoverReceipt: { url: '/api/company/cashOffice/handover/receipt', method: 'post' },
        handoverAcknowledge: { url: '/api/company/cashOffice/handover/acknowledge', method: 'post' },
        handoverReject: { url: '/api/company/cashOffice/handover/reject', method: 'post' },
        handoverReverse: { url: '/api/company/cashOffice/handover/reverse', method: 'post' },
        receiptCreate: { url: '/api/company/cashOffice/receipt/create', method: 'post' },
        transactionCreate: { url: '/api/company/cashOffice/transaction/create', method: 'post' },
        transactionUpdateDraft: { url: '/api/company/cashOffice/transaction/updateDraft', method: 'post' },
        transactionSubmit: { url: '/api/company/cashOffice/transaction/submit', method: 'post' },
        transactionPost: { url: '/api/company/cashOffice/transaction/post', method: 'post' },
        transactionList: { url: '/api/company/cashOffice/transaction/list', method: 'post' },
        transactionReverse: { url: '/api/company/cashOffice/transaction/reverse', method: 'post' },
        transferCreate: { url: '/api/company/cashOffice/transfer/create', method: 'post' },
        transferDispatch: { url: '/api/company/cashOffice/transfer/dispatch', method: 'post' },
        transferReceive: { url: '/api/company/cashOffice/transfer/receive', method: 'post' },
        transferList: { url: '/api/company/cashOffice/transfer/list', method: 'post' },
        bankCreate: { url: '/api/company/cashOffice/bank/create', method: 'post' },
        bankPost: { url: '/api/company/cashOffice/bank/post', method: 'post' },
        bankConfirmWithdrawal: { url: '/api/company/cashOffice/bank/confirmWithdrawal', method: 'post' },
        bankList: { url: '/api/company/cashOffice/bank/list', method: 'post' },
        reconciliationPreview: { url: '/api/company/cashOffice/reconciliation/preview', method: 'post' },
        reconciliationSubmit: { url: '/api/company/cashOffice/reconciliation/submit', method: 'post' },
        reconciliationApprove: { url: '/api/company/cashOffice/reconciliation/approve', method: 'post' },
        dashboard: { url: '/api/company/cashOffice/dashboard', method: 'post' },
        search: { url: '/api/company/cashOffice/search', method: 'post' },
        reportDailyStatement: { url: '/api/company/cashOffice/report/dailyStatement', method: 'post' },
        reportHandovers: { url: '/api/company/cashOffice/report/handovers', method: 'post' },
        reportPayments: { url: '/api/company/cashOffice/report/payments', method: 'post' },
        reportTransfers: { url: '/api/company/cashOffice/report/transfers', method: 'post' },
        reportBanking: { url: '/api/company/cashOffice/report/banking', method: 'post' },
        reportVariances: { url: '/api/company/cashOffice/report/variances', method: 'post' },
        reportAudit: { url: '/api/company/cashOffice/report/audit', method: 'post' },
        reportExport: { url: '/api/company/cashOffice/report/export', method: 'post' },
    },
    // Backlog 3024 - Product Publication (saleable/orderable listing with approval workflow)
    productPublication: {
        create: { url: '/api/company/productPublication/create', method: 'post' },
        submit: { url: '/api/company/productPublication/submit', method: 'post' },
        resolve: { url: '/api/company/productPublication/resolve', method: 'post' },
        list: { url: '/api/company/productPublication/list', method: 'post' },
        decide: { url: '/api/company/productPublication/decide', method: 'post' },
        get: { url: '/api/company/productPublication/get', method: 'post' },
        update: { url: '/api/company/productPublication/update', method: 'post' },
        delete: { url: '/api/company/productPublication/delete', method: 'post' },
    },
    // Backlog 3024 - Menu & Program Shortcuts (menu + menuAccess + till shortcuts)
    companyMenu: {
        create: { url: '/api/company/menu/create', method: 'post' },
        all: { url: '/api/company/menu/all', method: 'post' },
        get: { url: '/api/company/menu/get', method: 'post' },
        update: { url: '/api/company/menu/update', method: 'post' },
        delete: { url: '/api/company/menu/delete', method: 'post' },
    },
    menuAccess: {
        create: { url: '/api/company/menuAccess/create', method: 'post' },
        all: { url: '/api/company/menuAccess/all', method: 'post' },
        get: { url: '/api/company/menuAccess/get', method: 'post' },
        update: { url: '/api/company/menuAccess/update', method: 'post' },
        delete: { url: '/api/company/menuAccess/delete', method: 'post' },
    },
    shortcuts: {
        create: { url: '/api/company/shortcuts/create', method: 'post' },
        list: { url: '/api/company/shortcuts/list', method: 'post' },
        keys: { url: '/api/company/shortcuts/keys', method: 'post' },
        get: { url: '/api/company/shortcuts/get', method: 'post' },
        update: { url: '/api/company/shortcuts/update', method: 'post' },
    },
} as const;

// Download CSV

type ApiUrlGroups = typeof apiUrls;

type ApiSubKeys<K extends keyof ApiUrlGroups> = keyof ApiUrlGroups[K];

export async function axiosDownloadCSV<
    T extends object,
    K extends keyof ApiUrlGroups,
    S extends ApiSubKeys<K> | undefined = undefined,
>({ filters, label, key, listType }: { filters: T; label?: string; key: K; listType?: S }) {
    const effectiveKey = (listType || ('list' in apiUrls[key] ? 'list' : undefined)) as ApiSubKeys<K> | undefined;

    if (!effectiveKey) {
        throw new Error(`No valid subKey found for API key: ${String(key)}`);
    }

    const apiEntry = apiUrls[key][effectiveKey] as {
        url: string;
        method: string;
    };

    const response = await axiosInstance({
        url: apiEntry.url,
        method: apiEntry.method,
        ...(apiEntry.method === 'get' ? { params: filters } : { data: filters }),
        responseType: 'blob',
        headers: {
            Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
    });

    const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = `${label || 'Data'}_Report.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
}
