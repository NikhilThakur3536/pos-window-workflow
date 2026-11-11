import {
    Barcode,
    Calendar,
    Clock,
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
} from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { useGetLoyaltyTransactions, FilterProps, LoyaltyTransactionDetails } from '@/api-queries/loyalty/transactions';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import moment from 'moment';

const LoyaltyTransactions = () => {
    const initialFilters = {
        search: '',
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

    const query = useGetLoyaltyTransactions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const { data: loyaltyTransactions, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<LoyaltyTransactionDetails>[] = [
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
                        <div className="flex items-center gap-2">
                            <Clock className="!h-4 !w-4" /> {date ? moment(date).format('hh:mm A') : 'N/A'}
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

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">
                                {row.original.transactionType === 'REDEEM' ? 'Redeemed' : 'Earned'} :
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
                    data={loyaltyTransactions?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by user, membership & card name, card number"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>
                    </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default LoyaltyTransactions;
