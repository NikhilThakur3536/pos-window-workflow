'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, History, Plus, Users } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { Input } from '@/components/ui/input';
import SelectPopover from '@/components/select-popover';
import ExportSheets from '@/components/export-sheets';
import moment from 'moment';
import { useAuthUser } from '@/stores/auth-user.store';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import {
    PURCHASE_ORDER_STATUSES,
    PurchaseOrderDetails,
    PurchaseOrderListFilters,
    getPurchaseOrderList,
    useGetPurchaseOrderList,
} from '@/api-queries/purchase-orders';
import { useCreditorList } from '@/api-queries/creditor';
import PurchaseOrderForm from './purchase-order-form';
import PurchaseOrderView from './purchase-order-view';
import MultiSupplierPOForm from './multi-supplier-po-form';
import ProductHistoryDialog from './product-history-dialog';
import { docTotal, docLineItems } from './amounts';

const PurchaseOrdersTab = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isMultiFormOpen, setIsMultiFormOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const suppliers = useCreditorList({})?.data?.data?.rows || [];

    const initialFilters: PurchaseOrderListFilters = {
        search: '',
        status: '',
        companyCreditorId: '',
        poGroupId: '',
    };

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<PurchaseOrderListFilters>(initialFilters);

    const query = useGetPurchaseOrderList({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters?.status } : {}),
        ...(appliedFilters?.companyCreditorId ? { companyCreditorId: appliedFilters?.companyCreditorId } : {}),
        ...(appliedFilters?.poGroupId ? { poGroupId: appliedFilters?.poGroupId } : {}),
    });

    const { data: purchaseOrders, isLoading } = query;
    const totalRowCount = query?.data?.total || 0;

    const columns: ColumnDef<PurchaseOrderDetails>[] = [
        {
            accessorKey: 'poNumber',
            header: (data) => <TableHeaderToggle {...data}>Order</TableHeaderToggle>,
            cell: ({ row }) => (
                <>
                    <div>{row.original.poNumber || row.original.orderNumber || row.original.id?.slice(0, 8) || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">
                        {row.original.orderDate
                            ? moment(row.original.orderDate).format('Do MMM, YY')
                            : row.original.createdAt
                              ? moment(row.original.createdAt).format('Do MMM, YY')
                              : 'N/A'}
                    </div>
                </>
            ),
        },
        {
            accessorKey: 'companyCreditor',
            header: (data) => <TableHeaderToggle {...data}>Supplier</TableHeaderToggle>,
            cell: ({ row }) => {
                const supplier = row.original?.CompanyCreditor;
                return (
                    <div>
                        <div>{supplier?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                            {supplier?.accountNumber ? `Acct: ${supplier.accountNumber}` : ''}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'poGroupId',
            header: (data) => <TableHeaderToggle {...data}>Group</TableHeaderToggle>,
            cell: ({ row }) => {
                const groupId = row.original.poGroupId;
                const groupName = row.original.poGroupName;
                if (!groupId) return <div className="text-muted-foreground">—</div>;
                const label = groupName || groupId;
                return (
                    <button
                        className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                        title={`Filter by group ${label}`}
                        onClick={() => {
                            setFilters({ ...filters, poGroupId: groupId });
                            handleFilters({ ...filters, poGroupId: groupId });
                        }}
                    >
                        {label}
                    </button>
                );
            },
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Status</TableHeaderToggle>,
            cell: ({ row }) => {
                const status = row.original.status;
                const color =
                    status === 'CANCELLED'
                        ? 'text-red-600'
                        : status === 'COMPLETED'
                          ? 'text-green-600'
                          : status === 'CONFIRMED' || status === 'APPROVED'
                            ? 'text-blue-600'
                            : 'text-amber-600';
                return <span className={`font-medium ${color}`}>{status || 'N/A'}</span>;
            },
        },
        {
            accessorKey: 'expectedDeliveryDate',
            header: (data) => <TableHeaderToggle {...data}>Expected Delivery</TableHeaderToggle>,
            cell: ({ row }) =>
                row.original.expectedDeliveryDate
                    ? moment(row.original.expectedDeliveryDate).format('DD MMM, YY')
                    : 'N/A',
        },
        {
            accessorKey: 'deliveryCycle',
            header: (data) => <TableHeaderToggle {...data}>Delivery Cycle</TableHeaderToggle>,
            cell: ({ row }) => row.original.deliveryCycle || 'N/A',
        },
        {
            accessorKey: 'goodsTotal',
            header: (data) => <TableHeaderToggle {...data}>Goods Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.goodsTotal);
                return <div className="text-right">{row.original.goodsTotal != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'discountAmount',
            header: (data) => <TableHeaderToggle {...data}>Discount</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.discountAmount || 0);
                return <div className="text-right">{row.original.discountAmount != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'taxAmount',
            header: (data) => <TableHeaderToggle {...data}>Tax</TableHeaderToggle>,
            cell: ({ row }) => {
                const value = Number(row.original.taxAmount || 0);
                return <div className="text-right">{row.original.taxAmount != null ? `${currencySymbol} ${value.toFixed(2)}` : '—'}</div>;
            },
        },
        {
            accessorKey: 'grandTotal',
            header: (data) => <TableHeaderToggle {...data}>Grand Total</TableHeaderToggle>,
            cell: ({ row }) => {
                const total = docTotal(row.original, docLineItems(row.original));
                return (
                    <div>
                        {currencySymbol} {total > 0 ? total.toFixed(2) : '—'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalQuantity',
            header: (data) => <TableHeaderToggle {...data}>Quantity</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>
                    {row.original.totalQuantity != null ? Number(row.original.totalQuantity) : 'N/A'}
                    {row.original.receivedQuantity != null &&
                        Number(row.original.receivedQuantity) > 0 && (
                        <div className="text-xs text-muted-foreground">
                            Received: {Number(row.original.receivedQuantity)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'addedByUser',
            header: (data) => <TableHeaderToggle {...data}>Added By</TableHeaderToggle>,
            cell: ({ row }) => row.original.addedByUser || 'N/A',
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        title="View / Trace / Update Status"
                        onClick={() => setSelectedOrderId(row.original.id)}
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

    const onClosePermissionDenied = () => {
        setIsPermissionDeniedOpen(false);
    };

    async function downloadCSV() {
        getPurchaseOrderList({
            isCsv: true,
            csvLabel: 'Purchase_Orders',
            ...(appliedFilters?.search ? { search: appliedFilters?.search } : {}),
            ...(appliedFilters?.status ? { status: appliedFilters?.status } : {}),
            ...(appliedFilters?.companyCreditorId
                ? { companyCreditorId: appliedFilters?.companyCreditorId }
                : {}),
        });
    }

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={query}
                    data={purchaseOrders?.data || []}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full flex-wrap items-center gap-2">
                            <Input
                                placeholder="Search by order / supplier..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-sm"
                            />
                            <SelectPopover
                                title="Status"
                                onlyTitle="All Statuses"
                                selectedValue={filters.status || ''}
                                onSelect={(val) => setFilters({ ...filters, status: String(val || '') })}
                                options={PURCHASE_ORDER_STATUSES.map((s) => ({ label: s, value: s }))}
                            />
                            <SelectPopover
                                title="Supplier"
                                onlyTitle="All Suppliers"
                                selectedValue={filters.companyCreditorId || ''}
                                onSelect={(val) => setFilters({ ...filters, companyCreditorId: String(val || '') })}
                                options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
                            />
                            <Input
                                placeholder="Group ID..."
                                value={filters.poGroupId || ''}
                                onChange={(e) => setFilters({ ...filters, poGroupId: e.target.value })}
                                onKeyDown={handleKeyDown}
                                className="!max-w-[160px]"
                            />
                            <FilterActionButtons
                                onApplyFilters={handleApplyFilters}
                                onClearClick={handleClearSearch}
                                showClearButton={showClearButton}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <ExportSheets downloadCSV={downloadCSV} />
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code,
                                            [SYSTEM_PERMISSIONS.READ],
                                        )
                                    ) {
                                        setIsHistoryOpen(true);
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <History className="h-4 w-4" />
                                Purchase History
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        setIsMultiFormOpen(true);
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Users className="h-4 w-4" />
                                Multi-Supplier PO
                            </Button>
                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.PROCESSING.PURCHASE_ORDERS.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        setIsFormOpen(true);
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                        return;
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Purchase Order
                            </Button>
                        </div>
                    </div>
                </DataTable>

                <PurchaseOrderForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
                <MultiSupplierPOForm open={isMultiFormOpen} onClose={() => setIsMultiFormOpen(false)} />
                <ProductHistoryDialog open={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

                <PurchaseOrderView orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
            </div>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={onClosePermissionDenied}
                options={{ description: "You don't have access to add/update the purchase orders." }}
            />
        </PageLoader>
    );
};

export default PurchaseOrdersTab;
