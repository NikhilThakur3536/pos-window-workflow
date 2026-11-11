'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useGetActiveUoms } from '@/api-queries/masters/uom';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import SelectPopover from '@/components/select-popover';
import ConfirmDialog from '@/components/confirm-dialog';
import { type ColumnDef, type PaginationState } from '@tanstack/react-table';
import { toast } from 'sonner';
import moment from 'moment';
import { Plus, Pencil, PauseCircle, History, ScanLine } from 'lucide-react';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { hasPermission, ViewAccessDeniedDialog } from '@/components/permission-guards';
import useUsersPermissions from '@/components/permission-guards/useUsersPermissions';
import { generateUUIDForData } from '@/utils/helpers';
import {
    PACKAGE_TYPES,
    PACKAGE_TYPE_LABELS,
    useDeactivateStockBarcode,
    useGetStockBarcode,
    useGetStockBarcodeHistory,
    useGetStockBarcodes,
    useResolveStockBarcode,
    useSaveStockBarcode,
    useUpdateStockBarcode,
    type MutateStockBarcodeResponse,
    type ResolveStockBarcodeResult,
    type SaveStockBarcodeInput,
    type StockBarcodeHistoryEntry,
    type StockBarcodeRecord,
    type UpdateStockBarcodeInput,
} from '@/api-queries/company-stock-barcodes';
import { useCompanyStockDetailsList, type StockDetails } from '@/api-queries/company/stock-details';
import { useAuthUser } from '@/stores/auth-user.store';

