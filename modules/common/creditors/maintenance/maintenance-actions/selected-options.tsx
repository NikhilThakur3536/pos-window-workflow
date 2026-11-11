'use client';

import type React from 'react';

import { Button } from '@/components/ui/button';
import {
    Edit,
    Trash2,
    Download,
    Grid3X3,
    ArrowUpDown,
    Grid2X2Check,
    CopyCheck,
    Filter,
    ListCheck,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo, useMemo } from 'react';
import { Table } from '@tanstack/react-table';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CompanyCreditor } from '@/types';

interface ActionButton {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick?: () => void;
    variant?: 'default' | 'destructive';
}

interface StickyActionBarProps {
    onEdit?: () => void;
    onDelete?: () => void;
    onExport?: () => void;
    onAdvancedSort?: () => void;
    onGridEdit?: () => void;
    onCopy?: () => void;
    onFilter?: () => void;
    onSearch?: () => void;
    onDetails?: () => void;
    className?: string;
    table: Table<CompanyCreditor>;
}

const ActionButtonComponent = memo(({ icon: Icon, label, onClick, variant = 'default' }: ActionButton) => (
    <Button
        onClick={() => {
            onClick?.();
        }}
        variant="outline"
        className={cn(
            'flex h-16 w-20 flex-col items-center gap-1 bg-transparent transition-colors',
            variant === 'destructive' && 'text-red-600 hover:bg-red-50 hover:text-red-700',
        )}
        size="sm"
        aria-label={label}
    >
        <Icon className="h-5 w-5" />
        <span className="text-xs">{label}</span>
    </Button>
));

ActionButtonComponent.displayName = 'ActionButton';

export const StickyActionBar = memo(
    ({
        onEdit,
        onDelete,
        onExport,
        onAdvancedSort,
        onGridEdit,
        onCopy,
        onFilter,
        onSearch,
        onDetails,
        className,
        table,
    }: StickyActionBarProps) => {
        const actionButtons = useMemo(
            () =>
                [
                    { key: 'copy', button: { icon: CopyCheck, label: 'Copy', onClick: onCopy } },
                    { key: 'filter', button: { icon: Filter, label: 'Filter', onClick: onFilter } },
                    { key: 'search', button: { icon: Search, label: 'Select', onClick: onSearch } },
                    { key: 'details', button: { icon: ListCheck, label: 'Details', onClick: onDetails } },
                    { key: 'edit', button: { icon: Edit, label: 'Edit', onClick: onEdit } },
                    { key: 'export', button: { icon: Download, label: 'Export', onClick: onExport } },
                    {
                        key: 'delete',
                        button: { icon: Trash2, label: 'Delete', onClick: onDelete, variant: 'destructive' as const },
                    },
                    { key: 'sort', button: { icon: ArrowUpDown, label: 'Sort', onClick: onAdvancedSort } },
                    { key: 'gridEdit', button: { icon: Grid3X3, label: 'Grid Edit', onClick: onGridEdit } },
                ].filter((item) => item.button.onClick),
            [onEdit, onExport, onDelete, onAdvancedSort, onGridEdit],
        );

        return (
            <div
                className={cn(
                    'fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200 bg-white shadow-lg',
                    'will-change-transform',
                    className,
                )}
                role="toolbar"
                aria-label="Table actions"
            >
                <div className="mx-auto flex items-center justify-between gap-4 p-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                className="flex h-16 w-20 flex-col items-center gap-1 bg-transparent transition-colors"
                            >
                                <Grid2X2Check className="h-5 w-5" />
                                <span className="text-xs">Columns</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    );
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Center - Action Buttons */}
                    {actionButtons.length > 0 && (
                        <div
                            className={cn(
                                'flex items-center justify-center gap-2 transition-all duration-300 ease-out will-change-transform',
                                'translate-x-0 scale-100 opacity-100',
                            )}
                        >
                            {actionButtons.map(({ key, button }) => (
                                <ActionButtonComponent key={key} {...button} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

StickyActionBar.displayName = 'StickyActionBar';
