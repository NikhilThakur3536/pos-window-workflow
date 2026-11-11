import React from 'react';
import { EnquiriesInvoiceFilterProps, useGetUserEnquiryInvoice } from '@/api-queries/enquiries';
import AccountSalesInvoiceDialog from '../point-of-sale/account-sales/invoice/invoice-dialog';
import { EnquiryDataByType } from '@/api-queries/enquiries/type';
import GRVInvoiceDialog from '../goods-receiving/invoice/invoice-dialog';
import DebitNoteInvoiceDialog from '../debit-note/invoice/invoice-dialog';
import CreditNoteInvoiceDialog from '../credit-note/invoice/invoice-dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';

export interface EnquiriesInvoiceProps {
    onClose: () => void;
    data: EnquiriesInvoiceFilterProps;
}

const EnquiriesInvoice = ({ data, onClose }: EnquiriesInvoiceProps) => {
    const { data: response, isLoading } = useGetUserEnquiryInvoice(data);

    if (isLoading) return <PageLoader isLoading={isLoading} />;

    if (!response?.data) return null;

    const invoiceData = response.data;

    switch (data.transactionType) {
        case 'INVOICE': {
            const data = invoiceData as EnquiryDataByType<'INVOICE'>;

            return (
                <AccountSalesInvoiceDialog
                    printData={{
                        accountSales: data,
                        cartItems: data.DebtorInvoicingOrderItems,
                        accountNumber: data.CompanyDebtor?.accountNumber,
                    }}
                    onClose={onClose}
                />
            );
        }

        case 'SALES_ORDER': {
            const data = invoiceData as EnquiryDataByType<'SALES_ORDER'>;

            return (
                <AccountSalesInvoiceDialog
                    printData={{
                        accountSales: data,
                        cartItems: data.salesOrderItems,
                        accountNumber: data.CompanyDebtor?.accountNumber,
                    }}
                    onClose={onClose}
                />
            );
        }

        case 'QUOTATION': {
            const data = invoiceData as EnquiryDataByType<'QUOTATION'>;

            return (
                <AccountSalesInvoiceDialog
                    printData={{
                        accountSales: data,
                        cartItems: data.priceQuotationItems,
                        accountNumber: data.CompanyDebtor?.accountNumber,
                    }}
                    onClose={onClose}
                />
            );
        }

        case 'DEBIT_NOTE': {
            const data = invoiceData as EnquiryDataByType<'DEBIT_NOTE'>;

            return (
                <DebitNoteInvoiceDialog
                    printData={{
                        debitNote: data,
                        cartItems: data.debitNoteItems,
                        accountNumber: data.CompanyCreditor.accountNumber,
                    }}
                    onClose={onClose}
                />
            );
        }

        case 'CREDIT_NOTE': {
            const data = invoiceData as EnquiryDataByType<'CREDIT_NOTE'>;

            return (
                <CreditNoteInvoiceDialog
                    printData={{
                        creditNote: data,
                        cartItems: data.creditNoteItems,
                        accountNumber: data.CompanyDebtor.accountNumber,
                    }}
                    onClose={onClose}
                />
            );
        }

        case 'GRV': {
            const data = invoiceData as EnquiryDataByType<'GRV'>;

            return <GRVInvoiceDialog printData={data} onClose={onClose} />;
        }

        default:
            return null;
    }
};
export default EnquiriesInvoice;
