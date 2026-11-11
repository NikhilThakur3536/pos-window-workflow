import { useCreditorList, CreditorListPayload } from '@/api-queries/creditor';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { PageLoader } from '@/components/custom-components/PageLoader';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { ListOnlyTable } from '@/components/list-only-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CompanyCreditor } from '@/types';
import React, { useEffect, useMemo, useState } from 'react';

interface CreditorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCreditor: (creditor: CompanyCreditor) => void;
}

export function CreditorDialog({ isOpen, onClose, onSelectCreditor }: CreditorDialogProps) {
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
    } = useTableFilters<CreditorListPayload>(initialFilters);

    const [selectedCreditorInModal, setSelectedCreditorInModal] = useState<CompanyCreditor | null>(null);

    const { data: creditors, isLoading } = useCreditorList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const creditorColumns = useMemo(
        () => [
            { key: 'accountNumber', label: 'Account', className: 'w-[100px]' },
            {
                key: 'contact',
                label: 'Contact Details',
                className: 'w-[150px] border-l',
                render: (row: CompanyCreditor) =>
                    row.contact || row.cellphoneNumber || row.telephoneNumberOne || row.telephoneNumberTwo || 'N/A',
            },
            { key: 'name', label: 'Name', className: 'flex-1 border-l' },
        ],
        [],
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    const handleClearSearch = () => {
        clearFilters();
    };

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    function handleSelectAndClose() {
        if (selectedCreditorInModal) {
            onSelectCreditor(selectedCreditorInModal);
            onClose();
        }
    }

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedCreditorInModal(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Supplier (Creditor)</DialogTitle>
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
                                columns={creditorColumns}
                                data={creditors?.data?.rows || []}
                                onRowClick={setSelectedCreditorInModal}
                                selectedRowKey={selectedCreditorInModal?.id}
                                rowKeyExtractor={(row) => row.id}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalCount={creditors?.data?.count}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedCreditorInModal}>
                            Select Creditor
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
