import { BankAccountType, BaseCompanySettings, CompanyStatus, PaymentMethod, TaxStatus } from './company.types';

export interface CompanyCreditorSetting extends BaseCompanySettings {
    creditorGroupId: string;
    creditorSubGroupId: string | null;
    debtorGroupId?: string | null;
    debtorSubGroupId?: string | null;
    companyDebtorGroupId?: string | null;
}

export interface CompanyCreditorAccountSaleSettings {
    accountSaleQuantityControlEnabled?: boolean;
    accountSaleSalesLookbackDays?: number;
    accountSaleTargetStockDays?: number;
    accountSaleSeasonalUpliftPercent?: number;
    accountSaleSeasonStartMonth?: number;
    accountSaleSeasonEndMonth?: number;
}

export const COMPANY_DEBTOR_TYPES = [
    { value: 'COMPANY_OWNED', label: 'Company Owned' },
    { value: 'EXTERNAL', label: 'External' },
] as const;

export type CompanyDebtorType = (typeof COMPANY_DEBTOR_TYPES)[number]['value'];

// POST /api/company/creditor/get returns the bank block as `bankingInfo`.
// CompanyCreditorBankingInfo is kept as a fallback for older responses.
export interface CompanyCreditorBankingInfo {
    id?: string;
    companyId?: string;
    bankName?: string | null;
    bankAccount?: string | null;
    bankSubAccount?: string | null;
    bankBranchCode?: string | null;
    bankEftNumber?: string | null;
    bankAccountType?: string | null;
    bankProofOfPayment?: boolean | string | null;
    currencyId?: string | null;
    groupAccountId?: string | null;
    terms?: string | null;
    creditLimit?: number | string | null;
    enforceCreditLimitChecking?: boolean | null;
    excludeFromInterest?: boolean | null;
    InsuredCreditLimit?: number | string | null;
    interesetRiskProfile?: string | null;
    reviewRequired?: boolean | null;
    reviewRequiredAt?: string | null;
    reviewResolvedAt?: string | null;
    // Only sent while confirming a record that needs review; never sent on ordinary saves.
    confirmReview?: boolean;
}

export interface CompanyCreditor {
    id: string;
    timezone: string;
    domainId: string;
    companyId: string;
    accountNumber: string;
    name: string;
    companyDebtorGroupId?: string | null;
    tradingAs: string;
    companyRegistrationNumber: string | null;
    taxNumber: string | null;
    taxStatus: TaxStatus;
    preferredTaxRate: string;
    title?: string | null;
    initials?: string | null;
    idNumber?: string | null;
    contact: string;
    birthday?: string | null;
    cellphoneNumber: string;
    faxNumber?: string | null;
    terms?: string | null;
    // Credit limit lives on the main creditor account, not in bankingInfo.
    creditLimit?: number | string | null;
    emailAddress?: string | null;
    telephoneNumberOne?: string | null;
    telephoneNumberTwo?: string | null;
    countryId?: string | null;
    area?: string | null;
    postalAddress?: string | null;
    postalCode?: string | null;
    deliveryAddress?: string | null;
    deliveryAddressPostalCode?: string | null;
    createdAt: string;
    isPromotionExist: boolean;
    updatedAt: string;
    CompanyCreditorSetting: CompanyCreditorSetting;
    bankingInfo?: CompanyCreditorBankingInfo | null;
    CompanyCreditorBankingInfo?: CompanyCreditorBankingInfo | null;
    companyDebtorType: CompanyDebtorType;
    useAlternateBillingCompany: boolean;
    billingCompanyId: string | null;
    settings?: CompanyCreditorAccountSaleSettings;
}

export interface UpdatedCompanyCreditor extends Partial<CompanyCreditor> {
    id: string;
}

export { BankAccountType, CompanyStatus, PaymentMethod, TaxStatus };

// ---------------------------------------------------------------------------
// Company Debtor
//
// Mirrors POST /api/company/debtor/get. The field names differ from the older
// CompanyCreditor shape (country vs countryId, deliveryRoutes, CompanyDebtorSetting,
// defaultPrintLayoutId, invoiceDiscount, ...) so the maintenance forms read from
// these types rather than the creditor ones.
// ---------------------------------------------------------------------------

