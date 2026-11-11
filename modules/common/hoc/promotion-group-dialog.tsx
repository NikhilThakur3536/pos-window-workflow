import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useGetPromotionGroups, FilterProps, PromotionGroupsDetails } from '@/api-queries/promotions/groups';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';

interface PromotionGroupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPromotionGroup: (promotionGroup: PromotionGroupsDetails) => void;
}

export function PromotionGroupDialog({ isOpen, onClose, onSelectPromotionGroup }: PromotionGroupDialogProps) {
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

    const [selectedPromotionGroupInModal, setSelectedPromotionGroupInModal] = useState<PromotionGroupsDetails | null>(
        null,
    );

    const { data: promotionGroups, isLoading } = useGetPromotionGroups({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const promotionGroupColumns = [
        {
            key: 'sequenceNumber',
            label: 'Seq.',
            render: (row: PromotionGroupsDetails) => row.sequenceNumber || '--',
        },
        {
            key: 'colorCode',
            label: 'Code',
            render: (row: PromotionGroupsDetails) => row.colorCode || '--',
        },
        {
            key: 'groupName',
            label: 'Name',
            render: (row: PromotionGroupsDetails) => row.groupName || '--',
        },
        {
            key: 'groupDescription',
            label: 'Description',
            className: 'flex-1',
            render: (row: PromotionGroupsDetails) => row.groupDescription || '--',
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

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedPromotionGroupInModal(null);
        }
    }, [isOpen]);

    const handleSelectAndClose = () => {
        if (selectedPromotionGroupInModal) {
            onSelectPromotionGroup(selectedPromotionGroupInModal);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Customer (PromotionGroup)</DialogTitle>
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
                                columns={promotionGroupColumns}
                                data={promotionGroups?.data?.rows || []}
                                onRowClick={setSelectedPromotionGroupInModal}
                                selectedRowKey={selectedPromotionGroupInModal?.id}
                                rowKeyExtractor={(row) => row.id}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalCount={promotionGroups?.data?.count}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedPromotionGroupInModal}>
                            Select Promotion Group
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
