'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/Multi-select';
import { DataTable } from '@/components/dynamic-table/data-table';
import useTableFilters from '@/components/list-only-table/use-table-filters';
import FilterActionButtons from '@/components/custom-components/filter-action-buttons';
import { toast } from 'sonner';
import { Edit, Plus, Loader2, Monitor, Menu as MenuIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    useGetShortcutsList,
    useCreateShortcut,
    useUpdateShortcut,
    useGetShortcutKeys,
    SHORTCUT_TYPES,
    type ShortcutRecord,
    type ShortcutType,
    type ShortcutKeysDefinition,
} from '@/api-queries/shortcuts';
import { useGetCompanyMenuList, type CompanyMenuItem } from '@/api-queries/menu';
import { useGetTills, type TillDetails } from '@/api-queries/masters/tills';

const ShortcutManagement = () => {
    const { filters, handleFilters, clearFilters, appliedFilters, showClearButton, pagination, setPagination } =
        useTableFilters<{ type: string }>({ type: '' });

    const query = useGetShortcutsList({
        ...(appliedFilters?.type ? { type: appliedFilters.type as ShortcutType } : {}),
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
    });

    const rows: ShortcutRecord[] = Array.isArray(query?.data?.data) ? query.data.data : (query?.data?.data?.rows || []);
    const totalRowCount = rows.length;

    const menuQuery = useGetCompanyMenuList({ limit: 1000, offset: 0 });
    const allMenus: CompanyMenuItem[] = Array.isArray(menuQuery?.data?.data)
        ? menuQuery.data.data
        : (menuQuery.data?.data?.rows || []);

    // Order the menu tree so parents appear before their children.
    const menus = useMemo(() => {
        const childrenByParent = new Map<string, CompanyMenuItem[]>();
        for (const item of allMenus) {
            if (!item.parentId) continue;
            const list = childrenByParent.get(item.parentId) || [];
            list.push(item);
            childrenByParent.set(item.parentId, list);
        }
        const ordered: CompanyMenuItem[] = [];
        const seen = new Set<string>();
        for (const item of allMenus) {
            if (item.parentId) continue;
            ordered.push(item);
            seen.add(item.id);
            for (const child of childrenByParent.get(item.id) || []) {
                ordered.push(child);
                seen.add(child.id);
            }
        }
        for (const item of allMenus) {
            if (!seen.has(item.id)) ordered.push(item);
        }
        return ordered;
    }, [allMenus]);

    const menuDisplayLabel = (menu: CompanyMenuItem) => {
        const parent = menu.parent || (menu.parentId ? menus.find((m) => m.id === menu.parentId) : null);
        return parent?.label ? `${parent.label} / ${menu.label}` : menu.label || menu.href || menu.id;
    };

    const tillQuery = useGetTills({ limit: 1000, offset: 0 });
    const tills: TillDetails[] = tillQuery?.data?.data?.rows || [];

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ShortcutRecord | null>(null);

    const createMutation = useCreateShortcut();
    const updateMutation = useUpdateShortcut();

    const toggleActive = (record: ShortcutRecord) => {
        const next = record.isActive === false;
        updateMutation
            .mutateAsync({ id: record.id, isActive: next })
            .then((data) => {
                if (data?.success) toast.success(`Shortcut ${next ? 'activated' : 'deactivated'}`);
                else toast.error(data?.message || 'Update failed');
            })
            .catch((error) => {
                // @ts-ignore
                toast.error(error?.response?.data?.message || 'Internal Server Error!');
            });
    };

    const menuName = (record: ShortcutRecord) => record.menu?.label || record.menuId;
    const tillName = (record: ShortcutRecord) => {
        const t = record.till;
        if (t) return t.name || t.description || t.id;
        const found = tills.find((till) => till.id === record.tillId);
        return found ? found.name : record.tillId;
    };

    const columns: ColumnDef<ShortcutRecord>[] = [
        {
            accessorKey: 'type',
            header: 'Type',
            cell: ({ row }) =>
                row.original.type === 'EXTERNAL' ? (
                    <Badge variant="outline" className="gap-1 bg-blue-100 text-blue-800">
                        <Monitor className="h-3 w-3" /> EXTERNAL
                    </Badge>
                ) : (
                    <Badge variant="outline" className="gap-1 bg-violet-100 text-violet-800">
                        <MenuIcon className="h-3 w-3" /> MENU
                    </Badge>
                ),
        },
        {
            accessorKey: 'keyCombo',
            header: 'Key',
            cell: ({ row }) => (
                <span className="rounded border bg-muted px-2 py-0.5 font-mono text-xs font-semibold">
                    {row.original.keyCombo || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'menuId',
            header: 'Target',
            cell: ({ row }) => {
                const r = row.original;
                if (r.type === 'EXTERNAL') {
                    return (
                        <div className="text-sm">
                            <div>{r.programPath || '—'}</div>
                            {r.programParameters ? (
                                <div className="font-mono text-xs text-muted-foreground">{r.programParameters}</div>
                            ) : null}
                        </div>
                    );
                }
                return (
                    <div>
                        <div className="text-sm">{menuName(r) || '—'}</div>
                        {r.menu?.href ? <div className="font-mono text-xs text-muted-foreground">{r.menu.href}</div> : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'description',
            header: 'Description',
            cell: ({ row }) => <div className="max-w-[160px] truncate text-sm">{row.original.description || '—'}</div>,
        },
        {
            accessorKey: 'tillId',
            header: 'Till',
            cell: ({ row }) => {
                const r = row.original;
                return (
                    <div>
                        <div className="text-sm">{r.type === 'EXTERNAL' ? tillName(r) || '—' : '—'}</div>
                        {r.sendDomainContext === true ? (
                            <div className="text-xs text-muted-foreground">sends domain context</div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            accessorKey: 'isActive',
            header: 'Active',
            cell: ({ row }) =>
                row.original.isActive === false ? (
                    <Badge variant="outline" className="bg-red-100 text-red-700">No</Badge>
                ) : (
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800">Yes</Badge>
                ),
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
                        title="Edit"
                        onClick={() => {
                            setEditTarget(row.original);
                            setFormOpen(true);
                        }}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 pl-1">
                        <Switch
                            checked={row.original.isActive !== false}
                            onCheckedChange={() => toggleActive(row.original)}
                            title={row.original.isActive === false ? 'Activate' : 'Deactivate'}
                        />
                    </div>
                </div>
            ),
        },
    ];

    return (
        <PageLoader isLoading={query.isLoading}>
            <div className="space-y-2 p-4">
                <DataTable
                    query={query}
                    data={rows}
                    columns={columns}
                    pagination={pagination}
                    setPagination={setPagination}
                    totalRowCount={totalRowCount}
                >
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Select
                                value={appliedFilters.type || 'ALL'}
                                onValueChange={(value) => handleFilters({ ...filters, type: value === 'ALL' ? '' : value })}
                            >
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All types</SelectItem>
                                    {SHORTCUT_TYPES.map((type) => (
                                        <SelectItem key={type} value={type}>
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FilterActionButtons
                                onApplyFilters={() => handleFilters(filters)}
                                onClearClick={clearFilters}
                                showClearButton={showClearButton}
                            />
                        </div>
                        <Button
                            className="flex items-center gap-2"
                            onClick={() => {
                                setEditTarget(null);
                                setFormOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4" /> New Shortcut
                        </Button>
                    </div>
                </DataTable>
            </div>

            <ShortcutFormDialog
                open={formOpen}
                onClose={() => setFormOpen(false)}
                editTarget={editTarget}
                menus={menus}
                menuDisplayLabel={menuDisplayLabel}
                tills={tills}
                isPending={createMutation.isPending || updateMutation.isPending}
                onCreate={(payload) =>
                    createMutation
                        .mutateAsync(payload)
                        .then((data) => {
                            if (data?.success) {
                                toast.success('Shortcut created');
                                setFormOpen(false);
                            } else toast.error(data?.message || 'Create failed');
                        })
                        .catch((error) => {
                            // @ts-ignore
                            toast.error(error?.response?.data?.message || 'Internal Server Error!');
                        })
                }
                onUpdate={(payload) =>
                    updateMutation
                        .mutateAsync(payload)
                        .then((data) => {
                            if (data?.success) {
                                toast.success('Shortcut updated');
                                setFormOpen(false);
                            } else toast.error(data?.message || 'Update failed');
                        })
                        .catch((error) => {
                            // @ts-ignore
                            toast.error(error?.response?.data?.message || 'Internal Server Error!');
                        })
                }
            />
        </PageLoader>
    );
};

// Canonicalises a modifier token the way the server does (CTRL/SHIFT/ALT/META).
const MODIFIER_BY_CODE: Record<string, string> = {
    CTRL: 'CTRL',
    CONTROL: 'CTRL',
    SHIFT: 'SHIFT',
    ALT: 'ALT',
    OPTION: 'ALT',
    META: 'META',
    CMD: 'META',
    COMMAND: 'META',
    WIN: 'META',
    WINDOWS: 'META',
};

const parseCombo = (combo: string): { modifiers: string[]; key: string } => {
    const parts = (combo || '')
        .split('+')
        .map((part) => part.trim().toUpperCase())
        .filter(Boolean);
    const modifiers: string[] = [];
    let key = '';
    for (const part of parts) {
        const canonical = MODIFIER_BY_CODE[part];
        // A known modifier is always a modifier; the first non-modifier is the
        // key, and any later token simply replaces it (keeps "CTRL" as modifier
        // + no key while the user is still composing).
        if (canonical && !key) modifiers.push(canonical);
        else key = canonical || part;
    }
    return { modifiers, key };
};

// Key Combo picker. The dropdown keys come from POST /api/company/shortcuts/keys
// (a keyboard definition: modifiers, grouped keys and reserved combos) and the
// selection is composed back into the keyCombo field as MODIFIER+MODIFIER+KEY.
const KeyComboField = ({ value, onChange }: { value: string; onChange: (next: string) => void }) => {
    const keysQuery = useGetShortcutKeys();
    const definition: ShortcutKeysDefinition | undefined = keysQuery.data?.data;

    const { modifiers, key } = useMemo(() => parseCombo(value), [value]);

    const modifierOptions = useMemo(
        () => (definition?.modifiers || []).map((m) => ({ value: m.code, label: m.label })),
        [definition],
    );

    const compose = (nextModifiers: string[], nextKey: string) => {
        const combo = [...nextModifiers, nextKey].filter(Boolean).join('+');
        if (combo && definition?.reservedCombos?.includes(combo)) {
            toast.error(`"${combo}" is a reserved browser/OS combination.`);
            return;
        }
        onChange(combo);
    };

    const handleModifiersChange = (next: string[]) => {
        if (key) {
            compose(next, key);
        } else {
            onChange(next.join('+'));
        }
    };

    const handleKeyChange = (nextKey: string) => {
        if (!nextKey) return;
        if (!modifiers.length && !definition?.bareKeysAllowed?.includes(nextKey)) {
            toast.error('Non-function keys need at least one modifier (CTRL/SHIFT/ALT/META).');
        }
        compose(modifiers, nextKey);
    };

    return (
        <div>
            <Input
                className="mt-1 font-mono"
                placeholder="F3 or SHIFT+F5"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <div className="mt-1 flex gap-2">
                <MultiSelect
                    options={modifierOptions}
                    value={modifiers}
                    onChange={handleModifiersChange}
                    placeholder="Modifiers"
                    className="h-8 min-w-0 flex-1"
                />
                <Select value={key} onValueChange={handleKeyChange}>
                    <SelectTrigger className="h-8 flex-1">
                        <SelectValue placeholder="Key" />
                    </SelectTrigger>
                    <SelectContent>
                        {(definition?.keyGroups || []).map((group) => (
                            <SelectGroup key={group.group}>
                                <SelectLabel>{group.group}</SelectLabel>
                                {group.keys.map((option) => (
                                    <SelectItem key={option.code} value={option.code}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
                Format: {definition?.format || 'MODIFIER+MODIFIER+KEY'}
                {definition?.canonicalExample ? ` · e.g. ${definition.canonicalExample}` : ''}
            </p>
        </div>
    );
};

interface ShortcutFormDialogProps {
    open: boolean;
    onClose: () => void;
    editTarget: ShortcutRecord | null;
    menus: CompanyMenuItem[];
    menuDisplayLabel: (menu: CompanyMenuItem) => string;
    tills: TillDetails[];
    isPending: boolean;
    onCreate: (payload: {
        type: ShortcutType;
        keyCombo: string;
        menuId?: string;
        tillId?: string;
        description?: string;
        programPath?: string;
        programParameters?: string;
        sendDomainContext?: boolean;
    }) => void;
    onUpdate: (payload: {
        id: string;
        keyCombo?: string;
        menuId?: string | null;
        tillId?: string | null;
        description?: string;
        programPath?: string;
        programParameters?: string;
        sendDomainContext?: boolean;
        isActive?: boolean;
    }) => void;
}

const ShortcutFormDialog = ({ open, onClose, editTarget, menus, menuDisplayLabel, tills, isPending, onCreate, onUpdate }: ShortcutFormDialogProps) => {
    const [type, setType] = useState<ShortcutType>(editTarget?.type || 'MENU');
    const [keyCombo, setKeyCombo] = useState(editTarget?.keyCombo || '');
    const [menuId, setMenuId] = useState(editTarget?.menuId || '');
    const [tillId, setTillId] = useState(editTarget?.tillId || (editTarget?.type === 'EXTERNAL' ? tills[0]?.id || '' : ''));
    const [description, setDescription] = useState(editTarget?.description || '');
    const [programPath, setProgramPath] = useState(editTarget?.programPath || '');
    const [programParameters, setProgramParameters] = useState(editTarget?.programParameters || '');
    const [sendDomainContext, setSendDomainContext] = useState(editTarget?.sendDomainContext === true);

    const handleSubmit = () => {
        if (!keyCombo.trim()) return toast.error('Key combination is required');
        if (type === 'MENU' && !menuId) return toast.error('Select a menu');
        if (type === 'EXTERNAL' && !programPath.trim()) return toast.error('Program path is required');

        if (editTarget) {
            onUpdate({
                id: editTarget.id,
                keyCombo: keyCombo.trim(),
                ...(menuId ? { menuId } : {}),
                ...(tillId ? { tillId } : {}),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(programPath.trim() ? { programPath: programPath.trim() } : {}),
                ...(programParameters.trim() ? { programParameters: programParameters.trim() } : {}),
                sendDomainContext: type === 'EXTERNAL' ? sendDomainContext : undefined,
                isActive: editTarget.isActive !== false,
            });
        } else {
            onCreate({
                type,
                keyCombo: keyCombo.trim(),
                ...(type === 'MENU' && menuId ? { menuId } : {}),
                ...(type === 'EXTERNAL' && tillId ? { tillId } : {}),
                ...(type === 'EXTERNAL' && description.trim() ? { description: description.trim() } : {}),
                ...(type === 'EXTERNAL' && programPath.trim() ? { programPath: programPath.trim() } : {}),
                ...(type === 'EXTERNAL' && programParameters.trim() ? { programParameters: programParameters.trim() } : {}),
                sendDomainContext: type === 'EXTERNAL' ? sendDomainContext : undefined,
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!next && !isPending) onClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editTarget ? 'Edit Shortcut' : 'New Shortcut'}</DialogTitle>
                    <DialogDescription>Publish a keyboard shortcut to the till.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm font-medium">Type</Label>
                            <Select value={type} onValueChange={(value) => setType(value as ShortcutType)}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SHORTCUT_TYPES.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm font-medium">Key Combo</Label>
                            <KeyComboField value={keyCombo} onChange={setKeyCombo} />
                        </div>
                    </div>

                    {type === 'MENU' ? (
                        <div>
                            <Label className="text-sm font-medium">Menu</Label>
                            <Select value={menuId} onValueChange={setMenuId}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select menu item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {menus.map((menu) => (
                                        <SelectItem key={menu.id} value={menu.id}>
                                            {menuDisplayLabel(menu)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-sm font-medium">Till</Label>
                                    <Select value={tillId} onValueChange={setTillId}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Select till" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tills.map((till) => (
                                                <SelectItem key={till.id} value={till.id}>
                                                    {till.name || till.tillNumber}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Description</Label>
                                    <Input
                                        className="mt-1"
                                        placeholder="Scale Bridge"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-sm font-medium">Program Path</Label>
                                <Input
                                    className="mt-1 font-mono"
                                    placeholder="C:\\Tools\\scale-bridge.exe"
                                    value={programPath}
                                    onChange={(e) => setProgramPath(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 items-end gap-3">
                                <div>
                                    <Label className="text-sm font-medium">Program Parameters</Label>
                                    <Input
                                        className="mt-1 font-mono"
                                        placeholder="--port=COM3"
                                        value={programParameters}
                                        onChange={(e) => setProgramParameters(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pb-2">
                                    <Switch checked={sendDomainContext} onCheckedChange={setSendDomainContext} />
                                    <Label className="text-sm font-medium">Send Domain Context</Label>
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isPending}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShortcutManagement;