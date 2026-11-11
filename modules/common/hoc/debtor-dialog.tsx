import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Phone, Smartphone, Mail, MapPin, User } from 'lucide-react';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useDebtorList, FilterProps, useGetDebtorsOffline } from '@/api-queries/debtor';
import { COMPANY_DEBTOR_TYPES, CompanyCreditor } from '@/types';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { getLabelFromEnumValue } from '@/utils/helpers';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface DebtorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectDebtor: (debtor: CompanyCreditor) => void;
    isOnline: boolean;
}

export function DebtorDialog({ isOpen, onClose, onSelectDebtor, isOnline }: DebtorDialogProps) {
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

    const [selectedDebtorInModal, setSelectedDebtorInModal] = useState<CompanyCreditor | null>(null);

    const { data: debtors, isLoading } = isOnline
        ? useDebtorList({
              limit: pagination.pageSize,
              offset: pagination.pageIndex * pagination.pageSize,
              ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
              ...(appliedFilters?.companyDebtorType ? { companyDebtorType: appliedFilters?.companyDebtorType } : {}),
          })
        : useGetDebtorsOffline(false);

    const debtorColumns = [
        {
            key: 'companyDebtorType',
            label: 'Debtor Type',
            className: 'hidden md:table-cell',
            render: (row: CompanyCreditor) => (
                <div className="font-bold">{getLabelFromEnumValue(row.companyDebtorType) || '--'}</div>
            ),
        },
        {
            key: 'accountNumber',
            label: 'Account',
            render: (row: CompanyCreditor) => row.accountNumber || '--',
        },
        {
            key: 'name',
            label: 'Name',
            className: 'flex-1',
            render: (row: CompanyCreditor) => row.name || '--',
        },
        {
            key: 'contactInfo',
            label: 'Contact & Addresses',
            render: (row: CompanyCreditor) => {
                const { contact, telephoneNumberOne, cellphoneNumber, postalAddress, emailAddress } = row;

                const hasAny = contact || telephoneNumberOne || cellphoneNumber || postalAddress || emailAddress;

                if (!hasAny) {
                    return <span className="text-muted-foreground text-xs italic">No contact details available</span>;
                }

                return (
                    <div className="group flex flex-col space-y-1 text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                            {contact && (
                                <div className="flex items-center gap-1 font-medium">
                                    <User className="text-muted-foreground h-4 w-4" />
                                    {contact}
                                </div>
                            )}

                            {telephoneNumberOne && (
                                <div className="flex items-center gap-1">
                                    <Phone className="text-muted-foreground h-4 w-4" />
                                    <span>{telephoneNumberOne}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-muted-foreground flex flex-wrap items-center gap-4">
                            {cellphoneNumber && (
                                <div className="flex items-center gap-1">
                                    <Smartphone className="h-4 w-4" />
                                    <span>{cellphoneNumber}</span>
                                </div>
                            )}

                            {emailAddress && (
                                <div className="flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    <span>{emailAddress}</span>
                                </div>
                            )}
                        </div>

                        {postalAddress && (
                            <div className="text-muted-foreground flex items-center gap-1 pt-1 text-xs">
                                <MapPin className="h-3 w-3" />
                                {postalAddress}
                            </div>
                        )}
                    </div>
                );
            },
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
            setSelectedDebtorInModal(null);
        }
    }, [isOpen]);

    const handleSelectAndClose = () => {
        if (selectedDebtorInModal) {
            onSelectDebtor(selectedDebtorInModal);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                    <DialogHeader className="mb-4 p-4 pb-0">
                        <DialogTitle>Select Customer (Debtor)</DialogTitle>
                        <div className="mt-2 flex items-center gap-2">
                            <Input
                                placeholder="Search by account, name, cellphone or telephone"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="max-w-sm p-1"
                            />

                            <Select
                                value={filters.companyDebtorType || undefined}
                                onValueChange={(value: (typeof COMPANY_DEBTOR_TYPES)[number]['value']) =>
                                    setFilters({ ...filters, companyDebtorType: value || '' })
                                }
                            >
                                <SelectTrigger className="h-8 w-[180px]">
                                    <SelectValue placeholder="Select debtor Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMPANY_DEBTOR_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

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
                                data={debtors?.data?.rows || []}
                                onRowClick={setSelectedDebtorInModal}
                                selectedRowKey={selectedDebtorInModal?.id}
                                rowKeyExtractor={(row) => row.id}
                                shouldShowPagination={false}
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between p-4 pt-0">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelectAndClose} disabled={!selectedDebtorInModal}>
                            Select Customer
                        </Button>
                    </DialogFooter>
                </PageLoader>
            </DialogContent>
        </Dialog>
    );
}
