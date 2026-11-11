'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetCashUpTenders, toCashUpTenderRows, CashUpTenderRow } from '@/api-queries/till-management/cash-up';
import { useGetTills } from '@/api-queries/masters/tills';
import SelectPopover from '@/components/select-popover';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import { Banknote, Coins, Landmark, ReceiptText } from 'lucide-react';
import moment from 'moment';

interface CashTendersModuleProps {
    moduleCode: string;
}

// Cash tenders per till. The till dropdown drives the selection; the tender breakdown is
// then scoped to the selected till via the `tillId` filter on /api/company/cashUp/tenders.
const CashTendersModule = ({ moduleCode }: CashTendersModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [dateFrom, setDateFrom] = useState(() => moment().startOf('day').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
    const [tillId, setTillId] = useState<string | null>(null);

    const tillsQuery = useGetTills({ scope: 'ALL' });
    const tillsList = useMemo(() => tillsQuery.data?.data?.rows || [], [tillsQuery.data]);

    const tillOptions = useMemo(
        () =>
            tillsList.map((till) => ({
                value: till.id,
                label: `${till.name} (${till.tillNumber})`,
            })),
        [tillsList],
    );

    // The tender query only fires once a till is picked, so the landing state is an
    // empty breakdown rather than a call with no till scope.
    const tendersQuery = useGetCashUpTenders(
        useMemo(
            () => ({
                dateFrom,
                dateTo,
                ...(tillId ? { tillId } : {}),
            }),
            [dateFrom, dateTo, tillId],
        ),
        { enabled: !!tillId },
    );

    const selectedTill = useMemo(() => tillsList.find((till) => till.id === tillId) || null, [tillsList, tillId]);

    const tenderRows = useMemo(() => toCashUpTenderRows(tendersQuery.data?.data), [tendersQuery.data]);
    const reportData = tendersQuery.data?.data || {};

    // Prefer the server-computed totals; fall back to summing the lines when absent.
    const totalCollection = useMemo(() => {
        if (typeof reportData.totals?.totalCollection === 'number') return reportData.totals.totalCollection;
        return tenderRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }, [reportData, tenderRows]);

    const cashTenderTotal = useMemo(
        () =>
            tenderRows.filter((row) => row.isBankable !== false).reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [tenderRows],
    );

    const nonBankableTotal = useMemo(
        () =>
            tenderRows.filter((row) => row.isBankable === false).reduce((sum, row) => sum + Number(row.amount || 0), 0),
        [tenderRows],
    );

    const totalRefunds = useMemo(
        () => tenderRows.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0),
        [tenderRows],
    );

    const tenderColumns: ColumnDef<CashUpTenderRow>[] = useMemo(
        () => [
            {
                accessorKey: 'description',
                header: (data) => <TableHeaderToggle {...data}>Tender</TableHeaderToggle>,
                cell: ({ row }) => (
                    <div>
                        {row.original.description || row.original.saleType || 'N/A'}{' '}
                        {row.original.isBankable === false ? (
                            <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                NON-BANKABLE
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                accessorKey: 'count',
                header: (data) => <TableHeaderToggle {...data}>Transactions</TableHeaderToggle>,
                cell: ({ row }) => <div>{Number(row.original.count || 0)}</div>,
            },
            {
                accessorKey: 'amount',
                header: (data) => <TableHeaderToggle {...data}>Amount</TableHeaderToggle>,
                cell: ({ row }) => (
                    <div className="font-semibold">
                        {currencySymbol} {Number(row.original.amount || 0).toFixed(2)}
                    </div>
                ),
            },
            {
                accessorKey: 'refundAmount',
                header: (data) => <TableHeaderToggle {...data}>Refunds</TableHeaderToggle>,
                cell: ({ row }) => (
                    <div className="text-red-600">{Number(row.original.refundAmount || 0).toFixed(2)}</div>
                ),
            },
        ],
        [currencySymbol],
    );

    const clearFilters = () => {
        setDateFrom(moment().startOf('day').format('YYYY-MM-DD'));
        setDateTo(moment().format('YYYY-MM-DD'));
        setTillId(null);
    };

    return (
        <PageLoader isLoading={tillsQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Cash Tenders</div>
                <p className="text-muted-foreground text-xs">
                    Select a till to view its cash tender breakdown for the selected period.
                </p>

                {/* Filters */}
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <Label className="text-xs">Date From</Label>
                        <Input
                            type="date"
                            className="h-9 w-40 text-xs"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Date To</Label>
                        <Input
                            type="date"
                            className="h-9 w-40 text-xs"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                        />
                    </div>
                    <div className="min-w-[240px]">
                        <Label className="text-xs">Till</Label>
                        <SelectPopover
                            title="till"
                            selectedValue={tillId}
                            options={tillOptions}
                            onSelect={(value) => setTillId(value || null)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Cash tenders for the selected till */}
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <ReceiptText className="h-4 w-4" /> Cash Tenders
                    {selectedTill ? (
                        <span className="text-muted-foreground text-xs font-normal">
                            {selectedTill.name} ({selectedTill.tillNumber})
                        </span>
                    ) : null}
                </div>

                {!selectedTill ? (
                    <Card>
                        <CardContent className="text-muted-foreground p-6 text-center text-sm">
                            Select a till above to view its cash tenders.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-blue-200 bg-blue-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Banknote className="h-4 w-4 text-blue-600" />
                                            <div className="text-sm font-semibold">Total Tendered</div>
                                        </div>
                                        <div className="text-lg font-bold text-blue-700">
                                            {currencySymbol} {Number(totalCollection || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Landmark className="h-4 w-4 text-green-600" />
                                            <div className="text-sm font-semibold">Cash (Bankable)</div>
                                        </div>
                                        <div className="text-lg font-bold text-green-700">
                                            {currencySymbol} {Number(cashTenderTotal || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-amber-200 bg-amber-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-amber-600" />
                                            <div className="text-sm font-semibold">Non-Bankable</div>
                                        </div>
                                        <div className="text-lg font-bold text-amber-700">
                                            {currencySymbol} {Number(nonBankableTotal || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-red-200 bg-red-50">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="h-4 w-4 text-red-600" />
                                            <div className="text-sm font-semibold">Refunds</div>
                                        </div>
                                        <div className="text-lg font-bold text-red-700">
                                            {currencySymbol} {Number(totalRefunds || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="max-h-[50vh] overflow-auto rounded-md border">
                            <DataTable
                                query={tendersQuery}
                                data={tenderRows}
                                columns={tenderColumns}
                                totalRowCount={tenderRows.length}
                            />
                        </div>
                    </>
                )}
            </div>
        </PageLoader>
    );
};

export default CashTendersModule;
