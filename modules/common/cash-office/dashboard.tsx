import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import SelectPopover from '@/components/select-popover';
import {
    ArrowLeftRight,
    CalendarRange,
    ClipboardCheck,
    CornerUpLeft,
    Landmark,
    Wallet,
    TrendingUp,
    Box,
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import moment from 'moment';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeSessionCurrent,
    useOpenCashOfficeSession,
    usePreviewOpenCashOfficeSession,
    useGetCashOfficeHandovers,
    useGetCashOfficeDashboard,
    searchCashOffice,
    generateCashOfficeDocumentId,
    type CashOfficeConfiguration,
    type CashOfficeHandover,
    type OpenSessionPreviewResult,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { CashOfficeStatusBadge, formatMoney, formatDateTime } from './shared';

const DashboardModule = () => {
    const router = useRouter();
    const query = (router.query || {}) as { cashOfficeId?: string };

    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';

    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        status: 'ACTIVE',
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const [cashOfficeId, setCashOfficeId] = useState(String(query.cashOfficeId || ''));
    const activeConfig = configs.find((c) => c.id === cashOfficeId);

    const currentSession = useGetCashOfficeSessionCurrent(cashOfficeId);
    const session = currentSession?.data?.data || null;

    const dashboardQuery = useGetCashOfficeDashboard(!!cashOfficeId);
    const dashboardData = dashboardQuery?.data?.data || null;

    const handoverQuery = useGetCashOfficeHandovers({
        ...(cashOfficeId ? { cashOfficeId } : {}),
        limit: 10,
        offset: 0,
    });
    const handovers: CashOfficeHandover[] = handoverQuery?.data?.data?.rows || [];

    const today: Record<string, number | undefined> = dashboardData?.today || dashboardData?.counts || {};

    const [openDialog, setOpenDialog] = useState(false);
    const [businessDate, setBusinessDate] = useState(moment().format('YYYY-MM-DD'));
    const [openingCash, setOpeningCash] = useState('');
    const [openingCheque, setOpeningCheque] = useState('');
    const openMut = useOpenCashOfficeSession();
    const previewMut = usePreviewOpenCashOfficeSession();
    const [previewResult, setPreviewResult] = useState<OpenSessionPreviewResult | null>(null);

    const userGroupPermissions = useUsersPermissions();
    const sessionOpenPermissionCode = SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.SESSION_OPEN.code;
    const canOpenSession = hasPermission(userGroupPermissions, sessionOpenPermissionCode, [SYSTEM_PERMISSIONS.READ]);
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [fromDate, setFromDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [toDate, setToDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
    const [searchKeyword, setSearchKeyword] = useState('');
    const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
    const [searching, setSearching] = useState(false);

    const runSearch = async () => {
        if (!cashOfficeId) {
            toast.error('Select a cash office first');
            return;
        }
        setSearching(true);
        try {
            const res = await searchCashOffice({
                cashOfficeId,
                dateFrom: moment(fromDate).startOf('day').toISOString(),
                dateTo: moment(toDate).endOf('day').toISOString(),
                limit: 50,
                offset: 0,
                ...(searchKeyword ? { search: searchKeyword } : {}),
            });
            const data = res?.data as Record<string, unknown> | undefined;
            const rows = (data?.rows as Record<string, unknown>[]) || (data?.results as Record<string, unknown>[]) || [];
            setSearchResults(rows);
            if (!rows.length) toast.info('No results found');
        } catch (error) {
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Search failed');
        } finally {
            setSearching(false);
        }
    };

    const handleOpen = () => {
        if (!cashOfficeId) return;
        if (!canOpenSession) {
            setIsPermissionDeniedOpen(true);
            return;
        }
        openMut.mutate(
            {
                cashOfficeId,
                businessDate,
                openingCashAmount: openingCash === '' ? undefined : Number(openingCash),
                openingChequeAmount: openingCheque === '' ? undefined : Number(openingCheque),
                clientDocumentId: generateCashOfficeDocumentId('CO-OPEN'),
            },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Failed to open session');
                        return;
                    }
                    toast.success('Cash Office session opened');
                    setOpenDialog(false);
                    setOpeningCash('');
                    setOpeningCheque('');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleOpenSessionClick = () => {
        if (!canOpenSession) {
            setIsPermissionDeniedOpen(true);
            return;
        }
        setPreviewResult(null);
        setOpenDialog(true);
    };

    const handlePreview = () => {
        if (!cashOfficeId) return;
        previewMut.mutate(
            {
                cashOfficeId,
                businessDate,
                openingCashAmount: openingCash === '' ? undefined : Number(openingCash),
                openingChequeAmount: openingCheque === '' ? undefined : Number(openingCheque),
            },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Preview failed');
                        setPreviewResult(null);
                        return;
                    }
                    setPreviewResult(data?.data || null);
                    toast.success('Opening preview computed');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Preview failed');
                },
            },
        );
    };

    const summaryCards = [
        { key: 'handovers', label: 'Handovers Today', icon: ClipboardCheck, money: false },
        { key: 'received', label: 'Received Today', icon: Wallet, money: false },
        { key: 'paidOut', label: 'Paid Out Today', icon: ArrowLeftRight, money: false },
        { key: 'banked', label: 'Bank Movements', icon: Landmark, money: false },
        { key: 'variance', label: 'Variance Today', icon: TrendingUp, money: true },
    ];

    const handoverColumns: ColumnDef<CashOfficeHandover>[] = [
        {
            accessorKey: 'receiptNumber',
            header: 'Receipt',
            cell: ({ row }) => <div>{row.original.receiptNumber || '—'}</div>,
        },
        {
            accessorKey: 'clerkName',
            header: 'Clerk',
            cell: ({ row }) => <div>{row.original.clerkName || row.original.receivedByName || '—'}</div>,
        },
        {
            accessorKey: 'declaredCashAmount',
            header: 'Declared',
            cell: ({ row }) => <div>{formatMoney(row.original.declaredCashAmount || 0)}</div>,
        },
        {
            accessorKey: 'countedCashAmount',
            header: 'Counted',
            cell: ({ row }) => <div>{formatMoney(row.original.countedCashAmount || 0)}</div>,
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <CashOfficeStatusBadge status={row.original.status} /> },
        { accessorKey: 'createdAt', header: 'Date', cell: ({ row }) => <div>{formatDateTime(row.original.createdAt)}</div> },
    ];

    return (
        <PageLoader isLoading={configsQuery.isLoading || currentSession.isLoading}>
            <div className="space-y-4 p-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Cash Office</Label>
                        <SelectPopover
                            title="Cash Office"
                            onlyTitle="Select a cash office"
                            selectedValue={cashOfficeId}
                            options={[
                                { label: 'Select a cash office', value: '' },
                                ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                            ]}
                            onSelect={(val) => setCashOfficeId(String(val || ''))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {activeConfig ? <div className="text-sm text-muted-foreground">{activeConfig.code} — {activeConfig.name}</div> : null}
                        {cashOfficeId && !session ? (
                            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenSessionClick}>
                                <CalendarRange className="mr-1 h-4 w-4" /> Open Session
                            </Button>
                        ) : null}
                        {session?.status === 'OPEN' ? (
                            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                                <Box className="h-4 w-4" /> Session OPEN
                            </div>
                        ) : null}
                    </div>
                </div>

                {session?.status === 'OPEN' ? (
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                                <div className="text-muted-foreground">Business Date</div>
                                <div className="font-medium">{moment(session.businessDate).format('DD MMM YYYY')}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Opening Cash</div>
                                <div className="font-medium">{formatMoney(session.openingCashAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Opening Cheque</div>
                                <div className="font-medium">{formatMoney(session.openingChequeAmount)}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Session Ref</div>
                                <div className="font-medium">{session.clientDocumentId || '—'}</div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {session?.status === 'OPEN' ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                        {summaryCards.map((card) => {
                            const Icon = card.icon;
                            const value = today[card.key];
                            const numValue = Number(value || 0);
                            const cls = card.money
                                ? numValue > 0
                                    ? 'text-emerald-700'
                                    : numValue < 0
                                      ? 'text-red-600'
                                      : 'text-muted-foreground'
                                : 'text-gray-800';
                            return (
                                <div key={card.key} className="rounded-xl border bg-white p-4 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-muted-foreground">{card.label}</div>
                                        <Icon className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <div className={`mt-2 text-2xl font-bold ${cls}`}>
                                        {card.money ? formatMoney(numValue) : numValue.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between">
                            <div className="font-semibold">Recent Handovers</div>
                            <div className="text-sm text-muted-foreground">latest 10</div>
                        </div>
                        <DataTable
                            query={handoverQuery}
                            data={handovers}
                            columns={handoverColumns}
                            totalRowCount={handovers.length}
                            viewColumns={false}
                        />
                    </div>

                    <div className="rounded-xl border bg-white p-4 shadow-sm">
                        <div className="mb-3 font-semibold">Search Cash Office Records</div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs">From</Label>
                                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs">To</Label>
                                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Keyword (optional)</Label>
                                <Input
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    placeholder="Receipt, reference, report..."
                                    onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={runSearch} disabled={searching}>
                                    <CornerUpLeft className="mr-1 h-4 w-4" /> {searching ? 'Searching...' : 'Search'}
                                </Button>
                            </div>
                            {searchResults.length > 0 ? (
                                <div className="max-h-96 overflow-y-auto rounded-lg border">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-muted-foreground">
                                            <tr>
                                                <th className="px-3 py-2">Reference</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                                <th className="px-3 py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {searchResults.map((r, i) => (
                                                <tr key={String(r.id || r.clientDocumentId || i)} className="border-t">
                                                    <td className="px-3 py-2">{String(r.clientDocumentId || r.receiptNumber || '—')}</td>
                                                    <td className="px-3 py-2">{String(r.transactionType || r.sourceType || '—')}</td>
                                                    <td className="px-3 py-2 text-right">{formatMoney(Number(r.amount))}</td>
                                                    <td className="px-3 py-2"><CashOfficeStatusBadge status={String(r.status || '')} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Open Cash Office Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Business Date</Label>
                            <Input type="date" value={businessDate} onChange={(e) => setBusinessDate(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Opening Cash Amount</Label>
                                <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="Leave empty to carry forward" />
                            </div>
                            <div>
                                <Label>Opening Cheque Amount</Label>
                                <Input type="number" value={openingCheque} onChange={(e) => setOpeningCheque(e.target.value)} placeholder="Leave empty to carry forward" />
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            If omitted, the backend carries forward the previous approved closing balance.
                        </div>
                        {previewResult ? (
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                                <div className="mb-1 font-semibold text-blue-700">Opening Preview</div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {Object.entries(previewResult)
                                        .filter(([, v]) => v != null && v !== '')
                                        .map(([k, v]) => (
                                            <div key={k} className="text-xs">
                                                <span className="capitalize text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>{' '}
                                                <span className="font-semibold">{typeof v === 'number' ? formatMoney(v) : String(v)}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        ) : null}
                        {!canOpenSession ? (
                            <div className="text-xs text-amber-600">
                                Opening a session requires the CASH_OFFICE_SESSION_OPEN permission.
                            </div>
                        ) : null}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            Cancel
                        </Button>
                        <Button variant="secondary" onClick={handlePreview} disabled={previewMut.isPending}>
                            {previewMut.isPending ? 'Previewing...' : 'Preview'}
                        </Button>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={openMut.isPending || !canOpenSession} onClick={handleOpen}>
                            {openMut.isPending ? 'Opening...' : 'Open Session'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{
                    description:
                        "You don't have the CASH_OFFICE_SESSION_OPEN permission required to open a cash office session.",
                }}
            />
        </PageLoader>
    );
};

export default DashboardModule;