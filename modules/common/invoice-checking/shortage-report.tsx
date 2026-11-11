'use client';

import {
    useGetShortageReport,
    getShortageReport,
    InvoiceCheckingFilter,
} from '@/api-queries/invoice-checking';
import InvoiceCheckingReport, {
    InvoiceCheckingDateFilter,
    InvoiceCheckingColumn,
} from './invoice-checking-report';

const columns: InvoiceCheckingColumn[] = [
    { key: 'product', header: 'Product' },
    { key: 'skuCode', header: 'SKU' },
    { key: 'orderedQuantity', header: 'Ordered Qty' },
    { key: 'receivedQuantity', header: 'Received Qty' },
    { key: 'shortageQuantity', header: 'Shortage Qty' },
    {
        key: 'shortageReason',
        header: 'Reason',
        render: (row) => row.shortageReason || row.reason || '—',
    },
    {
        key: 'createdAt',
        header: 'Date',
        render: (row) =>
            row.createdAt ? new Date(String(row.createdAt)).toLocaleDateString() : '—',
    },
    {
        key: 'status',
        header: 'Status',
        render: (row) => row.status || '—',
    },
];

const ShortageReport = () => (
    <InvoiceCheckingReport
        title="Shortage Report"
        useReport={useGetShortageReport as (props: InvoiceCheckingDateFilter) => any}
        getReport={getShortageReport as (params: InvoiceCheckingFilter) => void}
        columns={columns}
    />
);

export default ShortageReport;
