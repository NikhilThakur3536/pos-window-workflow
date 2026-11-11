// import React, { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { ListOnlyTable } from '@/components/list-only-table';
// import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
// import useTableFilters from '@/components/list-only-table/use-table-filters';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import moment from 'moment';
// import { Eye, Mail, Phone, User } from 'lucide-react';
// import CashSaleInvoiceDialog from '../point-of-sale/cash-sales/invoice/invoice-dialog';
// import {
//     useGetCashSales,
//     FilterProps,
//     CashSalesDetails,
//     CashSaleInvoiceType,
// } from '@/api-queries/point-of-sale/cash-sales';

// interface CashSaleDialogProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onSelectCashSale: (accountSale: CashSalesDetails) => void;
// }

// export function CashSaleDialog({ isOpen, onClose, onSelectCashSale }: CashSaleDialogProps) {
//     const initialFilters = {
//         search: '',
//     };

//     const {
//         filters,
//         setFilters,
//         handleFilters,
//         clearFilters,
//         appliedFilters,
//         showClearButton,
//         pagination,
//         setPagination,
//     } = useTableFilters<FilterProps>(initialFilters);

//     const [selectedASInModal, setSelectedASInModal] = useState<CashSalesDetails | null>(null);

//     const { data: cashSales, isLoading } = useGetCashSales({
//         limit: pagination.pageSize,
//         offset: pagination.pageIndex * pagination.pageSize,
//         status: 'REFUNDED',
//         ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
//     });

//     const cashSaleColumns = [
//         {
//             key: 'invoiceNumber',
//             label: 'Invoice Number',
//             className: 'hidden md:table-cell',
//             render: (row: CashSalesDetails) => {
//                 const id = row.id;
//                 return <div>#INV{id?.slice(0, 8)?.toUpperCase() || 'N/A'}</div>;
//             },
//         },
//         {
//             key: 'invoiceDate',
//             label: 'Invoice Date',
//             render: (row: CashSalesDetails) => {
//                 const invoiceDate = row.invoiceDate;
//                 return <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>;
//             },
//         },
//         {
//             key: 'SalesRepresentative',
//             label: 'Representative',
//             render: (row: CashSalesDetails) => {
//                 const salesRepresentative = row?.SalesRepresentative;

//                 return salesRepresentative ? (
//                     <div className="space-y-1">
//                         <div className="flex items-center gap-2">
//                             <User className="!h-4 !w-4" />
//                             {salesRepresentative?.name || 'N/A'}
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Mail className="!h-4 !w-4" /> {salesRepresentative?.email || 'N/A'}
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Phone className="!h-4 !w-4" /> {salesRepresentative?.cellNumber || 'N/A'}
//                         </div>
//                     </div>
//                 ) : (
//                     'N/A'
//                 );
//             },
//         },
//         {
//             key: 'totalQuantity',
//             label: 'Total Products',
//             className: 'flex-1',
//             render: (row: CashSalesDetails) => {
//                 const totalQuantity =
//                     row.PosCashSaleOrderItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

//                 return <div>{totalQuantity}</div>;
//             },
//         },
//         {
//             key: 'view',
//             label: 'View',
//             className: 'text-center',
//             render: (row: CashSalesDetails) => (
//                 <div className="flex items-center justify-center gap-1">
//                     <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={(e) => onViewInvoice(row)}
//                         className="h-8 w-8 p-0"
//                         title="View Invoice"
//                     >
//                         <Eye className="h-4 w-4" />
//                     </Button>
//                 </div>
//             ),
//         },
//     ];

//     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') handleApplyFilters();
//     };

//     const handleClearSearch = () => {
//         clearFilters();
//     };

//     const handleApplyFilters = () => {
//         handleFilters(filters);
//     };

//     const [printData, setPrintData] = useState<CashSaleInvoiceType | null>(null);

//     const onViewInvoice = (data: CashSalesDetails) => {
//         setPrintData({
//             cashSales: data,
//             cartItems: data.PosCashSaleOrderItems,
//             paymentMethod: data?.PosTenderType || '',
//             debtor: data?.PosDebtor || null,
//             appliedDiscount: {
//                 id: data.voucherId ? data.voucherId : data.couponId ? data.couponId : '',
//                 type: data.voucherId ? data.Voucher?.type : data.couponId ? data.Coupon?.type : '',
//                 value: data?.voucherId ? data.voucherAmount || 0 : data?.couponId ? data?.couponAmount || 0 : 0,
//                 description: data.voucherId ? data.Voucher?.description : data.couponId ? data.Coupon?.description : '',
//             },
//             invoiceDate: data?.createdAt,
//         });
//     };

