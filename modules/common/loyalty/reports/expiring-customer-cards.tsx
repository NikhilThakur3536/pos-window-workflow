import { DataTable } from '@/components/dynamic-table/data-table';
import { Button } from '@/components/ui/button';
import { Download, User, CreditCard, Phone, QrCode, Star, Barcode, Wallet, Mail } from 'lucide-react';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import {
    type FilterProps,
    type ExpiringCustomerCardsType,
    getReports,
    useGetReports,
} from '@/api-queries/loyalty/reports';
import { type ColumnDef } from '@tanstack/react-table';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import TableDateFilter from '@/components/table/table-date-filter';

const ExpiringCustomerCards = () => {
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
        reportUrl: 'expiringCustomerCards',
        label: 'EXPIRING_CUSTOMER_CARDS',
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

    const columns: ColumnDef<ExpiringCustomerCardsType>[] = [
        {
            accessorKey: 'customer',
            header: 'Customer Details',
            cell: ({ row }) => {
                const customer = row.original.customer;
                const name = customer.name || 'N/A';
                const email = customer.email || 'N/A';
                const contact = customer.phone || 'N/A';
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
            },
        },
        {
            accessorKey: 'loyaltyCard',
            header: 'Card Details',
            cell: ({ row }) => {
                const card = row.original.loyaltyCard;
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
                const membership = row.original.membership;
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
                const availablePoints = row.original.availablePoints;
                const issueDate = row.original.issueDate;
                const expiryDate = row.original.expiryDate;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="font-semibold">Available :</div>
                            <div className="font-bold text-green-700">{availablePoints || 0}</div>
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
        {
            accessorKey: 'isExpired',
            header: 'Expiring Status',
            cell: ({ row }) => {
                const isExpired = row.original.isExpired;
                const expiryDate = row.original.expiryDate;

                let displayText = '';

                if (isExpired) {
                    displayText = 'Expired';
                } else {
                    const daysRemaining = moment(expiryDate).diff(moment(), 'days');
                    displayText = `Expiring in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                }

                return (
                    <Badge className={isExpired ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>
                        {displayText}
                    </Badge>
                );
            },
        },
    ];

    async function downloadCSV() {
        getReports({
            reportUrl: 'expiringCustomerCards',
            label: 'EXPIRING_CUSTOMER_CARDS',
            payload: {
                isCsv: true,
                ...(appliedFilters?.fromDate ? { fromDate: appliedFilters?.fromDate } : {}),
                ...(appliedFilters?.toDate ? { toDate: appliedFilters?.toDate } : {}),
                ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
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

                        <Button onClick={downloadCSV} variant={'outline'} size={'sm'}>
                            <Download /> Download
                        </Button>
                    </div>
                </DataTable>
            </div>
        </PageLoader>
    );
};

export default ExpiringCustomerCards;
