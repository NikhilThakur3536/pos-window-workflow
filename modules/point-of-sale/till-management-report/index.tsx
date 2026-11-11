import { useState } from 'react';
import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import {
    Download,
    Wallet,
    DollarSign,
    RotateCcw,
    Vault,
    Scale,
    Coins,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    CashUpReportRecord,
    TillManagementReportFilterProps,
    useGetTillManagementReport,
    getTillManagementReport,
} from '@/api-queries/till-management/till-management-report';
import {
    FilterProps,
    UserTillReportDetails,
    useGetReports,
} from '@/api-queries/user/reports/till-reports';
import { type ColumnDef } from '@tanstack/react-table';
import TableDateFilter from '@/components/table/table-date-filter';
import { useAuthUser } from '@/stores/auth-user.store';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetTills, TillDetails } from '@/api-queries/masters/tills';
import SelectPopover from '@/components/select-popover';
import { TableHeaderToggle } from '@/components/table';
import { Separator } from '@/components/ui/separator';
import moment from 'moment';

interface TillManagementReportProps {
    moduleCode: string;
}

export interface TillTransferRecord {
    id: string;
    referenceNumber: string | null;
    tillId: string;
    safeId: string;
    amount: string;
    openingBalance: string;
    closingBalance: string;
    reason: string | null;
    status: string;
    type: string; // e.g. TILL_TO_SAFE
    cashFlow: string; // e.g. CASH_IN
    createdAt: string;
    Till?: { id: string; name?: string; tillNumber?: string; currentBalance?: number };
    Safe?: { id: string; name?: string; code?: string; amount?: string };
    user?: { id: string; firstName?: string; surname?: string; email?: string };
}

const TillManagementReportModule = ({ moduleCode }: TillManagementReportProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;
    const tillsList = useGetTills({})?.data?.data?.rows;

    const [hasSearched, setHasSearched] = useState(false);

    const initialFilters: TillManagementReportFilterProps = {
        fromDate: '',
        toDate: '',
        tillId: '',
    };

    const {
        filters,
        setFilters,
        handleFilters,
        clearFilters,
        appliedFilters,
        showClearButton,
        pagination,
        setPagination,
    } = useTableFilters<TillManagementReportFilterProps>(initialFilters);

    const cashierFilter: FilterProps = {
        ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
        ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
        ...(appliedFilters?.tillId ? { tillId: appliedFilters?.tillId } : {}),
    };

    const cashierReports = useGetReports(cashierFilter);
    const cashierRows = cashierReports?.data?.data || [];

    const query = useGetTillManagementReport({
        ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
        ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
        ...(appliedFilters?.tillId ? { tillId: appliedFilters?.tillId } : {}),
    });

    const { data: reports, isLoading } = query;
    const cashUpRecords = reports?.cashUpRecords || [];
    const totalRowCount = cashUpRecords.length;

    const columns: ColumnDef<CashUpReportRecord>[] = [
        {
            accessorKey: 'tillId',
            header: (data) => <TableHeaderToggle {...data}>Till</TableHeaderToggle>,
            cell: ({ row }) => {
                const till = tillsList?.find((t: TillDetails) => t.id === row.getValue('tillId'));
                return <div>{till?.name || till?.tillNumber || row.getValue('tillId')}</div>;
            },
        },
        {
            accessorKey: 'cashUpDate',
            header: (data) => <TableHeaderToggle {...data}>Cash Up Date</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{row.getValue('cashUpDate') ? moment(row.getValue('cashUpDate')).format('DD/MM/YYYY') : 'N/A'}</div>
            ),
        },
        {
            accessorKey: 'cashFloat',
            header: (data) => <TableHeaderToggle {...data}>Cash Float</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {row.getValue('cashFloat') || '0.00'}
                </div>
            ),
        },
        {
            accessorKey: 'denominations',
            header: (data) => <TableHeaderToggle {...data}>Counted Denominations</TableHeaderToggle>,
            cell: ({ row }) => <div>{(row.original.denominations || []).length}</div>,
        },
        {
            accessorKey: 'discountAmount',
            header: (data) => <TableHeaderToggle {...data}>Discount</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {row.getValue('discountAmount') || '0.00'}
                </div>
            ),
        },
        {
            accessorKey: 'couponAmount',
            header: (data) => <TableHeaderToggle {...data}>Coupon</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {row.getValue('couponAmount') || '0.00'}
                </div>
            ),
        },
    ];

    async function downloadCSV() {
        await getTillManagementReport({
            isCsv: true,
            ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
            ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
            ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
            ...(appliedFilters?.tillId ? { tillId: appliedFilters?.tillId } : {}),
        });
    }

    const handleApplyFilters = () => {
        setHasSearched(true);
        handleFilters(filters);
    };

    const handleClearSearch = () => {
        clearFilters();
        setHasSearched(false);
    };

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">
                    Till Management Report{' '}
                    {selectedDebtor ? `for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})` : ''}
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex w-full items-center gap-2">
                        {isCompanyDebtor ? null : (
                            <SelectPopover
                                title="debtor (store)"
                                selectedValue={filters.companyDebtorId}
                                options={
                                    debtors
                                        ? debtors?.map((debtor) => ({
                                              value: debtor?.id,
                                              label: `${debtor?.name} (${debtor?.accountNumber})`,
                                          }))
                                        : []
                                }
                                onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                            />
                        )}

                        <SelectPopover
                            title="till"
                            selectedValue={filters.tillId}
                            options={(tillsList || []).map((till) => ({
                                value: till.id,
                                label: till.name || till.tillNumber || till.id,
                            }))}
                            onSelect={(val) => setFilters({ ...filters, tillId: val })}
                        />

                        <TableDateFilter filters={filters} setFilters={setFilters} />

                        <FilterActionButtons
                            onApplyFilters={handleApplyFilters}
                            onClearClick={handleClearSearch}
                            showClearButton={showClearButton}
                        />
                    </div>

                    <Button onClick={downloadCSV} variant={'outline'} size={'sm'} disabled={!hasSearched}>
                        <Download /> Download
                    </Button>
                </div>

                {hasSearched && (
                    <>
                        <CashierSummary rows={cashierRows} />
                        {(reports?.cashUpRecords?.length || 0) > 0 && (
                            <DataTable
                                query={query}
                                data={cashUpRecords}
                                columns={columns}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalRowCount={totalRowCount}
                            />
                        )}
                        {!reports?.cashUpRecords?.length && (
                            <Card>
                                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                    No cash-up records found for the selected range.
                                </CardContent>
                            </Card>
                        )}

                        {(reports?.transfers?.length || 0) > 0 ? (
                            <>
                                <Separator className="my-2" />
                                <div className="text-md font-semibold">Transfers to Safe</div>
                                <TransfersTable transfers={(reports?.transfers || []) as TillTransferRecord[]} />
                            </>
                        ) : null}
                    </>
                )}
            </div>
        </PageLoader>
    );
};

