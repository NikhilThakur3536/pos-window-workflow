import type { ReactNode } from 'react';
import {
    AlertTriangle,
    Building2,
    CalendarDays,
    CheckCircle2,
    Landmark,
    ReceiptText,
    ShieldCheck,
    Store,
    Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
    CashOfficeDailyStatementData,
    CashOfficeDailyStatementSummary,
    CashOfficeReportSession,
} from '@/api-queries/cash-office';
import { cn } from '@/lib/utils';
import { CashOfficeStatusBadge, formatDate, formatDateTime, formatMoney } from './shared';

interface DailyStatementProps {
    data: CashOfficeDailyStatementData;
    currencySymbol?: string;
}

const isIdKey = (key: string) => key === 'id' || (/Id$/.test(key) && key !== 'clientDocumentId');

const labelFor = (key: string) =>
    key
        .split('.')
        .map((part) =>
            part
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (character) => character.toUpperCase()),
        )
        .join(' · ');

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';

const flattenEntries = (value: unknown, prefix = ''): Array<[string, unknown]> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => {
        if (!hasValue(entry) || isIdKey(key)) return [];
        if (typeof entry === 'object' && !Array.isArray(entry)) return flattenEntries(entry, `${prefix}${key}.`);
        return [[`${prefix}${key}`, entry] as [string, unknown]];
    });
};

function Section({
    title,
    icon,
    children,
    className,
}: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('rounded-xl border bg-white p-4 shadow-sm', className)}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                {icon}
                {title}
            </div>
            {children}
        </div>
    );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="truncate font-medium" title={typeof value === 'string' ? value : undefined}>
                {hasValue(value) ? value : '—'}
            </div>
        </div>
    );
}

function MoneyStat({ label, value, symbol, emphasis }: { label: string; value?: number | string | null; symbol: string; emphasis?: boolean }) {
    return (
        <div className={cn('rounded-lg border p-3', emphasis && 'border-emerald-200 bg-emerald-50')}>
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className="text-lg font-semibold tabular-nums">{formatMoney(value ?? 0, symbol)}</div>
        </div>
    );
}

function CountStat({ label, value, tone }: { label: string; value?: number; tone?: 'warning' | 'ok' }) {
    return (
        <div className={cn('rounded-lg border p-3', tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'bg-white')}>
            <div className="text-muted-foreground text-xs">{label}</div>
            <div className={cn('text-lg font-semibold tabular-nums', tone === 'warning' && 'text-amber-800')}>
                {value ?? 0}
            </div>
        </div>
    );
}

const SUMMARY_AMOUNT_FIELDS: Array<[keyof CashOfficeDailyStatementSummary, string]> = [
    ['cashReceipts', 'Cash receipts'],
    ['chequeReceipts', 'Cheque receipts'],
    ['cashPayouts', 'Cash payouts'],
    ['chequePayouts', 'Cheque payouts'],
    ['transferInCash', 'Transfer in — cash'],
    ['transferInCheque', 'Transfer in — cheque'],
    ['transferOutCash', 'Transfer out — cash'],
    ['transferOutCheque', 'Transfer out — cheque'],
    ['bankWithdrawalCash', 'Bank withdrawal — cash'],
    ['bankWithdrawalCheque', 'Bank withdrawal — cheque'],
    ['bankDepositCash', 'Bank deposit — cash'],
    ['bankDepositCheque', 'Bank deposit — cheque'],
    ['cashReversals', 'Cash reversals'],
    ['chequeReversals', 'Cheque reversals'],
];

const sessionOpenedBy = (session?: CashOfficeReportSession | null) =>
    session?.openedByName || session?.openedByUser?.name || null;

const sessionClosedBy = (session?: CashOfficeReportSession | null) =>
    session?.closedByName || session?.closedByUser?.name || null;

const sessionReopenedBy = (session?: CashOfficeReportSession | null) =>
    session?.reopenedByName || session?.reopenedByUser?.name || null;

