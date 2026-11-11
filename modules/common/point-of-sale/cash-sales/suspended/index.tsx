import React, { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MinusCircleIcon, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import {
    FilterProps,
    SuspendedSalesDetails,
    useGetSuspendedSales,
    useRemoveSuspendedSale,
} from '@/api-queries/point-of-sale/suspended-sales';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { toast } from 'sonner';
import { PageLoader } from '@/components/custom-components/PageLoader';

interface SuspendedCashSalesProps {
    onResumption: (sale: SuspendedSalesDetails) => void;
}

const SuspendedCashSales = ({ onResumption }: SuspendedCashSalesProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<SuspendedSalesDetails | null>(null);

    const initialFilters: FilterProps = {
        search: '',
        isPlaced: false,
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

    const { data, isLoading, isError } = useGetSuspendedSales({
        isPlaced: false,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
    });
    const suspendedSales = data?.data?.rows || [];
    // const suspendedSales = data?.data?.rows?.filter((item) => !item.isPlaced) || [];
    const totalCount = data?.data?.count;
    // console.log("suspendedSales",suspendedSales)
    const dataColumns = useMemo(
        () => [
            { key: 'customerName', label: 'Name' },
            { key: 'customerPhoneNumber', label: 'Phone Number', className: 'text-center' },
            {
                key: 'customerSuspendedAt',
                label: 'Suspended At',
                render: (row: SuspendedSalesDetails) => (
                    <div>
                        {moment(row.customerSuspendedAt).format('DD MMM, YY')}
                        <br />
                        {moment(row.customerSuspendedAt).format('HH:mm A')}
                    </div>
                ),
                className: 'text-center',
            },
            {
                key: 'totalProduct',
                label: 'Total Products',
                render: (row: SuspendedSalesDetails) => {
                    const totalProducts =
                        row.companySuspendedSaleItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;
                    return <div>{totalProducts}</div>;
                },
                className: 'text-end',
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
        if (selectedSale) {
            onResumption(selectedSale);
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedSale(null);
        }
    }, [isOpen]);

    function onClose() {
        handleClearSearch();
        setSelectedSale(null);
        setIsOpen(false);
    }

    const { mutate: removeSuspendedSale } = useRemoveSuspendedSale();

    function handleRemoveSuspendedSale() {
        if (selectedSale?.id) {
            removeSuspendedSale(selectedSale?.id, {
                onSuccess: () => {
                    toast.success('Suspended sale removed successfully');
                    handleClearSearch();
                    setSelectedSale(null);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response.data.message || 'Internal Server Error!');
                },
            });
        }
    }

    return (
        <>
            <Button className="bg-red-500 text-white hover:bg-red-600" onClick={() => setIsOpen(true)}>
                <Play />
                Resume Suspended Sale
            </Button>

            {/* <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex min-h-[40vh] w-[50vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                    <PageLoader isLoading={isLoading} height="min-h-[40vh]" width="w-[60vw]">
                        <DialogHeader className="mb-4 p-4 pb-0">
                            <DialogTitle>Select Sale</DialogTitle>
                            <div className="mt-2 flex items-center gap-2">
                                <Input
                                    placeholder="Search by name or code"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="max-w-sm"
                                />
                                <FilterActionButtons
                                    onClearClick={handleClearSearch}
                                    onApplyFilters={handleApplyFilters}
                                    showClearButton={showClearButton}
                                />
                            </div>
                        </DialogHeader>

                        <div className="overflow-y-auto px-4">
                            <ListOnlyTable
                                columns={dataColumns}
                                data={suspendedSales}
                                onRowClick={setSelectedSale}
                                selectedRowKey={selectedSale?.id}
                                rowKeyExtractor={(row) => row.id}
                                pagination={pagination}
                                setPagination={setPagination}
                                totalCount={totalCount || 0}
                            />
                        </div>

                        <DialogFooter className="flex justify-between p-4">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>

                            <Button variant="destructive" onClick={handleRemoveSuspendedSale} disabled={!selectedSale}>
                                <MinusCircleIcon /> Remove Sale
                            </Button>

                            <Button onClick={handleSelectAndClose} disabled={!selectedSale}>
                                <Play /> Resume Sale
                            </Button>
                        </DialogFooter>
                    </PageLoader>
                </DialogContent>
            </Dialog>
             */}
             <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="flex h-[90vh] w-[95vw] max-w-7xl flex-col overflow-hidden p-0 sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:w-[65vw] ">
        <PageLoader isLoading={isLoading} height="min-h-[40vh]" width="w-full">
            <DialogHeader className="mb-4 p-4 pb-0">
                <DialogTitle>Select Sale</DialogTitle>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        placeholder="Search by name or code"
                        value={filters.search || ''}
                        onChange={(e) =>
                            setFilters({
                                ...filters,
                                search: e.target.value,
                            })
                        }
                        onKeyDown={handleKeyDown}
                        className="w-full sm:max-w-sm"
                    />

                    <FilterActionButtons
                        onClearClick={handleClearSearch}
                        onApplyFilters={handleApplyFilters}
                        showClearButton={showClearButton}
                    />
                </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <ListOnlyTable
                    columns={dataColumns}
                    data={suspendedSales}
                    onRowClick={setSelectedSale}
                    selectedRowKey={selectedSale?.id}
                    rowKeyExtractor={(row) => row.id}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalCount={totalCount || 0}
                />
            </div>

            <DialogFooter className="flex flex-col gap-2 p-4 sm:flex-row sm:justify-between">
                <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                    Cancel
                </Button>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                        variant="destructive"
                        onClick={handleRemoveSuspendedSale}
                        disabled={!selectedSale}
                        className="w-full sm:w-auto"
                    >
                        <MinusCircleIcon className="mr-2 h-4 w-4" />
                        Remove Sale
                    </Button>

                    <Button
                        onClick={handleSelectAndClose}
                        disabled={!selectedSale}
                        className="w-full sm:w-auto"
                    >
                        <Play className="mr-2 h-4 w-4" />
                        Resume Sale
                    </Button>
                </div>
            </DialogFooter>
        </PageLoader>
    </DialogContent>
</Dialog>
        </>
    );
};

export default SuspendedCashSales;
