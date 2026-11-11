'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/custom-components/PageLoader';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, FolderOpen, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuthUser } from '@/stores/auth-user.store';
import { useGetWarehouses, WarehouseDetails } from '@/api-queries/warehouse';
import { useDebtorList } from '@/api-queries/debtor';
import {
    LocationType,
    ScopeType,
    WarehouseLocation,
    WarehouseLocationScope,
    buildLocationScope,
    useGetAssignmentInventory,
    useSaveWarehouseLocation,
    useGetWarehouseLocationTree,
    useDeleteWarehouseLocation,
    useAssignInventoryToLocation,
} from '@/api-queries/company/warehouse-location';
import ConfirmDialog from '@/components/confirm-dialog';
import SelectPopover from '@/components/select-popover';
import { generateUniqueUUID } from '@/utils/helpers';

const CHILD_TYPES: Record<LocationType | 'root', LocationType[]> = {
    root: ['ZONE', 'AISLE'],
    ZONE: ['AISLE'],
    AISLE: ['RACK'],
    RACK: ['LEVEL'],
    LEVEL: ['BIN'],
    BIN: [],
};

const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
    ZONE: 'Zone',
    AISLE: 'Aisle',
    RACK: 'Rack',
    LEVEL: 'Level',
    BIN: 'Bin',
};

const TYPE_COLORS: Record<LocationType, string> = {
    ZONE: 'bg-purple-100 text-purple-700',
    AISLE: 'bg-blue-100 text-blue-700',
    RACK: 'bg-amber-100 text-amber-700',
    LEVEL: 'bg-emerald-100 text-emerald-700',
    BIN: 'bg-rose-100 text-rose-700',
};

type NodeAction =
    | { kind: 'create'; parent: WarehouseLocation | null }
    | { kind: 'edit'; node: WarehouseLocation }
    | { kind: 'assign'; node: WarehouseLocation }
    | null;

