import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetDebtorAccountSummary,
    StatementAccountSummary,
} from '@/api-queries/debtor/statements';
import {
    AGE_BUCKETS,
    buildAccountSummaryPayload,
    StatementFilters,
    useCurrencySymbol,
    formatAmount,
    formatDate,
    todayAsISO,
} from './shared';

interface AccountSummaryTabProps {
    filters: StatementFilters;
}

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{value || '—'}</span>
    </div>
);

const AccountSummaryTab = ({ filters }: AccountSummaryTabProps) => {
    const currency = useCurrencySymbol();

    const { data, isLoading, isFetching } = useGetDebtorAccountSummary(buildAccountSummaryPayload(filters));

    const summary = data?.data as StatementAccountSummary | undefined;
    const debtor = summary?.debtor;
    const paymentMode = debtor?.paymentMode || summary?.paymentMode;
    const creditTermDays = debtor?.creditTermDays ?? summary?.creditTermDays;
    const creditLimit = debtor?.creditLimit ?? summary?.creditLimit;
    const debtorAddress = Array.isArray(debtor?.address) ? debtor?.address.join(', ') : undefined;

    return (
        <PageLoader isLoading={isLoading || isFetching}>
            <div className="space-y-4">
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Account Summary</span>
                    <span>
                        {formatDate(filters.fromDate, 'Start')} — {formatDate(filters.toDate || todayAsISO(), 'Today')}
                    </span>
                    <span className="text-muted-foreground/60">|</span>
                    <span>As at {formatDate(filters.toDate || todayAsISO())}</span>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="gap-0 py-0">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Debtor Details</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            <div className="pb-2">
                                <div className="flex items-start justify-between gap-2 pb-1">
                                    <div>
                                        <div className="text-base font-semibold">{debtor?.name || '—'}</div>
                                        <div className="text-muted-foreground text-xs">
                                            {debtor?.tradingAs ? `Trading as ${debtor.tradingAs}` : ''}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right text-xs">
                                        <div className="text-muted-foreground">Account</div>
                                        <div className="font-semibold">{debtor?.accountNumber || '—'}</div>
                                    </div>
                                </div>
                                <DetailRow label="Tax No." value={debtor?.taxNumber} />
                                <DetailRow label="Terms" value={debtor?.terms} />
                                <DetailRow label="Address" value={debtorAddress || debtor?.postalAddress} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-0 py-0">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Payment & Credit Terms</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            <div className="pb-2">
                                <div className="flex items-center justify-between border-b py-1.5 text-sm">
                                    <span className="text-muted-foreground">Payment Mode</span>
                                    <Badge
                                        className={`border-transparent ${
                                            paymentMode === 'COD'
                                                ? 'bg-emerald-100 text-emerald-800'
                                                : 'bg-blue-100 text-blue-800'
                                        }`}
                                    >
                                        {paymentMode || '—'}
                                    </Badge>
                                </div>
                                <DetailRow label="Credit Term" value={creditTermDays != null ? `${creditTermDays} days` : null} />
                                <DetailRow
                                    label="Credit Limit"
                                    value={creditLimit != null ? `${currency} ${formatAmount(creditLimit)}` : null}
                                />
                                <DetailRow
                                    label="Brought Forward"
                                    value={`${currency} ${formatAmount(summary?.broughtForward)}`}
                                />
                                <DetailRow
                                    label="Outstanding Invoices"
                                    value={`${currency} ${formatAmount(
                                        summary?.totals?.totalOutstandingInvoices ?? summary?.outstandingInvoiceAmount,
                                    )}`}
                                />
                                <DetailRow
                                    label="Unallocated Credits"
                                    value={`${currency} ${formatAmount(
                                        summary?.totals?.unallocatedCredits ?? summary?.unallocatedCredits,
                                    )}`}
                                />
                                <DetailRow
                                    label="Total Due"
                                    value={`${currency} ${formatAmount(summary?.totals?.totalDue ?? summary?.totalDue)}`}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="gap-0 py-0">
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm">Billing / Issuer Company</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            {summary?.billingCompany || summary?.company || summary?.issuerCompany ? (
                                <div className="pb-2">
                                    <div className="pb-1 text-base font-semibold">
                                        {summary.billingCompany?.companyName ||
                                            summary.billingCompany?.name ||
                                            summary.company?.companyName ||
                                            summary.issuerCompany?.companyName ||
                                            '—'}
                                    </div>
                                    <DetailRow label="Registration No." value={summary.billingCompany?.companyRegistrationNumber} />
                                    <DetailRow label="Tax No." value={summary.billingCompany?.taxNumber} />
                                    <DetailRow label="Email" value={summary.billingCompany?.emailAddress} />
                                    <DetailRow label="Telephone" value={summary.billingCompany?.telephoneNumberOne} />
                                </div>
                            ) : (
                                <div className="text-muted-foreground py-4 text-sm italic">Company details not returned</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="gap-0 py-0">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Ageing</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0">
                        <div className="grid grid-cols-2 gap-2 pb-3 sm:grid-cols-4 lg:grid-cols-8">
                            {AGE_BUCKETS.map((bucket) => {
                                const ageing = summary?.ageing as Record<string, number> | undefined;
                                return (
                                    <div key={bucket.key} className="rounded-md bg-muted/50 px-3 py-2">
                                        <div className="text-muted-foreground text-[11px]">{bucket.label}</div>
                                        <div className="text-sm font-bold tabular-nums">
                                            {currency} {formatAmount(ageing?.[bucket.key])}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageLoader>
    );
};

export default AccountSummaryTab;