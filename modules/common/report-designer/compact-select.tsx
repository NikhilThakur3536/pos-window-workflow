'use client';

import * as React from 'react';
import * as Select from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    className?: string;
    triggerClassName?: string;
    editable?: boolean;
}

/**
 * Narrow toolbar-style select, used for the zoom control, font family and
 * font size pickers in the reference designer.
 */
export function CompactSelect({
    value,
    onValueChange,
    options,
    className,
    triggerClassName,
}: CompactSelectProps) {
    return (
        <Select.Root value={value} onValueChange={onValueChange}>
            <Select.Trigger
                className={cn(
                    'flex h-7 items-center gap-1 border border-neutral-300 bg-white px-2 text-xs text-neutral-800',
                    'hover:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-400',
                    triggerClassName,
                    className,
                )}
            >
                <Select.Value />
                <Select.Icon>
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
                <Select.Content className="z-50 max-h-72 overflow-hidden rounded-sm border border-neutral-300 bg-white shadow-lg">
                    <Select.Viewport className="p-1">
                        {options.map((option) => (
                            <Select.Item
                                key={option}
                                value={option}
                                className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1 text-xs text-neutral-800 outline-none data-[highlighted]:bg-blue-100"
                            >
                                <Select.ItemText>{option}</Select.ItemText>
                                <Select.ItemIndicator>
                                    <Check className="h-3 w-3" />
                                </Select.ItemIndicator>
                            </Select.Item>
                        ))}
                    </Select.Viewport>
                </Select.Content>
            </Select.Portal>
        </Select.Root>
    );
}
