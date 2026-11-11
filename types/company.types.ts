
export interface BaseCompany {
  id: string;
  timezone: string;
  domainId: string;
  companyId: string;
  accountNumber: string;
  name: string;
  tradingAs: string;
  companyRegistrationNumber: string;
  taxNumber: string;
  taxStatus: string;
  preferredTaxRate: number;
  title: string | null;
  initials: string | null;
  idNumber: string | null;
  contact: string;
  birthday: string | null;
  cellphoneNumber: string;
  faxNumber: string | null;
  emailAddress: string;
  telephoneNumberOne: string;
  telephoneNumberTwo: string | null;
  countryId: string;
  area: string | null;
  postalAddress: string;
  postalCode: string;
  deliveryAddress: string;
  deliveryAddressPostalCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface BaseBankingInfo {
  id: string;
  companyId: string;
  bankName: string;
  bankAccount: string;
  bankSubAccount?: string;
  bankBranchCode: string;
  bankEftNumber?: string;
  bankAccountType: string;
  bankProofOfPayment?: string;
  currencyId: string;
  groupAccountId?: string;
  terms?: string;
  creditLimit: number;
}

export interface BaseCompanySettings {
  id: string;
  companyId: string;
  groupId: string;
  subGroupId?: string;
  onHold?: boolean;
  dormantDays?: number;
  status?: string;
  expiryDate?: string;
  defaultLayoutId?: string;
  minOrderValue?: number;
  emailDocuments?: boolean;
  smsRecipient?: string;
  requireGRVOrder?: boolean;
  autoDeleteBackOrder?: boolean;
  paymentMethod?: string;
  advertisingAllowancePercentage?: number;
  rebatePercentage?: number;
  settlementDiscountPercentage?: number;
  swellAllowancePercentage?: number;
  supplierAccountNumber?: string;
  specialPriceListId?: string;
}

export interface CompanyWithSettings<T extends BaseCompanySettings, U extends BaseBankingInfo> extends BaseCompany {
  CompanySettings: T;
  CompanyBankingInfo: U;
}

export interface CompanyListResponse<T> {
  count: number;
  rows: T[];
}

export interface CompanyApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface CompanyFilters {
  search?: string;
  taxStatus?: string;
  paymentMethod?: string;
  onHold?: boolean;
  groupId?: string;
  minOrderValue?: number;
  creditLimit?: number;
}

export interface CompanySortOptions<T> {
  field: keyof T;
  direction: 'asc' | 'desc';
}

export interface CompanyPagination {
  page: number;
  limit: number;
  total: number;
}

export interface CompanySelection {
  [key: string]: boolean;
}

export interface CompanyTableRow<T extends object> {
  data: T;
  isSelected?: boolean;
}

export interface CompanySummary {
  totalCompanies: number;
  activeCompanies: number;
  onHoldCompanies: number;
  totalCreditLimit: number;
  averageCreditLimit: number;
}

export enum TaxStatus {
  VAT_REGISTERED = 'VAT Registered',
  NON_VAT = 'Non-VAT',
  EXEMPT = 'Exempt'
}

export enum PaymentMethod {
  EFT = 'EFT',
  CASH = 'Cash',
  CHEQUE = 'Cheque',
  CREDIT_CARD = 'Credit Card',
  BANK_TRANSFER = 'Bank Transfer'
}

export enum BankAccountType {
  CURRENT = 'Current',
  SAVINGS = 'Savings',
  CHECKING = 'Checking',
  BUSINESS = 'Business'
}

export enum CompanyStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended',
  PENDING = 'Pending'
}
