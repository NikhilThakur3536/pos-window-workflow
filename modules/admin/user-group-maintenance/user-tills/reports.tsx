import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { Download, User, CreditCard, DollarSign, Lock, RotateCcw, Vault, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    type UserTillReportDetails,
    type FilterProps,
    getUserTillReports,
    useGetReports,
    GetReportsResponse,
} from '@/api-queries/user/reports/till-reports';
import { type ColumnDef } from '@tanstack/react-table';
import TableDateFilter from '@/components/table/table-date-filter';
import { useAuthUser } from '@/stores/auth-user.store';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import TillToSafeTransferForm from './safe-transfer-form';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';

const UsersTillReport = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    const initialFilters = {
        fromDate: '',
        toDate: '',
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
    } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetReports({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
        ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });

    const { data: reports, isLoading } = query;
    // const totalRowCount = query?.data?.data?.count || 0;
    const totalRowCount = query?.data?.count || 0;

    const columns: ColumnDef<UserTillReportDetails>[] = [
        {
            accessorKey: 'cashierName',
            header: 'Till Details',
            cell: ({ row }) => {
                const cashierName = row.original.cashierName;
                const tillName = row.original.tillName;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {cashierName}
                        </div>
                        <div className="flex items-center gap-2">
                            <Vault className="!h-4 !w-4" /> {tillName}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'transactionCount',
            header: 'Amounts',
            cell: ({ row }) => {
                const cashSales = row.original.totalCashSales;
                const refunds = row.original.totalRefunds;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span>Cash Sales: </span>
                            {currencySymbol} {cashSales}
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Refunds: </span> {currencySymbol} {refunds}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalDropsToSafe',
            header: () => <div className="text-center">Drops to Safe Count</div>,
            cell: ({ row }) => {
                const totalDropsToSafe = row.original.totalDropsToSafe;

                return <div className="text-center">{totalDropsToSafe}</div>;
            },
        },
        {
            accessorKey: 'transactionCount',
            header: 'Transaction Count',
            cell: ({ row }) => {
                const count = row.original.transactionCount;

                return <div className="space-y-1">{count}</div>;
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={(e) => onCashTransfer(row.original)}
                        disabled={!row.original.totalCashSales}
                    >
                        <Send /> Transfer to Safe
                    </Button>
                </div>
            ),
        },
    ];

    const [tillData, setTillData] = useState<UserTillReportDetails | null>(null);

    const onClose = () => {
        setTillData(null);
    };

    const onCashTransfer = (data: UserTillReportDetails) => {
        setTillData(data);
    };

    async function downloadCSV() {
        getUserTillReports({
            isCsv: true,
            ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
            ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Store Filters

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    // data={reports?.data?.rows || []}
                    data={reports?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    {reports?.summary ? (
                        <>
                            <CashSummaryCards summary={reports?.summary} />

                            <Separator className="my-4" />
                        </>
                    ) : null}
                    <div className="text-lg font-bold">
                        User Till Report{' '}
                        {selectedDebtor ? `for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})` : ''}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by user, membership & card name, card number"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />

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

                            <TableDateFilter filters={filters} setFilters={setFilters} />

                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <Button onClick={downloadCSV} variant={'outline'} size={'sm'}>
                            <Download /> Download
                        </Button>
                    </div>
                </DataTable>
            </div>

            {!!tillData && <TillToSafeTransferForm open={!!tillData} onClose={onClose} tillData={tillData} />}
        </PageLoader>
    );
};

export default UsersTillReport;

export function CashSummaryCards({ summary }: { summary: GetReportsResponse['summary'] }) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const stats = [
        {
            title: 'Total Cash Sales',
            value: summary.totalCashSales,
            icon: DollarSign,
            color: 'text-green-600',
        },
        {
            title: 'Drops to Safe',
            value: summary.totalDropsToSafe,
            icon: Vault,
            color: 'text-blue-600',
        },
        {
            title: 'Total Refunds',
            value: summary.totalRefunds,
            icon: RotateCcw,
            color: 'text-red-600',
        },
        {
            title: 'Cash in Tills',
            value: summary.totalCashCurrentlyInTills,
            icon: CreditCard,
            color: 'text-purple-600',
        },
    ];
    return (
        <Card className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                    <div key={stat?.title} className={`${idx === 0 ? '' : 'border-l'} border-r-gray-400`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                            <Icon className={`h-6 w-6 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {currencySymbol} {stat.value}
                            </div>
                        </CardContent>
                    </div>
                );
            })}
        </Card>
    );
}
