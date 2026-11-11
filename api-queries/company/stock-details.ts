import { axiosInstance, handleError, axiosNetworkInstance, apiUrls, axiosDownloadCSV } from '@/api-queries';
import { CreateStockDetailsSchema, TaxItemSchema, UpdateStockDetailsSchema } from '@/schema/company/stock-details';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Company } from '../company-details';
import { getApiKey, getIDBKey } from '@/utils/helpers';
import { getDBData, setDBData } from '@/offline/db';
import { CartItemPricingType } from '../point-of-sale';
import { CategoryDetails } from '../categories';
import { SubCategoryDetails } from '../categories/sub-categories';
import { TaxRateDetails } from '../company-details/tax-rates';
import { CompanyStockCostType } from './stock-pricing';
import { SupplierDealDetails } from '../goods-receiving/supplier-deals';
import { StockVariantDetails } from '../masters/stock-variants';

export interface StockDetailsQuery {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
    isCsv?: boolean;
    csvLabel?: string;
    pricing?: boolean;
    isReportToItem?: boolean;
}

export interface Domain {
    id: string;
    domainName: string;
    organisationName: string;
    contactPerson: string;
    designation: string;
    email: string;
    phone: string;
    password: string;
    otp: string;
    mediaId: string;
    inviteUrl: string;
    appUrl: string;
    smsProvider: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

export interface CompanyStockPricing {
    id: string;
    createdAt: string;
    updatedAt: string;
    timezone: string;
    status: string;
    domainId: string;
    companyId: string;
    companyStockDetailId: string;
    companyStockPricingTypeId: string;
    priceExclusive: number;
    priceInclusive: number;
    markupPercent: number;
    gpPercent: number;
    // markupPercentLatestCost: number;
    // gpPercentLatestCost: number;
    // markupPercentFutureCost: number;
    // gpPercentFutureCost: number;
    effectiveDate: string | null;
    isFuturePrice: boolean;
    appliedDate: string | null;
    enable: number;
}

export interface StockDetails {
    id: string;
    timezone: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    domainId: string;
    companyId: string;
    itemCode: string;
    unitCode: string;
    caseCode: string;
    shrinkCode: string;
    description: string;
    alternativeDescription: string;
    barcode: string;
    generalCode: string;
    stockTypeId: string | null;
    itemCategoryId: string | null;
    majorDepartmentId: string | null;
    minorDepartmentId: string | null;
    rangeId: string | null;
    range?: {
        id: string;
        name: string;
        code?: string | null;
        description?: string | null;
        subCategoryId?: string;
        status?: string;
    } | null;
    cycleId: string | null;
    companyTaxRateId: string | null;
    companyItemCode: string | null;
    storageLocation: string;
    packSize: number;
    packDescription: string;
    lifeTimeInDays: number;
    uomHoldingId: string | null;
    uomInputId: string | null;
    genericTypeId: string | null;
    brandId: string | null;
    modelId: string | null;
    technicalSpecificationsId: string | null;
    supplierHierarchyId: string | null;
    supplierDepartmentId: string | null;
    tariffCodeId: string | null;
    materialId: string | null;
    assemblyTypeId: string | null;
    importTypeId: string | null;
    colourDetailedId: string | null;
    incoTermsId: string | null;
    guaranteeTermsId: string | null;
    buyerId: string | null;
    defaultLineRepId: string | null;
    weight: number;
    length: number;
    width: number;
    underBatchControl: boolean;
    disallowDecimals: boolean;
    sectionSevenExempt: boolean | null;
    domesticReverseCharge: boolean | null;
    abcClassification: string | null;
    overrideGrvLabelQuantity: boolean | null;
    override: boolean | null;
    overrideGrvLabelQuantityValue: number | null;
    excludeFromExtraChargeCostAllocationOnGrv: boolean | null;
    ignoreQuantityChangeSecurityOverride: boolean | null;
    allowSellingUnderCost: boolean;
    allowSellingIntoNegative: boolean;
    allowDiscount: boolean;
    stockOnHand: number;
    availableStock?: number;
    itemOnHold: boolean;
    dormantDays: number | null;
    scaleItem: boolean | null;
    reportToItem: string | null;
    reportToItemDetails: StockDetails | null;
    // New pack/unit mapping (Backlog 3235). When configured, base fields determine the
    // smallest physical unit for a selling SKU. Coexists with reportToItem fields.
    baseInventoryItemId?: string | null;
    baseStockDetailId?: string | null;
    inventoryUnitsPerSellingUnit?: number | null;
    reportToItemChildren: StockDetails[] | null;
    domain: Domain;
    company: Company;
    CompanyStockPricing: CompanyStockPricing[];
    pricingTypes: CartItemPricingType[];
    // Flattened default pricing echoed by the promotion detail/list API.
    priceInclusive?: number;
    priceExclusive?: number;
    unitPrice?: number;
    costTypes: CompanyStockCostType;
    categoryId: string;
    category: CategoryDetails;
    subCategoryId: string;
    subCategory: SubCategoryDetails & { taxRate: TaxRateDetails };
    variantId: string | null;
    stockVariant?: StockVariantDetails | null;
    lastModifiedById: string;
    lastModifiedUser: {
        id: string;
        name: string;
        email: string;
    };
    companySupplierDeal: SupplierDealDetails;
    taxes: TaxItemSchema[];
}

export type CompanyStockDetailsListResponse = {
    success: boolean;
    message: string;
    data: {
        count: number;
        rows: StockDetails[];
    };
};

export const companyStockDetailsList = async (
    params: StockDetailsQuery,
): Promise<CompanyStockDetailsListResponse | void> => {
    if (params?.isCsv) {
        axiosDownloadCSV({ filters: params, key: 'stocks', label: params?.csvLabel });
    } else {
        return (
            await axiosInstance({
                url: apiUrls.stocks.list.url,
                method: apiUrls.stocks.list.method,
                params,
            })
        ).data;
    }
};

export const useCompanyStockDetailsList = (params: StockDetailsQuery) => {
    return useQuery({
        queryKey: [getApiKey(apiUrls.stocks), params],
        queryFn: async () => await companyStockDetailsList(params),
    });
};

// Stock Details Offline Listing

export async function getStockDetailsOffline(online: boolean): Promise<CompanyStockDetailsListResponse> {
    if (online) {
        const response = await axiosNetworkInstance({
            url: apiUrls.stocks.offlineList.url,
            method: apiUrls.stocks.offlineList.method,
        });
        await setDBData(getIDBKey(apiUrls.stocks), response.data);
        return response.data;
    } else {
        const cached = await getDBData<CompanyStockDetailsListResponse>(getIDBKey(apiUrls.stocks));

        if (!cached) {
            throw new Error('No cached data available');
        }
        return cached;
    }
}

export const useCompanyStockDetailsOffline = (online: boolean) => {
    return useQuery({
        queryKey: [getIDBKey(apiUrls.stocks), online],
        queryFn: async () => await getStockDetailsOffline(online),
    });
};

// Stock Detail by ID

type CompanyStockDetailByIdResponse = {
    message: string;
    data: StockDetails;
};

export const companyStockDetailById = async (stockId: string): Promise<CompanyStockDetailByIdResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.stocks.get.url(stockId),
            method: apiUrls.stocks.get.method,
        })
    ).data;
};

