import { Badge } from '@/components/ui/badge';
import { useAuthUser } from '@/stores/auth-user.store';

export const useCurrencySymbol = () => useAuthUser((state) => state.currency?.symbol) || 'R';

export const formatDate = (value?: string | null, fallback = '—') => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatAmount = (value?: number | null) => {
    const num = Number(value || 0);
    const numStr = num.toFixed(2);
    const [int, dec] = numStr.split('.');
    const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${withSep}.${dec}`;
};

export const AMOUNT_CLASS = 'text-right font-medium tabular-nums';

export const TRANSACTION_TYPE_META: Record<string, { label: string; className: string }> = {
    IN: { label: 'Invoice', className: 'bg-blue-100 text-blue-800' },
    PM: { label: 'Payment', className: 'bg-emerald-100 text-emerald-800' },
    CN: { label: 'Credit Note', className: 'bg-red-100 text-red-800' },
    DP: { label: 'Deposit', className: 'bg-amber-100 text-amber-800' },
    RF: { label: 'Refund', className: 'bg-orange-100 text-orange-800' },
    CS: { label: 'Cash Sale', className: 'bg-violet-100 text-violet-800' },
    DEBIT: { label: 'Debit Adjustment', className: 'bg-rose-100 text-rose-800' },
    CREDIT: { label: 'Credit Adjustment', className: 'bg-teal-100 text-teal-800' },
};

export const getTransactionTypeMeta = (type?: string) =>
    type ? TRANSACTION_TYPE_META[type] || { label: type.replaceAll('_', ' '), className: 'bg-gray-100 text-gray-800' } : { label: '—', className: 'bg-gray-100 text-gray-800' };

export const AGE_BUCKETS = [
    { key: 'current', label: 'Current' },
    { key: 'days30', label: '30 Days' },
    { key: 'days60', label: '60 Days' },
    { key: 'days90', label: '90 Days' },
    { key: 'days120', label: '120 Days' },
    { key: 'days150', label: '150 Days' },
    { key: 'days180', label: '+180 Days' },
] as const;

export const ADJUSTMENT_TYPE_META: Record<string, { label: string; className: string }> = {
    DEBIT: { label: 'Debit', className: 'bg-red-100 text-red-800' },
    CREDIT: { label: 'Credit', className: 'bg-emerald-100 text-emerald-800' },
};

export const TransactionTypeBadge = ({ type }: { type?: string }) => {
    const meta = getTransactionTypeMeta(type);
    return <Badge className={`${meta.className} border-transparent`}>{meta.label}</Badge>;
};

export const AdjustmentTypeBadge = ({ type }: { type?: string }) => {
    const meta = ADJUSTMENT_TYPE_META[type || ''] || {
        label: type || '—',
        className: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={`${meta.className} border-transparent`}>{meta.label}</Badge>;
};

export interface StatementFilters {
    companyDebtorId: string;
    fromDate: string;
    toDate: string;
    includeCashSales: boolean;
}

export const todayAsISO = () => new Date().toISOString().split('T')[0];

export const buildStatementPayload = (filters: StatementFilters) => ({
    ...(filters.companyDebtorId ? { companyDebtorId: filters.companyDebtorId } : {}),
    ...(filters.fromDate ? { dateFrom: filters.fromDate } : {}),
    ...(filters.toDate ? { dateTo: filters.toDate } : {}),
    asOfDate: filters.toDate || todayAsISO(),
    includeCashSales: filters.includeCashSales,
});

// Full statement / PDF: isPdf: false returns JSON, isPdf: true streams the PDF.
export const buildStatementQueryPayload = (filters: StatementFilters) => ({
    ...buildStatementPayload(filters),
    isPdf: false,
    download: false,
});

// Account summary does not accept includeCashSales.
export const buildAccountSummaryPayload = (filters: StatementFilters) => ({
    ...(filters.companyDebtorId ? { companyDebtorId: filters.companyDebtorId } : {}),
    ...(filters.fromDate ? { dateFrom: filters.fromDate } : {}),
    ...(filters.toDate ? { dateTo: filters.toDate } : {}),
    asOfDate: filters.toDate || todayAsISO(),
});
