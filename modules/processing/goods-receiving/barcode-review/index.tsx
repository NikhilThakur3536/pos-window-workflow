'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/dynamic-table/data-table';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { useAuthUser } from '@/stores/auth-user.store';
import SelectPopover from '@/components/select-popover';
import { useGetGoodsReceivingList, GoodsReceivingDetails } from '@/api-queries/goods-receiving';
import {
    useScanBarcode,
    useAddTempItem,
    useGetUnresolvedTempItems,
    toUnresolvedTempItems,
    useResolveBarcode,
    useGetBarcodeApprovals,
    toBarcodeApprovals,
    ScanBarcodeResult,
    TempItem,
    BarcodeApproval,
    ResolveBarcodeAction,
} from '@/api-queries/goods-receiving/barcode-workflow';
import { useCompanyStockDetailsList } from '@/api-queries/company/stock-details';
import { resolveStockBarcode } from '@/api-queries/company-stock-barcodes';
import { useGetCompanyTaxRates } from '@/api-queries/company-tax-rate-master';
import { useCompanyStockPricingTypeList } from '@/api-queries/company/stock-pricing-type';
import { useApprovalRequired, isApprovalRequiredError } from '@/hooks/use-approval-required';
import ApprovalDialog from '@/components/approval/ApprovalDialog';
import type { ColumnDef } from '@tanstack/react-table';
import { TableHeaderToggle } from '@/components/table';
import {
    Barcode,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    Link2,
    PackagePlus,
    RefreshCcw,
    Replace,
    ScanLine,
    ShieldAlert,
    TriangleAlert,
} from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { generateUUIDForData } from '@/utils/helpers';

interface GrvBarcodeReviewModuleProps {
    moduleCode: string;
}

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
};

