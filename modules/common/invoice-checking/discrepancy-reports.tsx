'use client';

import {
    useGetDiscrepancyReport,
    getDiscrepancyReport,
    InvoiceCheckingFilter,
    INVOICE_DISCREPANCY_TYPES,
    DiscrepancyReportSummary,
} from '@/api-queries/invoice-checking';
import InvoiceCheckingReport, {
    InvoiceCheckingDateFilter,
    InvoiceCheckingColumn,
} from './invoice-checking-report';

const columns: InvoiceCheckingColumn[] = [
    {
        key: 'sourceCompany',
        header: 'Company',
        render: (row) =>
            String(
                row.companyName || row.companyCreditorName || row.warehouseName || row.creditorName || '—',
            ),
    },
    {
        key: 'sourceDebtor',
        header: 'Debtor',
        render: (row) =>
            String(row.debtorName || row.companyDebtorName || row.storeName || row.debtor || '—'),
    },
    {
        key: 'sourceDocumentNumber',
        header: 'Invoice Ref',
        render: (row) =>
            String(
                row.sourceDocumentNumber || row.invoiceNumber || row.orderNumber || row.salesOrderNumber || '—',
            ),
    },
    {
        key: 'itemDescription',
        header: 'Product',
        render: (row) => String(row.itemDescription || row.product || row.description || '—'),
    },
    {
        key: 'itemCode',
        header: 'SKU',
        render: (row) => String(row.itemCode || row.skuCode || '—'),
    },
    {
        key: 'discrepancyType',
        header: 'Discrepancy',
        render: (row) => String(row.discrepancyType || '—').replace(/_/g, ' '),
    },
    {
        key: 'expectedQuantity',
        header: 'Expected Qty',
        render: (row) => String(row.expectedQuantity ?? row.orderedQuantity ?? '—'),
    },
    {
        key: 'actualQuantity',
        header: 'Received Qty',
        render: (row) => String(row.actualQuantity ?? row.receivedQuantity ?? '—'),
    },
    {
        key: 'shortageQuantity',
        header: 'Shortage Qty',
        render: (row) => String(row.shortageQuantity ?? row.varianceQty ?? '—'),
    },
    {
        key: 'rejectedQuantity',
        header: 'Rejected Qty',
        render: (row) => String(row.rejectedQuantity ?? '—'),
    },
    {
        key: 'unresolvedQuantity',
        header: 'Unresolved Qty',
        render: (row) => String(row.unresolvedQuantity ?? '—'),
    },
    {
        key: 'reason',
        header: 'Reason',
        render: (row) => String(row.reason || row.shortageReason || '—'),
    },
    {
        key: 'checkedBy',
        header: 'Checked By',
        render: (row) => String(row.checkedBy || row.userName || '—'),
    },
    {
        key: 'date',
        header: 'Date',
        render: (row) =>
            row.date || row.createdAt
                ? new Date(String(row.date || row.createdAt)).toLocaleDateString()
                : '—',
    },
    {
        key: 'discrepancyStatus',
        header: 'Status',
        render: (row) => String(row.discrepancyStatus || row.status || '—'),
    },
];

const summaryCards = (data: Record<string, unknown>) => {
    if (!data?.summary) return null;
    const summary = data.summary as DiscrepancyReportSummary;
    const cards = [
        { label: 'Total Sessions', value: summary.totalSessions },
        { label: 'Discrepancies', value: summary.totalDiscrepanciesCount },
        { label: 'Expected Qty', value: summary.totalExpectedQuantity },
        { label: 'Actual Qty', value: summary.totalActualQuantity },
        { label: 'Shortage Qty', value: summary.totalShortageQuantity },
        { label: 'Shortage Value', value: summary.totalShortageValue },
        { label: 'Excess Qty', value: summary.totalExcessQuantity },
        { label: 'Damaged Qty', value: summary.totalDamagedQuantity },
    ];
    return (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="space-y-0.5">
                    <p className="text-[11px] text-muted-foreground">{card.label}</p>
                    <p className="text-sm font-semibold">{card.value ?? '—'}</p>
                </div>
            ))}
        </div>
    );
};

const DiscrepancyReports = () => (
    <InvoiceCheckingReport
        title="Discrepancy Reports"
        useReport={useGetDiscrepancyReport as (props: InvoiceCheckingDateFilter) => any}
        getReport={getDiscrepancyReport as (params: InvoiceCheckingFilter) => void}
        columns={columns}
        discrepancyTypes={INVOICE_DISCREPANCY_TYPES}
        defaultDiscrepancyType={INVOICE_DISCREPANCY_TYPES[0]}
        rowsKey="itemizedRows"
        renderSummary={summaryCards}
    />
);

export default DiscrepancyReports;