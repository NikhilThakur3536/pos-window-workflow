'use client';

import * as React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

interface UnderlineTabsProps {
    value: string;
    onValueChange: (value: string) => void;
    tabs: { value: string; label: string }[];
    className?: string;
    size?: 'sm' | 'md';
}

export function UnderlineTabs({
    value,
    onValueChange,
    tabs,
    className,
    size = 'md',
}: UnderlineTabsProps) {
    return (
        <Tabs.Root value={value} onValueChange={onValueChange}>
            <Tabs.List
                className={cn(
                    'flex items-center gap-0.5 border-b border-neutral-300 bg-neutral-100 px-1',
                    className,
                )}
            >
                {tabs.map((tab) => (
                    <Tabs.Trigger
                        key={tab.value}
                        value={tab.value}
                        className={cn(
                            'relative -mb-px border border-transparent border-b-0 font-medium text-neutral-600',
                            'hover:text-neutral-900 data-[state=active]:border-neutral-300 data-[state=active]:bg-white data-[state=active]:text-neutral-900',
                            size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-4 py-1.5 text-xs',
                        )}
                    >
                        {tab.label}
                    </Tabs.Trigger>
                ))}
            </Tabs.List>
        </Tabs.Root>
    );
}
