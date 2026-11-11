import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, ArrowLeft, Box, QrCode, Mail, Phone } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import moment from 'moment';
import { useRouter } from 'next/router';
import { useGetStockInventoryLogs, FilterProps, StockInventoryLogDetails } from '@/api-queries/company/stock-logs';
import { useAuthUser } from '@/stores/auth-user.store';
import { Label } from '@/components/ui/label';
import SelectPopover from '@/components/select-popover';

interface StockInventoriesProps {
    stockId?: string;
    inventoryId?: string;
    backHref?: string;
}

const MOVEMENT_SOURCE_TYPE_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'DISPOSITION_WRITE_OFF', label: 'Written Off' },
    { value: 'DISPOSITION_ALLOCATE', label: 'NST Allocated' },
    { value: 'DISPOSITION_RELEASE', label: 'NST Released' },
    { value: 'DISPOSITION_SALE', label: 'NST Sale' },
    { value: 'DISPOSITION_REFUND', label: 'NST Refund' },
    { value: 'DISPOSITION_RETURN', label: 'Returned to Supplier' },
];

const getMovementTag = (sourceType?: string) => {
    switch (sourceType) {
        case 'DISPOSITION_WRITE_OFF':
            return 'Written Off';
        case 'DISPOSITION_ALLOCATE':
            return 'NST Allocated';
        case 'DISPOSITION_RELEASE':
            return 'NST Released';
        case 'DISPOSITION_SALE':
            return 'NST Sale';
        case 'DISPOSITION_REFUND':
            return 'NST Refund';
        case 'DISPOSITION_RETURN':
            return 'Returned to Supplier';
        default:
            return sourceType ? sourceType.replace(/_/g, ' ') : 'N/A';
    }
};

const getStockChange = (variance?: number | null) => {
    const value = Number(variance);
    return Number.isFinite(value) ? value : 0;
};

const StockInventoryLogs = ({ stockId, inventoryId, backHref }: StockInventoriesProps) => {
    const router = useRouter();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const initialFilters = {
        search: '',
    };

    const { pagination, setPagination } = useTableFilters<FilterProps>(initialFilters);
    const [movementSourceType, setMovementSourceType] = useState<string>('');

    // Same endpoint both ways: stock-scoped rows filter on companyStockDetailId,
    // inventory-scoped rows on companyStockInventoryId.
    const query = useGetStockInventoryLogs({
        ...(stockId ? { companyStockDetailId: stockId } : {}),
        ...(inventoryId ? { companyStockInventoryId: inventoryId } : {}),
        ...(movementSourceType ? { sourceType: movementSourceType } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const { data: stockInventoryLogs, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const tableData = useMemo(() => stockInventoryLogs?.data?.rows || [], [stockInventoryLogs?.data?.rows]);

    const columns: ColumnDef<StockInventoryLogDetails>[] = [
        {
            accessorKey: 'CompanyStockDetail.description',
            header: 'Stock Details',
            cell: ({ row }: { row: { original: StockInventoryLogDetails } }) => {
                const name = row?.original?.CompanyStockDetail?.description || 'N/A';
                const itemCode = row?.original?.CompanyStockDetail?.itemCode || 'N/A';
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Box className="!h-4 !w-4" />
                            {name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2">
                            <QrCode className="!h-4 !w-4" /> {itemCode || 'N/A'}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'createdByUser.name',
            header: 'Created By',
            cell: ({ row }) => {
                const user = row?.original?.createdByUser;
                const name = user?.firstName ? `${user?.firstName} ${user?.surname || ''}` : 'N/A';
                const email = user?.email || 'N/A';
                const address = user?.addressOne
                    ? `${user?.addressOne} ${user?.addressTwo ? `, ${user?.addressTwo}` : ''}  ${
                          user?.postCode ? `, ${user?.postCode}` : ''
                      }`
                    : 'N/A';

                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail className="!h-4 !w-4" /> {email}
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="!h-4 !w-4" /> {address}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'batchNumber',
            header: 'Batch Number',
            cell: ({ row }) => <div>{row.getValue('batchNumber')}</div>,
        },
        {
            accessorKey: 'unitCost',
            header: 'Unit Cost',
            cell: ({ row }) => {
                const value = row.original.unitCost;
                return (
                    <div>
                        {currencySymbol} {value ? value.toFixed(2) : '0.00'}
                    </div>
                );
            },
        },
        {
            accessorKey: 'sourceType',
            header: 'Movement',
            cell: ({ row }) => {
                const sourceType = row.original.sourceType;
                const remarks = row.original.remarks;
                const createdAt = row.original.createdAt;
                return (
                    <div className="space-y-1">
                        <div className="font-semibold">{getMovementTag(sourceType)}</div>
                        <div className="text-muted-foreground text-xs">
                            {createdAt ? moment(createdAt).format('DD MMM YYYY, HH:mm') : 'N/A'}
                        </div>
                        {remarks ? <div className="text-muted-foreground text-xs">{remarks}</div> : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'totalValue',
            header: 'Stock Value After Movement',
            cell: ({ row }) => {
                const value = row.original.totalValue;
                return (
                    <div>
                        {currencySymbol} {value ? value.toFixed(2) : '0.00'}
                    </div>
                );
            },
        },
        {
            id: 'stockCounts',
            header: 'Stock Counts',
            cell: ({ row }) => {
                const quantity = row.original.quantity;
                const previousStock = row.original.previousStock;
                const newStock = row.original.newStock;
                const stockChange = getStockChange(row.original.variance);
                return (
                    <div>
                        <div>
                            <span className="font-semibold">Quantity : </span>
                            {quantity || 0}
                        </div>

                        <div>
                            <span className="font-semibold">Stock Change : </span>
                            {stockChange > 0 ? `+${stockChange}` : stockChange < 0 ? `−${Math.abs(stockChange)}` : 0}
                        </div>

                        <div>
                            <span className="font-semibold">Previous Stock : </span>
                            {previousStock || 0}
                        </div>

                        <div>
                            <span className="font-semibold">New Stock : </span>
                            {newStock || 0}
                        </div>
                    </div>
                );
            },
        },
    ];

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                {stockInventoryLogs && (
                    <DataTable
                        query={query}
                        data={tableData || []}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    >
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-lg font-bold">Stock Inventory Logs</div>

                                <Button
                                    variant="secondary"
                                    onClick={() => router.push(backHref || '/stocks')}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label>Movement</Label>
                                <SelectPopover
                                    title="movement"
                                    onlyTitle="All"
                                    selectedValue={movementSourceType || ''}
                                    options={MOVEMENT_SOURCE_TYPE_OPTIONS}
                                    onSelect={(value) => {
                                        setMovementSourceType(value || '');
                                        setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                                    }}
                                    selectClass="h-8 text-xs"
                                />
                            </div>
                        </div>
                    </DataTable>
                )}
            </div>
        </PageLoader>
    );
};

export default StockInventoryLogs;
