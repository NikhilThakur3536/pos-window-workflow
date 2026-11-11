'use client';

import {
    useGetGoodsReturnReport,
    getGoodsReturnReport,
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
    { key: 'returnedQuantity', header: 'Returned Qty' },
    {
        key: 'returnReason',
        header: 'Reason',
        render: (row) => row.returnReason || row.reason || '—',
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

const GoodsReturnReport = () => (
    <InvoiceCheckingReport
        title="Goods Return Report"
        useReport={useGetGoodsReturnReport as (props: InvoiceCheckingDateFilter) => any}
        getReport={getGoodsReturnReport as (params: InvoiceCheckingFilter) => void}
        columns={columns}
    />
);

export default GoodsReturnReport;
