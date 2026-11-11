import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Mail, Phone, Pin, Printer, User } from 'lucide-react';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FilterProps, useGetDebitNotes, DebitNotesDetails, DebitNoteInvoiceType } from '@/api-queries/debit-note';
import DebitNoteInvoiceDialog from './invoice/invoice-dialog';

import { documentPrintPayload, useDocumentPrint, DocumentType } from '@/api-queries/print';
import ConfirmDialog from '@/components/confirm-dialog';

const DebitNote = () => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const systemMode = localStorage.getItem("systemMode");

    const initialFilters = {
        search: '',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });

     const invoicePrint= useDocumentPrint()

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedPrintPayload, setSelectedPrintPayload] = useState<documentPrintPayload | null>(null);

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    const query = useGetDebitNotes({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const { data: debitNote, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const columns: ColumnDef<DebitNotesDetails>[] = [
        {
            accessorKey: 'supplierInvoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>D/Note Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const debitNoteDate = row.original.debitNoteDate;
                return (
                    <>
                        <div>{row.original.debitNoteNumber || 'N/A'}</div>
                        <div>{debitNoteDate ? moment(debitNoteDate).format('Do MMM, YY') : 'N/A'}</div>
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
            accessorKey: 'name',
            header: (data) => <TableHeaderToggle {...data}>Supplier Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const name = `${row?.original?.name}`;
                const email = `${row?.original?.email}`;
                const address = `${row?.original?.address}`;
                const contact = `${row?.original?.telephone}`;
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
                            <Pin className="!h-4 !w-4" /> {address || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {contact || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: 'Total Products',
            cell: ({ row }) => {
                const totalQuantity =
                    row.original.debitNoteItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
                return <div>{totalQuantity}</div>;
            },
        },
        {
            accessorKey: 'totals',
            header: 'Sale Amount',
            cell: ({ row }) => {
                const discount = row.original?.discountAmount;
                const goodsTotal = `${row.original.goodsTotal}`;

                return (
                    <div className="space-y-1">
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Sub Total:</div>
                            <div>
                                {currencySymbol} {(+goodsTotal + discount)?.toFixed(2)}
                            </div>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2">
                            <div>Discount:</div>
                            <div>
                                {currencySymbol} {(+discount)?.toFixed(2)}
                            </div>
                        </div>
                        <Separator />
                        <div className="flex w-full items-center justify-between text-[13px] font-bold">
                            <div>Total:</div>{' '}
                            <div>
                                {currencySymbol} {(+goodsTotal)?.toFixed(2)}
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
                                    onClick={() => {
                                        setSelectedPrintPayload({
                                            documentType: DocumentType.DEBIT_NOTE,
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

    const [printData, setPrintData] = useState<DebitNoteInvoiceType | null>(null);

    const onViewInvoice = (data: DebitNotesDetails) => {
        setPrintData({
            debitNote: data,
            cartItems: data.debitNoteItems,
            accountNumber: data.CompanyCreditor.accountNumber,
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
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex items-center justify-between"></div>

                <div className="item-center my-2 flex w-full justify-between space-y-2">
                    <div className="text-lg font-bold">Debit Note</div>
                </div>

                <DataTable
                    query={query}
                    data={debitNote?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by debit note number"
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

                {printData && <DebitNoteInvoiceDialog printData={printData} onClose={onClose} />}

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

export default DebitNote;
