import { Button } from '@/components/ui/button';
import { Plus, Minus, Settings, Check, X } from 'lucide-react';
import { UserGroupModulesDetails } from '@/api-queries/user-groups/user-group-permissions';
import { SYSTEM_PERMISSIONS } from '@/lib/constant';

function IconCell({ permitted }: { permitted: boolean }) {
    return permitted ? (
        <div className="flex items-center justify-center text-green-600">
            <Check size={18} aria-label="Allowed" />
        </div>
    ) : (
        <div className="flex items-center justify-center text-red-500">
            <X size={18} aria-label="Not allowed" />
        </div>
    );
}

export type Crud = (typeof SYSTEM_PERMISSIONS)[keyof typeof SYSTEM_PERMISSIONS];

type ModuleChildrenNodeProps = {
    node: UserGroupModulesDetails;
    depth: number;
    expandedIds: string[];
    toggle: (id: string) => void;
    hasPermission: (moduleId: string, action: Crud) => boolean;
    onOpenSettings: (module: UserGroupModulesDetails) => void;
    selectedId?: string | null;
};

export default function ModuleChildrenNode({
    node,
    depth,
    expandedIds,
    toggle,
    hasPermission,
    onOpenSettings,
    selectedId,
}: ModuleChildrenNodeProps) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const isExpanded = expandedIds.includes(node.id);
    const isSelected = selectedId === node.id;

    const renderChildren = () => {
        if (!hasChildren || !isExpanded) return null;

        const childNodes = [];
        for (let i = 0; i < node.children!.length; i++) {
            const child = node.children![i];
            childNodes.push(
                <ModuleChildrenNode
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    expandedIds={expandedIds}
                    toggle={toggle}
                    hasPermission={hasPermission}
                    onOpenSettings={onOpenSettings}
                    selectedId={selectedId}
                />,
            );
        }
        return childNodes;
    };

    return (
        <>
            <div
                className={`grid grid-cols-[50vw_repeat(6,auto)] items-center gap-x-2 border-t px-2 py-2 text-sm ${
                    isSelected ? 'bg-accent/40' : ''
                }`}
                role="row"
                aria-selected={isSelected}
            >
                <div className="flex items-center gap-2" style={{ paddingLeft: depth * 16 }}>
                    {hasChildren ? (
                        <button
                            type="button"
                            onClick={() => toggle(node.id)}
                            className="hover:bg-muted inline-flex h-6 w-6 items-center justify-center rounded"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isExpanded ? <Minus size={16} /> : <Plus size={16} />}
                        </button>
                    ) : (
                        <span className="inline-block h-6 w-6" />
                    )}
                    <span className="font-medium">{node.code}</span>
                    <span className="text-muted-foreground">- {node.name}</span>
                </div>

                <div className="flex items-center justify-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onOpenSettings({ id: node?.id, name: node?.name, code: node?.code })}
                        aria-label="Open settings"
                    >
                        <Settings size={18} />
                    </Button>
                </div>

                <IconCell permitted={hasPermission(node.id, SYSTEM_PERMISSIONS.CREATE)} />
                <IconCell permitted={hasPermission(node.id, SYSTEM_PERMISSIONS.READ)} />
                <IconCell permitted={hasPermission(node.id, SYSTEM_PERMISSIONS.UPDATE)} />
                <IconCell permitted={hasPermission(node.id, SYSTEM_PERMISSIONS.DELETE)} />
                <IconCell permitted={hasPermission(node.id, SYSTEM_PERMISSIONS.SHOW_IN_MENU)} />
            </div>

            {renderChildren()}
        </>
    );
}
