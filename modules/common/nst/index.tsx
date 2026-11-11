import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Box,
    Plus,
    QrCode,
    ShieldCheck,
    XCircle,
    PackageX,
    Truck,
    FileText,
    UserCheck,
    Printer,
    Eye,
} from 'lucide-react';
import { TableHeaderToggle } from '@/components/table';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import { Input } from '@/components/ui/input';
import SelectPopover from '@/components/select-popover';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import moment from 'moment';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import {
    StockDisposition,
    useGetStockDispositions,
    NST_APPROVAL_STATUSES,
    NST_DISPOSITION_TYPES,
    NSTListFilters,
    NSTStatus,
} from '@/api-queries/nst';
import { getStockInventoryLogs, type StockInventoryLogDetails } from '@/api-queries/company/stock-logs';
import NSTForm from './nst-form';
import NSTLabelDialog from './nst-label-dialog';
import NSTActionsDialog, { NSTActionType } from './nst-actions';
import NSTViewDialog from './nst-view-dialog';
import { useDebtorList } from '@/api-queries/debtor';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetWarehouses, type WarehouseDetails } from '@/api-queries/warehouse';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';

const statusColor: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT: 'bg-amber-100 text-amber-700',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-200 text-gray-600',
    WRITTEN_OFF: 'bg-purple-100 text-purple-700',
    RETURNED: 'bg-yellow-100 text-yellow-700',
    SOLD: 'bg-teal-100 text-teal-700',
    SOLD_OUT: 'bg-slate-200 text-slate-700',
};

// Spec vocabulary: DRAFT / PENDING_APPROVAL read as "Approval Pending" (actions disabled),
// ACTIVE / APPROVED read as "Ready for Sale", SOLD_OUT as "Sold Out" (Sell hidden),
// WRITTEN_OFF as "Written Off".
const statusLabel = (s?: string): string => {
    switch (s) {
        case 'DRAFT':
        case 'PENDING_APPROVAL':
            return 'Approval Pending';
        case 'ACTIVE':
        case 'APPROVED':
            return 'Ready for Sale';
        case 'SOLD_OUT':
            return 'Sold Out';
        case 'WRITTEN_OFF':
            return 'Written Off';
        default:
            return (s || '').replace(/_/g, ' ');
    }
};

// The status filter shows one option per user-facing label. DRAFT/PENDING_APPROVAL both map
// to "Approval Pending" and ACTIVE/APPROVED both map to "Ready for Sale", so we keep a single
// canonical value per label to avoid duplicate entries. Canonical values are listed first.
const STATUS_FILTER_OPTIONS = [
    'PENDING_APPROVAL',
    'ACTIVE',
    'DRAFT',
    'APPROVED',
    'CANCELLED',
    'WRITTEN_OFF',
    'RETURNED',
    'SOLD',
    'SOLD_OUT',
].reduce<{ value: string; label: string }[]>((acc, status) => {
    const label = statusLabel(status);
    if (!acc.some((option) => option.label === label)) acc.push({ value: status, label });
    return acc;
}, []);

// Movement source type filter options
const MOVEMENT_SOURCE_TYPE_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'DISPOSITION_WRITE_OFF', label: 'Written Off' },
    { value: 'DISPOSITION_ALLOCATE', label: 'NST Allocated' },
    { value: 'DISPOSITION_RELEASE', label: 'NST Released' },
    { value: 'DISPOSITION_SALE', label: 'NST Sale' },
    { value: 'DISPOSITION_REFUND', label: 'NST Refund' },
    { value: 'DISPOSITION_RETURN', label: 'Returned to Supplier' },
].reduce<{ value: string; label: string }[]>((acc, item) => {
    if (!acc.some((option) => option.label === item.label)) acc.push(item);
    return acc;
}, []);

/**
 * The API returns decimals as strings (e.g. "5.000", "100.0000").
 * Convert safely to a number so arithmetic and toLocaleString work.
 */
