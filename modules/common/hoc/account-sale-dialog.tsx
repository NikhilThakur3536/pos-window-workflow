import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import moment from 'moment';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
    AccountSaleInvoiceType,
    AccountSalesDetails,
    FilterProps,
    useGetAccountSales,
} from '@/api-queries/point-of-sale/account-sales/account-sales';
import AccountSalesInvoiceDialog from '../point-of-sale/account-sales/invoice/invoice-dialog';

interface AccountSaleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAccountSale: (accountSale: AccountSalesDetails) => void;
    companyDebtorId: string;
    /** Restrict invoice selection to invoices that may receive a price-mismatch credit note. */
    priceMismatchMode?: boolean;
}

export function AccountSaleDialog({
    isOpen,
    onClose,
    onSelectAccountSale,
    companyDebtorId,
    priceMismatchMode = false,
}: AccountSaleDialogProps) {
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

    const [selectedASInModal, setSelectedASInModal] = useState<AccountSalesDetails | null>(null);

    const { data: accountSales, isLoading } = useGetAccountSales({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(companyDebtorId ? { companyDebtorId } : {}),
        isCreditNoteGenerated: false,
    });

    const debtorColumns = [
        {
            key: 'invoiceNumber',
            label: 'Invoice Number',
            className: 'hidden md:table-cell',
            render: (row: AccountSalesDetails) => (
                <div className="space-y-1">
                    <div>{row.invoiceNumber || '--'}</div>
                    {row.isPriceMismatchCreditNoteGenerated ? (
                        <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Price-Mismatch Credit Note Created
                        </span>
                    ) : null}
                </div>
            ),
        },
        {
            key: 'invoiceDate',
            label: 'Invoice Date',
            render: (row: AccountSalesDetails) => {
                const invoiceDate = row.invoiceDate;
                return <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            key: 'name',
            label: 'Name',
            className: 'flex-1',
            render: (row: AccountSalesDetails) => row.name || '--',
        },
        {
            key: 'totalQuantity',
            label: 'Total Products',
            className: 'flex-1',
            render: (row: AccountSalesDetails) => {
                const totalQuantity =
                    row.DebtorInvoicingOrderItems?.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
                return <div>{totalQuantity}</div>;
            },
        },
        {
            key: 'view',
            label: 'View',
            className: 'text-center',
            render: (row: AccountSalesDetails) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onViewInvoice(row)}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
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

    const [printData, setPrintData] = useState<AccountSaleInvoiceType | null>(null);

    const onViewInvoice = (data: AccountSalesDetails) => {
        setPrintData({
            accountSales: data,
            cartItems: data.DebtorInvoicingOrderItems,
            accountNumber: data.CompanyDebtor.accountNumber,
        });
    };

    const onCloseInvoiceDialog = () => {
        setPrintData(null);
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedASInModal(null);
        }
    }, [isOpen]);

    const handleSelectAndClose = () => {
        if (!selectedASInModal) return;
        if (priceMismatchMode && selectedASInModal.canCreatePriceMismatchCredit === false) {
            toast.error('Price-mismatch credit note cannot be created for this invoice.');
            return;
        }
        onSelectAccountSale(selectedASInModal);
        onClose();
    };

    const rows = (accountSales?.data?.rows || []).map((row) => ({
        ...row,
        disabled: priceMismatchMode && row.canCreatePriceMismatchCredit === false,
    }));

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                    <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                        <DialogHeader className="mb-4 p-4 pb-0">
                            <DialogTitle>Select Sale Invoice</DialogTitle>
                            <div className="mt-2 flex items-center gap-2">
                                <Input
                                    placeholder="Search by account, name, cellphone or telephone"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="max-w-sm p-1"
                                />
                                <FilterActionButtons
                                    onApplyFilters={handleApplyFilters}
                                    onClearClick={handleClearSearch}
                                    showClearButton={showClearButton}
                                />
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden px-4">
                            <div className="h-full overflow-y-auto">
                                <ListOnlyTable
                                    columns={debtorColumns}
                                    data={rows}
                                    onRowClick={setSelectedASInModal}
                                    selectedRowKey={selectedASInModal?.id}
                                    rowKeyExtractor={(row) => row.id}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                    totalCount={accountSales?.data?.count}
                                    disabledRows={
                                        priceMismatchMode
                                            ? 'Price-mismatch credit note cannot be created for this invoice.'
                                            : ''
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-between p-4 pt-0">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleSelectAndClose} disabled={!selectedASInModal}>
                                Select Invoice
                            </Button>
                        </DialogFooter>
                    </PageLoader>
                </DialogContent>
            </Dialog>
            {printData && <AccountSalesInvoiceDialog printData={printData} onClose={onCloseInvoiceDialog} />}
        </>
    );
}
