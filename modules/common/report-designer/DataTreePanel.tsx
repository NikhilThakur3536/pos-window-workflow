'use client';

import * as React from 'react';
import { ArrowDownAZ, ArrowUpZA, RefreshCcw, Table2, Hash, Type, ToggleLeft, Calendar, DollarSign } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TreeView, type GenericTreeNode } from './tree-view';
import { UnderlineTabs } from './underline-tabs';
import { ToolbarIconButton, ToolbarProvider } from './toolbar-icon-button';
import { useDesignerDrag } from './drag-drop';
import type { DataFieldType, DataTreeNode } from './report-designer.types';

interface DataTreePanelProps {
    nodes: DataTreeNode[];
    onFieldDoubleClick?: (node: DataTreeNode) => void;
}

const DATA_TABS = [
    { value: 'data', label: 'Data' },
    { value: 'variables', label: 'Va' },
    { value: 'functions', label: 'Fu' },
    { value: 'classes', label: 'Cl' },
];

const typeIcon: Record<DataFieldType, React.ReactNode> = {
    table: <Table2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />,
    folder: <Table2 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />,
    number: <Hash className="h-3.5 w-3.5 shrink-0 text-blue-500" />,
    string: <Type className="h-3.5 w-3.5 shrink-0 text-purple-500" />,
    boolean: <ToggleLeft className="h-3.5 w-3.5 shrink-0 text-amber-500" />,
    date: <Calendar className="h-3.5 w-3.5 shrink-0 text-rose-500" />,
    currency: <DollarSign className="h-3.5 w-3.5 shrink-0 text-green-600" />,
};

function toGenericNodes(nodes: DataTreeNode[]): GenericTreeNode[] {
    return nodes.map((node) => ({
        id: node.id,
        label: node.label,
        icon: typeIcon[node.type],
        children: node.children ? toGenericNodes(node.children) : undefined,
    }));
}

export function DataTreePanel({ nodes, onFieldDoubleClick }: DataTreePanelProps) {
    const [tab, setTab] = React.useState('data');
    const genericNodes = React.useMemo(() => toGenericNodes(nodes), [nodes]);
    const flatById = React.useMemo(() => flattenById(nodes), [nodes]);
    const { startDrag } = useDesignerDrag();

    const handleNodePointerDown = (node: GenericTreeNode, event: React.PointerEvent) => {
        const original = flatById.get(node.id);
        if (!original || original.type === 'folder' || original.type === 'table') return;
        startDrag(
            {
                kind: 'data-field',
                fieldId: original.id,
                label: original.label,
                type: original.type,
                table: original.table,
            },
            event,
        );
    };

    return (
        <ToolbarProvider>
            <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-neutral-300 bg-neutral-100 px-2 py-1">
                    <span className="text-xs font-semibold text-neutral-700">Data Tree</span>
                    <div className="flex items-center gap-0.5">
                        <ToolbarIconButton label="Sort ascending">
                            <ArrowDownAZ className="h-3.5 w-3.5" />
                        </ToolbarIconButton>
                        <ToolbarIconButton label="Sort descending">
                            <ArrowUpZA className="h-3.5 w-3.5" />
                        </ToolbarIconButton>
                        <ToolbarIconButton label="Refresh data">
                            <RefreshCcw className="h-3.5 w-3.5" />
                        </ToolbarIconButton>
                    </div>
                </div>

                <UnderlineTabs value={tab} onValueChange={setTab} tabs={DATA_TABS} size="sm" />

                {tab === 'data' ? (
                    <ScrollArea className="flex-1">
                        <TreeView
                            nodes={genericNodes}
                            onNodePointerDown={handleNodePointerDown}
                            onSelect={(node) => {
                                const original = flatById.get(node.id);
                                if (original) onFieldDoubleClick?.(original);
                            }}
                        />
                    </ScrollArea>
                ) : (
                    <div className="flex flex-1 items-center justify-center text-xs text-neutral-400">
                        No {tab} defined
                    </div>
                )}
            </div>
        </ToolbarProvider>
    );
}

type FlatDataNode = DataTreeNode & { table?: string };

function flattenById(nodes: DataTreeNode[]): Map<string, FlatDataNode> {
    const map = new Map<string, FlatDataNode>();
    const walk = (list: DataTreeNode[], currentTable?: string) => {
        list.forEach((node) => {
            const table = node.type === 'table' ? node.label : currentTable;
            map.set(node.id, { ...node, table });
            if (node.children) walk(node.children, table);
        });
    };
    walk(nodes);
    return map;
}