//     const onCloseInvoiceDialog = () => {
//         setPrintData(null);
//     };

//     useEffect(() => {
//         if (isOpen) {
//             handleClearSearch();
//             setSelectedASInModal(null);
//         }
//     }, [isOpen]);

//     const handleSelectAndClose = () => {
//         if (selectedASInModal) {
//             onSelectCashSale(selectedASInModal);
//             onClose();
//         }
//     };

//     return (
//         <>
//             <Dialog open={isOpen} onOpenChange={onClose}>
//                 <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
//                     <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
//                         <DialogHeader className="mb-4 p-4 pb-0">
//                             <DialogTitle>Select Sale Invoice</DialogTitle>
//                             <div className="mt-2 flex items-center gap-2">
//                                 <Input
//                                     placeholder="Search by account, name, cellphone or telephone"
//                                     value={filters.search || ''}
//                                     onChange={(e) => setFilters({ ...filters, search: e.target.value })}
//                                     onKeyDown={handleKeyDown}
//                                     className="max-w-sm p-1"
//                                 />
//                                 <FilterActionButtons
//                                     onApplyFilters={handleApplyFilters}
//                                     onClearClick={handleClearSearch}
//                                     showClearButton={showClearButton}
//                                 />
//                             </div>
//                         </DialogHeader>
//                         <div className="flex-1 overflow-hidden px-4">
//                             <div className="h-full overflow-y-auto">
//                                 <ListOnlyTable
//                                     columns={cashSaleColumns}
//                                     data={cashSales?.data?.rows || []}
//                                     onRowClick={setSelectedASInModal}
//                                     selectedRowKey={selectedASInModal?.id}
//                                     rowKeyExtractor={(row) => row.id}
//                                     pagination={pagination}
//                                     setPagination={setPagination}
//                                     totalCount={cashSales?.data?.count}
//                                 />
//                             </div>
//                         </div>
//                         <DialogFooter className="flex justify-between p-4 pt-0">
//                             <Button variant="outline" onClick={onClose}>
//                                 Cancel
//                             </Button>
//                             <Button onClick={handleSelectAndClose} disabled={!selectedASInModal}>
//                                 Select Invoice
//                             </Button>
//                         </DialogFooter>
//                     </PageLoader>
//                 </DialogContent>
//             </Dialog>
//             {printData && <CashSaleInvoiceDialog printData={printData} onClose={onCloseInvoiceDialog} />}
//         </>
//     );
// }
// import React, { useState, useEffect } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { ListOnlyTable } from '@/components/list-only-table';
// import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
// import useTableFilters from '@/components/list-only-table/use-table-filters';
// import { PageLoader } from '@/components/custom-components/PageLoader';
// import moment from 'moment';
// import { Eye, Mail, Phone, User } from 'lucide-react';
// import CashSaleInvoiceDialog from '../point-of-sale/cash-sales/invoice/invoice-dialog';
// import {
//     useGetCashSales,
//     FilterProps,
//     CashSalesDetails,
//     CashSaleInvoiceType,
// } from '@/api-queries/point-of-sale/cash-sales';

// interface CashSaleDialogProps {
//     isOpen: boolean;
//     onClose: () => void;
//     onSelectCashSale: (accountSale: CashSalesDetails) => void;
// }

// export function CashSaleDialog({ isOpen, onClose, onSelectCashSale }: CashSaleDialogProps) {
//     const initialFilters = {
//         search: '',
//     };

//     const {
//         filters,
//         setFilters,
//         handleFilters,
//         clearFilters,
//         appliedFilters,
//         showClearButton,
//         pagination,
//         setPagination,
//     } = useTableFilters<FilterProps>(initialFilters);

//     const [selectedASInModal, setSelectedASInModal] = useState<CashSalesDetails | null>(null);

//     const { data: cashSales, isLoading } = useGetCashSales({
//         limit: pagination.pageSize,
//         offset: pagination.pageIndex * pagination.pageSize,
//         status: 'REFUNDED',
//         ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
//     });

