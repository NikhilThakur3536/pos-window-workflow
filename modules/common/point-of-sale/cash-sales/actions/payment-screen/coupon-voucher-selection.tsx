import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { TenderDetails, useGetTenders, useGetTendersOffline } from '@/api-queries/point-of-sale/tenders';
import { FilterProps } from '@/api-queries/point-of-sale/tenders';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { DISCOUNT_TYPES, TENDER_TYPES } from '@/lib/constant';
import { useAuthUser } from '@/stores/auth-user.store';

interface CouponVoucherSelectionProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCoupon: (coupon: TenderDetails) => void;
    discounts: TenderDetails[];
    isOnline: boolean;
}

export function CouponVoucherSelection({
    isOpen,
    onClose,
    onSelectCoupon,
    discounts,
    isOnline,
}: CouponVoucherSelectionProps) {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        search: '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<FilterProps>(initialFilters);

    const [selectedParentTender, setSelectedParentTender] = useState<TenderDetails | null>(discounts?.[0]);
    const selectedType = selectedParentTender?.code === TENDER_TYPES.VOUCHER;

    const discountList = isOnline
        ? useGetTenders({
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(selectedParentTender?.id ? { parentTenderId: selectedParentTender.id } : {}),
          })?.data?.data?.rows
        : useGetTendersOffline(isOnline)?.data?.data?.rows?.filter(
              (discount) => discount?.parentTenderId === selectedParentTender?.id,
          );

    const [selectedTender, setSelectedTender] = useState<TenderDetails | null>(null);

    const itemColumns = useMemo(
        () => [
            { key: 'code', label: 'Code', className: 'w-[100px]' },
            { key: 'description', label: 'Description', className: 'flex-1' },
            {
                key: 'fixedDiscountType',
                label: 'Type',
                className: 'w-[120px] text-right',
                render: (row: TenderDetails) =>
                    row.fixedDiscountType === DISCOUNT_TYPES?.PERCENTAGE ? 'Percentage' : 'Fixed Amount',
            },
            {
                key: 'fixedDiscountValue',
                label: 'Value',
                className: 'w-[120px] text-right',
                render: (row: TenderDetails) =>
                    row.fixedDiscountType === DISCOUNT_TYPES?.PERCENTAGE
                        ? `${row.fixedDiscountValue}%`
                        : `${currencySymbol} ${parseFloat(row.fixedDiscountValue).toFixed(2)}`,
            },
        ],
        [],
    );

    const handleApplyFilters = () => {
        handleFilters(filters);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleApplyFilters();
    };

    useEffect(() => {
        if (isOpen) {
            clearFilters();
            setSelectedTender(null);
        }
    }, [isOpen]);

    const handleSelectAndClose = useCallback(() => {
        if (selectedTender) {
            onSelectCoupon(selectedTender);
            onClose();
        }
    }, [selectedTender, onSelectCoupon, onClose]);

    const searchPlaceholder = useMemo(() => {
        if (!selectedParentTender) return 'Search by code or description';
        return `Search ${selectedType ? 'vouchers' : 'coupons'} by code or description`;
    }, [selectedParentTender]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="mb-4 p-4 pb-0">
                    <DialogTitle>Select {selectedType ? 'Voucher' : 'Coupon'}</DialogTitle>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <RadioGroup
                            value={selectedParentTender?.id || ''}
                            onValueChange={(id) => {
                                const tender = discounts.find((t) => t.id === id);
                                if (tender) {
                                    setSelectedParentTender(tender);
                                    clearFilters();
                                }
                            }}
                            className="flex gap-4"
                        >
                            {discounts
                                ?.filter((t) => t.status === 'ACTIVE' && t.isDiscountParent)
                                .map((tender) => (
                                    <div key={tender.id} className="flex items-center space-x-2">
                                        <RadioGroupItem value={tender.id} id={tender.id} />
                                        <Label htmlFor={tender.id}>{tender.description}</Label>
                                    </div>
                                ))}
                        </RadioGroup>

                        <div className="flex items-center gap-2">
                            <Input
                                placeholder={searchPlaceholder}
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="w-[30vw] p-1"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden px-4">
                    <div className="h-full overflow-y-auto">
                        <ListOnlyTable
                            columns={itemColumns}
                            data={discountList || []}
                            onRowClick={setSelectedTender}
                            selectedRowKey={selectedTender?.code}
                            rowKeyExtractor={(row) => row.code}
                            key={selectedParentTender?.id}
                        />
                    </div>
                </div>
                <DialogFooter className="flex justify-between p-4 pt-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelectAndClose} disabled={!selectedTender}>
                        Select {selectedType ? 'Voucher' : 'Coupon'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
