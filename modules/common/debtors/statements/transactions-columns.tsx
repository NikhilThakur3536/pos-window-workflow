import { ColumnDef } from '@tanstack/react-table';
import { StatementTransactionRow, StatementTenderBreakdown } from '@/api-queries/debtor/statements';
import { formatAmount, formatDate, TransactionTypeBadge } from './shared';
import { Badge } from '@/components/ui/badge';

export const TenderBreakdown = ({ tenders }: { tenders?: StatementTenderBreakdown[] }) => {
    if (!tenders || tenders.length === 0) return <span className="text-muted-foreground italic">—</span>;

    return (
        <div className="flex flex-wrap gap-1">
            {tenders.map((tender, index) => (
                <Badge key={index} variant="secondary" className="gap-1 border-transparent font-normal">
                    <span className="font-semibold uppercase">{tender.tenderType || 'Tender'}</span>
                    <span>{formatAmount(tender.amount)}</span>
                </Badge>
            ))}
        </div>
    );
};

export const statementTransactionColumns = (): ColumnDef<StatementTransactionRow>[] => [
    {
        accessorKey: 'transactionDate',
        header: 'Date',
        cell: ({ row }) => (
            <div className="min-w-[110px]">
                <div>{formatDate(row.original.transactionDate)}</div>
                {row.original.dueDate && (
                    <div className="text-muted-foreground text-xs">
                        Due {formatDate(row.original.dueDate, '')}
                    </div>
                )}
            </div>
        ),
    },
    {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => (
            <div className="min-w-[140px]">
                <div className="font-semibold">{row.original.reference || '—'}</div>
                {row.original.description && (
                    <div className="text-muted-foreground text-xs">{row.original.description}</div>
                )}
            </div>
        ),
    },
    {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
    },
    {
        accessorKey: 'debit',
        header: () => <div className="text-right">Debit</div>,
        cell: ({ row }) => (
            <div className="text-right tabular-nums">{row.original.debit ? formatAmount(row.original.debit) : '—'}</div>
        ),
    },
    {
        accessorKey: 'credit',
        header: () => <div className="text-right">Credit</div>,
        cell: ({ row }) => (
            <div className="text-right tabular-nums">
                {row.original.credit ? formatAmount(row.original.credit) : '—'}
            </div>
        ),
    },
    {
        accessorKey: 'amountDue',
        header: () => <div className="text-right">Amount Due</div>,
        cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatAmount(row.original.amountDue)}</div>,
    },
    {
        accessorKey: 'balance',
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatAmount(row.original.balance)}</div>,
    },
    {
        accessorKey: 'tenderBreakdown',
        header: 'Tenders',
        cell: ({ row }) => <TenderBreakdown tenders={row.original.tenderBreakdown} />,
    },
];