//     const cashSaleColumns = [
//         {
//             key: 'invoiceNumber',
//             label: 'Invoice Number',
//             className: 'hidden md:table-cell',
//             render: (row: CashSalesDetails) => {
//                 const id = row.id;
//                 return <div>#INV{id?.slice(0, 8)?.toUpperCase() || 'N/A'}</div>;
//             },
//         },
//         {
//             key: 'invoiceDate',
//             label: 'Invoice Date',
//             render: (row: CashSalesDetails) => {
//                 const invoiceDate = row.invoiceDate;
//                 return <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>;
//             },
//         },
//         {
//             key: 'SalesRepresentative',
//             label: 'Representative',
//             render: (row: CashSalesDetails) => {
//                 const salesRepresentative = row?.SalesRepresentative;

//                 return salesRepresentative ? (
//                     <div className="space-y-1">
//                         <div className="flex items-center gap-2">
//                             <User className="!h-4 !w-4" />
//                             {salesRepresentative?.name || 'N/A'}
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Mail className="!h-4 !w-4" /> {salesRepresentative?.email || 'N/A'}
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <Phone className="!h-4 !w-4" /> {salesRepresentative?.cellNumber || 'N/A'}
//                         </div>
//                     </div>
//                 ) : (
//                     'N/A'
//                 );
//             },
//         },
//         {
//             key: 'totalQuantity',
//             label: 'Total Products',
//             className: 'flex-1',
//             render: (row: CashSalesDetails) => {
//                 const totalQuantity =
//                     row.PosCashSaleOrderItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

//                 return <div>{totalQuantity}</div>;
//             },
//         },
//         {
//             key: 'view',
//             label: 'View',
//             className: 'text-center',
//             render: (row: CashSalesDetails) => (
//                 <div className="flex items-center justify-center gap-1">
//                     <Button
//                         variant="ghost"
//                         size="sm"
//                         onClick={(e) => onViewInvoice(row)}
//                         className="h-8 w-8 p-0"
//                         title="View Invoice"
//                     >
//                         <Eye className="h-4 w-4" />
//                     </Button>
//                 </div>
//             ),
//         },
//     ];

//     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') handleApplyFilters();
//     };

//     const handleClearSearch = () => {
//         clearFilters();
//     };

//     const handleApplyFilters = () => {
//         handleFilters(filters);
//     };

//     const [printData, setPrintData] = useState<CashSaleInvoiceType | null>(null);

//     const onViewInvoice = (data: CashSalesDetails) => {
//         setPrintData({
//             cashSales: data,
//             cartItems: data.PosCashSaleOrderItems,
//             paymentMethod: data?.PosTenderType || '',
//             debtor: data?.PosDebtor || null,
//             appliedDiscount: {
//                 id: data.voucherId ? data.voucherId : data.couponId ? data.couponId : '',
//                 type: data.voucherId ? data.Voucher?.type : data.couponId ? data.Coupon?.type : '',
//                 value: data?.voucherId ? data.voucherAmount || 0 : data?.couponId ? data?.couponAmount || 0 : 0,
//                 description: data.voucherId ? data.Voucher?.description : data.couponId ? data.Coupon?.description : '',
//             },
//             invoiceDate: data?.createdAt,
//         });
//     };

//     const onCloseInvoiceDialog = () => {
//         setPrintData(null);
//     };

//     useEffect(() => {
//         if (isOpen) {
//             handleClearSearch();
//             setSelectedASInModal(null);
//         }
//     }, [isOpen]);

//     const isRowSelectable = (row: CashSalesDetails): boolean => {
//         return row.status !== 'REFUNDED';
//     };

//     const handleRowClick = (row: CashSalesDetails) => {
//         if (isRowSelectable(row)) {
//             setSelectedASInModal(row);
//         }
//     };

//     const handleSelectAndClose = () => {
//         if (selectedASInModal && isRowSelectable(selectedASInModal)) {
//             onSelectCashSale(selectedASInModal);
//             onClose();
//         }
//     };