const toNum = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};

const fullName = (u?: { firstName?: string | null; surname?: string | null } | null): string =>
    [u?.firstName, u?.surname].filter(Boolean).join(' ').trim();

const NSTIndex = () => {
    const userGroupPermissions = useUsersPermissions();
    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const currencySymbol = useMemo(() => 'R', []);
    const router = useRouter();

    // Deep link used by the sidebar: /processing/nst?filter=pending opens the pending
    // approvals queue. Non-NEXT transition via the Array. await-config guard to make
    // initial applied filter match the link the user clicked.
    const isPendingView = router.query.filter === 'pending';

    // Login scope decides which stock location the user may work with. A store user is
    // pinned to their own store; a warehouse/DC user is pinned to company/DC stock at their
    // warehouse; a company user may choose company/DC or any store.
    const userType = useAuthUser((state) => state.user?.userType);
    const userCompanyDebtorId = useAuthUser((state) => state.user?.companyDebtorId);
    const userCompanyDebtor = useAuthUser((state) => state.user?.companyDebtor);
    const userWarehouseId = useAuthUser((state) => state.user?.warehouseId);
    const isStoreUser = userType === 'COMPANY-DEBTOR-USER';
    const isWarehouseUser = userType === 'WAREHOUSE-USER';

    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [filters, setFilters] = useState<NSTListFilters>(
        isPendingView
            ? { search: '', status: 'PENDING_APPROVAL', dispositionType: '', approvalStatus: 'PENDING' }
            : { search: '', status: '', dispositionType: '' },
    );
    // '' means Company/DC stock; any other value is a store id. A store user cannot name
    // another store, so the selector is locked to their own store.
    const [stockLocation, setStockLocation] = useState<string>(isStoreUser ? userCompanyDebtorId || '' : '');
    // Optional warehouse filter, only meaningful for company/DC stock. A warehouse/DC user
    // is locked to their own warehouse.
    const [warehouseFilter, setWarehouseFilter] = useState<string>(isWarehouseUser ? userWarehouseId || '' : '');
    const [appliedFilters, setAppliedFilters] = useState<NSTListFilters>(filters);
    const [movementSourceType, setMovementSourceType] = useState<string>('');
    const [productSearch, setProductSearch] = useState('');

    const [open, setOpen] = useState(false);
    const [selectedDisposition, setSelectedDisposition] = useState<StockDisposition | null>(null);
    const [actionType, setActionType] = useState<NSTActionType>('APPROVE');
    const [labelDisposition, setLabelDisposition] = useState<StockDisposition | null>(null);
    const [viewDisposition, setViewDisposition] = useState<StockDisposition | null>(null);

    const debtors = useDebtorList({ companyDebtorType: 'COMPANY_OWNED' })?.data?.data?.rows;
    const warehouseData: unknown = useGetWarehouses({ limit: 100, offset: 0 })?.data?.data;
    const warehouseList: WarehouseDetails[] = Array.isArray(warehouseData)
        ? warehouseData
        : warehouseData &&
            typeof warehouseData === 'object' &&
            'rows' in warehouseData &&
            Array.isArray(warehouseData.rows)
          ? warehouseData.rows
          : [];
    const products = useCompanyStockDetailsList({ limit: 50, offset: 0, search: productSearch })?.data?.data?.rows;

    // Company/DC = omit companyDebtorId; a store = send its id. Store users always send
    // their own store id.
    const effectiveCompanyDebtorId = isStoreUser ? userCompanyDebtorId || undefined : stockLocation || undefined;
    // Warehouse only applies to company/DC stock; a store selection clears it.
    const effectiveWarehouseId = isWarehouseUser
        ? userWarehouseId || undefined
        : !isStoreUser && !stockLocation
            ? warehouseFilter || undefined
            : undefined;

    const query = useGetStockDispositions({
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        ...(appliedFilters?.search ? { search: appliedFilters.search } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters?.dispositionType ? { dispositionType: appliedFilters.dispositionType as any } : {}),
        ...(appliedFilters?.approvalStatus ? { approvalStatus: appliedFilters.approvalStatus } : {}),
        ...(effectiveCompanyDebtorId ? { companyDebtorId: effectiveCompanyDebtorId } : {}),
        ...(effectiveWarehouseId ? { warehouseId: effectiveWarehouseId } : {}),
        ...(appliedFilters?.companyStockDetailId
            ? { companyStockDetailId: appliedFilters.companyStockDetailId }
            : {}),
        ...(appliedFilters?.companyStockInventoryId
            ? { companyStockInventoryId: appliedFilters.companyStockInventoryId }
            : {}),
        ...(appliedFilters?.expiryFrom ? { expiryAfter: appliedFilters.expiryFrom } : {}),
        ...(appliedFilters?.expiryTo ? { expiryBefore: appliedFilters.expiryTo } : {}),
        ...(appliedFilters?.dateFrom ? { dateFrom: appliedFilters.dateFrom } : {}),
        ...(appliedFilters?.dateTo ? { dateTo: appliedFilters.dateTo } : {}),
        ...(movementSourceType ? { movementSourceType } : {}),
    });

    const { data, isLoading } = query;
    const totalRowCount = data?.data?.count || 0;
    const dispositions = useMemo(() => data?.data?.rows || [], [data?.data?.rows]);
    const [logData, setLogData] = useState<StockInventoryLogDetails[]>([]);
    const [logLoading, setLogLoading] = useState(false);

    // Fetch stock inventory logs when movement source type changes
    useEffect(() => {
        if (!movementSourceType) {
            setLogData([]);
            setLogLoading(false);
            return;
        }
        setLogLoading(true);
        getStockInventoryLogs({
            movementSourceType,
            limit: 50,
            offset: 0,
        })
            .then((res) => {
                if (res?.success && res.data) {
                    setLogData(res.data.rows);
                }
            })
            .catch(() => setLogData([]))
            .finally(() => setLogLoading(false));
    }, [movementSourceType]);

    // Company/DC first (the default), then every company-owned store. A store user only
    // ever sees their own store.
    const locationOptions = useMemo(() => {
        if (isStoreUser) {
            const store = (debtors || []).find((d) => d?.id === userCompanyDebtorId);
            const label = store
                ? `${store.name} (${store.accountNumber})`
                : userCompanyDebtor?.name || 'My Store';
            return [{ value: userCompanyDebtorId || '', label }];
        }
        return [
            { value: '', label: 'Company / DC' },
            ...(debtors || []).map((d) => ({
                value: d?.id as string,
                label: `${d?.name} (${d?.accountNumber})`,
            })),
        ];
    }, [debtors, isStoreUser, userCompanyDebtorId, userCompanyDebtor]);

    const warehouseOptions = useMemo(
        () =>
            warehouseList.map((w) => ({
                value: w.id,
                label: w.warehouse || w.name || w.description,
            })),
        [warehouseList],
    );

    const warehouseName = (id?: string) => {
        const warehouse = warehouseList.find((w) => w.id === id);
        return warehouse?.warehouse || warehouse?.name || warehouse?.description;
    };

    // Every filter change re-runs the list from the first page, otherwise a smaller result
    // set would leave the table stranded on an out-of-range page.
    const resetPage = () => setPagination((prev) => ({ ...prev, pageIndex: 0 }));


    const runAction = (disposition: StockDisposition, action: NSTActionType) => {
        setSelectedDisposition(disposition);
        setActionType(action);
    };

    const columns: ColumnDef<StockDisposition>[] = [
        {
            accessorKey: 'stock',
            header: (data) => <TableHeaderToggle {...data}>NST Item</TableHeaderToggle>,
            cell: ({ row }) => {
                // API key is `stockDetail` (previously `CompanyStockDetail`)
                const name = row?.original?.stockDetail?.description || 'N/A';
                const itemCode = row?.original?.stockDetail?.itemCode || 'N/A';
                const dispositionNumber = row?.original?.dispositionNumber;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Box className="!h-4 !w-4" />
                            {name}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                            <QrCode className="!h-3 !w-3" /> {itemCode}
                        </div>
                        {dispositionNumber ? (
                            <div className="text-muted-foreground text-xs">{dispositionNumber}</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'location',
            header: 'Location',
            cell: ({ row }) => {
                const d = row.original;
                const store = d.CompanyDebtor?.name;
                return (
                    <div className="space-y-1">
                        <div>{store || 'Company / DC'}</div>
                        {d.warehouseId ? (
                            <div className="text-muted-foreground text-xs">
                                {warehouseName(d.warehouseId) || 'Warehouse'}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'batch',
            header: 'Batch / Expiry',
            cell: ({ row }) => {
                const d = row.original;
                return (
                    <div className="space-y-1">
                        <div>{d.batchNumber || 'N/A'}</div>
                        {d.expiryDate ? (
                            <div className="text-muted-foreground text-xs">
                                {moment(d.expiryDate).format('DD MMM, YY')}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'dispositionType',
            header: 'Type',
            cell: ({ row }) => (
                <div className="space-y-1">
                    <Badge variant="outline" className="text-xs">
                        {(row.original.dispositionType || '').replace(/_/g, ' ')}
                    </Badge>
                    {row.original.sourceType ? (
                        <div className="text-muted-foreground text-xs">
                            {row.original.sourceType.replace(/_/g, ' ')}
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            accessorKey: 'quantity',
            header: 'Quantities',
            cell: ({ row }) => {
                const d = row.original;
                const writtenOff = toNum(d.writtenOffQuantity);
                const returned = toNum(d.returnedQuantity);
                return (
                    <div className="space-y-1">
                        <div>Allocated: {toNum(d.allocatedQuantity)}</div>
                        <div>Remaining: {toNum(d.remainingQuantity)}</div>
                        <div>Sold: {toNum(d.soldQuantity)}</div>
                        {writtenOff > 0 ? <div>Written off: {writtenOff}</div> : null}
                        {returned > 0 ? <div>Returned: {returned}</div> : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'values',
            header: 'Stock Value After Movement',
            cell: ({ row }) => {
                const d = row.original;
                const logItem = logData.find((l) => l.companyStockDetailId === d.companyStockDetailId);
                const variance = logItem?.variance ?? 0;
                const previousStock = logItem?.previousStock ?? d.remainingQuantity ?? 0;
                const newStock = logItem?.newStock ?? (d.remainingQuantity ?? 0) + (variance ?? 0);
                const totalValue = logItem?.totalValue ?? 0;

                const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });
                const dash = <span className="text-muted-foreground">—</span>;
                const line = (label: string, n: number) => (
                    <div>
                        {label}: {n > 0 ? `${currencySymbol} ${fmt(n)}` : dash}
                    </div>
                );

                return (
                    <div className="space-y-1">
                        {line('Stock Value After Movement', totalValue)}
                        {variance !== 0 && (
                            <div>
                                Stock Change: {variance < 0 ? '-' : ''}{Math.abs(variance)}
                            </div>
                        )}
                        {previousStock > 0 && newStock > 0 && (
                            <div>
                                Previous Stock: {previousStock}, New Stock: {newStock}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'detail',
            header: 'Detail',
            cell: ({ row }) => {
                const d = row.original;
                const logItem = logData.find((l) => l.companyStockDetailId === d.companyStockDetailId);
                const photos = d.photoUrls || [];
                // API key is `rule` (previously `Rule`)
                const ruleName = d.rule?.name || d.stockDispositionRuleName || 'N/A';
                return (
                    <div className="w-[220px] max-w-[220px] min-w-0 space-y-1">
                        {ruleName !== 'N/A' ? (
                            <div className="flex min-w-0 items-start gap-1 text-xs">
                                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-blue-500" />
                                <span className="min-w-0 [overflow-wrap:anywhere] whitespace-normal">{ruleName}</span>
                            </div>
                        ) : null}
                        {d.reason ? (
                            <div className="text-muted-foreground text-xs [overflow-wrap:anywhere] whitespace-normal">
                                Reason: {d.reason}
                            </div>
                        ) : null}
                        {d.batchNumber || d.expiryDate ? (
                            <div className="text-muted-foreground text-xs [overflow-wrap:anywhere] whitespace-normal">
                                {d.batchNumber ? `Batch: ${d.batchNumber}` : ''}
                                {d.batchNumber && d.expiryDate ? ' · ' : ''}
                                {d.expiryDate ? `Expiry: ${moment(d.expiryDate).format('DD MMM, YY')}` : ''}
                            </div>
                        ) : null}
                        {logItem?.remarks && (
                            <div className="text-muted-foreground text-xs [overflow-wrap:anywhere] whitespace-normal">
                                Remarks: {logItem.remarks}
                            </div>
                        )}
                        {logItem?.createdAt && (
                            <div className="text-muted-foreground text-xs">
                                {moment(logItem.createdAt).format('DD MMM, YY HH:mm')}
                            </div>
                        )}
                        {photos.length ? (
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    className="relative h-8 w-8 overflow-hidden rounded-md border"
                                    title={photos[0]}
                                    onClick={() => window.open(photos[0], '_blank')}
                                >
                                    <img src={photos[0]} alt="NST" className="h-full w-full object-cover" />
                                </button>
                                {photos.slice(1, 4).map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="relative h-8 w-8 overflow-hidden rounded-md border"
                                        title={url}
                                        onClick={() => window.open(url, '_blank')}
                                    >
                                        <img src={url} alt="NST" className="h-full w-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'approval',
            header: 'Approval',
            cell: ({ row }) => {
                const d = row.original;
                if (d.status === 'PENDING_APPROVAL' || (d.status === 'DRAFT' && d.approvalStatus === 'PENDING'))
                    return <Badge className="bg-amber-100 text-xs text-amber-700">Approval required</Badge>;

                // `approvedBy` is now a user id; the readable name lives in `approvedByUser`
                const approverName = fullName(d.approvedByUser);
                if (approverName || d.approvedBy || d.approvedAt) {
                    return (
                        <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs">
                                <UserCheck className="h-3 w-3 text-green-600" />
                                {approverName || 'Approved'}
                            </div>
                            {d.approvalStatus ? (
                                <div className="text-muted-foreground text-xs">{d.approvalStatus}</div>
                            ) : null}
                            {d.approvedAt ? (
                                <div className="text-muted-foreground text-xs">
                                    {moment(d.approvedAt).format('DD MMM, YY HH:mm')}
                                </div>
                            ) : null}
                        </div>
                    );
                }
                return <div className="text-muted-foreground text-xs">—</div>;
            },
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const s = row.original.status as NSTStatus;
                return <Badge className={`${statusColor[s] || 'bg-gray-100'} text-xs`}>{statusLabel(s)}</Badge>;
            },
        },
        {
            accessorKey: 'createdAt',
            header: 'Created',
            cell: ({ row }) => {
                const creator = fullName(row.original.createdByUser);
                return (
                    <div className="space-y-1">
                        <div>
                            {row.original.createdAt ? moment(row.original.createdAt).format('DD MMM, YY') : 'N/A'}
                        </div>
                        {creator ? <div className="text-muted-foreground text-xs">{creator}</div> : null}
                    </div>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="View"
                        onClick={() => setViewDisposition(row.original)}
                    >
                        <Eye className="h-4 w-4 text-gray-600" />
                    </Button>
                    {row.original.status === 'PENDING_APPROVAL' ||
                        (row.original.status === 'DRAFT' && row.original.approvalStatus === 'PENDING') ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Approve"
                            onClick={() => runAction(row.original, 'APPROVE')}
                        >
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                        </Button>
                    ) : null}
                    {row.original.status === 'ACTIVE' ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Cancel"
                                onClick={() => runAction(row.original, 'CANCEL')}
                            >
                                <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Write-off"
                                onClick={() => runAction(row.original, 'WRITE_OFF')}
                            >
                                <PackageX className="h-4 w-4 text-purple-600" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Return to supplier"
                                onClick={() => runAction(row.original, 'RETURN')}
                            >
                                <Truck className="h-4 w-4 text-yellow-600" />
                            </Button>
                        </>
                    ) : null}
                    {['APPROVED', 'ACTIVE', 'SOLD', 'SOLD_OUT'].includes(row.original.status) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Print NST label"
                            onClick={() => setLabelDisposition(row.original)}
                        >
                            <Printer className="h-4 w-4 text-blue-600" />
                        </Button>
                    ) : null}
                    {['APPROVED', 'ACTIVE'].includes(row.original.status) &&
                        (row.original.labelUrl || row.original.pdfUrl) ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="View label"
                            onClick={() =>
                                window.open((row.original.labelUrl || row.original.pdfUrl) as string, '_blank')
                            }
                        >
                            <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    const onAddData = () => setOpen(true);
    const onClose = () => {
        setSelectedDisposition(null);
        setOpen(false);
    };

    const applyFilters = () => {
        setAppliedFilters(filters);
        resetPage();
    };
    const clearFilters = () => {
        const cleared: NSTListFilters = { search: '', status: '', dispositionType: '' };
        setFilters(cleared);
        setAppliedFilters(cleared);
        if (!isStoreUser) setStockLocation('');
        if (!isWarehouseUser) setWarehouseFilter('');
        setProductSearch('');
        resetPage();
    };
    const onLocationChange = (value: string) => {
        setStockLocation(value);
        // A specific store has no warehouse dimension, so drop any warehouse selection.
        if (value) setWarehouseFilter('');
        resetPage();
    };
    const onWarehouseChange = (value: string) => {
        setWarehouseFilter(value);
        resetPage();
    };

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-2 p-3">
                <div className="text-lg font-bold">NST Allocations</div>

                <DataTable
                    query={query}
                    data={dispositions}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex w-full flex-wrap items-end gap-2">
                            <div className="space-y-1">
                                <Label>Stock Location</Label>
                                <SelectPopover
                                    title="stock location"
                                    onlyTitle="Company / DC"
                                    selectedValue={stockLocation || null}
                                    options={locationOptions}
                                    onSelect={(v) => onLocationChange(v || '')}
                                    disabled={isStoreUser || isWarehouseUser}
                                    selectClass="!max-w-[220px]"
                                />
                            </div>
                            {!isStoreUser && !stockLocation ? (
                                <div className="space-y-1">
                                    <Label>Warehouse</Label>
                                    <SelectPopover
                                        title="warehouse"
                                        selectedValue={warehouseFilter || null}
                                        options={warehouseOptions}
                                        onSelect={(v) => onWarehouseChange(v || '')}
                                        disabled={isWarehouseUser}
                                        selectClass="!max-w-[200px]"
                                    />
                                </div>
                            ) : null}
                            <div className="space-y-1">
                                <Label>Product</Label>
                                <SelectPopover
                                    title="product"
                                    selectedValue={filters.companyStockDetailId || null}
                                    options={(products || []).map((p) => ({
                                        value: p.id,
                                        label: `${p.description} (${p.itemCode})`,
                                    }))}
                                    onSelect={(v) => setFilters({ ...filters, companyStockDetailId: v || '' })}
                                    onSearch={setProductSearch}
                                    selectClass="!max-w-[220px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Search</Label>
                                <Input
                                    placeholder="Search NST by product..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                                    className="!max-w-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Status</Label>
                                <SelectPopover
                                    title="status"
                                    selectedValue={filters.status || null}
                                    options={STATUS_FILTER_OPTIONS}
                                    onSelect={(v) => setFilters({ ...filters, status: v || '' })}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Movement</Label>
                                <SelectPopover
                                    title="movement"
                                    selectedValue={movementSourceType || null}
                                    options={MOVEMENT_SOURCE_TYPE_OPTIONS}
                                    onSelect={(v) => setMovementSourceType(v || '')}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Type</Label>
                                <SelectPopover
                                    title="type"
                                    selectedValue={filters.dispositionType || null}
                                    options={NST_DISPOSITION_TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))}
                                    onSelect={(v) => setFilters({ ...filters, dispositionType: v || '' })}
                                />
                            </div>
                            {/* <div className="space-y-1">
                                <Label>Approval Status</Label>
                                <SelectPopover
                                    title="approval status"
                                    selectedValue={filters.approvalStatus || null}
                                    options={NST_APPROVAL_STATUSES.map((s) => ({ value: s, label: s }))}
                                    onSelect={(v) => setFilters({ ...filters, approvalStatus: v || '' })}
                                />
                            </div> */}
                            <div className="space-y-1">
                                <Label>Expiry From</Label>
                                <Input
                                    type="date"
                                    title="Expiry from"
                                    value={filters.expiryFrom || ''}
                                    onChange={(e) => setFilters({ ...filters, expiryFrom: e.target.value })}
                                    className="!max-w-[150px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Expiry To</Label>
                                <Input
                                    type="date"
                                    title="Expiry to"
                                    value={filters.expiryTo || ''}
                                    onChange={(e) => setFilters({ ...filters, expiryTo: e.target.value })}
                                    className="!max-w-[150px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Created From</Label>
                                <Input
                                    type="date"
                                    title="Created from"
                                    value={filters.dateFrom || ''}
                                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                    className="!max-w-[150px]"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Created To</Label>
                                <Input
                                    type="date"
                                    title="Created to"
                                    value={filters.dateTo || ''}
                                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                                    className="!max-w-[150px]"
                                />
                            </div>
                            <FilterActionButtons
                                onApplyFilters={applyFilters}
                                onClearClick={clearFilters}
                                showClearButton={
                                    !!appliedFilters.search ||
                                    !!appliedFilters.status ||
                                    !!appliedFilters.dispositionType ||
                                    !!appliedFilters.approvalStatus ||
                                    !!appliedFilters.companyStockDetailId ||
                                    !!appliedFilters.expiryFrom ||
                                    !!appliedFilters.expiryTo ||
                                    !!appliedFilters.dateFrom ||
                                    !!appliedFilters.dateTo ||
                                    (!isStoreUser && !!stockLocation) ||
                                    (!isWarehouseUser && !!warehouseFilter)
                                }
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => {
                                    if (
                                        hasPermission(
                                            userGroupPermissions,
                                            SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code,
                                            [SYSTEM_PERMISSIONS.CREATE],
                                        )
                                    ) {
                                        onAddData();
                                    } else {
                                        setIsPermissionDeniedOpen(true);
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                New
                            </Button>
                        </div>
                    </div>
                </DataTable>
            </div>

            {open && <NSTForm open={open} onClose={onClose} companyDebtorId={effectiveCompanyDebtorId} />}

            <NSTViewDialog
                open={!!viewDisposition}
                id={viewDisposition?.id ?? null}
                companyDebtorId={viewDisposition?.companyDebtorId}
                onClose={() => setViewDisposition(null)}
            />

            <NSTLabelDialog disposition={labelDisposition} onClose={() => setLabelDisposition(null)} />

            <NSTActionsDialog
                open={!!selectedDisposition}
                onClose={() => setSelectedDisposition(null)}
                disposition={selectedDisposition}
                action={actionType}
            />

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{ description: "You don't have access to manage NST allocations." }}
            />
        </PageLoader>
    );
};

export default NSTIndex;