export default TillManagementReportModule;

function CashierSummary({ rows }: { rows: UserTillReportDetails[] }) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const aggregate = {
        openingFloat: rows.reduce((sum, row) => sum + (Number(row.openingFloat) || 0), 0),
        cashSales: rows.reduce((sum, row) => sum + (Number(row.totalCashSales) || 0), 0),
        refunds: rows.reduce((sum, row) => sum + (Number(row.totalRefunds) || 0), 0),
        safeDrops: rows.reduce((sum, row) => sum + (Number(row.totalDropsToSafe) || 0), 0),
        payouts: rows.reduce((sum, row) => sum + (Number(row.totalPayouts) || 0), 0),
        netDrawer: rows.reduce((sum, row) => sum + (Number(row.netDrawerBalance) || 0), 0),
    };

    const stats = [
        { title: 'Opening Float', value: aggregate.openingFloat, icon: Wallet, color: 'text-slate-600' },
        { title: 'Cash Sales', value: aggregate.cashSales, icon: DollarSign, color: 'text-green-600' },
        { title: 'Cash Refunds', value: aggregate.refunds, icon: RotateCcw, color: 'text-red-600' },
        { title: 'Safe Drops', value: aggregate.safeDrops, icon: Vault, color: 'text-blue-600' },
        { title: 'Payouts', value: aggregate.payouts, icon: Coins, color: 'text-amber-600' },
        { title: 'Net / Expected Drawer Balance', value: aggregate.netDrawer, icon: Scale, color: 'text-purple-600' },
    ];

    if (rows.length === 0) return null;

    return (
        <Card className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <div key={stat?.title} className={`${idx === 0 ? '' : 'border-l'} border-r-gray-400 px-2`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
                            <Icon className={`h-5 w-5 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl font-bold">
                                {currencySymbol} {Number(stat.value ?? 0).toFixed(2)}
                            </div>
                        </CardContent>
                    </div>
                );
            })}
        </Card>
    );
}

const formatLabel = (value?: string | null) =>
    value
        ? value
              .toLowerCase()
              .split('_')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ')
        : 'N/A';

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'ACTIVE':
        case 'APPROVED':
            return 'default';
        case 'REVERSED':
        case 'REJECTED':
            return 'destructive';
        default:
            return 'secondary';
    }
};

function TransfersTable({ transfers }: { transfers: TillTransferRecord[] }) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const money = (v?: string | number | null) => `${currencySymbol} ${Number(v ?? 0).toFixed(2)}`;

    if (transfers.length === 0) {
        return (
            <div className="rounded-md border p-3 text-center text-sm text-muted-foreground">
                No transfers.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Till</TableHead>
                        <TableHead>Safe</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Opening Balance</TableHead>
                        <TableHead className="text-right">Closing Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Transferred By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transfers.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell>{t.referenceNumber || 'N/A'}</TableCell>
                            <TableCell>{t.Till?.name || t.Till?.tillNumber || t.tillId}</TableCell>
                            <TableCell>
                                {t.Safe?.name || t.safeId}
                                {t.Safe?.code ? ` (${t.Safe.code})` : ''}
                            </TableCell>
                            <TableCell>{formatLabel(t.type)}</TableCell>
                            <TableCell className="text-right font-medium">{money(t.amount)}</TableCell>
                            <TableCell className="text-right">{money(t.openingBalance)}</TableCell>
                            <TableCell className="text-right">{money(t.closingBalance)}</TableCell>
                            <TableCell>
                                <Badge variant={statusVariant(t.status)}>{formatLabel(t.status)}</Badge>
                            </TableCell>
                            <TableCell>
                                {t.user ? `${t.user.firstName ?? ''} ${t.user.surname ?? ''}`.trim() : 'N/A'}
                            </TableCell>
                            <TableCell>
                                {t.createdAt ? moment(t.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}
                            </TableCell>
                            <TableCell>{t.reason || '-'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}