//     return (
//         <>
//             <Dialog open={isOpen} onOpenChange={onClose}>
//                 <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
//                     <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
//                         <DialogHeader className="mb-4 p-4 pb-0">
//                             <DialogTitle>Select Sale Invoice</DialogTitle>
//                             <div className="mt-2 flex items-center gap-2">
//                                 <Input
//                                     placeholder="Search by account, name, cellphone or telephone"
//                                     value={filters.search || ''}
//                                     onChange={(e) => setFilters({ ...filters, search: e.target.value })}
//                                     onKeyDown={handleKeyDown}
//                                     className="max-w-sm p-1"
//                                 />
//                                 <FilterActionButtons
//                                     onApplyFilters={handleApplyFilters}
//                                     onClearClick={handleClearSearch}
//                                     showClearButton={showClearButton}
//                                 />
//                             </div>
//                         </DialogHeader>
//                         <div className="flex-1 overflow-hidden px-4">
//                             <div className="h-full overflow-y-auto">
//                                 <ListOnlyTable
//                                     columns={cashSaleColumns}
//                                     data={cashSales?.data?.rows || []}
//                                     onRowClick={handleRowClick}
//                                     selectedRowKey={selectedASInModal?.id}
//                                     rowKeyExtractor={(row) => row.id}
//                                     pagination={pagination}
//                                     setPagination={setPagination}
//                                     totalCount={cashSales?.data?.count}
//                                     // Optional: You can pass a className for disabled rows if your table supports it
//                                     // rowClassName={(row) =>
//                                     //     !isRowSelectable(row) ? 'opacity-60 pointer-events-none bg-muted/50' : ''
//                                     // }
//                                 />
//                             </div>
//                         </div>
//                         <DialogFooter className="flex justify-between p-4 pt-0">
//                             <Button variant="outline" onClick={onClose}>
//                                 Cancel
//                             </Button>
//                             <Button 
//                                 onClick={handleSelectAndClose} 
//                                 disabled={!selectedASInModal || !isRowSelectable(selectedASInModal)}
//                             >
//                                 Select Invoice
//                             </Button>
//                         </DialogFooter>
//                     </PageLoader>
//                 </DialogContent>
//             </Dialog>
//             {printData && <CashSaleInvoiceDialog printData={printData} onClose={onCloseInvoiceDialog} />}
//         </>
//     );
// }
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListOnlyTable } from '@/components/list-only-table';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { PageLoader } from '@/components/custom-components/PageLoader';
import moment from 'moment';
import { Eye, Mail, Phone, User } from 'lucide-react';
import CashSaleInvoiceDialog from '../point-of-sale/cash-sales/invoice/invoice-dialog';
import {
    useGetCashSales,
    FilterProps,
    CashSalesDetails,
    CashSaleInvoiceType,
} from '@/api-queries/point-of-sale/cash-sales';

interface CashSaleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCashSale: (accountSale: CashSalesDetails) => void;
}

const NON_SELECTABLE_STATUSES = ['REFUNDED', 'PARTIALLY_REFUNDED'];

const STATUS_FILTER_OPTIONS = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'REFUNDED', label: 'Refunded' },
    { value: 'PARTIALLY_REFUNDED', label: 'Partially Refunded' },
];

