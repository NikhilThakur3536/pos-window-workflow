import { StockDetails, useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Column, ListOnlyTable } from '@/components/table/list-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQueryState } from 'nuqs';
import React, { useEffect, useMemo, useState } from 'react';

interface ItemDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectItem: (item: StockDetails) => void;
}

export function ItemDialog({ isOpen, onClose, onSelectItem }: ItemDialogProps) {
    const [selectedItem, setSelectedItem] = useState<StockDetails | null>(null);
    const [search, setSearch] = useQueryState('search', { defaultValue: '' });
    const [searchQuery, setSearchQuery] = useState(search);

    const items = useCompanyStockDetailsList({
        limit: 1000,
        offset: 0,
        search,
    });
    const itemsList = items.data?.data.rows || [];

    const itemColumns: Column<StockDetails>[] = useMemo(
        () => [
            { key: 'itemCode', label: 'Code', className: 'w-[100px]' },
            { key: 'description', label: 'Description', className: 'flex-1' },
            { key: 'barcode', label: 'Barcode', className: 'w-[120px] hidden md:table-cell' },
            { key: 'price', label: 'Supplier', className: 'w-[120px] hidden md:table-cell' },
            { key: 'onhand', label: 'On Hand', className: 'w-[80px] text-right' },
        ],
        [],
    );

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return itemsList;
        return itemsList.filter(
            (item) =>
                item.itemCode.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query) ||
                item.barcode.toLowerCase().includes(query),
        );
    }, [searchQuery, items.status]);

    function handleSearch() {
        setSearch(searchQuery);
    }

    function handleKeyDown(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        handleSearch();
    }

    function handleClearSearch() {
        setSearchQuery('');
        setSearch('');
    }

    function handleSelectAndClose() {
        if (selectedItem) {
            onSelectItem(selectedItem);
            onClose();
        }
    }

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedItem(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <DialogHeader className="mb-4 p-4 pb-0">
                    <DialogTitle>Select Item</DialogTitle>
                    <form onSubmit={handleKeyDown} className="mt-2 flex items-center gap-2">
                        <Input
                            placeholder="Search by code, description, barcode or supplier"
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(String(e.target.value))}
                            className="max-w-sm p-1"
                        />
                        <FilterActionButtons
                            onApplyFilters={handleSearch}
                            onClearClick={handleClearSearch}
                            showClearButton={!!searchQuery}
                        />
                    </form>
                </DialogHeader>
                <div className="flex-1 overflow-hidden px-4">
                    <div className="h-full overflow-y-auto">
                        <ListOnlyTable
                            columns={itemColumns}
                            data={filteredItems}
                            onRowClick={setSelectedItem}
                            selectedRowKey={selectedItem?.id}
                            rowKeyExtractor={(row) => row.id}
                        />
                    </div>
                </div>
                <DialogFooter className="flex justify-between p-4 pt-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSelectAndClose} disabled={!selectedItem}>
                        Select Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
