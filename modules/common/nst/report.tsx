import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { TableHeaderToggle } from '@/components/table';
import { toast } from 'sonner';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { useDebtorList } from '@/api-queries/debtor';
import { useGetCategories } from '@/api-queries/categories';
import { useGetSubCategories } from '@/api-queries/categories/sub-categories';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useAuthUser } from '@/stores/auth-user.store';
import {
    GetNSTReportProps,
    NSTReportExportFormat,
    NSTReportLine,
    NST_APPROVAL_STATUSES,
    NST_DISPOSITION_TYPES,
    NST_STATUS,
    useExportNSTReport,
    useGetNSTReport,
} from '@/api-queries/nst';
import { Box, Download, QrCode } from 'lucide-react';

interface ReportFilterState {
    companyDebtorId: string;
    warehouseId: string;
    dateFrom: string;
    dateTo: string;
    expiryFrom: string;
    expiryTo: string;
    dispositionType: string;
    status: string;
    approvalStatus: string;
    categoryId: string;
    subCategoryId: string;
    companyStockDetailId: string;
}

const emptyFilters: ReportFilterState = {
    companyDebtorId: '',
    warehouseId: '',
    dateFrom: '',
    dateTo: '',
    expiryFrom: '',
    expiryTo: '',
    dispositionType: '',
    status: '',
    approvalStatus: '',
    categoryId: '',
    subCategoryId: '',
    companyStockDetailId: '',
};

