'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import {
    useGetCashUpTenders,
    toCashUpTenderRows,
    toNonBankableRows,
    CashUpTenderRow,
} from '@/api-queries/till-management/cash-up';
import { useGetTills } from '@/api-queries/masters/tills';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import { Banknote, Coins, Landmark, ReceiptText, TrendingUp } from 'lucide-react';
import moment from 'moment';

interface CashUpSalesModuleProps {
    moduleCode: string;
}

const CashUpSalesModule = ({ moduleCode }: CashUpSalesModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [dateFrom, setDateFrom] = useState(() => moment().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(() => moment().format('YYYY-MM-DD'));
    const [tillId, setTillId] = useState<string | null>(null);
    const [applied, setApplied] = useState(false);

    const filterPayload = useMemo(
        () => ({
            dateFrom: applied ? dateFrom : undefined,
            dateTo: applied ? dateTo : undefined,
            ...(tillId && applied ? { tillId } : {}),
        }),
        [dateFrom, dateTo, tillId, applied],
    );

    const tendersQuery = useGetCashUpTenders(filterPayload);
    const tillsList = useGetTills({})?.data?.data?.rows || [];

    const tenderRows = useMemo(() => toCashUpTenderRows(tendersQuery.data?.data), [tendersQuery.data]);
    const nonBankableRows = useMemo(() => toNonBankableRows(tendersQuery.data?.data), [tendersQuery.data]);
    const reportData = tendersQuery.data?.data || {};

    // The endpoint sends server-computed totals under `totals` / `bankableTotals`; only
    // fall back to summing the report lines when they are absent.
    const totalSales = useMemo(() => {
        if (typeof reportData.totals?.totalCollection === 'number') return reportData.totals.totalCollection;
        return tenderRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }, [reportData, tenderRows]);

    const bankableTotal = useMemo(() => {
        if (typeof reportData.bankableTotals?.bankableTotal === 'number')
            return reportData.bankableTotals.bankableTotal;
        return tenderRows
            .filter((row) => row.isBankable !== false)
            .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }, [reportData, tenderRows]);

    const nonBankableTotal = useMemo(() => {
        if (typeof reportData.bankableTotals?.nonBankableTotal === 'number')
            return reportData.bankableTotals.nonBankableTotal;
        return tenderRows
            .filter((row) => row.isBankable === false)
            .reduce((sum, row) => sum + Number(row.amount || 0), 0);
    }, [reportData, tenderRows]);

    const applyFilters = () => setApplied(true);
    const clearFilters = () => {
        setDateFrom(moment().startOf('month').format('YYYY-MM-DD'));
        setDateTo(moment().format('YYYY-MM-DD'));
        setTillId(null);
        setApplied(false);
    };

    const columns: ColumnDef<CashUpTenderRow>[] = [
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
            cell: ({ row }) => <div>{Number(row.original.refundAmount || 0).toFixed(2)}</div>,
        },
    ];

    const nonBankableColumns: ColumnDef<CashUpTenderRow>[] = [
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Tender</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.description || row.original.saleType || 'N/A'}</div>,
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
                <div className="font-semibold text-amber-700">
                    {currencySymbol} {Number(row.original.amount || 0).toFixed(2)}
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={tendersQuery.isLoading && !!applied}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Cash-Up Sales & Non-Bankable Totals</div>
                <p className="text-muted-foreground text-xs">
                    Total sales breakdown along with non-bankable transaction totals for the cash-up settlement.
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
                    <div className="min-w-[220px]">
                        <Label className="text-xs">Till</Label>
                        <SelectPopover
                            title="till"
                            selectedValue={tillId}
                            options={tillsList.map((till) => ({
                                value: till.id,
                                label: `${till.name} (${till.tillNumber})`,
                            }))}
                            onSelect={(val) => setTillId(val || null)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={applyFilters}>
                            Apply
                        </Button>
                        <Button size="sm" variant="outline" onClick={clearFilters}>
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-blue-600" />
                                    <div className="text-sm font-semibold">Total Sales</div>
                                </div>
                                <div className="text-lg font-bold text-blue-700">
                                    {currencySymbol} {Number(totalSales || 0).toFixed(2)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-green-600" />
                                    <div className="text-sm font-semibold">Bankable Total</div>
                                </div>
                                <div className="text-lg font-bold text-green-700">
                                    {currencySymbol} {Number(bankableTotal || 0).toFixed(2)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-amber-200 bg-amber-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-amber-600" />
                                    <div className="text-sm font-semibold">Non-Bankable Total</div>
                                </div>
                                <div className="text-lg font-bold text-amber-700">
                                    {currencySymbol} {Number(nonBankableTotal || 0).toFixed(2)}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-stone-200 bg-stone-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-stone-600" />
                                    <div className="text-sm font-semibold">Tender Lines</div>
                                </div>
                                <div className="text-lg font-bold text-stone-700">{tenderRows.length}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {!applied ? (
                    <Card>
                        <CardContent className="text-muted-foreground p-6 text-center text-sm">
                            Apply a date range to load the sales and non-bankable totals.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <ReceiptText className="h-4 w-4" /> Sales Breakdown by Tender
                        </div>
                        <div className="max-h-[60vh] overflow-auto rounded-md border">
                            <DataTable
                                query={tendersQuery}
                                data={tenderRows}
                                columns={columns}
                                totalRowCount={tenderRows.length}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <Coins className="h-4 w-4 text-amber-600" /> Non-Bankable Transactions
                            <span className="text-muted-foreground text-xs font-normal">
                                {nonBankableRows.length} tender(s)
                            </span>
                        </div>
                        {nonBankableRows.length ? (
                            <div className="max-h-[40vh] overflow-auto rounded-md border">
                                <DataTable
                                    query={tendersQuery}
                                    data={nonBankableRows}
                                    columns={nonBankableColumns}
                                    totalRowCount={nonBankableRows.length}
                                />
                            </div>
                        ) : (
                            <Card>
                                <CardContent className="text-muted-foreground p-6 text-center text-sm">
                                    No non-bankable transactions for the selected period.
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </PageLoader>
    );
};

export default CashUpSalesModule;
