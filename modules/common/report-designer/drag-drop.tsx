'use client';

import * as React from 'react';

export type DesignerDragItem =
    | { kind: 'data-field'; fieldId: string; label: string; type: string; table?: string }
    | { kind: 'canvas-field'; bandId: string; fieldId: string; label: string; x: number }
    | { kind: 'band'; bandId: string };

export interface DesignerDropTarget {
    bandId?: string;
    beforeBandId?: string;
    /** Pixel offset (x/y) inside the band drop zone, unscaled. */
    x?: number;
    y?: number;
}

export interface DragSnapshot {
    payload: DesignerDragItem;
    x: number;
    y: number;
}

interface DesignerDragContextValue {
    drag: DragSnapshot | null;
    isDragging: boolean;
    startDrag: (payload: DesignerDragItem, event: React.PointerEvent) => void;
}

const DesignerDragContext = React.createContext<DesignerDragContextValue | null>(null);

const DRAG_THRESHOLD_PX = 4;

export function useDesignerDrag(): DesignerDragContextValue {
    const ctx = React.useContext(DesignerDragContext);
    if (!ctx) throw new Error('useDesignerDrag must be used within <DesignerDragProvider>');
    return ctx;
}

interface DesignerDragProviderProps {
    onDrop: (payload: DesignerDragItem, target: DesignerDropTarget) => void;
    children: React.ReactNode;
}

/**
 * Pointer-event based drag & drop. HTML5 drag events are unreliable inside
 * Electron (and on touch), so dragging is driven by pointerdown/pointermove/
 * pointerup listeners on window. Drop targets are resolved with
 * `document.elementFromPoint` against `data-drop-band` / `data-drop-band-header`.
 */
export function DesignerDragProvider({ onDrop, children }: DesignerDragProviderProps) {
    const [drag, setDrag] = React.useState<DragSnapshot | null>(null);
    const dragRef = React.useRef<DragSnapshot | null>(null);
    const onDropRef = React.useRef(onDrop);
    onDropRef.current = onDrop;

    const startDrag = React.useCallback((payload: DesignerDragItem, event: React.PointerEvent) => {
        event.stopPropagation();
        if (event.button !== 0 && event.pointerType === 'mouse') return;

        const startX = event.clientX;
        const startY = event.clientY;
        let active = false;
        let lastX = startX;
        let lastY = startY;

        const onMove = (ev: PointerEvent) => {
            lastX = ev.clientX;
            lastY = ev.clientY;

            if (!active) {
                const distance = Math.hypot(lastX - startX, lastY - startY);
                if (distance < DRAG_THRESHOLD_PX) return;
                active = true;
            }

            ev.preventDefault();
            const snapshot: DragSnapshot = { payload, x: lastX, y: lastY };
            dragRef.current = snapshot;
            setDrag(snapshot);
        };

        const onUp = (ev: PointerEvent) => {
            cleanup();
            if (!active) return;

            lastX = ev.clientX;
            lastY = ev.clientY;
            const snapshot: DragSnapshot = { payload, x: lastX, y: lastY };
            dragRef.current = snapshot;
            commitDrop(snapshot);
        };

        const onCancel = () => {
            cleanup();
            if (!active) return;
            dragRef.current = null;
            setDrag(null);
        };

        const cleanup = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onCancel);
            window.removeEventListener('blur', onCancel);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onCancel);
        window.addEventListener('blur', onCancel);
    }, []);

    const commitDrop = React.useCallback((snapshot: DragSnapshot) => {
        const element = document.elementFromPoint(snapshot.x, snapshot.y);

        const headerEl = element?.closest('[data-drop-band-header]') as HTMLElement | null;
        if (headerEl && snapshot.payload.kind === 'band') {
            const bandId = headerEl.dataset.dropBandHeader;
            if (bandId && bandId !== snapshot.payload.bandId) {
                onDropRef.current(snapshot.payload, { beforeBandId: bandId });
            }
            dragRef.current = null;
            setDrag(null);
            return;
        }

        const bandEl = element?.closest('[data-drop-band]') as HTMLElement | null;
        if (bandEl) {
            const bandId = bandEl.dataset.dropBand;
            if (bandId) {
                const rect = bandEl.getBoundingClientRect();
                onDropRef.current(snapshot.payload, {
                    bandId,
                    x: snapshot.x - rect.left,
                    y: snapshot.y - rect.top,
                });
            }
        }

        dragRef.current = null;
        setDrag(null);
    }, []);

    const value = React.useMemo<DesignerDragContextValue>(
        () => ({ drag, isDragging: !!drag, startDrag }),
        [drag, startDrag],
    );

    return <DesignerDragContext.Provider value={value}>{children}</DesignerDragContext.Provider>;
}