export const useCompanyStockDetailById = (stockId: string) => {
    return useQuery({
        queryKey: [apiUrls.stocks, stockId],
        queryFn: async () => await companyStockDetailById(stockId),
        enabled: !!stockId,
    });
};

export type MutateStockDetailsResponse = {
    success: boolean;
    data: CompanyStockDetailsListResponse;
    message: string;
};

export const createCompanyStockDetail = async (
    payload: CreateStockDetailsSchema,
): Promise<MutateStockDetailsResponse> => {
    return (
        await axiosInstance({
            url: apiUrls.stocks.create.url,
            method: apiUrls.stocks.create.method,
            data: payload,
        })
    ).data;
};

export const updateCompanyStockDetail = async (
    payload: UpdateStockDetailsSchema,
): Promise<MutateStockDetailsResponse> => {
    const { id, ...data } = payload;
    return (
        await axiosInstance({
            url: apiUrls.stocks.update.url(id),
            method: apiUrls.stocks.update.method,
            data,
        })
    ).data;
};

export const useCreateCompanyStockDetail = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createCompanyStockDetail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stocks)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        onError: (error) => {
            handleError('Stock Details Creation Failed', error);
        },
    });
};

export const useUpdateCompanyStockDetail = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateCompanyStockDetail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [getApiKey(apiUrls.stocks)] });
            queryClient.invalidateQueries({ queryKey: [getIDBKey(apiUrls.stocks)] });
        },
        onError: (error) => {
            handleError('Stock Details Updation Failed', error);
        },
    });
};
