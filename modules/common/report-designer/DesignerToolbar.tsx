'use client';

import * as React from 'react';
import {
    FilePlus,
    FolderOpen,
    Save,
    SaveAll,
    Printer,
    Search,
    Scissors,
    Copy,
    ClipboardPaste,
    Undo2,
    Redo2,
    Grid3x3,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    Columns,
    Rows,
    LayoutGrid,
    PanelLeftClose,
    PanelRightClose,
    Bold,
    Italic,
    Underline,
    Type,
    PaintBucket,
    RefreshCw,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Table2,
    ImageIcon,
    Palette,
    Hash,
} from 'lucide-react';
import { ToolbarIconButton, ToolbarSeparator, ToolbarProvider } from './toolbar-icon-button';
import { CompactSelect } from './compact-select';

const ZOOM_OPTIONS = ['50%', '75%', '100%', '125%', '150%', '200%'];
const FONT_OPTIONS = ['Arial', 'Calibri', 'Segoe UI', 'Times New Roman', 'Verdana'];
const FONT_SIZE_OPTIONS = ['8', '9', '10', '11', '12', '14', '16', '18', '24'];

interface DesignerToolbarProps {
    zoom: string;
    onZoomChange: (zoom: string) => void;
    fontFamily: string;
    onFontFamilyChange: (font: string) => void;
    fontSize: string;
    onFontSizeChange: (size: string) => void;
    onSave: () => void;
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    saving?: boolean;
}

export function DesignerToolbar({
    zoom,
    onZoomChange,
    fontFamily,
    onFontFamilyChange,
    fontSize,
    onFontSizeChange,
    onSave,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    saving,
}: DesignerToolbarProps) {
    return (
        <ToolbarProvider>
            <div className="flex flex-col border-b border-neutral-300 bg-neutral-50">
                {/* Row 1: file / edit / view actions */}
                <div className="flex items-center gap-0.5 px-2 py-1">
                    <ToolbarIconButton label="New report">
                        <FilePlus className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Open report">
                        <FolderOpen className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label={saving ? 'Saving…' : 'Save report'} onClick={onSave} disabled={saving}>
                        <Save className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Save as">
                        <SaveAll className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Print">
                        <Printer className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Find">
                        <Search className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Cut">
                        <Scissors className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Copy">
                        <Copy className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Paste">
                        <ClipboardPaste className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Undo" onClick={onUndo} disabled={!canUndo}>
                        <Undo2 className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Redo" onClick={onRedo} disabled={!canRedo}>
                        <Redo2 className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <CompactSelect
                        value={zoom}
                        onValueChange={onZoomChange}
                        options={ZOOM_OPTIONS}
                        triggerClassName="w-[70px]"
                    />

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Show grid">
                        <Grid3x3 className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align left" variant="group-first">
                        <AlignStartVertical className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align center" variant="group-middle">
                        <AlignCenterVertical className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align right" variant="group-last">
                        <AlignEndVertical className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align top" variant="group-first">
                        <AlignStartHorizontal className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align middle" variant="group-middle">
                        <AlignCenterHorizontal className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align bottom" variant="group-last">
                        <AlignEndHorizontal className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Columns">
                        <Columns className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Rows">
                        <Rows className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Layout grid">
                        <LayoutGrid className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Collapse left panel">
                        <PanelLeftClose className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Collapse right panel">
                        <PanelRightClose className="h-4 w-4" />
                    </ToolbarIconButton>
                </div>

                {/* Row 2: font formatting */}
                <div className="flex items-center gap-0.5 border-t border-neutral-200 px-2 py-1">
                    <CompactSelect
                        value={fontFamily}
                        onValueChange={onFontFamilyChange}
                        options={FONT_OPTIONS}
                        triggerClassName="w-[120px]"
                    />
                    <CompactSelect
                        value={fontSize}
                        onValueChange={onFontSizeChange}
                        options={FONT_SIZE_OPTIONS}
                        triggerClassName="w-[52px]"
                    />

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Bold">
                        <Bold className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Italic">
                        <Italic className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Underline">
                        <Underline className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Text color">
                        <Type className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Fill color">
                        <PaintBucket className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Refresh formatting">
                        <RefreshCw className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Align text left" variant="group-first">
                        <AlignLeft className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align text center" variant="group-middle">
                        <AlignCenter className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Align text right" variant="group-middle">
                        <AlignRight className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Justify" variant="group-last">
                        <AlignJustify className="h-4 w-4" />
                    </ToolbarIconButton>

                    <ToolbarSeparator />

                    <ToolbarIconButton label="Insert table">
                        <Table2 className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Insert picture">
                        <ImageIcon className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Highlight color">
                        <Palette className="h-4 w-4" />
                    </ToolbarIconButton>
                    <ToolbarIconButton label="Number format">
                        <Hash className="h-4 w-4" />
                    </ToolbarIconButton>
                </div>
            </div>
        </ToolbarProvider>
    );
}
