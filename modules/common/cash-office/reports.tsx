import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import SelectPopover from '@/components/select-popover';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import {
    CASH_OFFICE_REPORT_TYPES,
    useGetCashOfficeConfigurations,
    useGetCashOfficeReport,
    useGetCashOfficeSessions,
    useExportCashOfficeReport,
    type CashOfficeConfiguration,
    type CashOfficeDailyStatementData,
    type CashOfficeSession,
    type CashOfficeReportType,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { CashOfficeStatusBadge, formatDateTime } from './shared';
import DailyStatement from './daily-statement';

const ORDERED_KEYS = [
    'sessionNumber',
    'cashOfficeName',
    'businessDate',
    'clientDocumentId',
    'receiptNumber',
    'transactionType',
    'status',
    'date',
    'amount',
    'variance',
    'openingCashAmount',
    'openingChequeAmount',
    'closingCashAmount',
    'closingChequeAmount',
    'openedByName',
    'openedAt',
    'closedByName',
    'closedAt',
    'reopenedByName',
    'reopenedAt',
    'closeReason',
    'reopenReason',
    'createdAt',
    'updatedAt',
];

const isIdKey = (k: string) => k === 'id' || (/Id$/.test(k) && k !== 'clientDocumentId');

const ReportsModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';
    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const [reportType, setReportType] = useState<CashOfficeReportType>('DAILY_STATEMENT');
    const [cashOfficeId, setCashOfficeId] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [dateFrom, setDateFrom] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [dateTo, setDateTo] = useState(moment().endOf('month').format('YYYY-MM-DD'));

    const isDailyStatement = reportType === 'DAILY_STATEMENT';
    const sessionsQuery = useGetCashOfficeSessions({
        ...(cashOfficeId ? { cashOfficeId } : {}),
        limit: 1000,
        offset: 0,
    });
    const sessions: CashOfficeSession[] = sessionsQuery?.data?.data?.rows || [];
    const effectiveSessionId = sessionId || (isDailyStatement ? sessions.find((s) => s.status === 'OPEN')?.id || sessions[0]?.id || '' : '');

    const applyFilters = useMemo(() => {
        const props: Record<string, unknown> = {
            ...(cashOfficeId ? { cashOfficeId } : {}),
            ...(isDailyStatement && effectiveSessionId ? { cashOfficeSessionId: effectiveSessionId } : {}),
            dateFrom: moment(dateFrom).startOf('day').toISOString(),
            dateTo: moment(dateTo).endOf('day').toISOString(),
            isCsv: false,
            limit: 1000,
            offset: 0,
        };
        return props;
    }, [cashOfficeId, sessionId, effectiveSessionId, isDailyStatement, dateFrom, dateTo]);

    const reportQuery = useGetCashOfficeReport(reportType, applyFilters, !!reportType);
    const exportMut = useExportCashOfficeReport();

    const reportResponse = reportQuery?.data as unknown as
        | { download?: { filename?: string } }
        | undefined;

    const rawData = reportQuery?.data?.data as unknown;
    type Row = Record<string, unknown>;
    const dailyStatementData =
        isDailyStatement && rawData && typeof rawData === 'object' && ('session' in rawData || 'preview' in rawData)
            ? (rawData as CashOfficeDailyStatementData)
            : null;

    let rows: Row[] = [];
    if (Array.isArray(rawData)) rows = rawData as Row[];
    else if (rawData && typeof rawData === 'object' && 'rows' in (rawData as Row)) rows = (rawData as { rows: Row[] }).rows;
    else if (rawData && typeof rawData === 'object') rows = Object.values(rawData as Record<string, unknown>).filter((v) => typeof v === 'object') as Row[];
    rows = (Array.isArray(rows) ? rows : []).filter((r) => r !== null && r !== undefined && typeof r === 'object');

    const columns = useMemo(() => {
        const isNestedObject = (k: string) => rows.some((r) => r[k] !== null && r[k] !== undefined && typeof r[k] === 'object');
        const isHidden = (k: string) => isIdKey(k) || isNestedObject(k) || /User$/.test(k) || k === 'cashOffice';
        const present = new Set<string>();
        rows.forEach((r) => Object.keys(r).forEach((k) => present.add(k)));
        const keys = ORDERED_KEYS.filter((k) => present.has(k) && !isHidden(k));
        rows.forEach((r) => Object.keys(r).forEach((k) => !keys.includes(k) && !isHidden(k) && keys.push(k)));
        return keys.slice(0, 20);
    }, [rows]);

    const labelFor = (key: string) =>
        key
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

    const cellValue = (row: Row, key: string) => {
        const v = row[key];
        if (v == null || v === '') return '—';
        if (typeof v === 'object') return JSON.stringify(v);
        if (key.toLowerCase().includes('amount') || key.toLowerCase() === 'variance')
            return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (key.toLowerCase().includes('date') || /At$/.test(key)) return formatDateTime(String(v));
        if (key.toLowerCase() === 'status') return <CashOfficeStatusBadge status={String(v)} />;
        return String(v);
    };

    const handleExport = () => {
        exportMut.mutate(
            {
                reportType,
                ...(cashOfficeId ? { cashOfficeId } : {}),
                ...(isDailyStatement && effectiveSessionId ? { cashOfficeSessionId: effectiveSessionId } : {}),
                dateFrom: moment(dateFrom).startOf('day').toISOString(),
                dateTo: moment(dateTo).endOf('day').toISOString(),
                isCsv: true,
            },
            {
                onSuccess: (data) => {
                    const fileName = reportResponse?.download?.filename || `cash-office-${reportType.toLowerCase()}-${moment().format('YYYYMMDD')}.csv`;
                    const saveBlob = (blob: Blob) => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = fileName;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success('Report exported');
                    };
                    if (data instanceof Blob) {
                        if (data.type.includes('application/json')) {
                            data.text().then((text) => {
                                try {
                                    const parsed = JSON.parse(text) as { message?: string };
                                    toast.error(parsed?.message || 'Export failed');
                                } catch {
                                    toast.error('Export failed');
                                }
                            });
                            return;
                        }
                        saveBlob(data);
                        return;
                    }
                    if (typeof data === 'string' && (data as string).trim().length) {
                        saveBlob(new Blob([data as string], { type: 'text/csv;charset=utf-8' }));
                        return;
                    }
                    const res = data as { success?: boolean; message?: string; data?: unknown };
                    if (res?.success === false) {
                        toast.error(res?.message || 'Export failed');
                        return;
                    }
                    const payload = res?.data as unknown;
                    if (payload && typeof payload === 'string' && payload.trim().length) {
                        saveBlob(new Blob([payload], { type: 'text/csv;charset=utf-8' }));
                    } else {
                        toast.success(res?.message || 'Report exported');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Export failed');
                },
            },
        );
    };

    return (
        <PageLoader isLoading={configsQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                        <FileText className="h-4 w-4" /> Cash Office Report
                    </div>
                    <div className="grid gap-3 md:grid-cols-5">
                        <div>
                            <Label className="text-xs">Report</Label>
                            <SelectPopover
                                title="Report"
                                onlyTitle="Select report"
                                selectedValue={reportType}
                                options={CASH_OFFICE_REPORT_TYPES.map((r) => ({ label: r.label, value: r.value }))}
                                onSelect={(val) => setReportType(String(val || 'DAILY_STATEMENT') as CashOfficeReportType)}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Cash Office</Label>
                            <SelectPopover
                                title="Cash Office"
                                onlyTitle="All cash offices"
                                selectedValue={cashOfficeId}
                                options={[
                                    { label: 'All cash offices', value: '' },
                                    ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                                ]}
                                onSelect={(val) => {
                                    setCashOfficeId(String(val || ''));
                                    setSessionId('');
                                }}
                            />
                        </div>
                        {isDailyStatement && (
                            <div>
                                <Label className="text-xs">Session</Label>
                                <SelectPopover
                                    title="Session"
                                    onlyTitle="Latest session"
                                    selectedValue={effectiveSessionId}
                                    options={[
                                        { label: 'Latest session', value: '' },
                                        ...sessions.map((s) => ({
                                            label: `${s.status || 'SESSION'} — ${s.businessDate ? moment(String(s.businessDate)).format('DD MMM YYYY') : '—'}`,
                                            value: s.id,
                                        })),
                                    ]}
                                    onSelect={(val) => setSessionId(String(val || ''))}
                                />
                                {!sessionsQuery.isLoading && sessions.length === 0 && (
                                    <p className="mt-1 text-xs text-muted-foreground">No sessions for the selected cash office.</p>
                                )}
                            </div>
                        )}
                        <div>
                            <Label className="text-xs">From</Label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs">To</Label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" className="w-full" onClick={handleExport} disabled={exportMut.isPending}>
                                <Download className="mr-1 h-4 w-4" /> {exportMut.isPending ? 'Exporting...' : 'Export CSV'}
                            </Button>
                        </div>
                    </div>
                </div>

                {dailyStatementData ? (
                    <PageLoader isLoading={reportQuery.isLoading}>
                        <DailyStatement data={dailyStatementData} currencySymbol={currencySymbol} />
                    </PageLoader>
                ) : (
                    <div className="rounded-xl border bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b px-4 py-3">
                            <div>
                                <div className="font-semibold">
                                    {CASH_OFFICE_REPORT_TYPES.find((r) => r.value === reportType)?.label || reportType}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {moment(dateFrom).format('DD MMM YYYY')} — {moment(dateTo).format('DD MMM YYYY')}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {reportQuery.isLoading ? 'Loading...' : `${rows.length.toLocaleString()} row(s)`}
                            </div>
                        </div>
                        <PageLoader isLoading={reportQuery.isLoading}>
                            {rows.length ? (
                                <div className="max-h-[60vh] overflow-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-muted-foreground">
                                            <tr>
                                                {columns.map((k) => (
                                                    <th key={k} className="whitespace-nowrap px-3 py-2">
                                                        {labelFor(k)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((r, i) => (
                                                <tr key={String(r.id || r.clientDocumentId || i)} className="border-t">
                                                    {columns.map((k) => (
                                                        <td key={k} className="max-w-[220px] truncate px-3 py-2">
                                                            {cellValue(r, k)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : reportQuery.isLoading ? null : (
                                <div className="p-10 text-center text-sm text-muted-foreground">
                                    No rows for the selected period.
                                </div>
                            )}
                        </PageLoader>
                    </div>
                )}
            </div>
        </PageLoader>
    );
};

export default ReportsModule;