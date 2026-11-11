import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { GoodsReceivingDetails, GoodsReceivingFilter, useGetGoodsReceivingList } from '@/api-queries/goods-receiving';
import moment from 'moment';
import { Eye } from 'lucide-react';
import GRVInvoiceDialog from '../goods-receiving/invoice/invoice-dialog';
import { useAuthUser } from '@/stores/auth-user.store';

interface GRVDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectGRV: (grv: GoodsReceivingDetails) => void;
    companyCreditorId: string;
}

export function GRVDialog({ isOpen, onClose, onSelectGRV, companyCreditorId }: GRVDialogProps) {
    const isCompanyDebtor = useAuthUser((state) => state.user?.userType) === 'COMPANY-DEBTOR-USER';

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
    } = useTableFilters<GoodsReceivingFilter>(initialFilters);

    const [selectedGRVInModal, setSelectedGRVInModal] = useState<GoodsReceivingDetails | null>(null);

    const { data: grvList, isLoading } = useGetGoodsReceivingList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(companyCreditorId ? { companyCreditorId } : {}),
        isReturned: false,
    });

    const debtorColumns = [
        {
            key: 'supplierInvoiceNumber',
            label: 'Invoice Number',
            className: 'hidden md:table-cell',
            render: (row: GoodsReceivingDetails) => row.supplierInvoiceNumber || '--',
        },
        {
            key: 'grvDate',
            label: 'GRV Date',
            render: (row: GoodsReceivingDetails) => {
                const grvDate = row.grvDate;
                return <div>{grvDate ? moment(grvDate).format('Do MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            key: 'name',
            label: 'Name',
            className: 'flex-1',
            render: (row: GoodsReceivingDetails) => row.name || '--',
        },
        {
            key: 'totalQuantity',
            label: 'Total Products',
            className: 'flex-1',
            render: (row: GoodsReceivingDetails) => {
                const totalQuantity =
                    row[
                        isCompanyDebtor ? 'DebtorGoodsReceivingOrderItems' : 'CreditorGoodsReceivingOrderItems'
                    ]?.reduce((acc, item) => acc + (item.quantity + (item.freeStock || 0) || 0), 0) || 0;
                return <div>{totalQuantity}</div>;
            },
        },
        {
            key: 'view',
            label: 'View',
            className: 'text-center',
            render: (row: GoodsReceivingDetails) => (
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

    const [printData, setPrintData] = useState<GoodsReceivingDetails | null>(null);

    const onViewInvoice = (data: GoodsReceivingDetails) => {
        setPrintData(data);
    };

    const onCloseInvoiceDialog = () => {
        setPrintData(null);
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedGRVInModal(null);
        }
    }, [isOpen]);

    const handleSelectAndClose = () => {
        if (selectedGRVInModal) {
            onSelectGRV(selectedGRVInModal);
            onClose();
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                    <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                        <DialogHeader className="mb-4 p-4 pb-0">
                            <DialogTitle>Select GRV</DialogTitle>
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
                                    data={grvList?.data?.rows || []}
                                    onRowClick={setSelectedGRVInModal}
                                    selectedRowKey={selectedGRVInModal?.id}
                                    rowKeyExtractor={(row) => row.id}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                    totalCount={grvList?.data?.count}
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-between p-4 pt-0">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button onClick={handleSelectAndClose} disabled={!selectedGRVInModal}>
                                Select GRV
                            </Button>
                        </DialogFooter>
                    </PageLoader>
                </DialogContent>
            </Dialog>
            {printData && <GRVInvoiceDialog printData={printData} onClose={onCloseInvoiceDialog} />}
        </>
    );
}
