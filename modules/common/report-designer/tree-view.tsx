'use client';

import * as React from 'react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GenericTreeNode {
    id: string;
    label: string;
    icon?: React.ReactNode;
    children?: GenericTreeNode[];
}

interface TreeViewProps {
    nodes: GenericTreeNode[];
    selectedId?: string;
    onSelect?: (node: GenericTreeNode) => void;
    onNodePointerDown?: (node: GenericTreeNode, event: React.PointerEvent) => void;
    defaultExpandedIds?: string[];
}

export function TreeView({
    nodes,
    selectedId,
    onSelect,
    onNodePointerDown,
    defaultExpandedIds,
}: TreeViewProps) {
    return (
        <div className="select-none py-1 text-xs text-neutral-800">
            {nodes.map((node) => (
                <TreeItem
                    key={node.id}
                    node={node}
                    depth={0}
                    selectedId={selectedId}
                    onSelect={onSelect}
                    onNodePointerDown={onNodePointerDown}
                    defaultExpandedIds={defaultExpandedIds}
                />
            ))}
        </div>
    );
}

function TreeItem({
    node,
    depth,
    selectedId,
    onSelect,
    onNodePointerDown,
    defaultExpandedIds,
}: {
    node: GenericTreeNode;
    depth: number;
    selectedId?: string;
    onSelect?: (node: GenericTreeNode) => void;
    onNodePointerDown?: (node: GenericTreeNode, event: React.PointerEvent) => void;
    defaultExpandedIds?: string[];
}) {
    const hasChildren = !!node.children?.length;
    const [open, setOpen] = React.useState(defaultExpandedIds?.includes(node.id) ?? depth < 2);
    const isSelected = selectedId === node.id;

    return (
        <Collapsible.Root open={open} onOpenChange={setOpen}>
            <div
                role="treeitem"
                aria-selected={isSelected}
                onPointerDown={onNodePointerDown ? (event) => onNodePointerDown(node, event) : undefined}
                onClick={() => onSelect?.(node)}
                style={{ paddingLeft: depth * 14 + 4 }}
                className={cn(
                    'flex cursor-pointer touch-none items-center gap-1 py-[3px] pr-2 hover:bg-blue-50',
                    isSelected && 'bg-blue-100 hover:bg-blue-100',
                )}
            >
                {hasChildren ? (
                    <Collapsible.Trigger
                        onClick={(event) => event.stopPropagation()}
                        className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-neutral-500"
                    >
                        {open ? (
                            <ChevronDown className="h-3 w-3" />
                        ) : (
                            <ChevronRight className="h-3 w-3" />
                        )}
                    </Collapsible.Trigger>
                ) : (
                    <span className="h-3.5 w-3.5 shrink-0" />
                )}
                {node.icon}
                <span className="truncate">{node.label}</span>
            </div>
            {hasChildren && (
                <Collapsible.Content>
                    {node.children!.map((child) => (
                        <TreeItem
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            onNodePointerDown={onNodePointerDown}
                            defaultExpandedIds={defaultExpandedIds}
                        />
                    ))}
                </Collapsible.Content>
            )}
        </Collapsible.Root>
    );
}
