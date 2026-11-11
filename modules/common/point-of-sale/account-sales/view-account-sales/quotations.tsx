import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudAlert, CreditCard, Eye, Mail, Phone, Printer, User } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    QuotationsDetails,
    useGetQuotations,
    FilterProps,
    useGetQuotationsOffline,
    QuotationInvoiceType,
    getQuotations,
} from '@/api-queries/point-of-sale/account-sales/quotations';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { Separator } from '@/components/ui/separator';
import AccountSalesInvoiceDialog from '../invoice/invoice-dialog';
import { useNetworkStore } from '@/stores/network.store';
import ExportSheets from '@/components/export-sheets';
import { documentPrintPayload, useDocumentPrint, DocumentType } from '@/api-queries/print';
import ConfirmDialog from '@/components/confirm-dialog';

const SEARCH_DEBOUNCE_MS = 300;

const ViewAccountSalesQuotations = () => {
    const systemMode = localStorage.getItem("systemMode");
    const isOnline = useNetworkStore((state) => state.online);
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const companyId = useAuthUser((state) => state?.company?.id);

    const initialFilters = {
        search: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    // Debounced search value (300ms) used for the API query and CSV export
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            const nextSearch = (filters.search || '').trim();
            setDebouncedSearch((prev) => {
                if (prev !== nextSearch) {
                    // Go back to the first page whenever the search term changes
                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                }
                return nextSearch;
            });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [filters.search]);

         const invoicePrint= useDocumentPrint()


    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPrintPayload, setSelectedPrintPayload] = useState<documentPrintPayload | null>(null);

    const query = isOnline
        ? useGetQuotations({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(debouncedSearch ? { search: debouncedSearch } : {}),
          })
        : useGetQuotationsOffline(false);

    const { data: quotations, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<QuotationsDetails>[] = [
        {
            accessorKey: 'invoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>Quotation Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const invoiceDate = row.original.quotationDate;
                return (
                    <>
                        <div>{row.getValue('invoiceNumber') || 'N/A'}</div>
                        <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>
                    </>
                );
            },
        },

        {
            accessorKey: 'orderNumber',
            header: (data) => <TableHeaderToggle {...data}>Order No.</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.getValue('orderNumber') || 'N/A'}</div>,
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
            accessorKey: 'name',
            header: (data) => <TableHeaderToggle {...data}>Customer Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const name = `${row.original.name}`;
                const email = `${row.original.email}`;
                const address = `${row.original.address}`;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {address || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'accountNumber',
            header: (data) => <TableHeaderToggle {...data}>Account Number</TableHeaderToggle>,
            cell: ({ row }) => {
                const accountNo = `${row.original.CompanyDebtor?.accountNumber || 'N/A'}`;
                return (
                    <div className="flex items-center gap-2">
                        <CreditCard className="!h-4 !w-4" />
                        {accountNo}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Total Products',
            cell: ({ row }) => {
                const totalQuantity =
                    row.original.priceQuotationItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
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
            header: 'Quotations',
            cell: ({ row }) => {
                const discount = row.original?.discountAmount;
                const goodsTotal = row.original.goodsTotal;
                const promotionalDiscount = row.original?.promotionDiscountAmount || 0;

                return (
                    <div className="space-y-1">
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Sub Total:</div>
                            {currencySymbol} {(+goodsTotal + discount + promotionalDiscount)?.toFixed(2)}
                        </div>
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Discount:</div>
                            <div>
                                {currencySymbol} {discount?.toFixed(2)}
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

                        <Separator />
                        <div className="flex w-full items-center justify-between text-[13px] font-bold">
                            <div>Total:</div>{' '}
                            <div>
                                {currencySymbol} {goodsTotal?.toFixed(2)}
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
                    {/* <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (row.original.pdfUrl) {
                                window.open(row.original.pdfUrl, "_blank", "noopener,noreferrer");
                            }
                        }}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                        disabled={!row.original.pdfUrl}
                    >
                        <Eye className="h-4 w-4" />
                    </Button> */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            if (systemMode === "offline") {
                                onViewInvoice(row.original);
                            } else if (row.original.pdfUrl) {
                                window.open(
                                    row.original.pdfUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                );
                            }
                        }}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                        disabled={systemMode !== "offline" && !row.original.pdfUrl}
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
                                <DropdownMenuItem
                                    key={item}
                                    onClick={async() => {

                                        setSelectedPrintPayload({
                                            documentType: DocumentType.QUOTATION,
                                            documentId: row?.original?.id,
                                            printType: item,
                                        });
                                        setIsConfirmOpen(true);
                                       
                                        
      
                                    }}
                                >
                                    {item}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    const [printData, setPrintData] = useState<QuotationInvoiceType | null>(null);

    const onViewInvoice = (data: QuotationsDetails) => {
        setPrintData({
            accountSales: data,
            cartItems: data.priceQuotationItems,
            accountNumber: data.CompanyDebtor?.accountNumber,
        });
    };

    const onClose = () => {
        setPrintData(null);
    };

       const handleConfirmPrint = async () => {
        if (!selectedPrintPayload) return;
        try {
            const blob = await invoicePrint.mutateAsync(selectedPrintPayload);
            console.log(blob, "see blob");
            const url = URL.createObjectURL(blob);
            const iframe = document.createElement('iframe');

            iframe.style.display = 'none';
            iframe.src = url;

            document.body.appendChild(iframe);

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            };
        } catch (error) {
            console.error("Print error:", error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
        // Clear immediately instead of waiting for the debounce delay
        setDebouncedSearch('');
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
        // Apply immediately (skip the debounce delay) when the user explicitly confirms
        const nextSearch = (filters.search || '').trim();
        setDebouncedSearch(nextSearch);
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    // Export

    async function downloadCSV() {
        getQuotations({
            isCsv: true,
            csvLabel: 'Price_Quotations',
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex items-center justify-between"></div>

                <div className="item-center my-2 flex w-full justify-between space-y-2">
                    <div className="text-lg font-bold">Quotations</div>

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search by order or quotation number"
                            value={filters.search || ''}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            onKeyDown={handleKeyDown}
                            className="w-[320px]"
                        />

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
                    data={quotations?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                />

                {printData && <AccountSalesInvoiceDialog printData={printData} onClose={onClose} />}

                   <ConfirmDialog
                                    open={isConfirmOpen}
                                    setOpen={setIsConfirmOpen}
                                    title={`Are you sure you want to print ${selectedPrintPayload?.printType} Document`}
                                    description="This action will print the selected debit note document."
                                    onConfirm={handleConfirmPrint}
                                />
            </div>
        </PageLoader>
    );
};

export default ViewAccountSalesQuotations;