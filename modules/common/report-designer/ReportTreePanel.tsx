'use client';

import * as React from 'react';
import { FileText, LayoutTemplate, Rows3, Type } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TreeView, type GenericTreeNode } from './tree-view';
import type { ReportTreeNode } from './report-designer.types';

interface ReportTreePanelProps {
    nodes: ReportTreeNode[];
    selectedId?: string;
    onSelect: (nodeId: string) => void;
}

const kindIcon: Record<ReportTreeNode['kind'], React.ReactNode> = {
    page: <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-500" />,
    band: <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-amber-600" />,
    folder: <Rows3 className="h-3.5 w-3.5 shrink-0 text-neutral-500" />,
    field: <Type className="h-3.5 w-3.5 shrink-0 text-blue-500" />,
};

function toGenericNodes(nodes: ReportTreeNode[]): GenericTreeNode[] {
    return nodes.map((node) => ({
        id: node.id,
        label: node.label,
        icon: kindIcon[node.kind],
        children: node.children ? toGenericNodes(node.children) : undefined,
    }));
}

export function ReportTreePanel({ nodes, selectedId, onSelect }: ReportTreePanelProps) {
    const genericNodes = React.useMemo(() => toGenericNodes(nodes), [nodes]);

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-neutral-300 bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-700">
                Report Tree
            </div>
            <ScrollArea className="flex-1">
                <TreeView
                    nodes={genericNodes}
                    selectedId={selectedId}
                    onSelect={(node) => onSelect(node.id)}
                />
            </ScrollArea>
        </div>
    );
}