const STATUS_OPTIONS = [
    { label: 'All statuses', value: '' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Inactive', value: 'INACTIVE' },
];

const PackagingBarcodes = () => {
    const userGroupPermissions = useUsersPermissions();
    const authUser = useAuthUser((state) => state.user);

    const [isPermissionDeniedOpen, setIsPermissionDeniedOpen] = useState(false);
    const [deniedAction, setDeniedAction] = useState('manage');
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [historyId, setHistoryId] = useState<string | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<StockBarcodeRecord | null>(null);
    const [deactivateReason, setDeactivateReason] = useState('');

    const initialFilters = { search: '', packageType: '', status: '', productId: '' };
    const { filters, setFilters, handleFilters, clearFilters, appliedFilters, showClearButton } =
        useTableFilters<typeof initialFilters>(initialFilters);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    const listQuery = useGetStockBarcodes({
        ...(appliedFilters?.productId ? { companyStockDetailId: appliedFilters.productId } : {}),
        ...(appliedFilters?.packageType ? { packageType: appliedFilters.packageType } : {}),
        ...(appliedFilters?.status ? { status: appliedFilters.status } : {}),
        ...(appliedFilters?.search ? { barcode: appliedFilters.search } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });
    const { data: listRes, isLoading } = listQuery;
    const rows: StockBarcodeRecord[] = listRes?.data?.rows || [];
    const totalRowCount = listRes?.data?.count || 0;

    const stockListQuery = useCompanyStockDetailsList({ limit: 1000, offset: 0, status: 'ACTIVE' });
    const products: StockDetails[] = (stockListQuery?.data as { data?: { rows?: StockDetails[] } } | undefined)?.data?.rows || [];

    const saveMut = useSaveStockBarcode();
    const updateMut = useUpdateStockBarcode();
    const deactivateMut = useDeactivateStockBarcode();

    // ---------- Resolve (scan) widget ----------
    const resolveMut = useResolveStockBarcode();
    const [resolveBarcode, setResolveBarcode] = useState('');
    const [resolveScannedQty, setResolveScannedQty] = useState('1');
    const [resolveResult, setResolveResult] = useState<ResolveStockBarcodeResult | null>(null);

    const moduleCode = SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES.code;
    const canCreate = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.CREATE]);
    const canEdit = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.UPDATE]);
    const canDelete = hasPermission(userGroupPermissions, moduleCode, [SYSTEM_PERMISSIONS.DELETE]);

    const productLabelById = useMemo(() => {
        const map: Record<string, string> = {};
        products.forEach((p) => {
            if (p.id) map[p.id] = `${p.itemCode} — ${p.description}`;
        });
        return map;
    }, [products]);

    const columns: ColumnDef<StockBarcodeRecord>[] = [
        {
            accessorKey: 'barcode',
            header: 'Barcode',
            cell: ({ row }) => <div className="font-mono font-semibold">{row.original.barcode || '—'}</div>,
        },
        {
            accessorKey: 'companyStockDetailId',
            header: 'Product',
            cell: ({ row }) => (
                <div>
                    {row.original.companyStockDetailId
                        ? productLabelById[row.original.companyStockDetailId] || row.original.description || row.original.companyStockDetailId
                        : '—'}
                </div>
            ),
        },
        {
            accessorKey: 'packageType',
            header: 'Package',
            cell: ({ row }) => (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {row.original.packageType || '—'}
                </Badge>
            ),
        },
        {
            accessorKey: 'baseQuantityPerScan',
            header: 'Base Qty / Scan',
            cell: ({ row }) => <div className="font-semibold">{row.original.baseQuantityPerScan ?? '—'}</div>,
        },
        {
            accessorKey: 'isPrimary',
            header: 'Primary',
            cell: ({ row }) => (
                <Badge variant={row.original.isPrimary ? 'outline' : 'secondary'} className={row.original.isPrimary ? 'bg-green-50 text-green-700' : ''}>
                    {row.original.isPrimary ? 'Primary' : 'Secondary'}
                </Badge>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const active = (row.original.status ?? 'ACTIVE') !== 'INACTIVE';
                return (
                    <Badge variant="outline" className={active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {active ? 'Active' : 'Inactive'}
                    </Badge>
                );
            },
        },
        {
            accessorKey: 'effectiveFrom',
            header: 'Effective',
            cell: ({ row }) => (
                <div className="text-xs">
                    {row.original.effectiveFrom ? moment(String(row.original.effectiveFrom)).format('DD MMM YYYY') : '—'}
                    {row.original.effectiveTo ? ` → ${moment(String(row.original.effectiveTo)).format('DD MMM YYYY')}` : ''}
                </div>
            ),
        },
        {
            id: 'actions',
            header: () => <div className="text-center">Actions</div>,
            cell: ({ row }) => (
                <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Edit" onClick={() => openEdit(row.original)}>
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="History" onClick={() => setHistoryId(row.original.id)}>
                        <History className="h-4 w-4" />
                    </Button>
                    {(row.original.status ?? 'ACTIVE') !== 'INACTIVE' ? (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600"
                            title="Deactivate"
                            onClick={() => openDeactivate(row.original)}
                        >
                            <PauseCircle className="h-4 w-4" />
                        </Button>
                    ) : null}
                </div>
            ),
        },
    ];

    const openCreate = () => {
        if (!canCreate) {
            setDeniedAction('create');
            setIsPermissionDeniedOpen(true);
            return;
        }
        setEditingId(null);
        setFormOpen(true);
    };

    const openEdit = (row: StockBarcodeRecord) => {
        if (!canEdit) {
            setDeniedAction('edit');
            setIsPermissionDeniedOpen(true);
            return;
        }
        setEditingId(row.id);
        setFormOpen(true);
    };

    const openDeactivate = (row: StockBarcodeRecord) => {
        if (!canDelete) {
            setDeniedAction('deactivate');
            setIsPermissionDeniedOpen(true);
            return;
        }
        setDeactivateTarget(row);
        setDeactivateReason('');
    };

    const confirmDeactivate = () => {
        if (!deactivateTarget) return;
        deactivateMut.mutate(
            { id: deactivateTarget.id, reason: deactivateReason.trim() || undefined },
            {
                onSuccess: (data) => {
                    if (data?.success === false) {
                        toast.error(data?.message || 'Failed to deactivate barcode');
                        return;
                    }
                    toast.success('Barcode deactivated');
                    setDeactivateTarget(null);
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const handleResolve = () => {
        if (!resolveBarcode.trim()) {
            toast.error('Enter a barcode to resolve');
            return;
        }
        resolveMut.mutate(
            {
                barcode: resolveBarcode.trim(),
                scannedPackageQuantity: Number(resolveScannedQty) || 1,
                ...(authUser?.warehouseId ? { warehouseId: authUser.warehouseId } : {}),
            },
            {
                onSuccess: (data) => {
                    if (data?.success) {
                        setResolveResult(data?.data || null);
                        toast.success('Barcode resolved');
                    } else {
                        setResolveResult(null);
                        toast.error(data?.message || 'Resolve failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Resolve failed');
                },
            },
        );
    };

    return (
        <PageLoader isLoading={isLoading || stockListQuery.isLoading}>
            <div className="space-y-3 p-3">
                {/* Resolve widget */}
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                        <ScanLine className="h-4 w-4" /> Resolve Scanned Barcode
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[240px] flex-1">
                            <Label className="text-xs">Barcode</Label>
                            <Input
                                className="font-mono"
                                placeholder="Scan or type a package barcode"
                                value={resolveBarcode}
                                onChange={(e) => setResolveBarcode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleResolve()}
                            />
                        </div>
                        <div className="w-40">
                            <Label className="text-xs">Scanned Package Qty</Label>
                            <Input type="number" min={1} value={resolveScannedQty} onChange={(e) => setResolveScannedQty(e.target.value)} />
                        </div>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleResolve} disabled={resolveMut.isPending}>
                            {resolveMut.isPending ? 'Resolving...' : 'Resolve'}
                        </Button>
                    </div>
                    {resolveResult?.companyStockDetailId ? (
                        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                            <div className="font-semibold text-green-700">Use this converted quantity in the transaction item:</div>
                            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    Item Code: <span className="font-semibold">{resolveResult.itemCode || '—'}</span>
                                </div>
                                <div className="sm:col-span-2 lg:col-span-3">
                                    Description: <span className="font-semibold">{resolveResult.description || '—'}</span>
                                </div>
                                <div>
                                    Barcode: <span className="font-mono font-semibold">{resolveResult.barcode || '—'}</span>
                                </div>
                                <div>
                                    Package: <span className="font-semibold">{resolveResult.packageType || '—'}</span>
                                </div>
                                <div>
                                    Scanned Qty: <span className="font-semibold">{resolveResult.scannedPackageQuantity ?? '—'}</span>
                                </div>
                                <div>
                                    Base Qty / Scan: <span className="font-semibold">{resolveResult.baseQuantityPerScan ?? '—'}</span>
                                </div>
                                <div>
                                    Total Base Qty: <span className="font-semibold">{resolveResult.baseStockQuantity ?? '—'}</span>
                                </div>
                            </div>
                            {resolveResult.foundViaReplacedBarcode ? (
                                <div className="mt-2 text-xs text-amber-700">
                                    This barcode was matched through a replaced (older) barcode.
                                </div>
                            ) : null}
                        </div>
                    ) : resolveResult ? (
                        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
                            {Object.keys(resolveResult).length
                                ? Object.entries(resolveResult)
                                      .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
                                      .map(([k, v]) => (
                                          <div key={k} className="text-xs">
                                              {k}: <span className="font-semibold">{String(v)}</span>
                                          </div>
                                      ))
                                : 'No packaging configuration found for this barcode.'}
                        </div>
                    ) : null}
                </div>

                {/* List */}
                <div className="space-y-2">
                    <DataTable
                        query={listQuery}
                        data={rows}
                        columns={columns}
                        totalRowCount={totalRowCount}
                        pagination={pagination}
                        setPagination={setPagination}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    placeholder="Search barcode..."
                                    value={filters.search || ''}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFilters(filters)}
                                    className="!max-w-[160px]"
                                />
                                <SelectPopover
                                    title="Product"
                                    onlyTitle="All products"
                                    selectedValue={filters.productId}
                                    options={[
                                        { label: 'All products', value: '' },
                                        ...products.map((p) => ({ label: `${p.itemCode} — ${p.description}`, value: p.id })),
                                    ]}
                                    onSelect={(val) => handleFilters({ ...filters, productId: String(val || '') })}
                                />
                                <SelectPopover
                                    title="Package"
                                    onlyTitle="All packages"
                                    selectedValue={filters.packageType}
                                    options={[
                                        { label: 'All packages', value: '' },
                                        ...PACKAGE_TYPES.map((t) => ({ label: PACKAGE_TYPE_LABELS[t], value: t })),
                                    ]}
                                    onSelect={(val) => handleFilters({ ...filters, packageType: String(val || '') })}
                                />
                                <SelectPopover
                                    title="Status"
                                    onlyTitle="All statuses"
                                    selectedValue={filters.status}
                                    options={STATUS_OPTIONS}
                                    onSelect={(val) => handleFilters({ ...filters, status: String(val || '') })}
                                />
                                <FilterActionButtons
                                    onApplyFilters={() => handleFilters(filters)}
                                    onClearClick={() => clearFilters()}
                                    showClearButton={showClearButton}
                                />
                            </div>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={openCreate}>
                                <Plus className="mr-1 h-4 w-4" /> New Packaging Barcode
                            </Button>
                        </div>
                        <div className="text-lg font-bold">Packaging Barcodes</div>
                    </DataTable>
                </div>
            </div>

            <BarcodeForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editingId={editingId}
                products={products}
                onCreate={saveMut.mutateAsync}
                onUpdate={updateMut.mutateAsync}
            />

            <HistoryDialog id={historyId} onClose={() => setHistoryId(null)} />

            <ConfirmDialog
                open={!!deactivateTarget}
                setOpen={(open) => {
                    if (!open) setDeactivateTarget(null);
                    return open;
                }}
                title="Deactivate Packaging Barcode"
                description={
                    deactivateTarget
                        ? `Deactivate barcode "${deactivateTarget.barcode}"? It will no longer be used when scanning.`
                        : 'Deactivate this packaging barcode?'
                }
                variant="destructive"
                confirmBtnTitle="Deactivate"
                onConfirm={confirmDeactivate}
            >
                <div className="space-y-1">
                    <Label className="text-xs">Reason</Label>
                    <Textarea className="text-xs" value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="Reason for deactivation" />
                </div>
            </ConfirmDialog>

            <ViewAccessDeniedDialog
                open={isPermissionDeniedOpen}
                onClose={() => setIsPermissionDeniedOpen(false)}
                options={{
                    description:
                        deniedAction === 'create'
                            ? "You don't have access to create packaging barcodes."
                            : deniedAction === 'edit'
                              ? "You don't have access to edit packaging barcodes."
                              : "You don't have access to deactivate packaging barcodes.",
                }}
            />

            </PageLoader>
    );
};

interface BarcodeFormProps {
    open: boolean;
    onClose: () => void;
    editingId: string | null;
    products: StockDetails[];
    onCreate: (data: SaveStockBarcodeInput) => Promise<MutateStockBarcodeResponse>;
    onUpdate: (data: UpdateStockBarcodeInput) => Promise<MutateStockBarcodeResponse>;
}

interface BarcodeFormState {
    companyStockDetailId: string;
    barcode: string;
    barcodeType: string;
    packageType: string;
    companyUomId: string;
    baseQuantityPerScan: string;
    isPrimary: boolean;
    effectiveFrom: string;
    effectiveTo: string;
}

const emptyForm: BarcodeFormState = {
    companyStockDetailId: '',
    barcode: '',
    barcodeType: 'SECONDARY',
    packageType: 'UNIT',
    companyUomId: '',
    baseQuantityPerScan: '1',
    isPrimary: false,
    effectiveFrom: '',
    effectiveTo: '',
};

function BarcodeForm({ open, onClose, editingId, products, onCreate, onUpdate }: BarcodeFormProps) {
    const isEditing = !!editingId;
    const getQuery = useGetStockBarcode(editingId);
    const editData = getQuery?.data?.data as StockBarcodeRecord | undefined;

    const uomQuery = useGetActiveUoms(open);
    const uoms = uomQuery.data?.data?.rows || [];

    const [form, setForm] = useState<BarcodeFormState>(emptyForm);
    const prefilledRef = useRef(false);

    const uomOptions = useMemo(() => {
        const options = [
            { label: 'None', value: '' },
            ...uoms.map((u) => ({ label: `${u.name} (${u.code})`, value: u.id })),
        ];
        if (form.companyUomId && !uoms.some((u) => u.id === form.companyUomId)) {
            options.push({ label: `${form.companyUomId} (inactive)`, value: form.companyUomId });
        }
        return options;
    }, [uoms, form.companyUomId]);

    useEffect(() => {
        if (!open) {
            prefilledRef.current = false;
            setForm(emptyForm);
            return;
        }
        if (isEditing && editData && !prefilledRef.current) {
            setForm({
                companyStockDetailId: editData.companyStockDetailId || '',
                barcode: editData.barcode || '',
                barcodeType: editData.barcodeType || 'SECONDARY',
                packageType: (editData.packageType as string) || 'UNIT',
                companyUomId: editData.companyUomId || '',
                baseQuantityPerScan: String(editData.baseQuantityPerScan ?? 1),
                isPrimary: !!editData.isPrimary,
                effectiveFrom: editData.effectiveFrom ? moment(String(editData.effectiveFrom)).format('YYYY-MM-DD') : '',
                effectiveTo: editData.effectiveTo ? moment(String(editData.effectiveTo)).format('YYYY-MM-DD') : '',
            });
            prefilledRef.current = true;
        }
    }, [open, isEditing, editData]);

    const handleSave = () => {
        if (!form.companyStockDetailId) {
            toast.error('Select a product');
            return;
        }
        if (!form.barcode.trim()) {
            toast.error('Barcode is required');
            return;
        }
        if (!(Number(form.baseQuantityPerScan) > 0)) {
            toast.error('Base quantity per scan must be greater than 0');
            return;
        }
        const base = {
            packageType: form.packageType,
            baseQuantityPerScan: Number(form.baseQuantityPerScan),
            companyUomId: form.companyUomId.trim() || undefined,
            isPrimary: form.isPrimary,
            effectiveFrom: form.effectiveFrom ? moment(form.effectiveFrom).startOf('day').toISOString() : undefined,
            effectiveTo: form.effectiveTo ? moment(form.effectiveTo).endOf('day').toISOString() : null,
        };
        const onSuccess = (data: MutateStockBarcodeResponse) => {
            if (data?.success === false) {
                toast.error(data?.message || 'Save failed');
                return;
            }
            toast.success(isEditing ? 'Packaging barcode updated' : 'Packaging barcode created');
            onClose();
        };
        const onError = (error: unknown) => {
            // @ts-ignore
            toast.error(error?.response?.data?.message || 'Internal Server Error!');
        };
        if (isEditing && editingId) {
            onUpdate({ id: editingId, ...base, reason: 'Updated packaging configuration' })
                .then(onSuccess)
                .catch(onError);
        } else {
            onCreate({
                companyStockDetailId: form.companyStockDetailId,
                barcode: form.barcode.trim(),
                barcodeType: form.barcodeType.trim() || 'SECONDARY',
                ...base,
                clientDocumentId: generateUUIDForData(),
            })
                .then(onSuccess)
                .catch(onError);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Packaging Barcode' : 'New Packaging Barcode'}</DialogTitle>
                    <DialogDescription>
                        Configure package barcodes — UNIT, SHRINK, CASE or PALLET. Scanning returns the converted base quantity.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label>Product</Label>
                        <SelectPopover
                            title="Product"
                            onlyTitle="Select product"
                            selectedValue={form.companyStockDetailId}
                            options={[
                                { label: 'Select product', value: '' },
                                ...products.map((p) => ({ label: `${p.itemCode} — ${p.description}`, value: p.id })),
                            ]}
                            onSelect={(val) => setForm({ ...form, companyStockDetailId: String(val || '') })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Barcode</Label>
                            <Input
                                className="font-mono"
                                value={form.barcode}
                                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                placeholder="e.g. 600100000025"
                            />
                        </div>
                        <div>
                            <Label>Package Type</Label>
                            <SelectPopover
                                title="Package"
                                onlyTitle="Select package"
                                selectedValue={form.packageType}
                                options={PACKAGE_TYPES.map((t) => ({ label: PACKAGE_TYPE_LABELS[t], value: t }))}
                                onSelect={(val) => setForm({ ...form, packageType: String(val || 'UNIT') })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Base Quantity per Scan</Label>
                            <Input
                                type="number"
                                min={1}
                                value={form.baseQuantityPerScan}
                                onChange={(e) => setForm({ ...form, baseQuantityPerScan: e.target.value })}
                                placeholder="e.g. 24"
                            />
                        </div>
                        <div>
                            <Label>UOM (optional)</Label>
                            <SelectPopover
                                title="UOM"
                                onlyTitle="Select UOM"
                                selectedValue={form.companyUomId}
                                options={uomOptions}
                                onSelect={(val) => setForm({ ...form, companyUomId: String(val || '') })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Effective From</Label>
                            <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} />
                        </div>
                        <div>
                            <Label>Effective To</Label>
                            <Input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                        <div>
                            <Label>Primary barcode</Label>
                            <p className="text-xs text-muted-foreground">Mark this barcode as the primary label for the product.</p>
                        </div>
                        <Switch checked={form.isPrimary} onCheckedChange={(checked) => setForm({ ...form, isPrimary: checked })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700" disabled={getQuery.isLoading} onClick={handleSave}>
                        {getQuery.isLoading ? 'Loading...' : isEditing ? 'Update' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface HistoryApiEntry {
    id: string;
    changeType: 'CREATED' | 'UPDATED' | string;
    previousValues: Record<string, unknown> | null;
    newValues: Record<string, unknown> | null;
    reason: string | null;
    changedBy: string | null;
    createdAt: string;
}

const HISTORY_FIELD_LABELS: Record<string, string> = {
    barcode: 'Barcode',
    barcodeType: 'Barcode Type',
    packageType: 'Package Type',
    baseQuantityPerScan: 'Base Qty / Scan',
    companyUomId: 'UOM',
    isPrimary: 'Primary',
    status: 'Status',
    effectiveFrom: 'Effective From',
    effectiveTo: 'Effective To',
    companyStockDetailId: 'Product',
};

const HISTORY_DATE_FIELDS = new Set(['effectiveFrom', 'effectiveTo']);

function formatHistoryValue(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (HISTORY_DATE_FIELDS.has(field)) return moment(String(value)).format('DD MMM YYYY HH:mm');
    return String(value);
}

interface HistoryRow {
    field: string;
    oldValue: string;
    newValue: string;
}

function buildHistoryRows(entry: HistoryApiEntry): HistoryRow[] {
    const prev = entry.previousValues || {};
    const next = entry.newValues || {};
    const keys = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
    const isCreate = entry.changeType === 'CREATED';

    return keys
        .map((key) => ({
            field: HISTORY_FIELD_LABELS[key] || key,
            oldValue: formatHistoryValue(key, prev[key]),
            newValue: formatHistoryValue(key, next[key]),
            rawKey: key,
        }))
        .filter((r) => {
            if (isCreate) return r.newValue !== '—' && r.rawKey !== 'companyStockDetailId';
            // Compare formatted values so millisecond-only differences (e.g. 18:29:59.000 vs .999) are ignored
            return r.oldValue !== r.newValue;
        })
        .map(({ field, oldValue, newValue }) => ({ field, oldValue, newValue }));
}

function HistoryDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
    const query = useGetStockBarcodeHistory(id);
    const raw = query?.data?.data as unknown;

    let entries: HistoryApiEntry[] = [];
    if (Array.isArray(raw)) entries = raw as HistoryApiEntry[];
    else if (raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)) {
        entries = (raw as { rows: HistoryApiEntry[] }).rows;
    }

    // Newest first
    const sorted = [...entries].sort((a, b) => moment(b.createdAt).valueOf() - moment(a.createdAt).valueOf());

    return (
        <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Barcode Change History</DialogTitle>
                    <DialogDescription>Every update to this packaging barcode is tracked here.</DialogDescription>
                </DialogHeader>
                <PageLoader isLoading={query.isLoading}>
                    {sorted.length ? (
                        <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-gray-50 uppercase text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2">Change</th>
                                    <th className="px-3 py-2">Field</th>
                                    <th className="px-3 py-2">Old</th>
                                    <th className="px-3 py-2">New</th>
                                    <th className="px-3 py-2">Reason</th>
                                    <th className="px-3 py-2">Changed By</th>
                                    <th className="px-3 py-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((entry) => {
                                    const rows = buildHistoryRows(entry);
                                    const span = Math.max(rows.length, 1);
                                    const isCreate = entry.changeType === 'CREATED';

                                    const metaCells = (
                                        <>
                                            <td rowSpan={span} className="px-3 py-2">
                                                <Badge
                                                    variant="outline"
                                                    className={isCreate ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}
                                                >
                                                    {isCreate ? 'Created' : entry.changeType === 'UPDATED' ? 'Updated' : entry.changeType}
                                                </Badge>
                                            </td>
                                        </>
                                    );

                                    const trailingCells = (
                                        <>
                                            <td rowSpan={span} className="max-w-[160px] px-3 py-2">{entry.reason || '—'}</td>
                                            <td rowSpan={span} className="px-3 py-2 font-mono" title={entry.changedBy || undefined}>
                                                {entry.changedBy ? entry.changedBy.slice(0, 8) : '—'}
                                            </td>
                                            <td rowSpan={span} className="whitespace-nowrap px-3 py-2">
                                                {entry.createdAt ? moment(entry.createdAt).format('DD MMM YYYY HH:mm') : '—'}
                                            </td>
                                        </>
                                    );

                                    if (!rows.length) {
                                        return (
                                            <tr key={entry.id} className="border-t align-top">
                                                {metaCells}
                                                <td colSpan={3} className="px-3 py-2 text-muted-foreground">No field changes</td>
                                                {trailingCells}
                                            </tr>
                                        );
                                    }

                                    return rows.map((r, i) => (
                                        <tr key={`${entry.id}-${r.field}`} className={`align-top ${i === 0 ? 'border-t' : ''}`}>
                                            {i === 0 ? metaCells : null}
                                            <td className="px-3 py-2 font-semibold">{r.field}</td>
                                            <td className="max-w-[140px] truncate px-3 py-2">{r.oldValue}</td>
                                            <td className="max-w-[140px] truncate px-3 py-2">{r.newValue}</td>
                                            {i === 0 ? trailingCells : null}
                                        </tr>
                                    ));
                                })}
                            </tbody>
                        </table>
                    ) : query.isLoading ? null : (
                        <div className="p-8 text-center text-sm text-muted-foreground">No history recorded.</div>
                    )}
                </PageLoader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default PackagingBarcodes;