export interface CompanyDebtorSetting {
    id: string;
    companyDebtorId: string;
    debtorGroupId?: string | null;
    debtorSubGroupId?: string | null;
    onHold?: boolean | null;
    dormantDays?: number | string | null;
    status?: string | null;
    expiryDate?: string | null;
    defaultPrintLayoutId?: string | null;
    defaultEmailLayoutId?: string | null;
    loyaltyAccount?: string | null;
    autoEmailInvoice?: boolean | null;
    autoEmailCreditNote?: boolean | null;
    smsMarketing?: boolean | null;
    requireInvOrderNo?: boolean | null;
    emailDocuments?: boolean | null;
    autoDeleteBackOrder?: boolean | null;
    paymentMethod?: string | null;
    allowCashSale?: boolean | null;
    applyAsLineDiscount?: boolean | null;
    defaultSellPrice?: string | null;
    exportStatus?: string | null;
    invoiceDiscount?: number | string | null;
    settlementDiscount?: number | string | null;
    sellPrice?: string | null;
    ownPriceList?: number | string | null;
    normalRep?: number | string | null;
    accountSaleQuantityControlEnabled?: boolean | null;
    accountSaleSalesLookbackDays?: number | null;
    accountSaleTargetStockDays?: number | null;
    accountSaleSeasonalUpliftPercent?: number | string | null;
    accountSaleSeasonStartMonth?: number | null;
    accountSaleSeasonEndMonth?: number | null;
}

export interface CompanyDebtorBankingInfo {
    id?: string;
    companyDebtorId?: string;
    bankName?: string | null;
    bankAccount?: string | null;
    bankSubAccount?: string | null;
    bankBranchCode?: string | null;
    bankEftNumber?: string | null;
    bankAccountType?: string | null;
    bankProofOfPayment?: boolean | string | null;
    currencyId?: string | null;
    groupAccountDebtorId?: string | null;
    terms?: string | null;
    creditLimit?: number | string | null;
    enforceCreditLimitChecking?: boolean | null;
    excludeFromInterest?: boolean | null;
    // capitalised on the API
    InsuredCreditLimit?: number | string | null;
    // misspelled on the API
    interesetRiskProfile?: string | null;
    reviewRequired?: boolean | null;
    reviewRequiredAt?: string | null;
    reviewResolvedAt?: string | null;
    // Only sent while confirming a record that needs review; never sent on ordinary saves.
    confirmReview?: boolean;
}

export interface CompanyDebtorGroup {
    id: string;
    groupId?: string | null;
    description?: string | null;
    status?: string | null;
}

export interface CompanyDebtor {
    id: string;
    timezone: string;
    domainId: string;
    companyId: string;
    accountNumber: string;
    companyDebtorGroupId?: string | null;
    name: string;
    onHold?: boolean | null;
    tradingAs?: string | null;
    companyRegistrationNumber?: string | null;
    taxNumber?: string | null;
    taxStatus?: TaxStatus | string | null;
    preferredTaxRate?: number | string | null;
    title?: string | null;
    branch?: string | null;
    terms?: string | null;
    paymentMode?: string | null;
    creditTermDays?: number | string | null;
    creditLimit?: number | string | null;
    normalRep?: number | string | null;
    initials?: string | null;
    idNumber?: string | null;
    contact?: string | null;
    birthday?: string | null;
    cellphoneNumber?: string | null;
    faxNumber?: string | null;
    emailAddress?: string | null;
    address1?: string | null;
    address2?: string | null;
    address3?: string | null;
    address4?: string | null;
    // the country label lives on `country`; `countryId` is a separate column
    country?: string | null;
    countryId?: string | null;
    telephoneNumberOne?: string | null;
    telephoneNumberTwo?: string | null;
    area?: string | null;
    postalAddress?: string | null;
    postalCode?: string | null;
    deliveryAddress1?: string | null;
    deliveryAddress2?: string | null;
    deliveryAddress3?: string | null;
    deliveryAddress4?: string | null;
    deliveryAddress?: string | null;
    deliveryAddressPostalCode?: string | null;
    deliveryRoutes?: string | null;
    status?: string | null;
    createdAt: string;
    updatedAt: string;
    branchCode?: string | null;
    branchEFT?: string | null;
    bankNumber?: string | null;
    bankSubNumber?: string | null;
    bankProof?: boolean | null;
    bankAccountType?: string | null;
    currency?: string | null;
    vatStatus?: string | null;
    bankers?: string | null;
    companyDebtorType?: CompanyDebtorType | string | null;
    useAlternateBillingCompany?: boolean | null;
    billingCompanyId?: string | null;
    requireTenderOnAccountSale?: boolean | null;
    CompanyDebtorSetting?: CompanyDebtorSetting | null;
    // POST /api/company/debtor/get returns the bank block as `bankingInfo`.
    // CompanyDebtorBankingInfo is kept as a fallback for older responses.
    bankingInfo?: CompanyDebtorBankingInfo | null;
    CompanyDebtorBankingInfo?: CompanyDebtorBankingInfo | null;
    companyDebtorGroup?: CompanyDebtorGroup | null;
    taxProfile?: unknown;
    company?: { id: string; companyName?: string | null } | null;
    BillingCompany?: Record<string, unknown> | null;
}

export interface CompanyDebtorResponse {
    success: boolean;
    data: CompanyDebtor;
    message?: string;
}
