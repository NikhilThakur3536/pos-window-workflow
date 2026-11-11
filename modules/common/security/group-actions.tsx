'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLoader } from '@/components/custom-components/PageLoader';
import {
    useGetSecurityActionsTree,
    useGetGroupActions,
    useUpdateGroupActions,
    type GroupActionPermissionItem,
    type GroupActionPermissionStatus,
    type SecurityModuleActions,
    type SecurityAction,
} from '@/api-queries/security';
import { useGetUserGroups, type UserGroupDetails } from '@/api-queries/user-groups';
import SelectPopover from '@/components/select-popover';
import { toast } from 'sonner';
import { Save, Check, X, Search, ChevronDown, ChevronRight } from 'lucide-react';

interface GroupActionsProps {
    initialGroupId?: string;
}

const GroupActions = ({ initialGroupId }: GroupActionsProps) => {
    const [groupId, setGroupId] = useState<string>(initialGroupId || '');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { data: groupsRes, isLoading: groupsLoading } = useGetUserGroups({ limit: 1000 });
    const groups: UserGroupDetails[] = groupsRes?.data || [];

    const { data: actionsTreeRes, isLoading: actionsLoading } = useGetSecurityActionsTree();
    const actionsTree = actionsTreeRes?.data || [];

    const groupActionsQuery = useGetGroupActions(groupId || null, debouncedSearch);
    const groupActions: GroupActionPermissionItem[] = groupActionsQuery?.data?.data || [];

    const updateMutation = useUpdateGroupActions();

    const permissionMap = useMemo(() => {
        const map: Record<string, GroupActionPermissionItem> = {};
        for (const item of groupActions) {
            if (item?.actionCode) {
                map[item.actionCode] = item;
            }
        }
        return map;
    }, [groupActions]);

    const filteredTree = useMemo(() => {
        const q = debouncedSearch.trim().toLowerCase();
        if (!q) return actionsTree;
        return actionsTree
            .map((mod) => ({
                ...mod,
                actions: mod.actions.filter(
                    (a) =>
                        a.name.toLowerCase().includes(q) ||
                        a.code.toLowerCase().includes(q) ||
                        mod.moduleName.toLowerCase().includes(q),
                ),
            }))
            .filter((mod) => mod.actions.length > 0);
    }, [actionsTree, debouncedSearch]);

    const [localMap, setLocalMap] = useState<Record<string, GroupActionPermissionItem>>({});

    const effectiveMap = { ...permissionMap, ...localMap };

    const getEffective = (actionCode: string): GroupActionPermissionItem => {
        return (
            effectiveMap[actionCode] || {
                actionCode,
                canRequest: false,
                canExecute: false,
                canApprove: false,
                status: 'ACTIVE',
            }
        );
    };

    const toggle = (actionCode: string, field: 'canRequest' | 'canExecute' | 'canApprove' | 'status') => {
        if (!groupId) return;
        const current = { ...getEffective(actionCode) };

        if (field === 'status') {
            current.status = (current.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as GroupActionPermissionStatus;
        } else {
            current[field] = !current[field];
        }

        setLocalMap((prev) => ({ ...prev, [actionCode]: current }));
    };

    const handleSave = () => {
        if (!groupId) return;
        const permissions = Object.values(effectiveMap)
            .filter((item) => Boolean(item?.actionCode && item.actionCode.trim()))
            .map((item) => ({
                actionCode: item.actionCode,
                canRequest: Boolean(item.canRequest),
                canExecute: Boolean(item.canExecute),
                canApprove: Boolean(item.canApprove),
                status: item.status,
            }));

        if (!permissions.length) {
            toast.error('No action permissions to save');
            return;
        }

        updateMutation.mutate(
            { groupId, permissions },
            {
                onSuccess: async (data) => {
                    if (data.success) {
                        toast.success('Group action permissions saved');
                        await groupActionsQuery.refetch();
                        setLocalMap({});
                    } else {
                        toast.error(data.message || 'Save failed');
                    }
                },
                onError: (error) => {
                    // @ts-ignore
                    toast.error(error?.response?.data?.message || 'Internal Server Error!');
                },
            },
        );
    };

    const onGroupChange = (value: string) => {
        setGroupId(value);
        setLocalMap({});
    };

    const isLoading = groupsLoading || actionsLoading || groupActionsQuery.isLoading;

    return (
        <PageLoader isLoading={isLoading}>
            <div className="space-y-4 px-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-[280px]">
                        <div className="mb-1 text-sm font-medium text-muted-foreground">Select Group</div>
                        <SelectPopover
                            title="Group"
                            onlyTitle="Select a group"
                            selectedValue={groupId}
                            options={groups.map((g) => ({ label: g.name, value: g.id }))}
                            onSelect={(value) => onGroupChange(String(value || ''))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Level {groups.find((g) => g.id === groupId)?.approvalLevel ?? 0} •{' '}
                            {groups.find((g) => g.id === groupId)?.canSupervisorLogin ? 'Supervisor login enabled' : 'Not a supervisor group'}
                        </span>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!groupId || updateMutation.isPending}
                            onClick={handleSave}
                        >
                            <Save className="mr-1 h-4 w-4" /> Save
                        </Button>
                    </div>
                </div>

                {!groupId ? (
                    <Card>
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            Select a group to configure action permissions.
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                            <CardTitle className="text-sm">Group Action Permissions</CardTitle>
                            <div className="relative">
                                <Search className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />
                                <Input
                                    placeholder="Search actions..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-8 w-56 pl-7 text-xs"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {filteredTree?.length ? (
                                <ActionTree
                                    nodes={filteredTree}
                                    getEffective={getEffective}
                                    onToggle={toggle}
                                />
                            ) : (
                                <div className="text-muted-foreground py-6 text-center text-sm">
                                    {debouncedSearch ? 'No actions match the search.' : 'No actions found.'}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageLoader>
    );
};

interface ActionTreeProps {
    nodes: SecurityModuleActions[];
    getEffective: (actionCode: string) => GroupActionPermissionItem;
    onToggle: (actionCode: string, field: 'canRequest' | 'canExecute' | 'canApprove' | 'status') => void;
}

const ActionTree = ({ nodes, getEffective, onToggle }: ActionTreeProps) => {
    const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(nodes.map((n) => n.moduleId)));

    const toggleModule = (moduleId: string) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(moduleId)) {
                next.delete(moduleId);
            } else {
                next.add(moduleId);
            }
            return next;
        });
    };

    return (
        <div className="rounded-md border">
            <div
                role="row"
                className="bg-muted/60 text-muted-foreground grid grid-cols-[2fr_repeat(3,1fr)_auto] items-center gap-x-2 px-3 py-2 text-xs font-semibold"
            >
                <div>Action</div>
                <div className="text-center">REQUEST</div>
                <div className="text-center">EXECUTE</div>
                <div className="text-center">APPROVE</div>
                <div className="text-center">STATUS</div>
            </div>
            <div role="rowgroup">
                {nodes.map((module) => {
                    const isCollapsed = collapsed.has(module.moduleId);
                    return (
                        <div key={module.moduleId} className="border-t">
                            <button
                                type="button"
                                onClick={() => toggleModule(module.moduleId)}
                                className="bg-muted/40 text-muted-foreground flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold"
                            >
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                <span className="text-sm font-semibold">{module.moduleName}</span>
                                <span className="ml-1 font-mono text-[10px]">{module.moduleCode}</span>
                                <span className="ml-auto text-[10px] font-normal">
                                    {module.actions.length} {module.actions.length === 1 ? 'action' : 'actions'}
                                </span>
                            </button>
                            {!isCollapsed &&
                                (module.actions.length ? (
                                    module.actions.map((action) => (
                                        <ActionRow
                                            key={action.code}
                                            node={action}
                                            getEffective={getEffective}
                                            onToggle={onToggle}
                                        />
                                    ))
                                ) : (
                                    <div className="text-muted-foreground px-3 py-3 text-center text-xs">No actions</div>
                                ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ActionRow = ({
    node,
    getEffective,
    onToggle,
}: {
    node: SecurityAction;
    getEffective: (actionCode: string) => GroupActionPermissionItem;
    onToggle: (actionCode: string, field: 'canRequest' | 'canExecute' | 'canApprove' | 'status') => void;
}) => {
    const actionCode = node.code;
    const perm = getEffective(actionCode);

    const ToggleCell = ({ field }: { field: 'canRequest' | 'canExecute' | 'canApprove' }) => (
        <button
            type="button"
            onClick={() => onToggle(actionCode, field)}
            className={`flex items-center justify-center rounded p-0.5 ${
                perm[field] ? 'bg-blue-600 text-white hover:bg-blue-700' : 'hover:bg-muted'
            }`}
            aria-label={`Toggle ${field}`}
            aria-pressed={perm[field]}
        >
            {perm[field] ? (
                <Check size={18} aria-label="Allowed" />
            ) : (
                <X size={18} className="text-red-500" aria-label="Not allowed" />
            )}
        </button>
    );

    return (
        <div
            role="row"
            className="hover:bg-muted/30 grid grid-cols-[2fr_repeat(3,1fr)_auto] items-center gap-x-2 border-t px-3 py-2"
        >
            <div>
                <div className="text-sm font-medium">{node.name}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{actionCode}</div>
            </div>
            <ToggleCell field="canRequest" />
            <ToggleCell field="canExecute" />
            <ToggleCell field="canApprove" />
            <div className="flex justify-center">
                <Button
                    size="sm"
                    variant={perm.status === 'ACTIVE' ? 'default' : 'outline'}
                    className="h-7 text-xs"
                    onClick={() => onToggle(actionCode, 'status')}
                >
                    {perm.status}
                </Button>
            </div>
        </div>
    );
};

export default GroupActions;