const NSTReport = () => {
    const currencySymbol = 'R';
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    // Login scope decides the stock location, exactly like the NST workspace. A store user
    // must never send a companyDebtorId or warehouseId: the backend resolves their store
    // from the login, so those filters are left out of both the list and export payloads.
    const userType = useAuthUser((state) => state.user?.userType);
    const userWarehouseId = useAuthUser((state) => state.user?.warehouseId);
    const isStoreUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const makeDefaultFilters = (): ReportFilterState => ({
        ...emptyFilters,
        warehouseId: isWarehouseUser ? userWarehouseId || '' : '',
    });

    const [filters, setFilters] = useState<ReportFilterState>(makeDefaultFilters);
    const [appliedFilters, setAppliedFilters] = useState<ReportFilterState>(filters);
    const [productSearch, setProductSearch] = useState('');

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;
    const categories = useGetCategories({ limit: 100 })?.data?.data?.rows;
    const subCategories = useGetSubCategories({
        limit: 100,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    })?.data?.data?.rows;
    const products = useCompanyStockDetailsList({ limit: 50, offset: 0, search: productSearch })?.data?.data?.rows;

    const warehouseData: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouseList: WarehouseDetails[] = Array.isArray(warehouseData)
        ? warehouseData
        : warehouseData &&
            typeof warehouseData === 'object' &&
            'rows' in warehouseData &&
            Array.isArray(warehouseData.rows)
          ? warehouseData.rows
          : [];

    // Shared payload for the on-screen report and the export, so both always send the same
    // filters. Store logins omit companyDebtorId and warehouseId entirely.
    const buildReportProps = (selected: ReportFilterState): GetNSTReportProps => {
        const companyDebtorId = isStoreUser ? '' : selected.companyDebtorId;
        const warehouseId = isStoreUser
            ? ''
            : isWarehouseUser
              ? userWarehouseId || ''
              : !companyDebtorId
                ? selected.warehouseId
                : '';

        return {
            ...(companyDebtorId ? { companyDebtorId } : {}),
            ...(warehouseId ? { warehouseId } : {}),
            ...(selected.dateFrom ? { dateFrom: selected.dateFrom } : {}),
            ...(selected.dateTo ? { dateTo: selected.dateTo } : {}),
            ...(selected.expiryFrom ? { expiryAfter: selected.expiryFrom } : {}),
            ...(selected.expiryTo ? { expiryBefore: selected.expiryTo } : {}),
            ...(selected.dispositionType
                ? { dispositionType: selected.dispositionType as GetNSTReportProps['dispositionType'] }
                : {}),
            ...(selected.approvalStatus ? { approvalStatus: selected.approvalStatus } : {}),
            ...(selected.status ? { status: selected.status } : {}),
            ...(selected.categoryId ? { categoryId: selected.categoryId } : {}),
            ...(selected.subCategoryId ? { subCategoryId: selected.subCategoryId } : {}),
            ...(selected.companyStockDetailId ? { companyStockDetailId: selected.companyStockDetailId } : {}),
        };
    };

    const query = useGetNSTReport(buildReportProps(appliedFilters));
    const exportMutation = useExportNSTReport();

    const { data, isLoading } = query;
    const summary = data?.data;
    const rows = useMemo(() => summary?.rows || [], [summary?.rows]);
    const totalRowCount = rows.length;

    const columns: ColumnDef<NSTReportLine>[] = [
        {
            accessorKey: 'stock',
            header: (d) => <TableHeaderToggle {...d}>Product</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Box className="!h-4 !w-4" />
                        {row.original.itemDescription || row.original.description || 'N/A'}
                    </div>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <QrCode className="!h-3 !w-3" /> {row.original.itemCode || 'N/A'}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: 'dispositionType',
            header: 'Type',
            cell: ({ row }) => <div>{row.original.dispositionType.replace(/_/g, ' ')}</div>,
        },
        {
            accessorKey: 'availableQuantity',
            header: 'Available',
            cell: ({ row }) => <div>{row.original.remainingQuantity ?? 0}</div>,
        },
        {
            accessorKey: 'soldQuantity',
            header: 'Discounted Sold',
            cell: ({ row }) => <div>{row.original.soldQuantity ?? row.original.discountedUnitPrice ?? 0}</div>,
        },
        {
            accessorKey: 'originalValue',
            header: 'Original Value',
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {(row.original.originalUnitPrice ?? 0)}
                </div>
            ),
        },
        {
            accessorKey: 'realisedValue',
            header: 'Realised Value',
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {(row.original.soldRealisedValue ?? 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'discountLoss',
            header: 'Discount Loss',
            cell: ({ row }) => (
                <div>
                    {currencySymbol} {(row.original.soldDiscountLoss ?? 0).toFixed(2)}
                </div>
            ),
        },
        {
            accessorKey: 'returns',
            header: 'Returns',
            cell: ({ row }) => <div>{row.original.returns ?? row.original.returnedQuantity ?? 0}</div>,
        },
        {
            accessorKey: 'writeOffs',
            header: 'Write-offs',
            cell: ({ row }) => <div>{row.original.writeOffs ?? row.original.writtenOffQuantity ?? 0}</div>,
        },
    ];

    const summaryCards = [
        {
            label: 'Near-Expiry Available',
            value: summary?.totals?.nearExpiryAvailable ?? 0,
        },
        {
            label: 'Damaged Available',
            value: summary?.totals?.damagedAvailable ?? 0,
        },
        {
            label: 'Expired Available',
            value: summary?.totals?.expiredAvailable ?? 0,
        },
        {
            label: 'Discounted Qty Sold',
            value: summary?.totals?.discountedQuantitySold ?? 0,
        },
        {
            label: 'Original Value',
            value: `${currencySymbol} ${(summary?.totals?.originalValue ?? 0).toFixed(2)}`,
        },
        {
            label: 'Realised Value',
            value: `${currencySymbol} ${(summary?.totals?.realisedValue ?? 0).toFixed(2)}`,
        },
        {
            label: 'Discount Loss',
            value: `${currencySymbol} ${(summary?.totals?.discountLoss ?? 0).toFixed(2)}`,
        },
        {
            label: 'Returns',
            value: summary?.totals?.returnedQuantity ?? 0,
        },
        {
            label: 'Write-offs',
            value: summary?.totals?.writtenOffQuantity ?? 0,
        },
    ];

    const debtorOptions = (debtors || []).map((d) => ({
        value: d?.id,
        label: `${d?.name} (${d?.accountNumber})`,
    }));
    const warehouseOptions = warehouseList.map((w) => ({
        value: w.id,
        label: w.warehouse || w.name || w.description || w.id,
    }));
    const categoryOptions = (categories || []).map((c) => ({ value: c.id, label: c.name }));
    const subCategoryOptions = (subCategories || []).map((s) => ({ value: s.id, label: s.name }));
    const productOptions = (products || []).map((p) => ({
        value: p.id,
        label: `${p.description} (${p.itemCode})`,
    }));

    const applyFilters = () => setAppliedFilters(filters);
    const clearFilters = () => {
        const cleared = makeDefaultFilters();
        setFilters(cleared);
        setAppliedFilters(cleared);
        setProductSearch('');
    };

    const hasActiveFilters =
        (!isStoreUser && (!!appliedFilters.companyDebtorId || !!appliedFilters.warehouseId)) ||
        !!appliedFilters.dateFrom ||
        !!appliedFilters.dateTo ||
        !!appliedFilters.expiryFrom ||
        !!appliedFilters.expiryTo ||
        !!appliedFilters.dispositionType ||
        !!appliedFilters.status ||
        !!appliedFilters.approvalStatus ||
        !!appliedFilters.categoryId ||
        !!appliedFilters.subCategoryId ||
        !!appliedFilters.companyStockDetailId;

    const handleExport = async (format: NSTReportExportFormat) => {
        try {
            await exportMutation.mutateAsync({ ...buildReportProps(appliedFilters), format });
            toast.success(`NST report exported as ${format.toUpperCase()}`);
        } catch (error) {
            // @ts-ignore
            toast.error(error?.response?.data?.message || error?.message || 'Failed to export the NST report');
        }
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-3 p-3">
                <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">NST Report</div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('xlsx')}
                            disabled={exportMutation.isPending}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export Excel
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExport('csv')}
                            disabled={exportMutation.isPending}
                        >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-12 items-end gap-2 rounded-md border border-blue-500 bg-gray-100 p-3">
                    {!isStoreUser ? (
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Store / Debtor</Label>
                            <SelectPopover
                                title="debtor"
                                selectedValue={filters.companyDebtorId || null}
                                options={debtorOptions}
                                onSelect={(v) => setFilters({ ...filters, companyDebtorId: v || '' })}
                            />
                        </div>
                    ) : null}
                    {!isStoreUser ? (
                        <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Warehouse / DC</Label>
                            <SelectPopover
                                title="warehouse"
                                selectedValue={filters.warehouseId || null}
                                options={warehouseOptions}
                                disabled={isWarehouseUser}
                                onSelect={(v) => setFilters({ ...filters, warehouseId: v || '' })}
                            />
                        </div>
                    ) : null}
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">From Date</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">To Date</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Expiry From</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs"
                            value={filters.expiryFrom}
                            onChange={(e) => setFilters({ ...filters, expiryFrom: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Expiry To</Label>
                        <Input
                            type="date"
                            className="h-8 text-xs"
                            value={filters.expiryTo}
                            onChange={(e) => setFilters({ ...filters, expiryTo: e.target.value })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Type</Label>
                        <SelectPopover
                            title="type"
                            selectedValue={filters.dispositionType || null}
                            options={NST_DISPOSITION_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
                            onSelect={(v) => setFilters({ ...filters, dispositionType: v || '' })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Status</Label>
                        <SelectPopover
                            title="status"
                            selectedValue={filters.status || null}
                            options={NST_STATUS.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                            onSelect={(v) => setFilters({ ...filters, status: v || '' })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Approval Status</Label>
                        <SelectPopover
                            title="approval status"
                            selectedValue={filters.approvalStatus || null}
                            options={NST_APPROVAL_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
                            onSelect={(v) => setFilters({ ...filters, approvalStatus: v || '' })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Category</Label>
                        <SelectPopover
                            title="category"
                            selectedValue={filters.categoryId || null}
                            options={categoryOptions}
                            onSelect={(v) => setFilters({ ...filters, categoryId: v || '', subCategoryId: '' })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Sub Category</Label>
                        <SelectPopover
                            title="sub category"
                            selectedValue={filters.subCategoryId || null}
                            options={subCategoryOptions}
                            onSelect={(v) => setFilters({ ...filters, subCategoryId: v || '' })}
                        />
                    </div>
                    <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Product</Label>
                        <SelectPopover
                            title="product"
                            selectedValue={filters.companyStockDetailId || null}
                            options={productOptions}
                            onSearch={setProductSearch}
                            onSelect={(v) => setFilters({ ...filters, companyStockDetailId: v || '' })}
                        />
                    </div>
                    <div className="col-span-2">
                        <FilterActionButtons
                            onApplyFilters={applyFilters}
                            onClearClick={clearFilters}
                            showClearButton={hasActiveFilters}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 xl:grid-cols-5">
                    {summaryCards.map((card) => (
                        <Card key={card.label} className="border-blue-200">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-muted-foreground text-xs font-medium">
                                    {card.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold text-blue-700">{card.value}</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {rows.length ? (
                    <DataTable
                        query={query as any}
                        data={rows}
                        columns={columns}
                        pagination={pagination}
                        setPagination={setPagination}
                        totalRowCount={totalRowCount}
                    />
                ) : null}
            </div>
        </PageLoader>
    );
};

export default NSTReport;
