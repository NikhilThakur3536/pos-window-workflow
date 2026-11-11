import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import { SalesRepresentativeDetails, useGetSalesRepresentativesOffline } from '@/api-queries/sales-representatives';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { useGetSalesRepresentatives, FilterProps } from '@/api-queries/sales-representatives';
import { PageLoader } from '@/components/custom-components/PageLoader';

interface RepDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectRep: (rep: SalesRepresentativeDetails) => void;
    isOnline: boolean;
}

export function RepDialog({ isOpen, onClose, onSelectRep, isOnline }: RepDialogProps) {
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

    const [selectedRepInModal, setSelectedRepInModal] = useState<SalesRepresentativeDetails | null>(null);

    const { data: representatives, isLoading } = isOnline
        ? useGetSalesRepresentatives({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
          })
        : useGetSalesRepresentativesOffline(false);

    const dataColumns = useMemo(
        () => [
            { key: 'repNumber', label: 'Rep Number' },
            { key: 'name', label: 'Name' },
            { key: 'cellNumber', label: 'Contact' },
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

    const handleSelectAndClose = () => {
        if (selectedRepInModal) {
            onSelectRep(selectedRepInModal);
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedRepInModal(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[50vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} height="min-h-[40vh]" width="w-[50vw]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Representative</DialogTitle>
                        <div className="mt-2 flex items-center gap-2">
                            <Input
                                placeholder="Search by name or code"
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

                    <div className="overflow-y-auto px-4">
                        <ListOnlyTable
                            columns={dataColumns}
                            data={representatives?.data || []}
                            onRowClick={setSelectedRepInModal}
                            selectedRowKey={selectedRepInModal?.id}
                            rowKeyExtractor={(row) => row.id}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalCount={representatives?.count}
                        />
                    </div>

                    <DialogFooter className="flex justify-between p-4">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedRepInModal}>
                            Select Representative
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
