import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import {
    useGetUserEnquiries,
    FilterProps,
    UserEnquiryDetails,
    getUserEnquiries,
    EnquiriesInvoiceFilterProps,
} from '@/api-queries/enquiries';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import ExportSheets from '@/components/export-sheets';
import SelectPopover from '@/components/select-popover';
import { useDebtorList } from '@/api-queries/debtor';
import { useAuthUser } from '@/stores/auth-user.store';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useState } from 'react';
import EnquiriesInvoice from './enquiries-invoice';
import { useCreditorList } from '@/api-queries/creditor';

export type UserEnquiriesProps = {
    userType: FilterProps['userType'];
};

const UserEnquiries = ({ userType }: UserEnquiriesProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        companyDebtorId: '',
        userType,
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

    const query = useGetUserEnquiries({
        userType,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
        ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters?.companyCreditorId } : {}),
    });
    const { data: userEnquiries, isLoading } = query;

    const totalRowCount = query?.data?.data?.count || 0;

    const debtors = useDebtorList({})?.data?.data?.rows;
    const creditors = useCreditorList({})?.data?.data?.rows;

    const columns: ColumnDef<UserEnquiryDetails>[] = [
        {
            accessorKey: 'documentNumber',
            header: 'Document Details',
            cell: ({ row }) => {
                const document = row.original;
                return (
                    <div>
                        <div>
                            <span className="font-bold">No. :</span> {document.documentNumber || 'N/A'}
                        </div>
                        <div className="capitalize">
                            <span className="font-bold">Type :</span>{' '}
                            {document.transactionType?.replaceAll('_', ' ')?.toLowerCase()}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'userDetails',
            header: 'User Details',
            cell: ({ row }) => {
                const user = row?.original?.companyDebtorId
                    ? row?.original?.companyDebtor
                    : row?.original?.companyCreditor;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Name :</span> {user?.name || 'N/A'}
                        </div>
                        <div>
                            <span className="font-bold">Account No. :</span> {user?.accountNumber || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'productDetails',
            header: 'Order Details',
            cell: ({ row }) => {
                const rowData = row.original;
                const orderDate = rowData.transactionDate;
                return (
                    <div>
                        <div>
                            <span className="font-bold">Amount :</span> {currencySymbol} {rowData.totalAmount}
                        </div>
                        <div>
                            <span className="font-bold">Quantity :</span> {rowData.totalQuantity}
                        </div>
                        <div>
                            <span className="font-bold">Date :</span>{' '}
                            {orderDate ? moment(orderDate).format('DD MMM, YY') : 'N/A'}
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
                        onClick={() =>
                            onOpenEnquiryInvoice({
                                userType,
                                documentId: row.original.documentId,
                                transactionType: row.original.transactionType,
                            })
                        }
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    // Export

    async function downloadCSV() {
        getUserEnquiries({
            userType,
            isCsv: true,
            csvLabel: userType === 'DEBTOR' ? 'Debtor_Enquiries' : 'Creditor_Enquiries',
            ...(appliedFilters?.companyDebtorId ? { companyDebtorId: appliedFilters?.companyDebtorId } : {}),
            ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters?.companyCreditorId } : {}),
        });
    }

    // Enquiries Invoice

    const [invoiceFilters, setInvoiceFilters] = useState<EnquiriesInvoiceFilterProps | null>(null);

    function onOpenEnquiryInvoice(filters: EnquiriesInvoiceFilterProps) {
        setInvoiceFilters(filters);
    }

    function onCloseEnquiryInvoice() {
        setInvoiceFilters(null);
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="m-6 space-y-2">
                <DataTable
                    query={query}
                    data={userEnquiries?.data?.rows || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            {userType === 'DEBTOR'
                                ? debtors && (
                                      <SelectPopover
                                          options={debtors?.map((debtor) => ({
                                              value: debtor?.id,
                                              label: `${debtor?.name} (${debtor?.accountNumber})`,
                                          }))}
                                          selectedValue={filters.companyDebtorId}
                                          onSelect={(value) => setFilters({ ...filters, companyDebtorId: value })}
                                          title="Debtor"
                                      />
                                  )
                                : creditors && (
                                      <SelectPopover
                                          options={creditors?.map((creditor) => ({
                                              value: creditor?.id,
                                              label: `${creditor?.name} (${creditor?.accountNumber})`,
                                          }))}
                                          selectedValue={filters.companyCreditorId}
                                          onSelect={(value) => setFilters({ ...filters, companyCreditorId: value })}
                                          title="Creditor"
                                      />
                                  )}

                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />
                        </div>
                    </div>
                </DataTable>
            </div>

            {!!invoiceFilters ? <EnquiriesInvoice data={invoiceFilters} onClose={onCloseEnquiryInvoice} /> : null}
        </PageLoader>
    );
};

export default UserEnquiries;
