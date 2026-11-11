import { CreditNotesDetails } from '../credit-note';
import { DebitNotesDetails } from '../debit-note';
import { GoodsReceivingDetails } from '../goods-receiving';
import { AccountSalesDetails } from '../point-of-sale/account-sales/account-sales';
import { QuotationsDetails } from '../point-of-sale/account-sales/quotations';
import { SaleOrdersDetails } from '../point-of-sale/account-sales/sale-order';

export const ENQUIRY_TYPES = [
    // Debtors
    'INVOICE',
    'SALES_ORDER',
    'QUOTATION',
    'CREDIT_NOTE',
    // Creditors
    'GRV',
    'DEBIT_NOTE',
] as const;

export type EnquiryTypesType = (typeof ENQUIRY_TYPES)[number];

export type EnquiryDataMap = {
    // Debtor
    INVOICE: AccountSalesDetails;
    SALES_ORDER: SaleOrdersDetails;
    QUOTATION: QuotationsDetails;
    CREDIT_NOTE: CreditNotesDetails;
    // Creditor
    GRV: GoodsReceivingDetails;
    DEBIT_NOTE: DebitNotesDetails;
};

export type EnquiryDataByType<T extends keyof EnquiryDataMap> = EnquiryDataMap[T];
