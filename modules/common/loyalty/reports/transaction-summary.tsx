import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import {
    Barcode,
    Calendar,
    CreditCard,
    Gift,
    HandCoins,
    Mail,
    Phone,
    QrCode,
    Star,
    Tags,
    User,
    Wallet,
    Download,
} from 'lucide-react';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    type TransactionSummaryType,
    type FilterProps,
    getReports,
    useGetReports,
} from '@/api-queries/loyalty/reports';
import { type ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import TableDateFilter from '@/components/table/table-date-filter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TransactionSummary = () => {
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
        reportUrl: 'transactionSummary',
        label: 'TRANSACTION_SUMMARY',
        payload: {
            limit: pagination.pageSize,
            offset: pagination.pageIndex * pagination.pageSize,
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
            ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
        },
    });

    const { data: reports, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const pointsComparisonReport = useGetReports({
        reportUrl: 'pointsComparison',
        label: 'POINTS_COMPARISON',
        payload: {},
    })?.data?.data?.rows;

    const earn = Math.floor(pointsComparisonReport?.find((item) => item.type === 'EARN')?.totalPoints || 0);
    const redeem = Math.floor(pointsComparisonReport?.find((item) => item.type === 'REDEEM')?.totalPoints || 0);

    const columns: ColumnDef<TransactionSummaryType>[] = [
        {
            accessorKey: 'referenceType',
            header: 'Reference Type',
            cell: ({ row }) => {
                const type = row.original.referenceType;

                return <div className="capitalize">{type?.replaceAll('_', ' ')?.toLowerCase()}</div>;
            },
        },
        {
            accessorKey: 'transactionType',
            header: 'Points',
            cell: ({ row }) => {
                const type = row.original.transactionType;
                const date = row.original.transactionDate;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {type?.toLowerCase()?.includes('earn') ? (
                                <HandCoins className="!h-4 !w-4" />
                            ) : type?.toLowerCase()?.includes('redeem') ? (
                                <Gift className="!h-4 !w-4" />
                            ) : (
                                <Tags className="!h-4 !w-4" />
                            )}
                            {type}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="!h-4 !w-4" /> {date ? moment(date).format('Do MMM, YY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'user',
            header: 'User Details',
            cell: ({ row }) => {
                if (row.original.customerLoyaltyCardId) {
                    const customer = row?.original?.customerLoyaltyCard?.customer;
                    const name = customer?.name || 'N/A';
                    const email = customer?.email || 'N/A';
                    const contact = customer?.phone || 'N/A';
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <User className="!h-4 !w-4" />
                                {name}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="!h-4 !w-4" /> {contact}
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="!h-4 !w-4" /> {email}
                            </div>
                        </div>
                    );
                } else {
                    const debtor = row?.original?.debtorLoyaltyCard?.CompanyDebtor;
                    const name = debtor?.name || 'N/A';
                    const accountNumber = debtor?.accountNumber || 'N/A';
                    const contact = debtor?.contact || 'N/A';
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <User className="!h-4 !w-4" />
                                {name}
                            </div>
                            <div className="flex items-center gap-2">
                                <CreditCard className="!h-4 !w-4" /> {accountNumber}
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="!h-4 !w-4" /> {contact}
                            </div>
                        </div>
                    );
                }
            },
        },
        {
            accessorKey: 'loyaltyCard',
            header: 'Card Details',
            cell: ({ row }) => {
                const loyaltyCard = row.original.debtorLoyaltyCardId
                    ? row.original.debtorLoyaltyCard
                    : row.original.customerLoyaltyCard;
                const card = loyaltyCard.loyaltyCard;
                const name = card.name;
                const cardNumber = card.cardNumber;
                const barcode = card.barcode || 'N/A';

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Wallet className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <CreditCard className="!h-4 !w-4" /> {cardNumber}
                        </div>
                        <div className="flex items-center gap-2">
                            <Barcode className="!h-4 !w-4" /> {barcode}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'membership',
            header: 'Membership Details',
            cell: ({ row }) => {
                const loyaltyCard = row.original.debtorLoyaltyCardId
                    ? row.original.debtorLoyaltyCard
                    : row.original.customerLoyaltyCard;
                const membership = loyaltyCard.membership;
                const name = membership?.name;
                const code = membership?.code;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Star className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <QrCode className="!h-4 !w-4" /> {code}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'availablePoints',
            header: 'Points',
            cell: ({ row }) => {
                const loyaltyCard = row.original.debtorLoyaltyCardId
                    ? row.original.debtorLoyaltyCard
                    : row.original.customerLoyaltyCard;
                const availablePoints = row.original.points;
                const issueDate = loyaltyCard.issueDate;
                const expiryDate = loyaltyCard.expiryDate;
                const type = row.original.transactionType;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">
                                {type?.toLowerCase()?.includes('earn') ? 'Earned' : 'Redeemed'} :
                            </div>
                            <div className="font-bold text-green-700">{availablePoints || '0.00'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Issue Date :</div>
                            {issueDate ? moment(issueDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Expiry Date :</div>
                            {expiryDate ? moment(expiryDate).format('DD/MM/YYYY') : 'N/A'}
                        </div>
                    </div>
                );
            },
        },
    ];

    async function downloadCSV() {
        getReports({
            reportUrl: 'transactionSummary',
            label: 'TRANSACTION_SUMMARY',
            payload: {
                isCsv: true,
                ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
                ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
                ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
            },
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

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={reports?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <Card className="w-full border border-gray-200 !p-0 shadow-sm">
                        <CardContent className="space-y-2 p-4">
                            <div className="flex flex-wrap items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                                            <HandCoins className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500">Total Earned</p>
                                            <p className="text-base font-bold text-green-700">{earn} points</p>
                                        </div>
                                    </div>

                                    <div className="hidden h-8 w-[1px] bg-gray-200 sm:block" />

                                    <div className="flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                                            <Gift className="h-5 w-5 text-red-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500">Total Redeemed</p>
                                            <p className="text-base font-bold text-red-700">{redeem} points</p>
                                        </div>
                                    </div>
                                </div>

                                <Badge
                                    className={cn(
                                        'ml-auto text-xs font-semibold',
                                        earn > redeem ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                                    )}
                                >
                                    {earn > redeem
                                        ? `${((redeem / earn) * 100).toFixed(2)}% redeemed`
                                        : 'No redemptions yet'}
                                </Badge>
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

                                    <TableDateFilter filters={filters} setFilters={setFilters} />

                                    <FilterActionButtons
                                        onApplyFilters={handleApplyFilters}
                                        onClearClick={handleClearSearch}
                                        showClearButton={showClearButton}
                                    />
                                </div>

                                <div>
                                    <Button onClick={downloadCSV} variant={'outline'} size={'sm'}>
                                        <Download /> Download
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default TransactionSummary;
