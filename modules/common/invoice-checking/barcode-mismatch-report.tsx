'use client';

import {
    useGetBarcodeMismatchReport,
    getBarcodeMismatchReport,
    InvoiceCheckingFilter,
} from '@/api-queries/invoice-checking';
import InvoiceCheckingReport, {
    InvoiceCheckingDateFilter,
    InvoiceCheckingColumn,
} from './invoice-checking-report';

const columns: InvoiceCheckingColumn[] = [
    {
        key: 'invoiceRef',
        header: 'Invoice Ref',
        render: (row) => row.invoiceRef || row.invoiceNumber || row.orderNumber || '—',
    },
    { key: 'product', header: 'Product' },
    { key: 'skuCode', header: 'SKU' },
    {
        key: 'scannedBarcode',
        header: 'Scanned Barcode',
        render: (row) => row.scannedBarcode || row.scannedBarcodeNumber || '—',
    },
    {
        key: 'expectedBarcode',
        header: 'Expected Barcode',
        render: (row) => row.expectedBarcode || row.expectedBarcodeNumber || '—',
    },
    {
        key: 'createdAt',
        header: 'Date',
        render: (row) => (row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : '—'),
    },
    {
        key: 'status',
        header: 'Status',
        render: (row) => row.status || '—',
    },
];

const BarcodeMismatchReport = () => (
    <InvoiceCheckingReport
        title="Barcode Mismatch Report"
        useReport={useGetBarcodeMismatchReport as (props: InvoiceCheckingDateFilter) => any}
        getReport={getBarcodeMismatchReport as (params: InvoiceCheckingFilter) => void}
        columns={columns}
    />
);

export default BarcodeMismatchReport;
