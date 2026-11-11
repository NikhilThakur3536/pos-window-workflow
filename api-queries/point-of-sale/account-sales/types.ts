import z from 'zod';
import { accountSaleCreateSchema, AccountSaleCreateSchema, AccountSaleInvoiceType } from './account-sales';
import { quotationCreateSchema, QuotationCreateSchema, QuotationInvoiceType } from './quotations';
import { saleOrderCreateSchema, SaleOrderCreateSchema, SaleOrderInvoiceType } from './sale-order';

export type AccountSalesType = 'INVOICE' | 'SALES_ORDER' | 'QUOTATION';

export const accountSaleSchemaMap = {
    INVOICE: accountSaleCreateSchema,
    SALES_ORDER: saleOrderCreateSchema,
    QUOTATION: quotationCreateSchema,
} as const;

export type AccountSaleSchemaByType<T extends keyof typeof accountSaleSchemaMap> = z.infer<
    (typeof accountSaleSchemaMap)[T]
>;

export type AnyAccountSale = AccountSaleCreateSchema | SaleOrderCreateSchema | QuotationCreateSchema;

export const accountSaleFieldMap = {
    INVOICE: {
        NUMBER: 'invoiceNumber',
        DATE: 'invoiceDate',
        MEMO: 'invoiceMemo',
        INCLUSIVE: 'invoiceInclusive',
    },
    SALES_ORDER: {
        NUMBER: 'salesOrderNumber',
        DATE: 'salesOrderDate',
        MEMO: 'salesOrderMemo',
        INCLUSIVE: 'salesOrderInclusive',
    },
    QUOTATION: {
        NUMBER: 'quotationNumber',
        DATE: 'quotationDate',
        MEMO: 'quotationMemo',
        INCLUSIVE: 'quotationInclusive',
    },
} as const;

export type AnyInvoiceType = AccountSaleInvoiceType | SaleOrderInvoiceType | QuotationInvoiceType;
