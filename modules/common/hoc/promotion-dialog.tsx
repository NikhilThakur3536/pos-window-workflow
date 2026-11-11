import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetPromotions,
    FilterProps,
    PromotionDetails,
    useValidatePromotion,
    PromotionValidationSchema,
    PromotionValidationCartItemsSchema,
    AppliedPromotionDetails,
} from '@/api-queries/promotions';
import moment from 'moment';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface PromotionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyPromotion: (appliedPromotion: AppliedPromotionDetails) => void;
    cartItems: PromotionValidationCartItemsSchema;
}

export function PromotionDialog({ isOpen, onClose, onApplyPromotion, cartItems }: PromotionDialogProps) {
    const { mutate: validatePromotion, isPending } = useValidatePromotion();

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
    } = useTableFilters<FilterProps>(initialFilters, 5);

    const [selectedPromotionInModal, setSelectedPromotionInModal] = useState<PromotionDetails | null>(null);

    const { data: promotions, isLoading } = useGetPromotions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });

    const dataColumns = [
        {
            key: 'promotionDescription',
            label: 'Description ( Batch Code )',
            render: (row: PromotionDetails) => (
                <div>
                    <div className="w-[200px] whitespace-normal">{row.promotionDescription}</div>
                    <div>
                        (<span className="font-semibold">{row.promotionBatchCode}</span>)
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row: PromotionDetails) => (
                <Badge className={`capitalize ${row.status === 'ACTIVE' ? 'bg-green-700' : 'bg-red-500'}`}>
                    {row.status?.toLowerCase() || 'N/A'}
                </Badge>
            ),
        },
        {
            key: 'validityPeriod',
            label: 'Validity Period',
            render: (row: PromotionDetails) => (
                <>
                    <div>Start : {row.startDate ? moment(row.startDate).format('Do MMM, YY') : 'N/A'}</div>
                    <div>End : {row.endDate ? moment(row.endDate).format('Do MMM, YY') : 'N/A'}</div>
                </>
            ),
        },
        {
            key: 'qualifyingItemsRule',
            label: 'Eligible Items',
            render: (row: PromotionDetails) => (
                <div className="capitalize">{row.qualifyingItemsRule?.toLowerCase() || 'N/A'}</div>
            ),
        },
        {
            key: 'validityTime',
            label: 'Valid From / To',
            render: (row: PromotionDetails) => (
                <>
                    <div>Start : {row.startTime || 'N/A'}</div>
                    <div>End : {row.endTime || 'N/A'}</div>
                </>
            ),
        },
        {
            key: 'promotionType',
            label: 'Promotion Type',
            render: (row: PromotionDetails) =>
                row.CompanyStockPromotionType
                    ? `${row.CompanyStockPromotionType.typeName} (${row.CompanyStockPromotionType.code})`
                    : 'N/A',
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

    const handleSelectAndClose = () => {
        if (selectedPromotionInModal && cartItems) {
            const payload: PromotionValidationSchema = {
                promotionId: selectedPromotionInModal?.id,
                items: cartItems,
            };

            validatePromotion(payload, {
                onSuccess: (data) => {
                    onApplyPromotion(data.data);
                    onClose();
                    toast.success('Promotion applied successfully');
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedPromotionInModal(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-[60vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} height="min-h-[40vh]" width="w-[50vw]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Promotions</DialogTitle>
                        <div className="mt-2 flex items-center gap-2">
                            <Input
                                placeholder="Search by name or batch"
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

                    <div className="max-h-[55vh] overflow-y-auto px-4">
                        <ListOnlyTable
                            columns={dataColumns}
                            data={
                                promotions?.data?.rows?.map((row) => ({ ...row, disabled: row.status !== 'ACTIVE' })) ||
                                []
                            }
                            onRowClick={setSelectedPromotionInModal}
                            selectedRowKey={selectedPromotionInModal?.id}
                            rowKeyExtractor={(row) => row.id}
                            pagination={pagination}
                            setPagination={setPagination}
                            totalCount={promotions?.data?.count}
                            disabledRows="The promotion is not active. Please try another."
                        />
                    </div>

                    <DialogFooter className="flex justify-between p-4">
                        <Button variant="outline" onClick={onClose} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedPromotionInModal || isPending}>
                            {isPending ? 'Applying...' : 'Apply Promotion'}
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