export function CashSaleDialog({ isOpen, onClose, onSelectCashSale }: CashSaleDialogProps) {
    const initialFilters = {
        search: '',
        status: 'ALL',
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

    const [selectedASInModal, setSelectedASInModal] = useState<CashSalesDetails | null>(null);

    const { data: cashSales, isLoading } = useGetCashSales({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        filters: {
            ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
            ...(appliedFilters?.status && appliedFilters.status !== 'ALL'
                ? { status: appliedFilters.status }
                : {}),
        },
    });

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'REFUNDED':
                return <Badge variant="destructive">Refunded</Badge>;
            case 'PARTIALLY_REFUNDED':
                return <Badge variant="secondary">Partially Refunded</Badge>;
            default:
                return <Badge variant="outline">Active</Badge>;
        }
    };

    const cashSaleColumns = [
        {
            key: 'invoiceNumber',
            label: 'Invoice Number',
            className: 'hidden md:table-cell',
            render: (row: CashSalesDetails) => {
                const id = row.id;
                return <div>#INV{id?.slice(0, 8)?.toUpperCase() || 'N/A'}</div>;
            },
        },
        {
            key: 'invoiceDate',
            label: 'Invoice Date',
            render: (row: CashSalesDetails) => {
                const invoiceDate = row.invoiceDate;
                return <div>{invoiceDate ? moment(invoiceDate).format('Do MMM, YY') : 'N/A'}</div>;
            },
        },
        {
            key: 'SalesRepresentative',
            label: 'Representative',
            render: (row: CashSalesDetails) => {
                const salesRepresentative = row?.SalesRepresentative;

                return salesRepresentative ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {salesRepresentative?.name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {salesRepresentative?.email || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {salesRepresentative?.cellNumber || 'N/A'}
                        </div>
                    </div>
                ) : (
                    'N/A'
                );
            },
        },
        {
            key: 'totalQuantity',
            label: 'Total Products',
            className: 'flex-1',
            render: (row: CashSalesDetails) => {
                const totalQuantity =
                    row.PosCashSaleOrderItems.reduce((acc, item) => acc + (item.quantity || 0), 0) || 0;

                return <div>{totalQuantity}</div>;
            },
        },
        {
            key: 'status',
            label: 'Status',
            className: 'text-center',
            render: (row: CashSalesDetails) => (
                <div className="flex items-center justify-center">{getStatusBadge(row.status)}</div>
            ),
        },
        {
            key: 'view',
            label: 'View',
            className: 'text-center',
            render: (row: CashSalesDetails) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => onViewInvoice(row)}
                        className="h-8 w-8 p-0"
                        title="View Invoice"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
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

    const handleStatusFilterChange = (value: string) => {
        const updatedFilters = { ...filters, status: value };
        setFilters(updatedFilters);
        handleFilters(updatedFilters);
    };

    const [printData, setPrintData] = useState<CashSaleInvoiceType | null>(null);

    const onViewInvoice = (data: CashSalesDetails) => {
        setPrintData({
            cashSales: data,
            cartItems: data.PosCashSaleOrderItems,
            paymentMethod: data?.PosTenderType || '',
            debtor: data?.PosDebtor || null,
            appliedDiscount: {
                id: data.voucherId ? data.voucherId : data.couponId ? data.couponId : '',
                type: data.voucherId ? data.Voucher?.type : data.couponId ? data.Coupon?.type : '',
                value: data?.voucherId ? data.voucherAmount || 0 : data?.couponId ? data?.couponAmount || 0 : 0,
                description: data.voucherId ? data.Voucher?.description : data.couponId ? data.Coupon?.description : '',
            },
            invoiceDate: data?.createdAt,
        });
    };

    const onCloseInvoiceDialog = () => {
        setPrintData(null);
    };

    useEffect(() => {
        if (isOpen) {
            handleClearSearch();
            setSelectedASInModal(null);
        }
    }, [isOpen]);

    const isRowSelectable = (row: CashSalesDetails): boolean => {
        return !NON_SELECTABLE_STATUSES.includes(row.status as string);
    };

    const handleRowClick = (row: CashSalesDetails) => {
        if (isRowSelectable(row)) {
            setSelectedASInModal(row);
        }
    };

    const handleSelectAndClose = () => {
        if (selectedASInModal && isRowSelectable(selectedASInModal)) {
            onSelectCashSale(selectedASInModal);
            onClose();
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="flex h-[95vh] w-[80vw] !max-w-none flex-col gap-2 overflow-hidden p-0">
                    <PageLoader isLoading={isLoading} width="w-[80vw]" height="h-[95vh]">
                        <DialogHeader className="mb-4 p-4 pb-0">
                            <DialogTitle>Select Sale Invoice</DialogTitle>
                            <div className="mt-2 flex items-center gap-2">
                                <Input
                                    placeholder="Search by account, name, cellphone or telephone"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={handleKeyDown}
                                    className="max-w-sm p-1"
                                />
                                <Select
                                    value={filters.status || 'ALL'}
                                    onValueChange={handleStatusFilterChange}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_FILTER_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
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
                                    columns={cashSaleColumns}
                                    data={cashSales?.data?.rows || []}
                                    onRowClick={handleRowClick}
                                    selectedRowKey={selectedASInModal?.id}
                                    rowKeyExtractor={(row) => row.id}
                                    pagination={pagination}
                                    setPagination={setPagination}
                                    totalCount={cashSales?.data?.count}
                                    rowClassName={(row: CashSalesDetails) =>
                                        !isRowSelectable(row) ? 'opacity-60 pointer-events-none bg-muted/50' : ''
                                    }
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex justify-between p-4 pt-0">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleSelectAndClose} 
                                disabled={!selectedASInModal || !isRowSelectable(selectedASInModal)}
                            >
                                Select Invoice
                            </Button>
                        </DialogFooter>
                    </PageLoader>
                </DialogContent>
            </Dialog>
            {printData && <CashSaleInvoiceDialog printData={printData} onClose={onCloseInvoiceDialog} />}
        </>
    );
}