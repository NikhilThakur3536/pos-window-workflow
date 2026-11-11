import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Company, useGetCompanies } from '@/api-queries/company-details';
import { FilterProps } from '@/api-queries/company-details';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '../PageLoader';
import { useNetworkStore } from '@/stores/network.store';

interface CompanySelectionProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCompany: (company: Company) => void;
    token?: string;
}

export function CompanySelection({ isOpen, onClose, onSelectCompany, token }: CompanySelectionProps) {
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

    const isOnline = useNetworkStore((state) => state.online);

    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const { data: companies, isLoading } = useGetCompanies(
        {
            limit: pagination?.pageSize ?? 10,
            offset: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 10),
            ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
        },
        token,
        isOnline,
    );

    const companyColumns = [
        {
            key: 'companyIdentificationNumber',
            label: 'CIN',
            className: 'flex-1',
            render: (row: Company) => row.companyIdentificationNumber || '--',
        },
        {
            key: 'companyName',
            label: 'Name',
            render: (row: Company) => row.companyName || '--',
        },
        {
            key: 'bankAccountNumber',
            label: 'Bank Account No.',
            render: (row: Company) => row.bankAccountNumber || '--',
        },
        {
            key: 'companyRegistrationNumber',
            label: 'CRN',
            className: 'w-[120px] hidden md:table-cell',
            render: (row: Company) => row.companyRegistrationNumber || '--',
        },
        {
            key: 'emailAddress',
            label: 'Email',
            className: 'w-[120px] hidden md:table-cell',
            render: (row: Company) => row.emailAddress || '--',
        },
        {
            key: 'telephone',
            label: 'Telephone',
            className: 'w-[120px] hidden md:table-cell',
            render: (row: Company) => row.telephone || '--',
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
        if (selectedCompany) {
            onSelectCompany(selectedCompany);
            onClose();
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedCompany(null);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} height="h-[95vh]" width="w-[80vw]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Company</DialogTitle>
                        <div className="mt-2 flex items-center gap-2">
                            <Input
                                placeholder="Search by name, email or telephone"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="max-w-sm"
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
                                columns={companyColumns}
                                data={companies?.data || []}
                                onRowClick={setSelectedCompany}
                                selectedRowKey={selectedCompany?.id}
                                rowKeyExtractor={(row) => row.id}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalCount={companies?.count}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedCompany}>
                            Select Company
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