const WarehouseLocations = () => {
    const currentUser = useAuthUser((state) => state.user);
    const isStoreUser = currentUser?.userType === 'COMPANY-DEBTOR-USER';
    const myDebtorId = currentUser?.companyDebtorId || '';

    const [scopeMode, setScopeMode] = useState<ScopeType>(isStoreUser ? 'STORE' : 'COMPANY');
    const [warehouseId, setWarehouseId] = useState('');
    const [storeId, setStoreId] = useState(myDebtorId);

    const [action, setAction] = useState<NodeAction>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [confirmDelete, setConfirmDelete] = useState<WarehouseLocation | null>(null);

    const deleteMut = useDeleteWarehouseLocation();

    const warehousesRes = useGetWarehouses({});
    const rawWarehouses = (warehousesRes?.data?.data || []) as WarehouseDetails[] | { rows?: WarehouseDetails[] };
    const warehouses: WarehouseDetails[] = Array.isArray(rawWarehouses) ? rawWarehouses : rawWarehouses?.rows || [];

    const { data: debtorsRes } = useDebtorList({ limit: 1000, offset: 0 });
    const stores = (debtorsRes?.data?.rows as any[]) || [];

    // Store users are locked to their own store; they can never pick Company/DC or another store.
    const effectiveScopeMode: ScopeType = isStoreUser ? 'STORE' : scopeMode;
    const activeDebtorId = isStoreUser ? myDebtorId : storeId || '';

    const scope: WarehouseLocationScope = useMemo(
        () => buildLocationScope(effectiveScopeMode, warehouseId, activeDebtorId),
        [effectiveScopeMode, warehouseId, activeDebtorId],
    );

    const scopeReady =
        effectiveScopeMode === 'COMPANY' ? true : effectiveScopeMode === 'WAREHOUSE' ? !!warehouseId : !!activeDebtorId;

    // Changing scope discards the open dialog (its inventory rows + unsaved assignments) and tree state.
    const resetForScopeChange = () => {
        setAction(null);
        setExpanded({});
        setConfirmDelete(null);
    };

    const treeQuery = useGetWarehouseLocationTree(scope, scopeReady);

    const renderNode = (node: WarehouseLocation, depth: number) => {
        const open = !!expanded[node.id];
        const hasChildren = !!node.children?.length;

        return (
            <div key={node.id}>
                <div
                    className="group flex items-center gap-1 rounded-md border px-2 py-1.5 hover:bg-muted/50"
                    style={{ marginLeft: depth * 20 }}
                >
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpanded((prev) => ({ ...prev, [node.id]: !open }));
                        }}
                        className="rounded p-0.5 hover:bg-muted disabled:cursor-default"
                        disabled={!hasChildren}
                    >
                        {hasChildren ? open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : <span className="inline-block w-4" />}
                    </button>
                    <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold">{node.name || node.code}</span>
                            <span className="truncate font-mono text-xs text-muted-foreground">{node.code}</span>
                            <Badge variant="outline" className={`px-1.5 py-0 text-[10px] ${TYPE_COLORS[node.locationType]}`}>
                                {LOCATION_TYPE_LABEL[node.locationType]}
                            </Badge>
                            {node.pickSequence != null ? (
                                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                                    seq {node.pickSequence}
                                </Badge>
                            ) : null}
                        </div>
                        {node.displayPath ? (
                            <div className="truncate text-[10px] text-muted-foreground">{node.displayPath}</div>
                        ) : null}
                    </div>
                    <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                        {CHILD_TYPES[node.locationType]?.length ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                title={`Add ${CHILD_TYPES[node.locationType].join('/')}`}
                                onClick={() => setAction({ kind: 'create', parent: node })}
                            >
                                <Plus className="h-3.5 w-3.5 text-blue-600" />
                            </Button>
                        ) : null}
                        {node.locationType === 'RACK' ? (
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Assign inventory" onClick={() => setAction({ kind: 'assign', node })}>
                                <PackagePlus className="h-3.5 w-3.5 text-violet-600" />
                            </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Edit" onClick={() => setAction({ kind: 'edit', node })}>
                            <Pencil className="h-3.5 w-3.5 text-gray-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Delete" onClick={() => setConfirmDelete(node)}>
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                    </div>
                </div>
                {open && hasChildren ? (node.children || []).map((child) => renderNode(child, depth + 1)) : null}
                {!open && hasChildren ? (
                    <div style={{ marginLeft: (depth + 1) * 20 }} className="py-0.5 pl-2 text-xs text-muted-foreground">
                        {node.children!.length} child location{node.children!.length === 1 ? '' : 's'}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <PageLoader isLoading={treeQuery.isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="flex flex-wrap items-end gap-3">
                        {!isStoreUser ? (
                            <>
                                <div className="min-w-[140px]">
                                    <Label className="text-xs">Scope</Label>
                                    <div className="mt-1">
                                        <Select
                                            value={scopeMode}
                                            onValueChange={(v) => {
                                                setScopeMode(v as ScopeType);
                                                setWarehouseId('');
                                                setStoreId('');
                                                resetForScopeChange();
                                            }}
                                        >
                                            <SelectTrigger className="!h-9 text-xs">
                                                <SelectValue placeholder="Scope" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="COMPANY">Company/DC</SelectItem>
                                                <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                                                <SelectItem value="STORE">Store</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                {scopeMode === 'COMPANY' ? null : scopeMode === 'WAREHOUSE' ? (
                                    <div className="min-w-[220px]">
                                        <Label className="text-xs">Warehouse</Label>
                                        <div className="mt-1">
                                            <SelectPopover
                                                title="Warehouse"
                                                onlyTitle="Select warehouse"
                                                selectedValue={warehouseId}
                                                options={warehouses.map((w) => ({ value: w.id, label: `${w.warehouse} (${w.groupCode})` }))}
                                                onSelect={(v) => {
                                                    setWarehouseId(String(v || ''));
                                                    resetForScopeChange();
                                                }}
                                                selectClass="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="min-w-[220px]">
                                        <Label className="text-xs">Debtor / Store</Label>
                                        <div className="mt-1">
                                            <SelectPopover
                                                title="Debtor / Store"
                                                onlyTitle="Select store"
                                                selectedValue={storeId}
                                                options={stores.map((s) => ({ value: s.id, label: s.name || s.tradingAs || s.id }))}
                                                onSelect={(v) => {
                                                    setStoreId(String(v || ''));
                                                    resetForScopeChange();
                                                }}
                                                selectClass="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-xs text-muted-foreground">
                                Scoped to my store
                            </div>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setAction({ kind: 'create', parent: null })} disabled={!scopeReady}>
                            <Plus className="mr-1 h-4 w-4" /> Add Root Location
                        </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">ZONE → AISLE → RACK → LEVEL → BIN</div>
                </div>

                <Separator />

                {!scopeReady ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        Select a warehouse or store to view its location hierarchy.
                    </div>
                ) : (treeQuery.data?.data || []).length === 0 ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No locations yet. Create a root Aisle (or Zone) to start building the hierarchy.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {(treeQuery.data?.data || []).map((node) => renderNode(node, 0))}
                    </div>
                )}

                {action?.kind === 'create' || action?.kind === 'edit' ? (
                    <LocationDialog scope={scope} parent={action.kind === 'create' ? action.parent : null} node={action.kind === 'edit' ? action.node : null} onClose={() => setAction(null)} />
                ) : null}

                {action?.kind === 'assign' ? (
                    <InventoryAssignmentDialog
                        scope={scope}
                        location={action.node}
                        onClose={() => setAction(null)}
                    />
                ) : null}

                <ConfirmDialog
                    open={!!confirmDelete}
                    setOpen={(open) => (open ? undefined : setConfirmDelete(null))}
                    title="Delete location"
                    description="A location cannot be deleted while it has child locations or assigned inventory. Proceed?"
                    variant="destructive"
                    confirmBtnTitle="Delete"
                    onConfirm={() => {
                        if (!confirmDelete) return;
                        deleteMut.mutate(confirmDelete.id, {
                            onSuccess: (data) => {
                                if (data.success) {
                                    toast.success('Location deleted successfully');
                                    setConfirmDelete(null);
                                } else {
                                    toast.error(data.message || 'Failed to delete location');
                                }
                            },
                            onError: (error: any) => {
                                toast.error(error?.response?.data?.message || 'Internal Server Error!');
                            },
                        });
                    }}
                />
            </div>
        </PageLoader>
    );
};

interface LocationDialogProps {
    scope: WarehouseLocationScope;
    parent: WarehouseLocation | null;
    node: WarehouseLocation | null;
    onClose: () => void;
}

const LocationDialog = ({ scope, parent, node, onClose }: LocationDialogProps) => {
    const saveMut = useSaveWarehouseLocation();
    const [locationType, setLocationType] = useState<LocationType>(
        node?.locationType || CHILD_TYPES[parent ? parent.locationType : 'root'][0],
    );
    const [code, setCode] = useState(node?.code || '');
    const [name, setName] = useState(node?.name || '');
    const [barcode, setBarcode] = useState(node?.barcode || '');
    const [pickSequence, setPickSequence] = useState<number | undefined>(node?.pickSequence ?? undefined);
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(node?.status || 'ACTIVE');
    const [parentId, setParentId] = useState<string | null>(parent?.id || node?.parentId || null);

    const allowedTypes = node ? [node.locationType] : CHILD_TYPES[parent ? parent.locationType : 'root'] || [];

    useEffect(() => {
        if (node) {
            setLocationType(node.locationType);
            setCode(node.code);
            setName(node.name || '');
            setBarcode(node.barcode || '');
            setPickSequence(node.pickSequence ?? undefined);
            setParentId(node.parentId || null);
            setStatus(node.status || 'ACTIVE');
        } else if (parent) {
            setLocationType(CHILD_TYPES[parent.locationType][0]);
            setParentId(parent.id);
        }
    }, [node, parent]);

    const submit = () => {
        if (!code.trim()) return toast.error('Location code is required');
        saveMut.mutate(
            {
                ...(node?.id ? { id: node.id } : {}),
                ...scope,
                parentId,
                locationType,
                code: code.trim(),
                ...(name ? { name: name.trim() } : {}),
                ...(barcode ? { barcode: barcode.trim() } : {}),
                ...(pickSequence != null ? { pickSequence } : {}),
                ...(node?.id ? { status } : {}),
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success(node ? 'Location updated successfully' : 'Location created successfully');
                        onClose();
                    } else {
                        toast.error(data.message || 'Failed to save location');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    return (
        <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
            <DialogContent className="sm:max-w-[520px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">
                        {node ? `Edit ${LOCATION_TYPE_LABEL[node.locationType]}` : `Add ${LOCATION_TYPE_LABEL[locationType]}`}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Location Type</Label>
                            <Select value={locationType} onValueChange={(v) => setLocationType(v as LocationType)} disabled={!!node}>
                                <SelectTrigger className="!h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedTypes.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {LOCATION_TYPE_LABEL[t]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Pick Sequence</Label>
                            <Input type="number" min={0} className="h-8 text-xs" value={pickSequence ?? ''} onChange={(e) => setPickSequence(e.target.value ? Number(e.target.value) : undefined)} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Code</Label>
                            <Input className="h-8 text-xs" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. A01" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rack A01" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Barcode</Label>
                            <Input className="h-8 text-xs" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="LOC-A-A01" />
                        </div>
                        {node ? (
                            <div className="space-y-1">
                                <Label className="text-xs">Status</Label>
                                <Select value={status} onValueChange={(v) => setStatus(v as 'ACTIVE' | 'INACTIVE')}>
                                    <SelectTrigger className="!h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Label className="text-xs">Parent</Label>
                                <div className="flex h-8 items-center rounded-md border bg-muted px-3 text-xs">
                                    {parent ? parent.displayPath || parent.name || parent.code : '— root —'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="button" className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700" onClick={submit} disabled={saveMut.isPending}>
                            {saveMut.isPending ? 'Saving…' : node ? 'Update Location' : 'Save Location'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

interface InventoryAssignmentDialogProps {
    scope: WarehouseLocationScope;
    location: WarehouseLocation;
    onClose: () => void;
}

const ASSIGN_PAGE_SIZE = 50;
const UNASSIGN_VALUE = '__unassign__';

const InventoryAssignmentDialog = ({ scope, location, onClose }: InventoryAssignmentDialogProps) => {
    const assignMut = useAssignInventoryToLocation();
    const [includeUnassigned, setIncludeUnassigned] = useState(true);
    const [page, setPage] = useState(0);
    // Unsaved choices across pages: inventoryId -> target location id (null = unassign).
    const [draft, setDraft] = useState<Record<string, string | null>>({});
    // The location each inventory row had when loaded, to know what actually changed.
    const originalRef = useRef<Record<string, string | null>>({});
    // Same id is reused when retrying an identical submission; renewed after success or any edit.
    const clientEventIdRef = useRef<string>(generateUniqueUUID());

    // Only this rack and its children (plus Unassigned) may be chosen.
    const treeQuery = useGetWarehouseLocationTree({ ...scope, rootLocationId: location.id }, true);
    const locationOptions = useMemo(() => {
        const out: { value: string; label: string }[] = [];
        const walk = (nodes: WarehouseLocation[] | undefined) =>
            (nodes || []).forEach((n) => {
                out.push({ value: n.id, label: n.displayPath || n.name || n.code });
                walk(n.children);
            });
        walk(treeQuery.data?.data);
        return out;
    }, [treeQuery.data]);

    const invQuery = useGetAssignmentInventory(
        {
            warehouseLocationId: location.id,
            includeUnassigned,
            limit: ASSIGN_PAGE_SIZE,
            offset: page * ASSIGN_PAGE_SIZE,
        },
        true,
    );
    const rows = invQuery.data?.data?.rows || [];
    const total = invQuery.data?.data?.count || 0;
    const pageCount = Math.max(1, Math.ceil(total / ASSIGN_PAGE_SIZE));

    useEffect(() => {
        rows.forEach((r) => {
            if (!(r.id in originalRef.current)) originalRef.current[r.id] = r.warehouseLocationId || null;
        });
    }, [rows]);

    const changed = Object.entries(draft).filter(([id, target]) => (originalRef.current[id] ?? null) !== (target ?? null));

    const setTarget = (id: string, target: string | null) => {
        clientEventIdRef.current = generateUniqueUUID();
        setDraft((prev) => ({ ...prev, [id]: target }));
    };

    const pathTitle = location.displayPath || location.name || location.code;

    const submit = () => {
        if (assignMut.isPending) return;
        if (!changed.length) return onClose();
        assignMut.mutate(
            {
                rootLocationId: location.id,
                clientEventId: clientEventIdRef.current,
                assignments: changed.map(([id, target]) => ({
                    companyStockInventoryId: id,
                    warehouseLocationId: target || null,
                })),
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        toast.success('Inventory locations updated successfully');
                        clientEventIdRef.current = generateUniqueUUID();
                        originalRef.current = {};
                        setDraft({});
                        invQuery.refetch();
                        treeQuery.refetch();
                    } else {
                        toast.error(data.message || 'Failed to assign inventory');
                    }
                },
                onError: (error: any) => {
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    return (
        <Dialog open onOpenChange={(o) => (o ? undefined : onClose())}>
            <DialogContent className="sm:max-w-[1100px]" onWheel={(e) => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle className="font-semibold">Assign Inventory — {pathTitle}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] space-y-3 overflow-auto text-xs">
                    <p className="text-xs text-muted-foreground">
                        Records where stock is kept inside this rack. It does not transfer stock or change quantities. Choose
                        &quot;Unassigned&quot; to remove an assignment.
                    </p>
                    <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={includeUnassigned}
                            onChange={(e) => {
                                setIncludeUnassigned(e.target.checked);
                                setPage(0);
                            }}
                        />
                        Include unassigned stock
                    </label>
                    {invQuery.isLoading ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">Loading inventory…</div>
                    ) : !rows.length ? (
                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                            No inventory found for this rack.
                        </div>
                    ) : (
                        <table className="w-full table-fixed text-sm">
                            <colgroup>
                                <col className="w-[26%]" />
                                <col className="w-[8%]" />
                                <col className="w-[8%]" />
                                <col className="w-[8%]" />
                                <col className="w-[16%]" />
                                <col className="w-[34%]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b text-left text-xs text-muted-foreground">
                                    <th className="px-2 py-1">Product / Batch</th>
                                    <th className="px-2 py-1 text-right">On Hand</th>
                                    <th className="px-2 py-1 text-right">Reserved</th>
                                    <th className="px-2 py-1 text-right">Available</th>
                                    <th className="px-3 py-1">Current Location</th>
                                    <th className="px-2 py-1">Assign To</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const original = r.warehouseLocationId || null;
                                    const value = r.id in draft ? draft[r.id] : original;
                                    return (
                                        <tr key={r.id} className="border-b">
                                            <td className="px-2 py-1">
                                                <div className="truncate font-medium" title={r.productName}>{r.productName || r.companyStockDetailId}</div>
                                                <div className="font-mono text-xs text-muted-foreground">
                                                    {r.itemCode ? `${r.itemCode} · ` : ''}
                                                    {r.batchNumber}
                                                </div>
                                            </td>
                                            <td className="px-2 py-1 text-right tabular-nums">{r.stockOnHand ?? '—'}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{r.reservedStock ?? '—'}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{r.availableStock ?? '—'}</td>
                                            <td className="break-words px-3 py-1 text-xs text-muted-foreground">
                                                {r.locationPath && r.locationPath.toUpperCase() !== 'UNASSIGNED' ? r.locationPath : 'Unassigned'}
                                            </td>
                                            <td className="px-2 py-1">
                                                <SelectPopover
                                                    title="Location"
                                                    onlyTitle="Unassigned"
                                                    selectedValue={value || ''}
                                                    options={[{ value: UNASSIGN_VALUE, label: 'Unassigned' }, ...locationOptions]}
                                                    onSelect={(v) => setTarget(r.id, !v || v === UNASSIGN_VALUE ? null : String(v))}
                                                    selectClass="h-8 w-full text-xs"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={page === 0 || invQuery.isFetching}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                            >
                                Prev
                            </Button>
                            <span>
                                Page {page + 1} of {pageCount} · {total} item{total === 1 ? '' : 's'}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={page + 1 >= pageCount || invQuery.isFetching}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" className="px-3 py-1 text-xs" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="bg-blue-600 px-3 py-1 text-xs hover:bg-blue-700"
                                onClick={submit}
                                disabled={assignMut.isPending || !changed.length}
                            >
                                {assignMut.isPending ? 'Saving…' : `Save Assignments${changed.length ? ` (${changed.length})` : ''}`}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WarehouseLocations;