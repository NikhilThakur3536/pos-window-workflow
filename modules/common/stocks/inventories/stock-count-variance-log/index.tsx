import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Box, QrCode, ArrowLeft, User, Warehouse, Store, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { type ColumnDef } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import moment from 'moment';
import { useRouter } from 'next/router';
import { FilterProps, StockInventoryLogDetails, useGetStockInventoryLogs } from '@/api-queries/company/stock-logs';
import { useGetUsers, UserDetails } from '@/api-queries/user';
import { useAuthUser } from '@/stores/auth-user.store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectPopover from '@/components/select-popover';
import { useGetWarehouses } from '@/api-queries/warehouse';
import { useDebtorList } from '@/api-queries/debtor';
import { Badge } from '@/components/ui/badge';

interface StockCountVarianceLogProps {
    stockId?: string;
}

const StockCountVarianceLog = ({ stockId }: StockCountVarianceLogProps) => {
    const router = useRouter();

    const userType = useAuthUser((state) => state.user?.userType);
    const isScopedUser = userType === 'COMPANY-DEBTOR-USER' || userType === 'WAREHOUSE-USER';

    const [startDate, setStartDate] = useState(moment().startOf('month').format('YYYY-MM-DD'));
    const [endDate, setEndDate] = useState(moment().endOf('month').format('YYYY-MM-DD'));
    const [warehouseId, setWarehouseId] = useState('');
    const [debtorId, setDebtorId] = useState('');
    const [createdById, setCreatedById] = useState<string>('');

    const initialFilters: FilterProps = {};
    const { pagination, setPagination } = useTableFilters<FilterProps>(initialFilters);

    const query = useGetStockInventoryLogs({
        physicalCountOnly: true,
        ...(stockId ? { companyStockDetailId: stockId } : {}),
        ...(startDate ? { startDate: moment(startDate).startOf('day').toISOString() } : {}),
        ...(endDate ? { endDate: moment(endDate).endOf('day').toISOString() } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(debtorId ? { companyDebtorId: debtorId } : {}),
        ...(createdById ? { createdBy: createdById } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const { data: stockInventoryLogs, isLoading } = query;
    const totalRowCount = query?.data?.data?.count || 0;
    const tableData = useMemo(() => stockInventoryLogs?.data?.rows || [], [stockInventoryLogs?.data?.rows]);

    const warehousesRes = useGetWarehouses({ limit: 1000, offset: 0 });
    const rawWarehouses: unknown = warehousesRes?.data?.data;
    const warehouses = Array.isArray(rawWarehouses) ? rawWarehouses : (rawWarehouses as { rows?: [] } | undefined)?.rows || [];

    const debtorsRes = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' });
    const debtors = debtorsRes?.data?.data?.rows || [];

    const usersRes = useGetUsers({ status: 'ACTIVE', limit: 1000, offset: 0 });
    const rawUsers: unknown = usersRes?.data?.data;
    const users = Array.isArray(rawUsers) ? rawUsers : (rawUsers as { rows?: UserDetails[] } | undefined)?.rows || [];

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
            accessorKey: 'CompanyStockWarehouse.warehouse',
            header: 'Warehouse',
            cell: ({ row }) => {
                const wh = row.original.CompanyStockWarehouse || row.original.warehouse;
                // The API pads these values, e.g. "warehouse1 ", so trim before display.
                const name = (wh?.warehouse || wh?.name || wh?.description || '').trim();
                if (!name) {
                    return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Warehouse className="!h-4 !w-4" /> —
                        </div>
                    );
                }
                return (
                    <div className="flex items-center gap-2">
                        <Warehouse className="!h-4 !w-4" /> {name}
                    </div>
                );
            },
        },
        {
            accessorKey: 'CompanyDebtor.name',
            header: 'Store',
            cell: ({ row }) => {
                const debtor = row.original.CompanyDebtor || row.original.companyDebtor;
                const name = (debtor?.name || '').trim();
                if (!name) {
                    return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Store className="!h-4 !w-4" /> —
                        </div>
                    );
                }
                const accountNumber = (debtor?.accountNumber || '').trim();
                return (
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <Store className="!h-4 !w-4" /> {name}
                        </div>
                        {accountNumber ? (
                            <div className="pl-6 text-xs text-muted-foreground">{accountNumber}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'previousStock',
            header: 'Previous Stock',
            cell: ({ row }) => <div>{row.original.previousStock ?? '—'}</div>,
        },
        {
            accessorKey: 'newStock',
            header: 'Counted Stock',
            cell: ({ row }) => <div className="font-semibold">{row.original.newStock ?? '—'}</div>,
        },
        {
            accessorKey: 'variance',
            header: 'Variance',
            cell: ({ row }) => {
                const variance = row.original.variance ?? (row.original.newStock || 0) - (row.original.previousStock || 0);
                const ClassName =
                    variance > 0
                        ? 'text-green-700'
                        : variance < 0
                          ? 'text-red-600'
                          : 'text-muted-foreground';
                return (
                    <div className={`flex items-center gap-1 font-semibold ${ClassName}`}>
                        {variance > 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                        ) : variance < 0 ? (
                            <ArrowDownRight className="h-4 w-4" />
                        ) : (
                            <Minus className="h-4 w-4" />
                        )}
                        {variance}
                    </div>
                );
            },
        },
        {
            accessorKey: 'quantity',
            header: 'Quantity',
            cell: ({ row }) => <div>{row.original.quantity ?? '—'}</div>,
        },
        {
            accessorKey: 'addedByUser.name',
            header: 'Counted By',
            cell: ({ row }) => {
                const addedBy = row.original.addedByUser;
                const name =
                    typeof addedBy === 'string'
                        ? addedBy
                        : addedBy?.firstName
                          ? `${addedBy.firstName} ${addedBy.surname || ''}`
                          : row.original.createdByUser?.firstName
                            ? `${row.original.createdByUser.firstName} ${row.original.createdByUser.surname || ''}`
                            : '—';
                return (
                    <div className="flex items-center gap-2">
                        <User className="!h-4 !w-4" /> {name}
                    </div>
                );
            },
        },
        {
            accessorKey: 'remarks',
            header: 'Remarks',
            cell: ({ row }) => <div className="max-w-[200px]">{row.original.remarks || '—'}</div>,
        },
        {
            accessorKey: 'createdAt',
            header: 'Date',
            cell: ({ row }) => (
                <div>
                    {row.original.createdAt ? moment(row.original.createdAt).format('DD MMM, YYYY HH:mm') : '—'}
                </div>
            ),
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
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <div>
                                    <Label className="text-xs">From</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="!w-40"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">To</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="!w-40"
                                    />
                                </div>
                                {!isScopedUser ? (
                                    <>
                                        <div>
                                            <Label className="text-xs">Warehouse</Label>
                                            <SelectPopover
                                                title="Warehouse"
                                                onlyTitle="All warehouses"
                                                selectedValue={warehouseId}
options={[
                                            { label: 'All warehouses', value: '' },
                                            ...(warehouses as { id: string; name?: string; warehouse?: string; groupCode?: string }[]).map((w) => ({
                                                label: w.name || w.warehouse || w.groupCode || 'Warehouse',
                                                value: w.id,
                                            })),
                                        ]}
                                                onSelect={(val) => setWarehouseId(String(val || ''))}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Debtor / Store</Label>
                                            <SelectPopover
                                                title="Debtor / Store"
                                                onlyTitle="All stores"
                                                selectedValue={debtorId}
                                                options={[
                                                    { label: 'All stores', value: '' },
                                                    ...debtors.map((d: { id: string; name?: string; accountNumber?: string }) => ({
                                                        label: `${d.name || ''} (${d.accountNumber || ''})`,
                                                        value: d.id,
                                                    })),
                                                ]}
                                                onSelect={(val) => setDebtorId(String(val || ''))}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Counted By</Label>
                                            <SelectPopover
                                                title="Counted By"
                                                onlyTitle="All users"
                                                selectedValue={createdById}
                                                options={[
                                                    { label: 'All users', value: '' },
                                                    ...users.map((u: UserDetails) => ({
                                                        label: `${u.firstName || ''} ${u.surname || ''}`.trim() || u.id,
                                                        value: u.id,
                                                    })),
                                                ]}
                                                onSelect={(val) => setCreatedById(String(val || ''))}
                                            />
                                        </div>
                                    </>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="gap-1">
                                    {totalRowCount} physical counts
                                </Badge>
                                <Button
                                    variant="secondary"
                                    onClick={() => router.push('/stocks/inventory')}
                                    className="flex items-center gap-2"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Back
                                </Button>
                            </div>
                        </div>
                        <div className="text-lg font-bold">Stock Count Variance Log</div>
                    </DataTable>
                )}
            </div>
        </PageLoader>
    );
};

export default StockCountVarianceLog;