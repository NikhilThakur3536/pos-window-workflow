import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { FileDown, Eye, Building2, UserRound, CalendarRange } from 'lucide-react';
import {
    useGetDebtorStatement,
    getDebtorStatementPdfBlob,
    DebtorStatementResponse,
    StatementData,
    StatementTenderBreakdown,
} from '@/api-queries/debtor/statements';
import { statementTransactionColumns } from './transactions-columns';
import { buildStatementPayload, buildStatementQueryPayload, StatementFilters, useCurrencySymbol, formatAmount, formatDate, AGE_BUCKETS, todayAsISO } from './shared';
import { PdfPreviewOverlay } from './pdf-preview';
import { toast } from 'sonner';

const getStatementData = (response?: DebtorStatementResponse): StatementData | undefined => {
    return response?.data;
};

const getTenders = (statement?: StatementData): StatementTenderBreakdown[] => {
    const tenders: StatementTenderBreakdown[] = [];
    statement?.rows?.forEach((row) => {
        row.tenderBreakdown?.forEach((tender) => tenders.push(tender));
    });
    return tenders;
};

const SummaryTile = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
    <div
        className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
            highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/40'
        }`}
    >
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</span>
    </div>
);

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div className="flex justify-between gap-4 border-b py-1.5 text-sm last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-right font-medium">{value || '—'}</span>
    </div>
);

interface StatementTabProps {
    filters: StatementFilters;
    debtorName?: string;
    isCompanyDebtorUser: boolean;
}

const StatementTab = ({ filters, debtorName, isCompanyDebtorUser }: StatementTabProps) => {
    const currency = useCurrencySymbol();
    const statementQuery = useGetDebtorStatement(buildStatementQueryPayload(filters));
    const { data, isLoading, refetch, isFetching } = statementQuery;

    const statement = getStatementData(data);

    const [showPreview, setShowPreview] = useState(false);
    const [pdfUrl, setPdfUrl] = useState('');
    const [isPdfLoading, setIsPdfLoading] = useState(false);

    const payload = buildStatementPayload(filters);

    async function previewPDF() {
        try {
            setIsPdfLoading(true);
            const blob = await getDebtorStatementPdfBlob({ ...payload, download: false });
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setShowPreview(true);
        } catch (error) {
            toast.error('Failed to generate PDF', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
        } finally {
            setIsPdfLoading(false);
        }
    }

    async function downloadPDF() {
        try {
            setIsPdfLoading(true);
            const blob = await getDebtorStatementPdfBlob({ ...payload, download: true });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${isCompanyDebtorUser ? debtorName || 'Debtor' : statement?.debtor?.name || 'Debtor'}_Statement_${formatDate(
                filters.toDate || todayAsISO(),
                todayAsISO(),
            ).replaceAll('/', '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            toast.error('Failed to download PDF', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
        } finally {
            setIsPdfLoading(false);
        }
    }

    const debtor = statement?.debtor;
    const company = statement?.company || statement?.issuerCompany;
    const tenders = useMemo(() => getTenders(statement), [statement]);
    const paymentMode = debtor?.paymentMode;
    const creditTermDays = debtor?.creditTermDays;
    const creditLimit = debtor?.creditLimit;
    const debtorAddress = Array.isArray(debtor?.address) ? debtor?.address.join(', ') : undefined;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <CalendarRange className="h-4 w-4" />
                    <span>
                        {formatDate(filters.fromDate, 'Start')} — {formatDate(filters.toDate || todayAsISO(), 'Today')}
                    </span>
                    <span className="text-muted-foreground/60">|</span>
                    <span>As at {formatDate(filters.toDate || todayAsISO())}</span>
                    <span className="text-muted-foreground/60">|</span>
                    <span>{filters.includeCashSales ? 'Including cash sales' : 'Credit sales only'}</span>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={previewPDF} disabled={isPdfLoading}>
                        <Eye className="mr-2 h-4 w-4" />
                        Preview PDF
                    </Button>
                    <Button variant="outline" onClick={downloadPDF} disabled={isPdfLoading}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Download PDF
                    </Button>
                </div>
            </div>

            <PageLoader isLoading={isLoading || isFetching}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Card className="gap-0 py-0">
                        <CardHeader className="gap-1 py-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <UserRound className="h-4 w-4" /> Debtor Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            {debtor ? (
                                <div className="pb-2">
                                    <div className="flex items-start justify-between gap-2 pb-1">
                                        <div className="min-w-0">
                                            <div className="text-base font-semibold">{debtor.name}</div>
                                            <div className="text-muted-foreground text-xs">
                                                {debtor.tradingAs ? `Trading as ${debtor.tradingAs}` : ''}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right text-xs">
                                            <div className="text-muted-foreground">Account</div>
                                            <div className="font-semibold">{debtor.accountNumber}</div>
                                        </div>
                                    </div>
                                    <DetailRow label="Tax No." value={debtor.taxNumber} />
                                    <DetailRow label="Terms" value={debtor.terms} />
                                    <DetailRow label="Postal Address" value={debtorAddress || debtor.postalAddress} />
                                </div>
                            ) : (
                                <div className="text-muted-foreground py-4 text-sm italic">
                                    {isCompanyDebtorUser ? debtorName || 'Logged-in debtor' : 'No debtor selected'}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-0 py-0">
                        <CardHeader className="gap-1 py-3">
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Building2 className="h-4 w-4" /> Issuer Company
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            {company ? (
                                <div className="pb-2">
                                    <div className="pb-1 text-base font-semibold">
                                        {company.companyName || company.name || '—'}
                                    </div>
                                    <DetailRow label="Registration No." value={company.companyRegistrationNumber} />
                                    <DetailRow label="Tax No." value={company.taxNumber} />
                                    <DetailRow label="Email" value={company.emailAddress} />
                                    <DetailRow label="Telephone" value={company.telephoneNumberOne} />
                                    <DetailRow label="Address" value={company.postalAddress} />
                                </div>
                            ) : (
                                <div className="text-muted-foreground py-4 text-sm italic">Company details not returned</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="gap-0 py-0">
                        <CardHeader className="gap-1 py-3">
                            <CardTitle className="text-sm">Statement Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                            <div className="grid grid-cols-2 gap-2 pb-2">
                                <SummaryTile label="Brought Forward" value={`${currency} ${formatAmount(statement?.broughtForward)}`} />
                                <SummaryTile
                                    label="Total Due"
                                    value={`${currency} ${formatAmount(statement?.totals?.totalDue ?? statement?.totalDue)}`}
                                    highlight
                                />
                                <SummaryTile
                                    label="Outstanding Invoices"
                                    value={`${currency} ${formatAmount(statement?.totals?.totalOutstandingInvoices)}`}
                                />
                                <SummaryTile
                                    label="Unallocated Credits"
                                    value={`${currency} ${formatAmount(statement?.totals?.unallocatedCredits)}`}
                                />
                            </div>
                            {(statement?.totals?.periodDebits != null || statement?.totals?.periodCredits != null) && (
                                <div className="grid grid-cols-2 gap-2 pb-2">
                                    <SummaryTile
                                        label="Period Debits"
                                        value={`${currency} ${formatAmount(statement?.totals?.periodDebits)}`}
                                    />
                                    <SummaryTile
                                        label="Period Credits"
                                        value={`${currency} ${formatAmount(statement?.totals?.periodCredits)}`}
                                    />
                                </div>
                            )}
                            <DetailRow label="Payment Mode" value={paymentMode} />
                            <DetailRow label="Credit Term" value={creditTermDays ? `${creditTermDays} days` : '—'} />
                            <DetailRow
                                label="Credit Limit"
                                value={creditLimit != null ? `${currency} ${formatAmount(creditLimit)}` : '—'}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    {(statement?.ageing || statement?.totals?.totalDue != null) && (
                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-white p-3 sm:grid-cols-4 lg:grid-cols-8">
                            {AGE_BUCKETS.map((bucket) => {
                                const age = statement?.ageing as Record<string, number> | undefined;
                                return (
                                    <div key={bucket.key} className="flex flex-col gap-0.5 rounded-md bg-muted/50 px-3 py-2">
                                        <span className="text-muted-foreground text-[11px]">{bucket.label}</span>
                                        <span className="text-sm font-bold tabular-nums">
                                            {currency} {formatAmount(age?.[bucket.key])}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <Card className="gap-0 py-0">
                        <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
                            <CardTitle className="text-sm">Ledger</CardTitle>
                            <div className="flex items-center gap-2 text-xs">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => refetch()}>
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="py-0">
                            <DataTable
                                query={statementQuery}
                                data={statement?.rows || []}
                                columns={statementTransactionColumns()}
                                totalRowCount={statement?.rows?.length || 0}
                                viewColumns={false}
                            />
                        </CardContent>
                    </Card>

                    {(tenders.length > 0 || (statement?.payments && statement.payments.length > 0)) && (
                        <Card className="gap-0 py-0">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Payment / Tender Details</CardTitle>
                            </CardHeader>
                            <CardContent className="py-0">
                                <div className="flex flex-wrap gap-2 pb-2">
                                    {(tenders.length > 0 ? tenders : statement?.payments || []).map((payment, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm"
                                        >
                                            <span className="font-semibold uppercase">{payment.tenderType || 'Tender'}</span>
                                            <span className="tabular-nums">
                                                {currency} {formatAmount(payment.amount)}
                                            </span>
                                            {payment.referenceNumber && (
                                                <span className="text-muted-foreground text-xs">{payment.referenceNumber}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </PageLoader>

            <PdfPreviewOverlay
                open={showPreview}
                onClose={() => {
                    setShowPreview(false);
                    URL.revokeObjectURL(pdfUrl);
                }}
                pdfUrl={pdfUrl}
            />
        </div>
    );
};

export default StatementTab;