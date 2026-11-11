'use client';

import * as React from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDesignerDrag } from './drag-drop';
import type { ReportBand, ReportPage } from './report-designer.types';

interface ReportCanvasProps {
    page: ReportPage;
    selectedObjectId?: string;
    onSelectBand: (bandId: string) => void;
    onSelectField: (fieldId: string) => void;
    zoomPercent: number;
}

const PAGE_WIDTH_UNITS = 18;
const UNIT_PX = 48;

export function ReportCanvas({
    page,
    selectedObjectId,
    onSelectBand,
    onSelectField,
    zoomPercent,
}: ReportCanvasProps) {
    const scale = zoomPercent / 100;
    const pageWidth = PAGE_WIDTH_UNITS * UNIT_PX * scale;
    const { drag, isDragging } = useDesignerDrag();

    return (
        <div className="flex h-full flex-col overflow-auto bg-neutral-200">
            {/* Ruler is full scroll-width and centered so it always lines up with the page */}
            <div className="sticky top-0 z-20 flex shrink-0 justify-center border-b border-neutral-300 bg-neutral-100">
                <Ruler widthUnits={PAGE_WIDTH_UNITS} unitPx={UNIT_PX * scale} />
            </div>

            <div className="flex flex-1 justify-center py-3">
                <div
                    className="border border-neutral-400 bg-white shadow-sm"
                    style={{ width: pageWidth }}
                >
                    {page.bands.map((band) => (
                        <BandBlock
                            key={band.id}
                            band={band}
                            scale={scale}
                            selectedObjectId={selectedObjectId}
                            onSelectBand={onSelectBand}
                            onSelectField={onSelectField}
                        />
                    ))}
                </div>
            </div>

            {/* Drag ghost */}
            {isDragging && drag && (
                <div
                    className="pointer-events-none fixed z-50 flex max-w-[220px] -translate-x-1/2 -translate-y-full items-center gap-1 rounded border border-blue-500 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 shadow-md"
                    style={{ left: drag.x, top: drag.y }}
                >
                    <span className="truncate">
                        {drag.payload.kind === 'band'
                            ? `Move ${drag.payload.bandId}`
                            : drag.payload.kind === 'canvas-field'
                              ? drag.payload.label
                              : drag.payload.label}
                    </span>
                </div>
            )}
        </div>
    );
}

function Ruler({ widthUnits, unitPx }: { widthUnits: number; unitPx: number }) {
    return (
        <div className="flex h-4 w-fit shrink-0 text-[9px] text-neutral-500">
            {Array.from({ length: widthUnits }).map((_, index) => (
                <div
                    key={index}
                    className="relative shrink-0 border-r border-neutral-300"
                    style={{ width: unitPx }}
                >
                    <span className="absolute left-0.5 top-0">{index + 1}</span>
                </div>
            ))}
        </div>
    );
}

function BandBlock({
    band,
    scale,
    selectedObjectId,
    onSelectBand,
    onSelectField,
}: {
    band: ReportBand;
    scale: number;
    selectedObjectId?: string;
    onSelectBand: (bandId: string) => void;
    onSelectField: (fieldId: string) => void;
}) {
    const { startDrag, isDragging, drag } = useDesignerDrag();
    const [hoverDrop, setHoverDrop] = React.useState(false);
    const [hoverReorder, setHoverReorder] = React.useState(false);
    const draggingField =
        isDragging && (drag?.payload.kind === 'data-field' || drag?.payload.kind === 'canvas-field');
    const draggingBand = isDragging && drag?.payload.kind === 'band';

    return (
        <div className="border-b border-neutral-400">
            <div
                data-drop-band-header={band.id}
                onPointerEnter={() => setHoverReorder(true)}
                onPointerLeave={() => setHoverReorder(false)}
                onPointerDown={(event) =>
                    startDrag({ kind: 'band', bandId: band.id }, event)
                }
                onClick={() => onSelectBand(band.id)}
                className={cn(
                    'flex cursor-grab touch-none select-none items-center justify-between px-2 py-0.5 text-[11px] font-semibold text-neutral-800 active:cursor-grabbing',
                    band.highlighted ? 'bg-amber-400 text-neutral-900' : 'bg-neutral-100',
                    selectedObjectId === band.id && 'ring-2 ring-inset ring-blue-500',
                    draggingBand && hoverReorder && 'bg-blue-100',
                    isDragging && 'cursor-grabbing',
                )}
            >
                <span>
                    {band.type}: <span className="font-bold">{band.label}</span>
                </span>
                <span className="text-[9px] font-normal text-neutral-400">drag to reorder</span>
            </div>

            {band.title && (
                <div className="border-b border-dashed border-neutral-300 py-2 text-center text-sm font-semibold text-neutral-800">
                    {band.title}
                </div>
            )}

            <div
                data-drop-band={band.id}
                onPointerEnter={() => setHoverDrop(true)}
                onPointerLeave={() => setHoverDrop(false)}
                className={cn(
                    'relative',
                    draggingField &&
                        hoverDrop &&
                        'bg-blue-50/40 outline-2 outline-dashed outline-blue-400',
                )}
                style={{ height: band.height * scale, minHeight: 26 }}
            >
                {band.fields.map((field) => (
                    <div
                        key={field.id}
                        onPointerDown={(event) =>
                            startDrag(
                                {
                                    kind: 'canvas-field',
                                    bandId: band.id,
                                    fieldId: field.id,
                                    label: field.label,
                                    x: field.x,
                                },
                                event,
                            )
                        }
                        onClick={(event) => {
                            event.stopPropagation();
                            onSelectField(field.id);
                        }}
                        style={{
                            left: field.x * scale,
                            width: field.width * scale,
                        }}
                        className={cn(
                            'absolute top-1 flex h-[18px] cursor-grab touch-none select-none items-center border border-dashed border-neutral-400 bg-white px-1 text-[11px] font-medium text-neutral-800 hover:border-blue-500 active:cursor-grabbing',
                            selectedObjectId === field.id && 'border-solid border-blue-500 ring-1 ring-blue-400',
                        )}
                    >
                        <span className="truncate">{field.expression}</span>
                    </div>
                ))}

                {band.type === 'PageFooter' && (
                    <div className="absolute right-2 top-1 flex h-5 w-5 items-center justify-center border border-neutral-400 bg-neutral-50">
                        <ImageIcon className="h-3 w-3 text-neutral-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
