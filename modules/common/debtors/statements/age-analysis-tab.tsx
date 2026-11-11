import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useGetDebtorAgeAnalysis, AgeAnalysisData, AgeBuckets } from '@/api-queries/debtor/statements';
import { AGE_BUCKETS, StatementFilters, useCurrencySymbol, formatAmount, formatDate, todayAsISO } from './shared';

interface AgeAnalysisTabProps {
    filters: StatementFilters;
}

const AgeAnalysisTab = ({ filters }: AgeAnalysisTabProps) => {
    const currency = useCurrencySymbol();

    const { data, isLoading, isFetching } = useGetDebtorAgeAnalysis({
        ...(filters.companyDebtorId ? { companyDebtorId: filters.companyDebtorId } : {}),
        asOfDate: filters.toDate || todayAsISO(),
    });

    const analysis = data?.data as (AgeAnalysisData & { ageing?: AgeBuckets; totals?: Record<string, number> }) | undefined;
    const aging = (analysis?.ageing || analysis || {}) as Partial<AgeBuckets>;
    const totals = analysis?.totals || {};

    const summaryTiles: { label: string; value: number; highlight?: boolean }[] = [
        {
            label: 'Outstanding Invoice Amount',
            value: analysis?.outstandingInvoiceAmount ?? totals.totalOutstandingInvoices ?? 0,
        },
        { label: 'Unallocated Credits', value: analysis?.unallocatedCredits ?? totals.unallocatedCredits ?? 0 },
        { label: 'Total Due', value: analysis?.totalDue ?? totals.totalDue ?? 0, highlight: true },
    ];

    return (
        <PageLoader isLoading={isLoading || isFetching}>
            <div className="space-y-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">Age Analysis</span>
                    <span>as at {formatDate(filters.toDate || todayAsISO())}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {AGE_BUCKETS.map((bucket) => (
                        <Card key={bucket.key} className="gap-0 py-3">
                            <CardContent className="px-4">
                                <div className="text-muted-foreground text-xs">{bucket.label}</div>
                                <div className="mt-1 text-xl font-bold tabular-nums">
                                    {currency} {formatAmount((aging as Record<string, number>)?.[bucket.key])}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <Card className="gap-0 py-0">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm">Totals</CardTitle>
                    </CardHeader>
                    <CardContent className="py-0">
                        <div className="grid grid-cols-1 gap-2 pb-3 sm:grid-cols-3">
                            {summaryTiles.map((tile) => (
                                <div
                                    key={tile.label}
                                    className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${
                                        tile.highlight ? 'border-primary/30 bg-primary/5' : 'bg-muted/40'
                                    }`}
                                >
                                    <span className="text-muted-foreground text-xs">{tile.label}</span>
                                    <span className={`text-lg font-bold tabular-nums ${tile.highlight ? 'text-primary' : ''}`}>
                                        {currency} {formatAmount(tile.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageLoader>
    );
};

export default AgeAnalysisTab;