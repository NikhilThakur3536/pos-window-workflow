import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudAlert, Eye, Mail, Phone, Printer, User } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { Separator } from '@/components/ui/separator';
import CashSaleInvoiceDialog from '../invoice/invoice-dialog';
import {
    CashSalesDetails,
    useGetCashSales,
    FilterProps,
    CashSaleInvoiceType,
    useGetCashSalesOffline,
    getCashSales,
} from '@/api-queries/point-of-sale/cash-sales';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNetworkStore } from '@/stores/network.store';
import ExportSheets from '@/components/export-sheets';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';

type PrintDataState = CashSaleInvoiceType & { isDuplicate?: boolean };

const ViewCashSales = () => {
    const isOnline = useNetworkStore((state) => state.online);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';
    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;

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
        ? useGetCashSales({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
          })
        : useGetCashSalesOffline(false);

    const { data: cashSales, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const [printData, setPrintData] = useState<PrintDataState | null>(null);

    const onViewInvoice = (data: CashSalesDetails, printType?: 'ORIGINAL' | 'DUPLICATE') => {
        setPrintData({
            cashSales: data,
            cartItems: data.PosCashSaleOrderItems,
            paymentMethod: data?.PosTenderType || '',
            debtor: data?.PosDebtor || null,
            appliedDiscount: {
                id: data.voucherId ? data.voucherId : data.couponId ? data.couponId : '',
                type: data.voucherId ? data.Voucher?.type : data.couponId ? data.Coupon?.type : '',
                value: data?.voucherId ? data.voucherAmount || 0 : data?.couponId ? data?.couponAmount || 0 : 0,
                description: data.voucherId ? data.Voucher?.description : data.couponId ? data.Coupon?.description : '',
            },
            invoiceDate: data?.createdAt,
            // only true when the DUPLICATE dropdown option was explicitly chosen —
            // plain Eye-button view and ORIGINAL both stay false
            isDuplicate: printType === 'DUPLICATE',
        });
    };

    const onClose = () => {
        setPrintData(null);
    };

    const columns: ColumnDef<CashSalesDetails>[] = [
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
                    row.original.PosCashSaleOrderItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

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
            accessorKey: 'totals',
            header: 'Sale Amount',
            cell: ({ row }) => {
                const manualDiscount = row.original?.manualDiscount || 0;
                const couponAmount = row.original?.couponAmount;
                const coupon = row?.original?.Coupon?.description;
                const voucherAmount = row.original?.voucherAmount;
                const totalPrice = row.original.totalPrice;
                const voucher = row?.original?.Voucher?.description;
                const loyaltyDiscount = row.original.loyaltyDiscountAmount || 0;
                const promotionalDiscount = row.original?.promotionDiscountAmount || 0;

                return (
                    <div className="space-y-1">
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Sub Total:</div>
                            <div>
                                {currencySymbol} {(+totalPrice).toFixed(2)}
                            </div>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Discount:</div>
                            <div>
                                - {currencySymbol} {manualDiscount?.toFixed(2)}
                            </div>
                        </div>
                        {promotionalDiscount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div className="max-w-[160px] whitespace-normal">{row.original.promotionName}:</div>
                                <div>
                                    - {currencySymbol} {promotionalDiscount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}
                        {couponAmount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div>{coupon || 'Coupon Discount'}:</div>
                                <div>
                                    - {currencySymbol} {couponAmount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}
                        {voucherAmount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div>{voucher || 'Voucher Discount'}:</div>
                                <div>
                                    - {currencySymbol} {voucherAmount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}
                        {loyaltyDiscount ? (
                            <div className="flex w-full items-center justify-between gap-2">
                                <div>Loyalty Discount:</div>
                                <div>
                                    - {currencySymbol} {loyaltyDiscount?.toFixed(2)}
                                </div>
                            </div>
                        ) : null}
                        <Separator />
                        <div className="flex w-full items-center justify-between text-[13px] font-bold">
                            <div>Total:</div>{' '}
                            <div>
                                {currencySymbol}{' '}
                                {(
                                    +totalPrice -
                                    manualDiscount -
                                    (promotionalDiscount || 0) -
                                    (couponAmount || 0) -
                                    (voucherAmount || 0) -
                                    (loyaltyDiscount || 0)
                                ).toFixed(2)}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'view',
            header: () => <div className="text-center">View</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewInvoice(row.original)}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Print"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {(['ORIGINAL', 'DUPLICATE'] as const).map((item) => (
                                <DropdownMenuItem key={item} onClick={() => onViewInvoice(row.original, item)}>
                                    {item}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
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

    // Export

    async function downloadCSV() {
        getCashSales({
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
                        Cash Sales{' '}
                        {selectedDebtor ? `for ${selectedDebtor?.name} (${selectedDebtor?.accountNumber})` : ''}
                    </div>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by order or invoice number"
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

                {printData && (
                    <CashSaleInvoiceDialog
                        printData={printData}
                        isDuplicate={printData.isDuplicate}
                        onClose={onClose}
                    />
                )}
            </div>
        </PageLoader>
    );
};

export default ViewCashSales;