const GrvBarcodeReviewModule = ({ moduleCode }: GrvBarcodeReviewModuleProps) => {
    const currencySymbol = useAuthUser((state) => state.currency?.symbol) || 'R';

    // GRV selection
    const [grvId, setGrvId] = useState<string | null>(null);
    const grvListQuery = useGetGoodsReceivingList({ limit: 200, offset: 0 });
    const grvList = useMemo(() => grvListQuery.data?.data?.rows || [], [grvListQuery.data]);
    const selectedGrv = grvList.find((grv) => grv.id === grvId);

    // 3078 Scan barcode
    const [barcode, setBarcode] = useState('');
    const scanMut = useScanBarcode();
    const [isResolving, setIsResolving] = useState(false);
    const [scanResult, setScanResult] = useState<ScanBarcodeResult | null>(null);

    // 3079 Add temp item
    const [tempQty, setTempQty] = useState(1);
    const [tempUnitPrice, setTempUnitPrice] = useState('');
    const [tempDescription, setTempDescription] = useState('');
    const addTempMut = useAddTempItem();

    // Scan package quantity (sent as scannedPackageQuantity for packaging-barcode conversion)
    const [packageQty, setPackageQty] = useState(1);

    // Unresolved
    const unresolvedQuery = useGetUnresolvedTempItems(grvId);
    const unresolvedItems = useMemo(
        () => toUnresolvedTempItems(unresolvedQuery.data?.data),
        [unresolvedQuery.data],
    );

    // Resolve dialogs
    const [resolveTarget, setResolveTarget] = useState<TempItem | null>(null);
    const [resolveAction, setResolveAction] = useState<ResolveBarcodeAction>('LINK');
    const [reason, setReason] = useState('');
    const [linkStockId, setLinkStockId] = useState<string | null>(null);
    const [newBarcode, setNewBarcode] = useState('');
    const [replacementReason, setReplacementReason] = useState('');
    const [createItemCode, setCreateItemCode] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createTaxRateId, setCreateTaxRateId] = useState('');
    const [createPricingTypeId, setCreatePricingTypeId] = useState('');
    const [createSellingPrice, setCreateSellingPrice] = useState('');

    // 3228: one stable clientDocumentId per resolution request; reused on retries (incl. approval resend).
    const [resolveDocumentId, setResolveDocumentId] = useState('');

    const resolveMut = useResolveBarcode();

    // 3224: HTTP 428 APPROVAL_REQUIRED -> supervisor approves once -> resend with approvalToken (memory only).
    const { approval, openApproval, closeApproval, setApproval } = useApprovalRequired();
    const pendingResolveRef = useRef<Record<string, unknown> | null>(null);

    // Approvals
    const [approvalStatus, setApprovalStatus] = useState<string>('PENDING');
    const [approvalExecutionStatus, setApprovalExecutionStatus] = useState<string>('PENDING');
    const [approvalSearch, setApprovalSearch] = useState('');
    const approvalsQuery = useGetBarcodeApprovals({
        status: approvalStatus as any,
        executionStatus: approvalExecutionStatus as any,
        search: approvalSearch || undefined,
        limit: 100,
        offset: 0,
    });
    const approvals = useMemo(
        () => toBarcodeApprovals(approvalsQuery.data?.data),
        [approvalsQuery.data],
    );
    // 3225: the review queue is approved through the GENERIC security approval API
    // (security/approvals/approve). /barcode-approvals/action returns 410 and must
    // not be used.
    const [approveTarget, setApproveTarget] = useState<BarcodeApproval | null>(null);

    // 3228: one stable clientDocumentId per scanned barcode, reused on any retry of
    // add-temp-item so the backend returns the original temporary line.
    const tempItemDocumentIdRef = useRef<Record<string, string>>({});

    // Stock selector for LINK
    const stockListQuery = useCompanyStockDetailsList({ limit: 100, offset: 0 });
    const stockList = stockListQuery.data?.data?.rows || [];

    // CREATE selectors: tax rate + pricing type
    const taxRateList = useGetCompanyTaxRates()?.data?.data?.rows || [];
    const pricingTypeList = useCompanyStockPricingTypeList({})?.data?.data?.rows || [];

    const handleScan = async () => {
        if (!barcode.trim()) {
            toast.error('Enter a barcode to scan');
            return;
        }
        const code = barcode.trim();
        const scannedPackageQuantity = packageQty || 1;

        // Product barcodes (including SHRINK/CASE/PALLET package mappings) resolve through
        // the barcode service first so the converted base quantity is shown. Unmapped
        // barcodes continue through the GRV scan endpoint below.
        setIsResolving(true);
        try {
            const resolved = await resolveStockBarcode({
                barcode: code,
                scannedPackageQuantity,
                ...(selectedGrv?.warehouseId ? { warehouseId: selectedGrv.warehouseId } : {}),
            });
            const data = resolved?.data;
            if (resolved?.success && data?.companyStockDetailId) {
                const result: ScanBarcodeResult = {
                    companyStockDetailId: data.companyStockDetailId,
                    matchedStockDetailId: data.companyStockDetailId,
                    packageType: data.packageType,
                    scannedPackageQuantity: data.scannedPackageQuantity ?? scannedPackageQuantity,
                    baseQuantityPerScan: data.baseQuantityPerScan,
                    baseStockQuantity: data.baseStockQuantity,
                    itemCode: data.itemCode,
                    description: data.description,
                    barcode: code,
                };
                setScanResult(result);
                if (result.baseStockQuantity) {
                    setTempQty(Number(result.baseStockQuantity));
                }
                toast.success('Barcode matched to a product');
                setIsResolving(false);
                return;
            }
        } catch {
            // Not a mapped barcode; use the GRV scan endpoint.
        }
        setIsResolving(false);
        scanMut.mutate(
            { barcode: code, scannedPackageQuantity },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        setScanResult(data.data || null);
                        if (data.data?.baseStockQuantity) {
                            // Packaging barcode: convert the scanned package quantity
                            // into base units and use it as the line quantity.
                            setTempQty(Number(data.data.baseStockQuantity));
                        }
                        const matched = data.data?.companyStockDetailId || data.data?.matchedStockDetailId;
                        if (matched) {
                            toast.success('Barcode matched to a product');
                            if (data.data?.replacedBarcode) {
                                toast.info('Old/replaced barcode recognised.');
                            }
                        } else {
                            toast.info('Barcode not recognised - you may add a temporary item');
                        }
                    } else {
                        toast.error(data?.message || 'Scan failed');
                    }
                },
                onError: (error: any) => toast.error(error?.response?.data?.message || 'Scan failed'),
            },
        );
    };

    const handleAddTempItem = () => {
        if (!grvId) {
            toast.error('Select a GRV first');
            return;
        }
        const code = barcode.trim();
        if (!code) {
            toast.error('Scan a barcode first');
            return;
        }
        // 3228: reuse the stable clientDocumentId for this barcode - never submit a
        // second request with a new id for the same scan retry.
        const docId = tempItemDocumentIdRef.current[code] || generateUUIDForData();
        tempItemDocumentIdRef.current[code] = docId;
        addTempMut.mutate(
            {
                grvId,
                barcode: code,
                description: tempDescription || undefined,
                quantity: Number(tempQty || 0),
                unitPrice: tempUnitPrice ? Number(tempUnitPrice) : undefined,
                clientDocumentId: docId,
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        toast.success('Temporary item added');
                        delete tempItemDocumentIdRef.current[code];
                        setScanResult(null);
                        setBarcode('');
                        setTempDescription('');
                        setTempQty(1);
                        setTempUnitPrice('');
                        unresolvedQuery.refetch();
                    } else {
                        toast.error(data?.message || 'Add failed');
                    }
                },
                onError: () => toast.error('Add temporary item failed'),
            },
        );
    };

    const resolvePayload = () => {
        if (!resolveTarget) return null;
        const base = { action: resolveAction, clientDocumentId: resolveDocumentId } as Record<string, unknown>;

        if (resolveAction === 'LINK') {
            return {
                ...base,
                grvItemId: resolveTarget.grvItemId || resolveTarget.id,
                companyStockDetailId: linkStockId || undefined,
                reason: reason || undefined,
            };
        }
        if (resolveAction === 'REPLACE') {
            return {
                ...base,
                companyStockDetailId: linkStockId || undefined,
                oldBarcode: resolveTarget.barcode,
                newBarcode: newBarcode || undefined,
                replacementReason: replacementReason || undefined,
            };
        }
        return {
            ...base,
            grvItemId: resolveTarget.grvItemId || resolveTarget.id,
            productData: {
                itemCode: createItemCode || undefined,
                description: createDescription || undefined,
                companyTaxRateId: createTaxRateId || undefined,
                companyStockPricingTypeId: createPricingTypeId || undefined,
                sellingPrice: createSellingPrice ? Number(createSellingPrice) : undefined,
            },
        };
    };

    const refreshAfterResolve = () => {
        setResolveTarget(null);
        pendingResolveRef.current = null;
        setReason('');
        setLinkStockId(null);
        setNewBarcode('');
        setReplacementReason('');
        setCreateItemCode('');
        setCreateDescription('');
        setCreateTaxRateId('');
        setCreatePricingTypeId('');
        setCreateSellingPrice('');
        setResolveDocumentId('');
        unresolvedQuery.refetch();
        approvalsQuery.refetch();
    };

    const submitWithToken = (payload: Record<string, unknown>) => {
        resolveMut
            .mutateAsync(payload as any)
            .then((data) => {
                if (data?.success) {
                    if (data.data?.approvalRequired) {
                        toast.success('Sent for approval');
                    } else {
                        toast.success('Barcode resolved');
                    }
                    refreshAfterResolve();
                } else {
                    toast.error(data?.message || 'Resolve failed');
                }
            })
            .catch((error) => {
                const info = isApprovalRequiredError(error);
                if (info) {
                    // 428 APPROVAL_REQUIRED: keep the item unresolved and capture the exact
                    // payload so the supervisor approval can be followed by a resend (3224).
                    pendingResolveRef.current = { ...payload };
                    setApproval({ ...info, actionLabel: 'Resolve Barcode' });
                } else {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                }
            });
    };

    const handleResolveConfirm = () => {
        const payload = resolvePayload();
        if (!payload) return;
        if (resolveAction === 'LINK' && !linkStockId) {
            toast.error('Select a product to link');
            return;
        }
        if (resolveAction === 'REPLACE' && !newBarcode) {
            toast.error('Enter the new barcode');
            return;
        }
        submitWithToken(payload);
    };

    const handleApproved = (token: string) => {
        const meta = pendingResolveRef.current;
        if (!meta) {
            closeApproval();
            return;
        }
        // Approval token is held in memory only (3228); never persisted to offline storage.
        submitWithToken({ ...meta, approvalToken: token });
    };

    const openResolve = (item: TempItem, action: ResolveBarcodeAction) => {
        setResolveTarget(item);
        setResolveAction(action);
        pendingResolveRef.current = null;
        setReason('');
        setLinkStockId(null);
        setNewBarcode('');
        setReplacementReason('');
        setCreateItemCode('');
        setCreateDescription('');
        setCreateTaxRateId('');
        setCreatePricingTypeId('');
        setCreateSellingPrice('');
        // Stable per-resolution clientDocumentId (3228): reused on approval resend.
        setResolveDocumentId(generateUUIDForData());
    };

    const scanResultColumns: ColumnDef<{ key: string; value: string | number }>[] = [
        { accessorKey: 'key', header: () => <div>Field</div> },
        { accessorKey: 'value', header: () => <div>Value</div> },
    ];

    const unresolvedColumns: ColumnDef<TempItem>[] = [
        {
            accessorKey: 'barcode',
            header: (data) => <TableHeaderToggle {...data}>Barcode</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium font-mono">{row.original.barcode || 'N/A'}</div>,
        },
        {
            accessorKey: 'description',
            header: (data) => <TableHeaderToggle {...data}>Description</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.description || 'N/A'}</div>,
        },
        {
            accessorKey: 'itemCode',
            header: (data) => <TableHeaderToggle {...data}>Item Code</TableHeaderToggle>,
            cell: ({ row }) => <div>{row.original.itemCode || 'N/A'}</div>,
        },
        {
            accessorKey: 'quantity',
            header: (data) => <TableHeaderToggle {...data}>Qty</TableHeaderToggle>,
            cell: ({ row }) => <div>{Number(row.original.quantity || 0)}</div>,
        },
        {
            accessorKey: 'unitPrice',
            header: (data) => <TableHeaderToggle {...data}>Unit Price</TableHeaderToggle>,
            cell: ({ row }) => (
                <div>{currencySymbol} {Number(row.original.unitPrice || 0).toFixed(2)}</div>
            ),
        },
        {
            id: 'actions',
            header: () => <div>Resolve</div>,
            cell: ({ row }) => (
                <div className="flex flex-wrap items-center gap-1">
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => openResolve(row.original, 'LINK')}>
                        <Link2 className="h-3.5 w-3.5" /> LINK
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => openResolve(row.original, 'CREATE')}>
                        <PackagePlus className="h-3.5 w-3.5" /> CREATE
                    </Button>
                    <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => openResolve(row.original, 'REPLACE')}>
                        <Replace className="h-3.5 w-3.5" /> REPLACE
                    </Button>
                </div>
            ),
        },
    ];

    const approvalColumns: ColumnDef<BarcodeApproval>[] = [
        {
            accessorKey: 'barcode',
            header: (data) => <TableHeaderToggle {...data}>Barcode</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-medium font-mono">{row.original.barcode || 'N/A'}</div>,
        },
        {
            accessorKey: 'action',
            header: (data) => <TableHeaderToggle {...data}>Action</TableHeaderToggle>,
            cell: ({ row }) => {
                const a = row.original.action || '';
                const cls =
                    a === 'LINK'
                        ? 'bg-blue-100 text-blue-700'
                        : a === 'CREATE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700';
                return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{a || 'N/A'}</span>;
            },
        },
        {
            accessorKey: 'supplierName',
            header: (data) => <TableHeaderToggle {...data}>Supplier</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="max-w-[140px] truncate">{row.original.supplierName || row.original.supplierId || 'N/A'}</div>
            ),
        },
        {
            accessorKey: 'warehouseName',
            header: (data) => <TableHeaderToggle {...data}>Warehouse</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="max-w-[120px] truncate">{row.original.warehouseName || row.original.warehouseId || 'N/A'}</div>
            ),
        },
        {
            accessorKey: 'grvId',
            header: (data) => <TableHeaderToggle {...data}>GRV</TableHeaderToggle>,
            cell: ({ row }) => <div className="font-mono text-xs">{row.original.grvId || 'N/A'}</div>,
        },
        {
            accessorKey: 'requestedBy',
            header: (data) => <TableHeaderToggle {...data}>Requester</TableHeaderToggle>,
            cell: ({ row }) => {
                const u = row.original.requestedBy;
                return <div>{u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'N/A' : 'N/A'}</div>;
            },
        },
        {
            accessorKey: 'reason',
            header: (data) => <TableHeaderToggle {...data}>Reason</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="max-w-[160px] truncate" title={row.original.reason || ''}>
                    {row.original.reason || 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: (data) => <TableHeaderToggle {...data}>Approval</TableHeaderToggle>,
            cell: ({ row }) => {
                const st = row.original.status || '';
                const cls =
                    st === 'APPROVED'
                        ? 'bg-green-100 text-green-700'
                        : st === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700';
                return (
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>
                        {STATUS_LABEL[st] || st || 'N/A'}
                    </span>
                );
            },
        },
        {
            accessorKey: 'executionStatus',
            header: (data) => <TableHeaderToggle {...data}>Execution</TableHeaderToggle>,
            cell: ({ row }) => {
                const es = row.original.executionStatus || '';
                const cls =
                    es === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : es === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-stone-100 text-stone-600';
                return (
                    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{es || 'N/A'}</span>
                );
            },
        },
        {
            accessorKey: 'failureReason',
            header: (data) => <TableHeaderToggle {...data}>Failure</TableHeaderToggle>,
            cell: ({ row }) => (
                <div className="max-w-[140px] truncate text-xs text-red-600" title={row.original.failureReason || ''}>
                    {row.original.executionStatus === 'FAILED' ? row.original.failureReason || 'failed' : 'N/A'}
                </div>
            ),
        },
        {
            accessorKey: 'createdAt',
            header: (data) => <TableHeaderToggle {...data}>Date</TableHeaderToggle>,
            cell: ({ row }) =>
                row.getValue('createdAt') ? (
                    <div>{moment(String(row.getValue('createdAt'))).format('DD/MM/YYYY')}</div>
                ) : (
                    <div>N/A</div>
                ),
        },
        {
            id: 'actions',
            header: () => <div>Actions</div>,
            cell: ({ row }) => {
                if (row.original.status === 'PENDING') {
                    return (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-green-700 hover:bg-green-50"
                                onClick={() => setApproveTarget(row.original)}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                            </Button>
                        </div>
                    );
                }
                return <div className="text-xs text-muted-foreground">-</div>;
            },
        },
    ];

    const scanRows = useMemo(() => {
        if (!scanResult) return [];
        return Object.entries(scanResult)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([key, value]) => ({
                key,
                value:
                    typeof value === 'object'
                        ? JSON.stringify(value)
                        : typeof value === 'boolean'
                          ? value ? 'Yes' : 'No'
                          : String(value),
            }));
    }, [scanResult]);

    return (
        <PageLoader isLoading={grvListQuery.isLoading}>
            <div className="space-y-4 p-3">
                <div className="text-lg font-bold">GRV Barcode Review</div>
                <p className="text-xs text-muted-foreground">
                    Scan barcodes during goods receiving, create temporary products for unknown barcodes, and resolve
                    them (LINK / CREATE / REPLACE) - optionally routed through supervisor approval.
                </p>

                {/* GRV selector */}
                <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[280px]">
                        <Label className="text-xs">Goods Receiving (GRV)</Label>
                        <SelectPopover
                            title="grv"
                            selectedValue={grvId}
                            options={grvList.map((grv) => ({
                                value: grv.id,
                                label: `${grv.supplierInvoiceNumber || grv.name || grv.id} (${moment(grv.grvDate || grv.createdAt).format('DD MMM YY')})`,
                            }))}
                            onSelect={(val) => setGrvId(val || null)}
                        />
                    </div>
                    {selectedGrv ? (
                        <div className="text-xs text-muted-foreground">
                            Supplier: <span className="font-medium text-stone-700">{selectedGrv.name}</span> · Invoice:{' '}
                            <span className="font-medium text-stone-700">{selectedGrv.supplierInvoiceNumber}</span>
                        </div>
                    ) : null}
                </div>

                {!grvId ? (
                    <Card>
                        <CardContent className="p-6 text-center text-sm text-muted-foreground">
                            Select a GRV to scan barcodes and resolve temporary items. Barcode approvals are shown in the
                            Approvals tab.
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="scan">
                        {unresolvedItems.length > 0 && (
                            <div className="mb-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <div className="font-semibold">
                                        This GRV has {unresolvedItems.length} unresolved barcode item
                                        {unresolvedItems.length === 1 ? '' : 's'}.
                                    </div>
                                    <div className="text-xs">
                                        Resolve all unknown barcode items before posting this GRV.
                                    </div>
                                </div>
                            </div>
                        )}
                        <TabsList>
                            <TabsTrigger value="scan">
                                <ScanLine className="mr-1 h-4 w-4" /> Scan Barcode
                            </TabsTrigger>
                            <TabsTrigger value="unresolved">
                                <TriangleAlert className="mr-1 h-4 w-4" /> Unresolved ({unresolvedItems.length})
                            </TabsTrigger>
                            <TabsTrigger value="approvals">
                                <ShieldAlert className="mr-1 h-4 w-4" /> Approvals ({approvals.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* Scan */}
                        <TabsContent value="scan" className="space-y-3">
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="min-w-[240px] flex-1">
                                            <Label className="text-xs">Barcode</Label>
                                            <Input
                                                className="h-9 font-mono"
                                                placeholder="Scan or type barcode e.g. 8901111222665"
                                                value={barcode}
                                                onChange={(e) => setBarcode(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                                            />
                                        </div>
                                        <div className="w-[110px]">
                                            <Label className="text-xs">Scan Qty</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                className="h-9"
                                                value={packageQty}
                                                onChange={(e) => setPackageQty(Number(e.target.value) || 1)}
                                                aria-label="Scanned package quantity"
                                            />
                                        </div>
                                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleScan} disabled={scanMut.isPending || isResolving}>
                                            <ScanLine className="mr-1 h-4 w-4" />
                                            {scanMut.isPending || isResolving ? 'Scanning...' : 'Scan'}
                                        </Button>
                                    </div>

                                    {scanResult?.matchedStockDetailId ? (
                                        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                Barcode matched to product: <span className="font-semibold">{scanResult.itemCode || scanResult.description || scanResult.matchedStockDetailId}</span>
                                            </div>
                                            {scanResult.baseStockQuantity != null ? (
                                                <div className="mt-1 text-xs text-green-800">
                                                    Package <span className="font-semibold">{scanResult.packageType || '—'}</span> ·{' '}
                                                    {scanResult.scannedPackageQuantity ?? 1} × {scanResult.baseQuantityPerScan ?? '—'} → converted base qty{' '}
                                                    <span className="font-semibold">{scanResult.baseStockQuantity}</span> (use this as the item quantity)
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : scanResult ? (
                                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                                            <div className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                                                <TriangleAlert className="h-4 w-4" /> Barcode not recognised
                                            </div>
                                            <div className="mt-2 grid gap-2">
                                                <div>
                                                    <Label className="text-xs">Description</Label>
                                                    <Input className="h-8 text-xs" value={tempDescription} onChange={(e) => setTempDescription(e.target.value)} placeholder="Unknown product description" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-xs">Quantity</Label>
                                                        <Input type="number" className="h-8 text-xs" value={tempQty} min={1} onChange={(e) => setTempQty(Number(e.target.value))} />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs">Unit Price</Label>
                                                        <Input type="number" className="h-8 text-xs" value={tempUnitPrice} onChange={(e) => setTempUnitPrice(e.target.value)} placeholder="0.00" />
                                                    </div>
                                                </div>
                                                <Button variant="outline" className="justify-self-start" onClick={handleAddTempItem} disabled={addTempMut.isPending}>
                                                    <PackagePlus className="mr-1 h-4 w-4" />
                                                    {addTempMut.isPending ? 'Adding...' : 'Add as Temporary Item'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>

                            {scanRows.length ? (
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="mb-2 text-sm font-semibold">Scan Result</div>
                                        <DataTable
                                            query={undefined as any}
                                            data={scanRows}
                                            columns={scanResultColumns}
                                            totalRowCount={scanRows.length}
                                        />
                                    </CardContent>
                                </Card>
                            ) : null}
                        </TabsContent>

                        {/* Unresolved */}
                        <TabsContent value="unresolved" className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold">Unresolved Temporary Items</div>
                                <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => unresolvedQuery.refetch()}>
                                    <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                                </Button>
                            </div>
                            {unresolvedItems.length ? (
                                <DataTable
                                    query={unresolvedQuery}
                                    data={unresolvedItems}
                                    columns={unresolvedColumns}
                                    totalRowCount={unresolvedItems.length}
                                />
                            ) : (
                                <Card>
                                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                        {unresolvedQuery.isLoading ? 'Loading...' : 'No unresolved temporary items for this GRV.'}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        {/* Approvals */}
                        <TabsContent value="approvals" className="space-y-2">
                            <div className="flex flex-wrap items-end gap-2">
                                <div className="min-w-[160px]">
                                    <Label className="text-xs">Approval Status</Label>
                                    <SelectPopover
                                        title="status"
                                        selectedValue={approvalStatus}
                                        options={['PENDING', 'APPROVED', 'REJECTED'].map((s) => ({ value: s, label: s }))}
                                        onSelect={(val) => setApprovalStatus((val as string) || 'PENDING')}
                                    />
                                </div>
                                <div className="min-w-[160px]">
                                    <Label className="text-xs">Execution Status</Label>
                                    <SelectPopover
                                        title="execution"
                                        selectedValue={approvalExecutionStatus}
                                        options={['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'].map((s) => ({ value: s, label: s }))}
                                        onSelect={(val) => {
                                            const next = val as string;
                                            setApprovalExecutionStatus(next || 'PENDING');
                                        }}
                                    />
                                </div>
                                <div className="min-w-[220px] flex-1">
                                    <Label className="text-xs">Search</Label>
                                    <Input
                                        className="h-9"
                                        placeholder="Barcode, GRV id, supplier, requester..."
                                        value={approvalSearch}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setApprovalSearch(v);
                                            if (v === '') approvalsQuery.refetch();
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && approvalsQuery.refetch()}
                                    />
                                </div>
                                <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={() => approvalsQuery.refetch()}>
                                    <RefreshCcw className="h-3.5 w-3.5" /> Refresh
                                </Button>
                            </div>
                            {approvals.length ? (
                                <DataTable
                                    query={approvalsQuery}
                                    data={approvals}
                                    columns={approvalColumns}
                                    totalRowCount={approvals.length}
                                />
                            ) : (
                                <Card>
                                    <CardContent className="p-6 text-center text-sm text-muted-foreground">
                                        {approvalsQuery.isLoading ? 'Loading...' : `No ${approvalStatus.toLowerCase()} barcode approvals.`}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* Resolve dialog */}
            <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Resolve Barcode - {resolveAction}</DialogTitle>
                        <DialogDescription>
                            Barcode: <span className="font-mono font-semibold">{resolveTarget?.barcode || 'N/A'}</span>
                            {resolveTarget?.description ? ` · ${resolveTarget.description}` : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs">Action</Label>
                            <div className="flex flex-wrap gap-1 pt-1">
                                {(['LINK', 'CREATE', 'REPLACE'] as ResolveBarcodeAction[]).map((a) => (
                                    <Button
                                        key={a}
                                        size="sm"
                                        variant={resolveAction === a ? 'default' : 'outline'}
                                        className={resolveAction === a ? 'bg-blue-600 hover:bg-blue-700' : ''}
                                        onClick={() => setResolveAction(a)}
                                    >
                                        {a}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {resolveAction === 'LINK' && (
                            <>
                                <div>
                                    <Label className="text-xs">Product to Link</Label>
                                    <SelectPopover
                                        title="product"
                                        selectedValue={linkStockId}
                                        options={stockList.map((s) => ({ value: s.id, label: `${s.itemCode} - ${s.description || s.itemCode}` }))}
                                        onSelect={(val) => setLinkStockId(val || null)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Reason</Label>
                                    <Input className="h-8 text-xs" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Scanned barcode belongs to confirmed product" />
                                </div>
                            </>
                        )}

                        {resolveAction === 'CREATE' && (
                            <>
                                <div>
                                    <Label className="text-xs">Item Code</Label>
                                    <Input className="h-8 text-xs" value={createItemCode} onChange={(e) => setCreateItemCode(e.target.value)} placeholder="SKU-..." />
                                </div>
                                <div>
                                    <Label className="text-xs">Description</Label>
                                    <Input className="h-8 text-xs" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder={resolveTarget?.description || 'Product description'} />
                                </div>
                                <div>
                                    <Label className="text-xs">Tax Rate</Label>
                                    <SelectPopover
                                        title="tax rate"
                                        selectedValue={createTaxRateId}
                                        options={taxRateList.map((t) => ({
                                            value: t.id,
                                            label: `${t.name}${t.taxRatePercent ? ` (${t.taxRatePercent}%)` : ''}`,
                                        }))}
                                        onSelect={(val) => setCreateTaxRateId(val || '')}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Pricing Type</Label>
                                    <SelectPopover
                                        title="pricing type"
                                        selectedValue={createPricingTypeId}
                                        options={pricingTypeList.map((p) => ({
                                            value: p.id,
                                            label: p.name || p.code || p.id,
                                        }))}
                                        onSelect={(val) => setCreatePricingTypeId(val || '')}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Selling Price</Label>
                                    <Input
                                        type="number"
                                        className="h-8 text-xs"
                                        value={createSellingPrice}
                                        onChange={(e) => setCreateSellingPrice(e.target.value)}
                                        placeholder="Optional - omit to skip selling price"
                                    />
                                </div>
                            </>
                        )}

                        {resolveAction === 'REPLACE' && (
                            <>
                                <div>
                                    <Label className="text-xs">Product (holder of barcode)</Label>
                                    <SelectPopover
                                        title="product"
                                        selectedValue={linkStockId}
                                        options={stockList.map((s) => ({ value: s.id, label: `${s.itemCode} - ${s.description || s.itemCode}` }))}
                                        onSelect={(val) => setLinkStockId(val || null)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Old Barcode</Label>
                                    <Input className="h-8 text-xs font-mono" value={resolveTarget?.barcode || ''} disabled />
                                </div>
                                <div>
                                    <Label className="text-xs">New Barcode</Label>
                                    <Input className="h-8 text-xs font-mono" value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} placeholder="999888777667" />
                                </div>
                                <div>
                                    <Label className="text-xs">Replacement Reason</Label>
                                    <Input className="h-8 text-xs" value={replacementReason} onChange={(e) => setReplacementReason(e.target.value)} placeholder="Supplier packaging barcode update" />
                                </div>
                            </>
                        )}

                        <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
                            Actions requiring supervisor approval are submitted, and when the security policy returns{' '}
                            <span className="font-mono">428 APPROVAL_REQUIRED</span> the item stays unresolved until a
                            supervisor approves it (Processing → GRV Barcode Review → Approvals).
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={resolveMut.isPending}
                            onClick={handleResolveConfirm}
                        >
                            <ClipboardCheck className="mr-1 h-4 w-4" />
                            {resolveMut.isPending ? 'Resolving...' : 'Resolve'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 3224 Supervisor approval for APPROVAL_REQUIRED (428) */}
            <ApprovalDialog
                open={openApproval}
                onClose={closeApproval}
                approvalRequestId={approval?.approvalRequestId}
                allowedMethods={approval?.allowedMethods}
                actionLabel={approval?.actionLabel}
                approverGroupName={approval?.approverGroupName}
                onApproved={handleApproved}
            />

            {/* 3225 Review queue approve: generic security approval (never /barcode-approvals/action) */}
            <ApprovalDialog
                open={!!approveTarget}
                onClose={() => setApproveTarget(null)}
                approvalRequestId={
                    (approveTarget as any)?.approvalRequestId || approveTarget?.id || undefined
                }
                mode="supervisor"
                actionLabel={`Approve barcode ${approveTarget?.action || ''} request`}
                onApproved={() => {
                    toast.success('Approval approved');
                    setApproveTarget(null);
                    approvalsQuery.refetch();
                }}
            />
        </PageLoader>
    );
};

export default GrvBarcodeReviewModule;
