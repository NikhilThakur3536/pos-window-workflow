'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import ExportSheets from '@/components/export-sheets';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetTills, TillDetails } from '@/api-queries/masters/tills';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import {
    useGetEndOfDayPreview,
    useCloseEndOfDay,
    useGetEndOfDayList,
    useReopenEndOfDay,
    toEndOfDayRows,
    EndOfDaySnapshot,
    EndOfDayTenderTotals,
    EndOfDayTaxTotals,
    EndOfDayListInput,
    CloseEndOfDayInput,
    EndOfDayPreviewData,
    toNumber,
    toText,
} from '@/api-queries/end-of-day';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import { CalendarCheck, Clock, Lock, Printer, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';

interface ZReportModuleProps {
    moduleCode: string;
}

const ZReportModule = ({ moduleCode }: ZReportModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const tillsList = useGetTills({})?.data?.data?.rows;

    const [tradingDate, setTradingDate] = useState<string>('');
    const [hasSearched, setHasSearched] = useState(false);
    const [listInput, setListInput] = useState<EndOfDayListInput>({});
    const [closeOpen, setCloseOpen] = useState(false);
    const [closeReason, setCloseReason] = useState('');
    const [closeVariance, setCloseVariance] = useState(false);
    const [closeVarianceReason, setCloseVarianceReason] = useState('');
    const [reopenOpen, setReopenOpen] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [selectedEoD, setSelectedEoD] = useState<EndOfDaySnapshot | null>(null);

    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();

    const previewQuery = useGetEndOfDayPreview(hasSearched && tradingDate ? { tradingDate } : null);
    const datesComplete = !!(listInput.fromDate && listInput.toDate);
    const listQuery = useGetEndOfDayList(datesComplete ? listInput : null);
    const closeMut = useCloseEndOfDay();
    const reopenMut = useReopenEndOfDay();

    const preview = previewQuery.data?.data;
    const rows = toEndOfDayRows(listQuery.data?.data);

    const previewTradingDate = preview?.scope?.tradingDate || tradingDate;
    const canCloseSnapshot = preview?.canClose !== false;
    const previewVariance = toNumber(preview?.cashUp?.variance);

    const downloadCSV = () => {
        // List export for the closed Z-reports is handled via getEndOfDayList isCsv if supported.
    };

    const handleApproval = (error: unknown, actionLabel: string) => {
        const info = isApprovalRequiredError(error);
        if (info) {
            setApproval({ ...info, actionLabel });
        } else {
            // @ts-ignore
            toast.error(error?.response?.data?.message || error?.message || 'Internal Server Error!');
        }
    };

    const buildClosePayload = (approvalToken?: string): CloseEndOfDayInput => ({
        tradingDate: previewTradingDate,
        closeVersion: preview?.closeVersion ?? 1,
        approveVariance: closeVariance,
        varianceReason: closeVarianceReason.trim() || undefined,
        reason: closeReason.trim() || undefined,
        companyDebtorId: preview?.scope?.companyDebtorId ?? null,
        companyWarehouseId: preview?.scope?.companyWarehouseId ?? null,
        ...(approvalToken ? { approvalToken } : {}),
    });

    const runClose = (approvalToken: string) => {
        if (!tradingDate) return;
        closeMut.mutate(buildClosePayload(approvalToken), {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Trading day closed successfully');
                    setCloseOpen(false);
                    setCloseReason('');
                    setCloseVariance(false);
                    setCloseVarianceReason('');
                    previewQuery.refetch();
                    listQuery.refetch();
                } else {
                    toast.error(data?.message || 'Close failed');
                }
            },
            onError: (error) => {
                handleApproval(error, 'Close End of Day');
            },
        });
    };

    const handleCloseConfirm = () => {
        if (!tradingDate) return;
        closeMut.mutate(buildClosePayload(), {
            onSuccess: (data) => {
                if (data?.success) {
                    toast.success('Trading day closed successfully');
                    setCloseOpen(false);
                    setCloseReason('');
                    setCloseVariance(false);
                    setCloseVarianceReason('');
                    previewQuery.refetch();
                    listQuery.refetch();
                } else {
                    toast.error(data?.message || 'Close failed');
                }
            },
            onError: (error) => {
                handleApproval(error, 'Close End of Day');
            },
        });
    };

    const runReopen = (approvalToken: string) => {
        if (!selectedEoD) return;
        reopenMut.mutate(
            {
                tradingDate: selectedEoD.tradingDate || tradingDate,
                closeVersion: selectedEoD.closeVersion ?? 1,
                reason: reopenReason.trim() || undefined,
                approvalToken,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Trading day reopened');
                        setReopenOpen(false);
                        setReopenReason('');
                        previewQuery.refetch();
                        listQuery.refetch();
                    } else {
                        toast.error(data?.message || 'Reopen failed');
                    }
                },
                onError: (error) => {
                    handleApproval(error, 'Reopen End of Day');
                },
            },
        );
    };

    const handleReopenConfirm = () => {
        if (!selectedEoD) return;
        reopenMut.mutate(
            {
                tradingDate: selectedEoD.tradingDate || tradingDate,
                closeVersion: selectedEoD.closeVersion ?? 1,
                reason: reopenReason.trim() || undefined,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Trading day reopened');
                        setReopenOpen(false);
                        setReopenReason('');
                        previewQuery.refetch();
                        listQuery.refetch();
                    } else {
                        toast.error(data?.message || 'Reopen failed');
                    }
                },
                onError: (error) => {
                    handleApproval(error, 'Reopen End of Day');
                },
            },
        );
    };

    const handleApply = () => {
        setHasSearched(true);
        setCloseVariance(false);
        setCloseVarianceReason('');
        setCloseReason('');
    };

    const applyListFilters = (next: Partial<EndOfDayListInput>) => {
        setListInput((prev) => ({ ...prev, ...next }));
    };

    const handleClear = () => {
        setHasSearched(false);
        setTradingDate('');
        setListInput({});
    };

    const endOfDayColumns: ColumnDef<EndOfDaySnapshot>[] = [
        {
            accessorKey: 'tradingDate',
            header: (data) => <TableHeaderToggle {...data}>Trading Date</TableHeaderToggle>,
            cell: ({ row }) => {
                const date = toText(row.getValue('tradingDate'));
                return <div>{date ? moment(date).format('DD/MM/YYYY') : 'N/A'}</div>;
            },
        },
        {
            id: 'till',
            header: (data) => <TableHeaderToggle {...data}>Till</TableHeaderToggle>,
            cell: ({ row }) => {
                const tillId = toText(row.original.tillId);
                const till = tillsList?.find((t: TillDetails) => t.id === tillId);
                return <div>{row.original.tillName || till?.name || till?.tillNumber || tillId || 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'closeStatus',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => <div>{toText(row.getValue('closeStatus')) || 'N/A'}</div>,
        },
        {
            accessorKey: 'openedAt',
            header: (data) => <TableHeaderToggle {...data}>Opened At</TableHeaderToggle>,
            cell: ({ row }) => {
                const openedAt = toText(row.getValue('openedAt'));
                return <div>{openedAt ? moment(openedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'closedAt',
            header: (data) => <TableHeaderToggle {...data}>Closed At</TableHeaderToggle>,
            cell: ({ row }) => {
                const closedAt = toText(row.getValue('closedAt'));
                return <div>{closedAt ? moment(closedAt).format('DD/MM/YYYY HH:mm') : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'netSales',
            header: (data) => <TableHeaderToggle {...data}>Net Sales</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {toNumber(row.getValue('netSales')).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'transactionCount',
            header: (data) => <TableHeaderToggle {...data}>Transactions</TableHeaderToggle>,
            cell: ({ row }) => <div>{toNumber(row.getValue('transactionCount'))}</div>,
        },
        {
            accessorKey: 'cashVariance',
            header: (data) => <TableHeaderToggle {...data}>Cash Variance</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {toNumber(row.getValue('cashVariance')).toFixed(2)}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div>Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                        onClick={() => {
                            setSelectedEoD(row.original);
                            setReopenReason('');
                            setReopenOpen(true);
                        }}
                    >
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={previewQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">Z-Report &amp; Trading-Day Close</div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex w-full flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
                                <Clock className="h-4 w-4" />
                                <Input
                                    type="date"
                                    className="h-7 w-[150px] border-0 p-1 text-xs [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                    value={tradingDate}
                                    onChange={(e) => setTradingDate(e.target.value)}
                                />
                            </div>
                            <FilterActionButtons
                                onApplyFilters={handleApply}
                                onClearClick={handleClear}
                                showClearButton={hasSearched}
                            />
                        </div>

                        {hasSearched && previewTradingDate ? (
                            <Button
                                className="flex items-center gap-1"
                                disabled={!canCloseSnapshot}
                                onClick={() => setCloseOpen(true)}
                            >
                                <Lock className="h-4 w-4" /> Close End of Day
                            </Button>
                        ) : null}
                    </div>

                    {hasSearched && displayEndOfDayPreview(preview, currencySymbol)}

                    <Separator className="my-2" />

                    <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="text-md font-semibold">End of Day History</div>
                            <div className="flex items-center gap-1 rounded-md border px-2 py-1">
                                <Clock className="h-4 w-4" />
                                <Input
                                    type="date"
                                    className="h-7 w-[150px] border-0 p-1 text-xs [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                    value={listInput.fromDate || ''}
                                    onChange={(e) => applyListFilters({ fromDate: e.target.value || undefined })}
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                    type="date"
                                    className="h-7 w-[150px] border-0 p-1 text-xs [&::-webkit-calendar-picker-indicator]:block [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                                    value={listInput.toDate || ''}
                                    onChange={(e) => applyListFilters({ toDate: e.target.value || undefined })}
                                />
                            </div>
                        </div>
                        <ExportSheets downloadCSV={downloadCSV} title="History" />
                    </div>
                    <DataTable
                        query={listQuery}
                        data={rows}
                        columns={endOfDayColumns}
                        totalRowCount={rows.length}
                    />
                </div>
            </div>

            {/* Close confirmation */}
            <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Close Trading Day</DialogTitle>
                        <DialogDescription>
                            This will close the end of day for trading date{' '}
                            {previewTradingDate ? moment(previewTradingDate).format('DD/MM/YYYY') : 'the selected date'}{' '}
                            and finalise the Z report.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {!canCloseSnapshot ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                <div className="font-semibold">Close Blocked</div>
                                <div>{blockerText(preview)}</div>
                            </div>
                        ) : null}
                        {previewVariance !== 0 ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                                <div className="font-semibold">Cash Variance Detected</div>
                                <div>
                                    Variance: {currencySymbol} {previewVariance}
                                </div>
                                <div className="mt-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <input
                                            id="approve-variance"
                                            type="checkbox"
                                            checked={closeVariance}
                                            onChange={(e) => setCloseVariance(e.target.checked)}
                                            className="h-3.5 w-3.5"
                                        />
                                        <Label htmlFor="approve-variance" className="text-xs">
                                            Approve variance and close
                                        </Label>
                                    </div>
                                    {closeVariance ? (
                                        <Label className="text-xs">Variance reason</Label>
                                    ) : null}
                                    {closeVariance ? (
                                        <Textarea
                                            className="h-16 text-xs"
                                            value={closeVarianceReason}
                                            onChange={(e) => setCloseVarianceReason(e.target.value)}
                                            placeholder="Reason for approving the variance"
                                        />
                                    ) : null}
                                </div>
                            </div>
                        ) : null}
                        <div>
                            <Label className="text-xs">Reason (optional)</Label>
                            <Textarea
                                className="h-16 text-xs"
                                value={closeReason}
                                onChange={(e) => setCloseReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCloseOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={closeMut.isPending}
                            onClick={handleCloseConfirm}
                        >
                            {closeMut.isPending ? 'Closing...' : 'Confirm Close'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reopen confirmation */}
            <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Reopen Trading Day</DialogTitle>
                        <DialogDescription>
                            Reopen the closed trading day to continue posting transactions on that till.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Reason (optional)</Label>
                            <Textarea
                                className="h-16 text-xs"
                                value={reopenReason}
                                onChange={(e) => setReopenReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReopenOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={reopenMut.isPending}
                            onClick={handleReopenConfirm}
                        >
                            {reopenMut.isPending ? 'Reopening...' : 'Confirm Reopen'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Supervisor approval for close/reopen */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId || undefined}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                onApproved={(token) => {
                    if (approval?.actionLabel === 'Close End of Day') runClose(token);
                    else if (approval?.actionLabel === 'Reopen End of Day') runReopen(token);
                }}
            />
        </PageLoader>
    );
};

export default ZReportModule;

function displayEndOfDayPreview(preview: EndOfDayPreviewData | null | undefined, currencySymbol: string) {
    if (!preview) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No End of Day data found for the selected trading date.
                </CardContent>
            </Card>
        );
    }

    const tradingDate = preview.scope?.tradingDate || '';
    const sales = preview.sales || {};
    const refunds = preview.refunds || {};
    const cashUp = preview.cashUp || {};
    const netSales = toNumber(preview.netSalesAmount);
    const grossSales = toNumber(sales.totalAmount);
    const refundAmount = toNumber(refunds.totalAmount);
    const transactionCount = toNumber(sales.documentCount);
    const quantity = toNumber(sales.totalQuantity);
    const variance = toNumber(cashUp.variance);

    const summary: Array<{ label: string; value: number; icon?: 'up' | 'down' }> = [
        { label: 'Gross Sales', value: grossSales },
        { label: 'Net Sales', value: netSales },
        { label: 'Refunds', value: refundAmount, icon: 'down' },
        { label: 'Quantity', value: quantity },
        { label: 'Transactions', value: transactionCount, icon: 'up' },
        { label: 'Cash Variance', value: variance, icon: variance !== 0 ? 'down' : undefined },
    ];

    const blockers = preview.blockers;
    const blockerCount =
        toNumber(blockers?.openShifts?.length || 0) +
        (blockers?.missingCashUp ? 1 : 0) +
        (blockers?.unresolvedVariance ? 1 : 0);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-1">
                    Status: <span className="font-semibold">{preview.closeStatus || 'N/A'}</span>
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1">
                    Version: <span className="font-semibold">{preview.closeVersion ?? 'N/A'}</span>
                </span>
                {preview.calculatedAt ? (
                    <span className="rounded-md bg-slate-100 px-2 py-1">
                        Calculated At: <span className="font-semibold">{moment(preview.calculatedAt).format('DD/MM/YYYY HH:mm:ss')}</span>
                    </span>
                ) : null}
                <span
                    className={`rounded-md px-2 py-1 ${
                        preview.canClose === false
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-green-50 text-green-700'
                    }`}
                >
                    {preview.canClose === false ? `Cannot close (${blockerCount} blocker(s))` : 'Ready to close'}
                </span>
            </div>

            {preview.canClose === false && blockerCount > 0 ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                    <div className="mb-1 font-semibold">Close Blockers</div>
                    <div>{blockerText(preview)}</div>
                </div>
            ) : null}

            <Card className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {summary.map((stat) => {
                    const Icon = stat.icon === 'down' ? TrendingDown : stat.icon === 'up' ? TrendingUp : CalendarCheck;
                    return (
                        <div key={stat.label} className="px-2">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-medium">{stat.label}</CardTitle>
                                <Icon className="h-5 w-5 text-slate-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold">
                                    {currencySymbol} {stat.value}
                                </div>
                            </CardContent>
                        </div>
                    );
                })}
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold">Cash Up</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between border-b py-1 last:border-0">
                                <span>Count</span>
                                <span className="font-semibold">{toNumber(cashUp.count)}</span>
                            </div>
                            <div className="flex justify-between border-b py-1">
                                <span>Expected Cash</span>
                                <span className="font-semibold">
                                    {currencySymbol} {toNumber(cashUp.expectedCash)}
                                </span>
                            </div>
                            <div className="flex justify-between border-b py-1">
                                <span>Declared Cash</span>
                                <span className="font-semibold">
                                    {currencySymbol} {toNumber(cashUp.declaredCash)}
                                </span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span>Variance</span>
                                <span className="font-semibold">
                                    {currencySymbol} {variance}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {preview.tenders?.length ? (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-semibold">Tenders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <EodTotals
                                rows={preview.tenders}
                                valueKey="amount"
                                labelKey="tenderName"
                                fallbackLabel="tenderType"
                            />
                        </CardContent>
                    </Card>
                ) : null}
            </div>

            <div className="flex items-center text-xs text-muted-foreground">
                <Printer className="mr-1 h-3.5 w-3.5" /> End of day for {moment(tradingDate).format('DD/MM/YYYY')}
                {preview.calculatedAt
                    ? `, calculated at ${moment(preview.calculatedAt).format('DD/MM/YYYY HH:mm:ss')}`
                    : ''}
            </div>
        </div>
    );
}

function blockerText(preview: EndOfDayPreviewData | null | undefined): string {
    if (!preview?.blockers) return 'No blockers reported.';
    const blockers = preview.blockers;
    const reasons: string[] = [];
    const openShiftCount = toNumber(blockers.openShifts?.length);
    if (openShiftCount > 0) reasons.push(`${openShiftCount} open shift(s)`);
    if (blockers.missingCashUp) reasons.push('Cash-up has not been performed');
    if (blockers.unresolvedVariance) reasons.push('Cash variance has not been resolved');
    return reasons.length ? reasons.join(', ') : 'No blockers reported.';
}

function EodTotals({
    rows,
    valueKey,
    labelKey,
    fallbackLabel,
}: {
    rows: Array<EndOfDayTenderTotals | EndOfDayTaxTotals>;
    valueKey: string;
    labelKey: string;
    fallbackLabel: string;
}) {
    return (
        <div className="space-y-1 text-sm">
            {rows.map((row, idx) => {
                const label =
                    (row[labelKey] as string | undefined) ||
                    (row[fallbackLabel] as string | undefined) ||
                    `Row ${idx + 1}`;
                const value = (row[valueKey] as number | undefined) ?? 0;
                return (
                    <div key={idx} className="flex justify-between border-b py-1 last:border-0">
                        <span>{label}</span>
                        <span className="font-semibold">{value}</span>
                    </div>
                );
            })}
        </div>
    );
}