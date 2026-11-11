'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { DesignerToolbar } from './DesignerToolbar';
import { ReportTreePanel } from './ReportTreePanel';
import { ObjectInspectorPanel } from './ObjectInspectorPanel';
import { DataTreePanel } from './DataTreePanel';
import { ReportCanvas } from './ReportCanvas';
import { UnderlineTabs } from './underline-tabs';
import {
    useReportDesignerDocument,
    useSaveReportDesigner,
    useSelectReportObject,
    useUpdateObjectProperty,
    useReportDataTree,
} from '@/api-queries/report-designer';
import type { PropertyValue } from './report-designer.types';
import type {
    DataTreeNode,
    ReportDesignerDocument,
    ReportBand,
    ReportBandField,
} from './report-designer.types';
import { DesignerDragProvider, type DesignerDragItem, type DesignerDropTarget } from './drag-drop';
import { stocktableReportMock } from './stocktable-report.mock';
import { createBlankReportDocument } from './blank-report.document';

interface ReportDesignerPageProps {
    reportId: string;
}

const TOP_LEVEL_TABS = [
    { value: 'code', label: 'Code' },
    { value: 'data', label: 'Data' },
];

export default function ReportDesignerPage({ reportId }: ReportDesignerPageProps) {
    const { data, isLoading, isError } = useReportDesignerDocument(reportId);
    const selectObject = useSelectReportObject(reportId);
    const updateProperty = useUpdateObjectProperty(reportId);
    const saveReport = useSaveReportDesigner(reportId);

    // Real reports load from the API; a newly created / unknown report opens
    // as a blank document. Only the known demo template keeps its mock.
    const fallbackDoc = React.useMemo<ReportDesignerDocument>(
        () =>
            reportId === stocktableReportMock.reportId || reportId === 'demo-invoice'
                ? { ...stocktableReportMock, reportId }
                : createBlankReportDocument(reportId),
        [reportId],
    );

    const doc = data ?? (isError ? fallbackDoc : undefined);

    // Data Tree integration: prefer the document's own data tree, otherwise
    // build it from the real data-sources API.
    const dataTreeQuery = useReportDataTree(true);
    const dataTree = React.useMemo<DataTreeNode[]>(() => {
        if (doc?.dataTree?.length) return doc.dataTree;
        return dataTreeQuery.data ?? [];
    }, [doc?.dataTree, dataTreeQuery.data]);

    const [zoom, setZoom] = React.useState('100%');
    const [fontFamily, setFontFamily] = React.useState('Arial');
    const [fontSize, setFontSize] = React.useState('10');
    const [topTab, setTopTab] = React.useState('code');
    const [history, setHistory] = React.useState<{ past: number; future: number }>({
        past: 0,
        future: 0,
    });

    // Local (unsaved) band layout so drag & drop can mutate the canvas immediately.
    const [localBands, setLocalBands] = React.useState<ReportBand[] | null>(null);
    React.useEffect(() => {
        if (doc) setLocalBands(doc.page.bands);
    }, [doc]);

    // Measure available height below the page header so the designer never
    // overflows / overlaps the rest of the app.
    const rootRef = React.useRef<HTMLDivElement>(null);
    const [viewportHeight, setViewportHeight] = React.useState(0);
    React.useEffect(() => {
        let raf = 0;
        const compute = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const el = rootRef.current;
                if (!el) return;
                const top = el.getBoundingClientRect().top;
                setViewportHeight(Math.max(0, window.innerHeight - top));
            });
        };
        compute();
        const timer = window.setTimeout(compute, 100);
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        window.addEventListener('orientationchange', compute);
        return () => {
            cancelAnimationFrame(raf);
            window.clearTimeout(timer);
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
            window.removeEventListener('orientationchange', compute);
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-neutral-100">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                <span className="ml-2 text-sm text-neutral-500">Loading report…</span>
            </div>
        );
    }

    if (!doc) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-neutral-100 text-sm text-red-600">
                Couldn&apos;t load this report. Try again.
            </div>
        );
    }

    const selectedProperties = doc.objectInspector[doc.selectedObjectId] ?? [];
    const selectedNode = findNodeLabel(doc, doc.selectedObjectId);
    const bands = localBands ?? doc.page.bands;

    const handleSelect = (objectId: string) => {
        selectObject.mutate(objectId);
    };

    const handlePropertyChange = (propertyId: string, value: PropertyValue) => {
        updateProperty.mutate({ objectId: doc.selectedObjectId, propertyId, value });
    };

    const handleDrop = (payload: DesignerDragItem, target: DesignerDropTarget) => {
        const scale = (Number.parseInt(zoom, 10) || 100) / 100;

        if (payload.kind === 'band') {
            if (target.beforeBandId) {
                setLocalBands((prev) => (prev ? reorderBands(prev, payload.bandId, target.beforeBandId!) : prev));
            }
            return;
        }

        if (!target.bandId) return;
        const x = Math.max(0, Math.round((target.x ?? 0) / scale));

        if (payload.kind === 'data-field') {
            const field: ReportBandField = {
                id: crypto.randomUUID(),
                label: payload.label,
                expression: payload.table
                    ? `[${payload.table}."${payload.label}"]`
                    : `[Stocktable."${payload.label}"]`,
                x,
                width: 100,
            };
            setLocalBands((prev) =>
                prev
                    ? prev.map((band) =>
                          band.id === target.bandId ? { ...band, fields: [...band.fields, field] } : band,
                      )
                    : prev,
            );
            return;
        }

        if (payload.kind === 'canvas-field') {
            setLocalBands((prev) => {
                if (!prev) return prev;
                const movingWithin = payload.bandId === target.bandId;
                return prev.map((band) => {
                    if (movingWithin && band.id === payload.bandId) {
                        return {
                            ...band,
                            fields: band.fields.map((f) =>
                                f.id === payload.fieldId ? { ...f, x } : f,
                            ),
                        };
                    }
                    if (!movingWithin && band.id === payload.bandId) {
                        return { ...band, fields: band.fields.filter((f) => f.id !== payload.fieldId) };
                    }
                    if (!movingWithin && band.id === target.bandId) {
                        const source = prev.find((b) => b.id === payload.bandId);
                        const field = source?.fields.find((f) => f.id === payload.fieldId);
                        if (!field) return band;
                        return { ...band, fields: [...band.fields, { ...field, x }] };
                    }
                    return band;
                });
            });
        }
    };

    const handleSave = () => {
        saveReport.mutate();
    };

    return (
        <div
            ref={rootRef}
            className="flex w-full flex-col overflow-hidden bg-white text-neutral-800"
            style={{ height: viewportHeight || '100vh' }}
        >
            <DesignerToolbar
                zoom={zoom}
                onZoomChange={setZoom}
                fontFamily={fontFamily}
                onFontFamilyChange={setFontFamily}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                onSave={handleSave}
                onUndo={() => setHistory((h) => ({ past: Math.max(0, h.past - 1), future: h.future + 1 }))}
                onRedo={() => setHistory((h) => ({ past: h.past + 1, future: Math.max(0, h.future - 1) }))}
                canUndo={history.past > 0}
                canRedo={history.future > 0}
                saving={saveReport.isPending}
            />

            <UnderlineTabs
                value={topTab}
                onValueChange={setTopTab}
                tabs={[...TOP_LEVEL_TABS, { value: 'page', label: doc.page.name }]}
            />

            <DesignerDragProvider onDrop={handleDrop}>
                <div className="flex min-h-0 flex-1">
                    {/* Left column: Report Tree + Object Inspector */}
                    <div className="flex w-60 shrink-0 flex-col border-r border-neutral-300">
                        <div className="h-1/2 min-h-0 overflow-hidden">
                            <ReportTreePanel
                                nodes={doc.reportTree}
                                selectedId={doc.selectedObjectId}
                                onSelect={handleSelect}
                            />
                        </div>
                        <div className="h-1/2 min-h-0 overflow-hidden">
                            <ObjectInspectorPanel
                                objectLabel={selectedNode?.label ?? doc.page.name}
                                objectTypeLabel={selectedNode?.type ?? 'TfrxReportPage'}
                                properties={selectedProperties}
                                onPropertyChange={handlePropertyChange}
                            />
                        </div>
                    </div>

                    {/* Center: canvas */}
                    <div className="min-w-0 flex-1">
                        <ReportCanvas
                            page={{ ...doc.page, bands }}
                            selectedObjectId={doc.selectedObjectId}
                            onSelectBand={handleSelect}
                            onSelectField={handleSelect}
                            zoomPercent={Number.parseInt(zoom, 10) || 100}
                        />
                    </div>

                    {/* Right column: Data Tree */}
                    <div className="w-64 shrink-0 overflow-hidden border-l border-neutral-300">
                        <DataTreePanel
                            nodes={dataTree}
                            onFieldDoubleClick={(node) => handleSelect(node.id)}
                        />
                    </div>
                </div>
            </DesignerDragProvider>
        </div>
    );
}

function reorderBands(bands: ReportBand[], sourceId: string, beforeId: string): ReportBand[] {
    const source = bands.find((b) => b.id === sourceId);
    if (!source) return bands;
    const rest = bands.filter((b) => b.id !== sourceId);
    const index = rest.findIndex((b) => b.id === beforeId);
    const next = [...rest];
    next.splice(index < 0 ? next.length : index, 0, source);
    return next;
}

function findNodeLabel(
    doc: NonNullable<ReturnType<typeof useReportDesignerDocument>['data']>,
    id: string,
): { label: string; type: string } | null {
    const walk = (
        nodes: { id: string; label: string; kind: string; children?: typeof nodes }[],
    ): { label: string; type: string } | null => {
        for (const node of nodes) {
            if (node.id === id) return { label: node.label, type: node.kind };
            if (node.children) {
                const found = walk(node.children);
                if (found) return found;
            }
        }
        return null;
    };
    return walk(doc.reportTree);
}
