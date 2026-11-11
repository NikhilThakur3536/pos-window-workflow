import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Mail, Phone, Plus, User, FileSymlink, Pin, Printer } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import CreditNoteForm from './credit-note-form';
import { FilterProps, useGetCreditNotes, CreditNotesDetails, CreditNoteInvoiceType } from '@/api-queries/credit-note';
import CreditNoteInvoiceDialog from './invoice/invoice-dialog';
import { useDebtorList } from '@/api-queries/debtor';
import SelectPopover from '@/components/select-popover';
import DebtorAllocationForm from '../debtors/allocations/debtor-allocation-form';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { documentPrintPayload, useDocumentPrint, DocumentType } from '@/api-queries/print';
import ConfirmDialog from '@/components/confirm-dialog';

const CreditNote = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const systemMode = localStorage.getItem("systemMode");

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';
    const [selectedItem, setSelectedItem] = useState<CreditNotesDetails | null>(null);
    const [isDebtorAllocationOpen, setIsDebtorAllocationOpen] = useState(false);

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

    const query = useGetCreditNotes({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
    });

    const { data: creditNotes, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;

    const debtorList = useDebtorList({})?.data?.data?.rows;

    const columns: ColumnDef<CreditNotesDetails>[] = [
        {
            accessorKey: 'supplierInvoiceNumber',
            header: (data) => <TableHeaderToggle {...data}>C/Note Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const creditNoteDate = row.original.creditNoteDate;
                return (
                    <>
                        <div>{row.original.creditNoteNumber || 'N/A'}</div>
                        <div>{creditNoteDate ? moment(creditNoteDate).format('Do MMM, YY') : 'N/A'}</div>
                        {row.original.creditNoteType === 'PRICE_MISMATCH' ? (
                            <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                Price Mismatch
                            </span>
                        ) : null}
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
            header: (data) => <TableHeaderToggle {...data}>Store / Debtor Details</TableHeaderToggle>,
            cell: ({ row }) => {
                const debtor = row?.original?.CompanyDebtor;
                const debtorRecord = debtorList?.find((d) => d?.id === debtor?.id);
                const debtorType = debtorRecord?.companyDebtorType;
                const isStore = debtorType === 'COMPANY_OWNED';
                const name = debtor?.name;
                const email = debtor?.emailAddress;
                const address = [debtor?.address1, debtor?.address2, debtor?.address3, debtor?.address4]
                    .filter(Boolean)
                    .join(', ');
                const contact = debtor?.telephoneNumberOne || debtor?.cellphoneNumber;
                return (
                    <div className="space-y-1">
                        {debtorType ? (
                            <Badge
                                className={`text-xs ${
                                    isStore ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                }`}
                            >
                                {isStore ? 'Store' : 'Debtor'}
                            </Badge>
                        ) : null}
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
                    row.original.creditNoteItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
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
        // {
        //     id: 'view',
        //     header: () => <div className="text-center">View</div>,
        //     cell: ({ row }) => (
        //         <div className="flex items-center justify-center gap-1">
        //             <Button
        //                 variant="ghost"
        //                 size="sm"
        //                 onClick={(e) => onViewInvoice(row.original)}
        //                 className="h-8 w-8 p-0"
        //                 title="View Invoice"
        //             >
        //                 <Eye className="h-4 w-4" />
        //             </Button>

        //             {row.original.unallocatedAmount > 0 && (
        //                 <Button
        //                     variant="ghost"
        //                     size="sm"
        //                     onClick={(e) => {
        //                         if (
        //                             hasPermission(userGroupPermissions, SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code, [
        //                                 SYSTEM_PERMISSIONS.CREATE,
        //                             ])
        //                         ) {
        //                             e.preventDefault();
        //                             setSelectedItem(row.original);
        //                             setIsDebtorAllocationOpen(true);
        //                         } else {
        //                             setIsPermissionDeniedOpen(true);
        //                             return;
        //                         }
        //                     }}
        //                     title="Allocate Receipt"
        //                     className="h-8 w-8 p-0 text-green-700 hover:bg-green-50 hover:text-green-500"
        //                 >
        //                     <FileSymlink className="h-4 w-4" />
        //                 </Button>
        //             )}
        //         </div>
        //     ),
        // },
        {
            id: 'view',
            header: () => <div className="text-center">View</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
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
                                            documentType: DocumentType.CREDIT_NOTE,
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

                    {row.original.unallocatedAmount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.DEBTORS.ALLOCATIONS.code,
                                        [SYSTEM_PERMISSIONS.CREATE]
                                    )
                                ) {
                                    e.preventDefault();
                                    setSelectedItem(row.original);
                                    setIsDebtorAllocationOpen(true);
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                            title="Allocate Receipt"
                            className="h-8 w-8 p-0 text-green-700 hover:bg-green-50 hover:text-green-500"
                        >
                            <FileSymlink className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    const [printData, setPrintData] = useState<CreditNoteInvoiceType | null>(null);

    const onViewInvoice = (data: CreditNotesDetails) => {
        setPrintData({
            creditNote: data,
            cartItems: data.creditNoteItems,
            accountNumber: data.CompanyDebtor.accountNumber,
         
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

    const [open, setOpen] = useState(false);

    const onAddData = () => {
        setOpen(true);
    };

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            {open ? (
                <CreditNoteForm onClose={() => setOpen(false)} />
            ) : (
                <div className="space-y-4 px-2">
                    <div className="flex items-center justify-between"></div>

                    <div className="item-center my-2 flex w-full justify-between space-y-2">
                        <div className="text-lg font-bold">Credit Notes</div>
                    </div>

                    <DataTable
                        query={query}
                        data={creditNotes?.data?.rows || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="mt-2 flex items-center justify-between">
                            <div className="flex w-full items-center gap-2">
                                <Input
                                    placeholder="Search by credit note number"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="!max-w-sm"
                                />

                                {debtorList && (
                                    <SelectPopover
                                        title="Debtor"
                                        options={debtorList?.map((debtor) => ({
                                            value: debtor?.id,
                                            label: `${debtor?.name} ( ${debtor?.accountNumber} )`,
                                        }))}
                                        selectedValue={filters.companyDebtorId}
                                        onSelect={(val) => setFilters({ ...filters, companyDebtorId: val })}
                                    />
                                )}

                                <FilterActionButtons
                                    onApplyFilters={handleApplyFilters}
                                    onClearClick={handleClearSearch}
                                    showClearButton={showClearButton}
                                />
                            </div>

                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.POINT_OF_SALE.CREDIT_NOTES.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        onAddData();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                             Create Credit Note   
                            </Button>
                        </div>
                    </DataTable>

                    {isDebtorAllocationOpen && selectedItem && (
                        <DebtorAllocationForm
                            open={isDebtorAllocationOpen}
                            onClose={() => setIsDebtorAllocationOpen(false)}
                            preDefinedValues={{
                                type: 'CREDIT_NOTE',
                                creditNote: selectedItem,
                            }}
                            key={selectedItem?.id}
                        />
                    )}

                    <ViewAccessDeniedDialog
                        open={isPermissionDeniedOpen}
                        onClose={onClosePermissionDenied}
                        options={{
                            description: `You don't have access to ${isDebtorAllocationOpen ? 'allocate credit note' : 'add/update the credit note'}.`,
                        }}
                    />

                    {printData && <CreditNoteInvoiceDialog printData={printData} onClose={onClose} />}

                    <ConfirmDialog
                                        open={isConfirmOpen}
                                        setOpen={setIsConfirmOpen}
                                        title={`Are you sure you want to print ${selectedPrintPayload?.printType} Document`}
                                        description="This action will print the selected debit note document."
                                        onConfirm={handleConfirmPrint}
                                    />
                </div>
            )}
        </PageLoader>
    );
};

export default CreditNote;