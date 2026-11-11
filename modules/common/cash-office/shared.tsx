import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import moment from 'moment';

const STATUS_CLASS: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    INACTIVE: 'bg-gray-100 text-gray-600',
    OPEN: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-600',
    REOPENED: 'bg-amber-100 text-amber-800',
    REQUESTED: 'bg-sky-100 text-sky-800',
    CLAIMED: 'bg-indigo-100 text-indigo-800',
    COUNTED: 'bg-violet-100 text-violet-800',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
    ACKNOWLEDGED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    REVERSED: 'bg-red-100 text-red-800',
    DRAFT: 'bg-gray-100 text-gray-600',
    SUBMITTED: 'bg-sky-100 text-sky-800',
    POSTED: 'bg-emerald-100 text-emerald-800',
    IN_TRANSIT: 'bg-indigo-100 text-indigo-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    SUBMITTED_RECON: 'bg-violet-100 text-violet-800',
};

export function CashOfficeStatusBadge({ status }: { status?: string | null }) {
    if (!status) return <Badge variant="outline">—</Badge>;
    const label = status.replace(/_/g, ' ');
    return (
        <Badge variant="outline" className={cn('font-medium', STATUS_CLASS[status] || 'bg-gray-100 text-gray-600')}>
            {label}
        </Badge>
    );
}

/**
 * Backend responses now carry both `status` and `transactionStatus`. The
 * transaction status drives the row badge and the row actions; `status` is
 * kept as a fallback for older responses.
 */
export function cashOfficeTransactionStatus(row?: {
    transactionStatus?: string | null;
    status?: string | null;
} | null): string | undefined {
    return row?.transactionStatus || row?.status || undefined;
}

/** A cash-office session permits financial actions when it is OPEN or REOPENED. */
export function isCashOfficeSessionOpen(status?: string | null): boolean {
    return status === 'OPEN' || status === 'REOPENED';
}

/**
 * Whether the session linked to a transaction row permits actions. Falls back
 * to the selected office's session when the row does not carry session fields
 * (older backend responses).
 */
export function isTransactionRowSessionOpen(
    row: {
        isCashOfficeSessionOpen?: boolean;
        cashOfficeSessionStatus?: string | null;
        cashOfficeSession?: { status?: string | null } | null;
    },
    fallback: boolean,
): boolean {
    // `cashOfficeSessionStatus` describes the session linked to this row; use it
    // before the boolean shortcut and the nested session object.
    if (row.cashOfficeSessionStatus) return isCashOfficeSessionOpen(row.cashOfficeSessionStatus);
    if (row.cashOfficeSession?.status) return isCashOfficeSessionOpen(row.cashOfficeSession.status);
    if (typeof row.isCashOfficeSessionOpen === 'boolean') return row.isCashOfficeSessionOpen;
    return fallback;
}

export function formatMoney(value?: number | string | null, symbol = 'R') {
    const num = Number(value ?? 0);
    return `${symbol} ${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value?: string | null) {
    return value ? moment(value).format('DD MMM YYYY, HH:mm') : '—';
}

export function formatDate(value?: string | null) {
    return value ? moment(value).format('DD MMM YYYY') : '—';
}

export function varianceClassName(variance: number) {
    return variance > 0 ? 'text-emerald-700' : variance < 0 ? 'text-red-600' : 'text-muted-foreground';
}