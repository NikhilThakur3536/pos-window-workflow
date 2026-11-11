import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudAlert, Eye, Mail, Phone, User } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import CashRefundInvoiceDialog from '../invoice/invoice-dialog';
import {
    CashRefundsDetails,
    useGetCashRefunds,
    FilterProps,
    CashRefundInvoiceType,
    useGetCashRefundsOffline,
    getCashRefunds,
} from '@/api-queries/point-of-sale/cash-refund';
import { useNetworkStore } from '@/stores/network.store';
import ExportSheets from '@/components/export-sheets';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';

const ViewCashRefunds = () => {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

    const isOnline = useNetworkStore((state) => state.online);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        search: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    const query = isOnline
        ? useGetCashRefunds({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
          })
        : useGetCashRefundsOffline(false);

    const { data: cashSales, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<CashRefundsDetails>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Invoice No.</TableHeaderToggle>,
            cell: ({ row }) => {
                const id = row.original.id;
                const invoiceDate = row.original.invoiceDate || row.original.createdAt;
                return (
                    <>
                        <div>#INV{id?.slice(0, 8)?.toUpperCase() || 'N/A'}</div>
                        <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>
                    </>
                );
            },
        },
        {
            accessorKey: 'SalesRepresentative',
            header: 'Representative',
            cell: ({ row }) => {
                const salesRepresentative = row?.original?.SalesRepresentative;

                return salesRepresentative ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {salesRepresentative?.name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {salesRepresentative?.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {salesRepresentative?.cellNumber || 'N/A'}
                        </div>
                    </div>
                ) : (
                    'N/A'
                );
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Total Products',
            cell: ({ row }) => {
                const totalQuantity =
                    row.original.PosCashRefundItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

                return <div>{totalQuantity}</div>;
            },
        },
        ...(isOnline
            ? []
            : [
                  {
                      accessorKey: 'notSynced',
                      header: 'Sync Status',
                      cell: ({ row }: any) =>
                          row.getValue('notSynced') ? (
                              <div className="flex items-center gap-1 text-red-700">
                                  <CloudAlert /> Not Synced
                              </div>
                          ) : (
                              <div className="flex items-center gap-1 text-green-700">
                                  <Cloud /> Synced
                              </div>
                          ),
                  },
              ]),
        {
            accessorKey: 'tenderValue',
            header: 'Refunded Amt.',
            cell: ({ row }) => {
                const totalPrice = +row.original.tenderValue || 0;

                return (
                    <div className="flex w-full items-center justify-between text-[13px] font-bold">
                        <div>
                            {currencySymbol} {totalPrice.toFixed(2)}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'refundReason',
            header: 'Reason',
            cell: ({ row }) => <div>{row.original.refundReason}</div>,
        },
        {
            id: 'view',
            header: () => <div className="text-center">View</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        // onClick={(e) => onViewInvoice(row.original)}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const [printData, setPrintData] = useState<CashRefundInvoiceType | null>(null);

    const onViewInvoice = (data: CashRefundsDetails) => {
        setPrintData({
            cashRefund: data,
            cartItems: data.PosCashRefundItems,
            paymentMethod: data?.PosTenderType || '',
            invoiceDate: data?.createdAt,
        });
    };

    const onClose = () => {
        setPrintData(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Export

    async function downloadCSV() {
        getCashRefunds({
            isCsv: true,
            csvLabel: 'Cash_Sales',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        });
    }

    // Store Filters

    const selectedDebtor = debtors?.find((data) => data?.id === appliedFilters?.companyDebtorId);

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="item-center mb-2 flex w-full justify-between space-y-2">
                    <div className="text-lg font-bold">
                        Cash Refunds{' '}
                        {selectedDebtor ? `for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})` : ''}
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by cash refund number"
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-[320px]"
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

                        <FilterActionButtons
                            onApplyFilters={handleApplyFilters}
                            onClearClick={handleClearSearch}
                            showClearButton={showClearButton}
                        />

                        <ExportSheets downloadCSV={downloadCSV} />
                    </div>
                </div>

                <DataTable
                    query={query}
                    data={cashSales?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />

                {printData && <CashRefundInvoiceDialog printData={printData} onClose={onClose} />}
            </div>
        </PageLoader>
    );
};

export default ViewCashRefunds;
