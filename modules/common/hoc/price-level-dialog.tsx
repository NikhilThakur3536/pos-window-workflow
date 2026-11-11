import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useCompanyStockPricingList, FilterProps } from '@/api-queries/company/stock-pricing';
import { CartItemPricingType } from '@/api-queries/point-of-sale';
import { useAuthUser } from '@/stores/auth-user.store';
import { useCompanyStockDetailsOffline } from '@/api-queries/company/stock-details';
import useTableFilters from '@/components/list-only-table/use-table-filters';

interface PriceLevelDialogProps {
    companyStockDetailId: string;
    isOpen: boolean;
    onClose: () => void;
    onSelectPriceLevel: (priceLevel: CartItemPricingType) => void;
    isOnline: boolean;
}

export function PriceLevelDialog({
    isOpen,
    onClose,
    onSelectPriceLevel,
    companyStockDetailId,
    isOnline,
}: PriceLevelDialogProps) {
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

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const priceLevels = isOnline
        ? useCompanyStockPricingList(companyStockDetailId)?.data?.rows?.[0]?.pricingTypes
        : useCompanyStockDetailsOffline(isOnline)?.data?.data?.rows?.find((stock) => stock?.id === companyStockDetailId)
              ?.pricingTypes || [];

    const [selectedPriceLevel, setSelectedPriceLevel] = useState<CartItemPricingType | null>(null);

    const dataColumns = useMemo(
        () => [
            {
                key: 'idNumber',
                label: 'ID',
                className: '!hidden md:table-cell',
                render: (row: CartItemPricingType) => row.id || '--',
            },
            {
                key: 'name',
                label: 'Name',
                className: 'text-left',
                render: (row: CartItemPricingType) => (row.type.name ? `${row.type.name}` : '--'),
            },
            {
                key: 'priceExclusive',
                label: 'Price (Exc.)',
                className: 'text-right',
                render: (row: CartItemPricingType) =>
                    row.priceInclusive ? `${currencySymbol} ${row.priceExclusive?.toFixed(2)}` : '--',
            },
            {
                key: 'priceInclusive',
                label: 'Price (Inc.)',
                className: 'text-right',
                render: (row: CartItemPricingType) =>
                    row.priceInclusive ? `${currencySymbol} ${row.priceInclusive?.toFixed(2)}` : '--',
            },
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
        if (selectedPriceLevel) {
            onSelectPriceLevel(selectedPriceLevel);
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedPriceLevel(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex w-[50vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="mb-4 p-4 pb-0">
                    <DialogTitle>Select Price Level</DialogTitle>
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

                <div className="max-h-[50vh] overflow-y-auto px-4">
                    <ListOnlyTable
                        columns={dataColumns}
                        data={priceLevels || []}
                        onRowClick={setSelectedPriceLevel}
                        selectedRowKey={selectedPriceLevel?.id}
                        rowKeyExtractor={(row) => row.id}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalCount={priceLevels?.length}
                    />
                </div>

                <DialogFooter className="flex justify-between p-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelectAndClose} disabled={!selectedPriceLevel}>
                        Select Price Level
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
