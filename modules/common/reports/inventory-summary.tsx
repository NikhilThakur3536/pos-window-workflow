import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Plus, Filter } from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { useAuthUser } from '@/stores/auth-user.store';
import moment from 'moment';
import { Separator } from '@/components/ui/separator';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import ExportSheets from '@/components/export-sheets';

import {
    InventorySummaryReportPayload,
    InventorySummaryItem,
    useInventorySummaryReport,
    InventorySummaryReportType,
    InventorySortBy,
} from '@/api-queries/reports/inventory-summary';

import { useGetWarehouses } from '@/api-queries/warehouse';

const InventorySummaryReport = () => {
    const userGroupPermissions = useUsersPermissions();
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const initialFilters: Partial<InventorySummaryReportPayload> = {
        reportType: 'COMBINED' as InventorySummaryReportType,
        search: '',
        sortBy: 'itemCode' as InventorySortBy,
        sortOrder: 'asc',
    };

    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 20,
    });

    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<InventorySummaryReportPayload>(initialFilters);

    const payload = useMemo<InventorySummaryReportPayload>(() => ({
        ...appliedFilters,
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    }), [appliedFilters, pagination]);

    const mutation = useInventorySummaryReport();
    const { data, isPending: isLoading } = mutation;

    const exportMutation = useInventorySummaryReport();

    useEffect(() => {
        mutation.mutate(payload);
    }, [payload]);

    const reportData = (data?.rows || []) as InventorySummaryItem[];
    const summary = data?.summary;
    const totalRowCount = data?.totalCount || 0;

    const { data: warehousesData, isLoading: isLoadingWarehouses } = useGetWarehouses({
        limit: 100,
    });

    const warehouses = warehousesData?.data || warehousesData?.rows || [];

    const columns: ColumnDef<InventorySummaryItem>[] = [
        {
            accessorKey: 'itemCode',
            header: (data) => <TableHeaderToggle {...data}>Item Code</TableHeaderToggle>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div className="max-w-md truncate">{row.getValue('description')}</div>,
        },
        {
            accessorKey: 'category',
            header: 'Category',
        },
        {
            accessorKey: 'batch',
            header: 'Batch',
        },
        {
            accessorKey: 'expiry',
            header: 'Expiry',
            cell: ({ row }) => {
                const date = row.original.expiry;
                return date ? moment(date).format('DD MMM YYYY') : 'No Expiry';
            },
        },
        {
            accessorKey: 'storeDebtor',
            header: 'Store / Debtor',
            cell: ({ row }) => (
                <div>
                    <div>{row.original.storeDebtor || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">{row.original.debtorAccountNumber || ''}</div>
                </div>
            ),
        },
        {
            accessorKey: 'warehouse',
            header: 'Warehouse / Store',
        },
        {
            accessorKey: 'stockOnHand',
            header: 'Stock On Hand',
            cell: ({ row }) => <div className="font-medium">{row.getValue('stockOnHand') || 0}</div>,
        },
        {
            accessorKey: 'available',
            header: 'Available',
        },
        {
            accessorKey: 'reserved',
            header: 'Reserved',
        },
        {
            accessorKey: 'free',
            header: 'Free Stock',
        },
        {
            accessorKey: 'unitCost',
            header: 'Unit Cost',
            cell: ({ row }) => `${currencySymbol} ${(+row.getValue('unitCost') || 0).toFixed(2)}`,
        },
        {
            accessorKey: 'totalValue',
            header: 'Total Value',
            cell: ({ row }) => (
                <div className="font-bold">
                    {currencySymbol} {(+row.getValue('totalValue') || 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => (
                <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    row.original.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                    {row.original.status || 'N/A'}
                </div>
            ),
        },
        {
            id: 'view',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <Button variant="ghost" size="sm" onClick={() => console.log('View details', row.original)}>
                    <Eye className="h-4 w-4" />
                </Button>
            ),
        },
    ];

    const downloadCSV = async () => {
        try {
            const exportPayload = {
                ...payload,
                isCsv: true,
                csvLabel: 'Inventory_Summary_Report',
            };

            const result = await exportMutation.mutateAsync(exportPayload);

            let blob: Blob;

            if (result instanceof Blob) {
                blob = result;
            } 
            else if (result?.data instanceof Blob) {
                blob = result.data;
            } 
            else if (typeof result === 'string' && result.startsWith('PK')) {
                blob = new Blob([result], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
            } 
            else if (result instanceof ArrayBuffer) {
                blob = new Blob([result], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });
            } 
            else {
                console.error('Unexpected response:', result);
                alert('Export failed: Unknown response format.');
                return;
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Inventory_Summary_Report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Export Error:', error);
            alert('Failed to download report. Please try again.');
        }
    };

    const applyFilters = () => {
        handleFilters(filters);
        setShowAdvancedFilters(false);
    };

    const resetAllFilters = () => {
        clearFilters();
        setShowAdvancedFilters(false);
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">Inventory Summary Report</div>

                    <div className="flex items-center gap-2">
                        <ExportSheets downloadCSV={downloadCSV} />

                        <Button variant="outline" onClick={() => setShowAdvancedFilters(true)}>
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>

                        {/* <Button
                            onClick={() => {
                                if (
                                    hasPermission(
                                        userGroupPermissions,
                                        SYSTEM_MODULES.PROCESSING.INVENTORY?.code || 'inventory',
                                        [SYSTEM_PERMISSIONS.CREATE]
                                    )
                                ) {
                                    // TODO: Open stock adjustment form
                                } else {
                                    setIsPermissionDeniedOpen(true);
                                }
                            }}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            New Adjustment
                        </Button> */}
                    </div>
                </div>

                {/* Summary Cards */}
                {/* {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        <div className="bg-card p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">Total Products</p>
                            <p className="text-2xl font-bold">{summary.totalProducts ?? 0}</p>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">Total SKUs</p>
                            <p className="text-2xl font-bold">{summary.totalSkus ?? 0}</p>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">Total Stock On Hand</p>
                            <p className="text-2xl font-bold">{summary.totalStockOnHand ?? 0}</p>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">Total Inventory Value</p>
                            <p className="text-2xl font-bold">
                                {currencySymbol} {(summary.totalInventoryValue ?? 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-card p-4 rounded-lg border">
                            <p className="text-sm text-muted-foreground">Expiring Soon</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {summary.totalExpiringWithin30Days ?? 0}
                            </p>
                        </div>
                    </div>
                )} */}

                <DataTable
                    query={mutation}
                    data={reportData}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex items-center justify-between">
                        <div className="flex w-full items-center gap-2">
                            <Input
                                placeholder="Search by item code, description, batch..."
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="!max-w-md"
                            />

                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                    </div>
                </DataTable>

                <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Filters</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            {/* Basic */}
                            <div>
                                <Label>Report Type</Label>
                                <Select
                                    value={filters.reportType || 'COMBINED'}
                                    onValueChange={(v) =>
                                        setFilters({ ...filters, reportType: v as InventorySummaryReportType })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COMBINED">Combined</SelectItem>
                                        <SelectItem value="COMPANY">Company</SelectItem>
                                        <SelectItem value="STORES">Stores</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Search</Label>
                                <Input
                                    placeholder="Global Search"
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Warehouse</Label>
                                <Select
                                    value={filters.warehouseId || ''}
                                    onValueChange={(value) => setFilters({ ...filters, warehouseId: value || undefined })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Warehouses</SelectItem>
                                        {warehouses?.rows?.map((wh: any) => (
                                            <SelectItem key={wh.id} value={wh.id}>
                                                {wh.name || wh.warehouse || wh.code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Item Code</Label>
                                <Input
                                    placeholder="Item Code"
                                    value={filters.itemCode || ''}
                                    onChange={(e) => setFilters({ ...filters, itemCode: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input
                                    placeholder="Description"
                                    value={filters.description || ''}
                                    onChange={(e) => setFilters({ ...filters, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Batch Number</Label>
                                <Input
                                    placeholder="Batch Number"
                                    value={filters.batchNumber || ''}
                                    onChange={(e) => setFilters({ ...filters, batchNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Expiry From</Label>
                                <Input
                                    type="date"
                                    value={filters.expiryFrom || ''}
                                    onChange={(e) => setFilters({ ...filters, expiryFrom: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Expiry To</Label>
                                <Input
                                    type="date"
                                    value={filters.expiryTo || ''}
                                    onChange={(e) => setFilters({ ...filters, expiryTo: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Stock On Hand Min</Label>
                                <Input
                                    type="number"
                                    value={filters.stockOnHandMin ?? ''}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            stockOnHandMin: e.target.value ? Number(e.target.value) : undefined,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>Stock On Hand Max</Label>
                                <Input
                                    type="number"
                                    value={filters.stockOnHandMax ?? ''}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            stockOnHandMax: e.target.value ? Number(e.target.value) : undefined,
                                        })
                                    }
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="mb-3 block">Status Flags</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {[
                                        { key: 'negativeStock', label: 'Negative Stock' },
                                        { key: 'zeroStock', label: 'Zero Stock' },
                                        { key: 'lowStock', label: 'Low Stock' },
                                        { key: 'expiredOnly', label: 'Expired Only' },
                                        { key: 'nonExpiredOnly', label: 'Non-Expired Only' },
                                        { key: 'noExpiry', label: 'No Expiry' },
                                    ].map(({ key, label }) => (
                                        <div key={key} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={key}
                                                checked={!!(filters as any)[key]}
                                                onCheckedChange={(checked) =>
                                                    setFilters({ ...filters, [key]: checked })
                                                }
                                            />
                                            <Label htmlFor={key}>{label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={resetAllFilters}>
                                Reset All
                            </Button>
                            <Button variant="outline" onClick={() => setShowAdvancedFilters(false)}>
                                Cancel
                            </Button>
                            <Button onClick={applyFilters}>Apply Filters</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <ViewAccessDeniedDialog
                    open={isPermissionDeniedOpen}
                    onClose={() => setIsPermissionDeniedOpen(false)}
                    options={{ description: "You don't have permission to perform this action." }}
                />
            </div>
        </PageLoader>
    );
};

export default InventorySummaryReport;