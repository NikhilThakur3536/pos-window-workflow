import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import { Eye, Printer } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import {
    useGetCashOfficeConfigurations,
    useGetCashOfficeHandovers,
    type CashOfficeConfiguration,
    type CashOfficeHandover,
} from '@/api-queries/cash-office';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    CashOfficeStatusBadge,
    formatMoney,
    formatDateTime,
    varianceClassName,
} from './shared';
import { CashOfficeHandoverReceiptDialog } from './handover-receipt-dialog';

const ReceiptsModule = () => {
    const userType = useAuthUser((state) => state.user?.userType);
    const myDebtorId = useAuthUser((state) => state.user?.companyDebtorId) || '';
    const myWarehouseId = useAuthUser((state) => state.user?.warehouseId) || '';

    const isDebtorUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const initialFilters = { cashOfficeId: '', status: 'ACKNOWLEDGED' };
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<typeof initialFilters>(initialFilters);

    const configsQuery = useGetCashOfficeConfigurations({
        ...(isDebtorUser ? { companyDebtorId: myDebtorId } : {}),
        ...(isWarehouseUser ? { companyWarehouseId: myWarehouseId } : {}),
        limit: 200,
        offset: 0,
    });
    const configs: CashOfficeConfiguration[] = configsQuery?.data?.data?.rows || [];

    const listQuery = useGetCashOfficeHandovers({
        ...(appliedFilters.cashOfficeId ? { cashOfficeId: appliedFilters.cashOfficeId } : {}),
        ...(appliedFilters.status ? { status: appliedFilters.status } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const rows: CashOfficeHandover[] = listQuery?.data?.data?.rows || [];
    const totalRowCount = listQuery?.data?.data?.count || 0;

    const [receiptId, setReceiptId] = useState('');
    const [autoPrint, setAutoPrint] = useState(false);

    const openReceipt = (id: string) => {
        setAutoPrint(false);
        setReceiptId(id);
    };

    const handlePrint = (row: CashOfficeHandover) => {
        setAutoPrint(true);
        setReceiptId(row.id);
    };

    const closeReceipt = () => {
        setReceiptId('');
        setAutoPrint(false);
    };

    const columns: ColumnDef<CashOfficeHandover>[] = [
        { accessorKey: 'receiptNumber', header: 'Receipt', cell: ({ row }) => <div className="font-semibold">{row.original.receiptNumber || row.original.clientDocumentId || '—'}</div> },
        { id: 'requestedBy', header: 'Requested By', cell: ({ row }) => <div>{row.original.requestedByName || row.original.requestedByUser?.name || '—'}</div> },
        {
            accessorKey: 'declaredAmount',
            header: 'Declared (Cash / Chq)',
            cell: ({ row }) => (
                <div>{formatMoney(row.original.declaredCashAmount || 0)} <span className="text-muted-foreground">/ {formatMoney(row.original.declaredChequeAmount || 0)}</span></div>
            ),
        },
        {
            accessorKey: 'countedAmount',
            header: 'Counted (Cash / Chq)',
            cell: ({ row }) => (
                <div>{formatMoney(row.original.countedCashAmount || 0)} <span className="text-muted-foreground">/ {formatMoney(row.original.countedChequeAmount || 0)}</span></div>
            ),
        },
        {
            id: 'variance',
            header: 'Variance',
            cell: ({ row }) => {
                const v = row.original.varianceAmount ?? row.original.variance;
                return <div className={`font-semibold ${varianceClassName(Number(v) || 0)}`}>{v != null ? formatMoney(v) : '—'}</div>;
            },
        },
        { accessorKey: 'status', header: 'Status', cell: ({ row }) => <CashOfficeStatusBadge status={row.original.status} /> },
        { accessorKey: 'receivedAt', header: 'Received', cell: ({ row }) => <div>{formatDateTime(row.original.receivedAt || row.original.countedAt || row.original.createdAt)}</div> },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="View receipt" onClick={() => openReceipt(row.original.id)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" title="Print receipt" onClick={() => handlePrint(row.original)}>
                        <Printer className="mr-1 h-3.5 w-3.5" /> Print
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={listQuery.isLoading || configsQuery.isLoading}>
            <div className="space-y-2 p-3">
                <DataTable
                    query={listQuery}
                    data={rows}
                    columns={columns}
                    totalRowCount={totalRowCount}
                    pagination={pagination}
                    setPagination={setPagination}
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <SelectPopover
                            title="Cash Office"
                            onlyTitle="All cash offices"
                            selectedValue={filters.cashOfficeId}
                            options={[
                                { label: 'All cash offices', value: '' },
                                ...configs.map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
                            ]}
                            onSelect={(val) => handleFilters({ ...filters, cashOfficeId: String(val || '') })}
                        />
                        <SelectPopover
                            title="Status"
                            onlyTitle="All statuses"
                            selectedValue={filters.status}
                            options={[
                                { label: 'All statuses', value: '' },
                                { label: 'Received', value: 'RECEIVED' },
                                { label: 'Acknowledged', value: 'ACKNOWLEDGED' },
                                { label: 'Counted', value: 'COUNTED' },
                                { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
                                { label: 'Rejected', value: 'REJECTED' },
                                { label: 'Reversed', value: 'REVERSED' },
                            ]}
                            onSelect={(val) => handleFilters({ ...filters, status: String(val || '') })}
                        />
                        <FilterActionButtons
                            onApplyFilters={() => handleFilters(filters)}
                            onClearClick={() => clearFilters()}
                            showClearButton={showClearButton}
                        />
                    </div>
                    <div className="text-lg font-bold">Cash Office Receipts</div>
                </DataTable>
            </div>

            <CashOfficeHandoverReceiptDialog
                open={!!receiptId}
                handoverId={receiptId}
                autoPrint={autoPrint}
                onClose={closeReceipt}
            />
        </PageLoader>
    );
};

export default ReceiptsModule;