import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ListOnlyTable } from '@/components/list-only-table';
import type { SerialNumber } from '../cash-sales-types';
import { SERIAL_NUMBERS } from '../../../../dummy-data/cash-sales-dummy-data';
import { useQueryState } from 'nuqs';
import { Input } from '@/components/ui/input';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';

interface SerialNumberSelectionProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    onRowClick: (row: SerialNumber) => void;
}

const SerialNumberSelection = ({ isOpen, setIsOpen, onRowClick }: SerialNumberSelectionProps) => {
    const serialNumberColumns = useMemo(
        () => [
            { key: 'serial', label: 'Serial Number', className: 'w-[150px]' },
            { key: 'description', label: 'Description', className: 'flex-1' },
        ],
        [],
    );

    const [search] = useQueryState('search', { defaultValue: '' });
    const [searchQuery, setSearchQuery] = useState(search);
    const [appliedSearchQuery, setAppliedSearchQuery] = useState('');

    const filteredSerialNumbers = useMemo(() => {
        const query = appliedSearchQuery.toLowerCase().trim();
        if (!query) return SERIAL_NUMBERS;
        return SERIAL_NUMBERS.filter(
            (item) => item.serial.toLowerCase().includes(query) || item.description.toLowerCase().includes(query),
        );
    }, [appliedSearchQuery]);

    const handleSearch = () => {
        setAppliedSearchQuery(searchQuery);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setAppliedSearchQuery('');
    };

    useEffect(() => {
        if (isOpen) handleClearSearch();
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="flex h-[90vh] !w-[70vw] !max-w-none flex-col">
                <DialogHeader>
                    <DialogTitle>Select Serial Number</DialogTitle>

                    <div className="mt-2 flex items-center gap-2">
                        <Input
                            placeholder="Search by serial number or description"
                            value={searchQuery || ''}
                            onChange={(e) => setSearchQuery(String(e.target.value))}
                            onKeyDown={handleKeyDown}
                        />

                        <FilterActionButtons
                            onApplyFilters={handleSearch}
                            onClearClick={handleClearSearch}
                            showClearButton={!!searchQuery}
                        />
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <ListOnlyTable
                            columns={serialNumberColumns}
                            data={filteredSerialNumbers}
                            onRowClick={(row) => onRowClick(row as SerialNumber)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default SerialNumberSelection;