const DailyStatement = ({ data, currencySymbol = 'R' }: DailyStatementProps) => {
    const session = data.session || data.preview?.session || null;
    const summary = data.preview?.summary || null;
    const expected = data.preview?.expected || null;
    const blockers = data.preview?.blockers || null;
    const canClose = data.preview?.canClose;
    const reconciliationEntries = flattenEntries(data.reconciliation);

    const blockerCount = (blockers?.openHandovers || 0) + (blockers?.pendingTransactions || 0);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                            <ReceiptText className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-lg font-semibold">Daily Statement</div>
                            <div className="text-muted-foreground text-sm">
                                {session?.businessDate ? formatDate(session.businessDate) : '—'}
                                {session?.sessionNumber ? ` · ${session.sessionNumber}` : ''}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <CashOfficeStatusBadge status={session?.status} />
                        {canClose !== undefined && (
                            <Badge
                                variant="outline"
                                className={cn(
                                    'font-medium',
                                    canClose
                                        ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                                        : 'border-amber-200 bg-amber-100 text-amber-800',
                                )}
                            >
                                {canClose ? 'Ready to close' : 'Close blocked'}
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Detail
                        label="Company"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.company?.companyName || '—'}
                            </span>
                        }
                    />
                    <Detail
                        label="Domain"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.domain?.domainName || '—'}
                            </span>
                        }
                    />
                    <Detail
                        label="Cash office"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.cashOffice?.name || data.cashOffice?.code || session?.cashOfficeName || '—'}
                                {data.cashOffice?.code && data.cashOffice?.name
                                    ? ` (${data.cashOffice.code})`
                                    : ''}
                            </span>
                        }
                    />
                    <Detail
                        label="Safe"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.safe?.name || data.safe?.code || '—'}
                                {data.safe?.code && data.safe?.name ? ` (${data.safe.code})` : ''}
                            </span>
                        }
                    />
                    <Detail
                        label="Store"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.store?.name || '—'}
                            </span>
                        }
                    />
                    <Detail
                        label="Warehouse"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                {data.warehouse?.name || '—'}
                            </span>
                        }
                    />
                    <Detail
                        label="Business date"
                        value={
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                {session?.businessDate ? formatDate(session.businessDate) : '—'}
                            </span>
                        }
                    />
                    <Detail label="Session reference" value={session?.clientDocumentId || '—'} />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Session" icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                        <Detail label="Opened by" value={sessionOpenedBy(session)} />
                        <Detail label="Opened at" value={session?.openedAt ? formatDateTime(session.openedAt) : '—'} />
                        <Detail label="Status" value={<CashOfficeStatusBadge status={session?.status} />} />
                        <Detail
                            label="Opening cash"
                            value={formatMoney(session?.openingCashAmount ?? 0, currencySymbol)}
                        />
                        <Detail
                            label="Opening cheque"
                            value={formatMoney(session?.openingChequeAmount ?? 0, currencySymbol)}
                        />
                        <Detail label="Closing cash" value={hasValue(session?.closingCashAmount) ? formatMoney(session?.closingCashAmount, currencySymbol) : '—'} />
                        <Detail label="Closing cheque" value={hasValue(session?.closingChequeAmount) ? formatMoney(session?.closingChequeAmount, currencySymbol) : '—'} />
                        <Detail label="Closed by" value={sessionClosedBy(session)} />
                        <Detail label="Closed at" value={session?.closedAt ? formatDateTime(session.closedAt) : '—'} />
                        <Detail label="Reopened by" value={sessionReopenedBy(session)} />
                        <Detail label="Reopened at" value={session?.reopenedAt ? formatDateTime(session.reopenedAt) : '—'} />
                        <Detail label="Close reason" value={session?.closeReason || '—'} />
                        <Detail label="Reopen reason" value={session?.reopenReason || '—'} />
                    </div>
                </Section>

                <Section title="Expected totals" icon={<Wallet className="h-4 w-4 text-muted-foreground" />}>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <MoneyStat label="Expected cash" value={expected?.expectedCashAmount} symbol={currencySymbol} />
                        <MoneyStat label="Expected cheque" value={expected?.expectedChequeAmount} symbol={currencySymbol} />
                        <MoneyStat label="Expected total" value={expected?.expectedTotal} symbol={currencySymbol} emphasis />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <CountStat label="Handovers" value={summary?.handoverCount} />
                        <CountStat label="Transactions" value={summary?.transactionCount} />
                    </div>
                </Section>
            </div>

            <Section title="Cash movement" icon={<Landmark className="h-4 w-4 text-muted-foreground" />}>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {SUMMARY_AMOUNT_FIELDS.map(([key, label]) => (
                        <div key={key} className="rounded-lg border p-3">
                            <div className="text-muted-foreground text-xs">{label}</div>
                            <div className="font-semibold tabular-nums">{formatMoney(summary?.[key] ?? 0, currencySymbol)}</div>
                        </div>
                    ))}
                </div>
            </Section>

            <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Close readiness" icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <CountStat label="Open handovers" value={blockers?.openHandovers} tone={blockers?.openHandovers ? 'warning' : 'ok'} />
                        <CountStat
                            label="Pending transactions"
                            value={blockers?.pendingTransactions}
                            tone={blockers?.pendingTransactions ? 'warning' : 'ok'}
                        />
                    </div>
                    <div
                        className={cn(
                            'mt-3 flex items-start gap-2 rounded-md border p-2 text-xs',
                            blockerCount
                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800',
                        )}
                    >
                        {blockerCount ? (
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        ) : (
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>
                            {blockerCount
                                ? `${blockerCount} item(s) must be cleared before this session can close.`
                                : 'No blockers — this session is ready to close.'}
                        </span>
                    </div>
                </Section>

                {reconciliationEntries.length > 0 && (
                    <Section title="Reconciliation" icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {reconciliationEntries.map(([key, value]) => (
                                <Detail
                                    key={key}
                                    label={labelFor(key)}
                                    value={
                                        typeof value === 'number' ||
                                        (typeof value === 'string' &&
                                            /amount|total|variance|cash|cheque|expected|declared/i.test(key) &&
                                            Number.isFinite(Number(value)))
                                            ? formatMoney(value as number | string, currencySymbol)
                                            : String(value)
                                    }
                                />
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
};

export default DailyStatement;
