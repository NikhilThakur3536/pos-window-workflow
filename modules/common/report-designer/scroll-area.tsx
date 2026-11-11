'use client';

import * as React from 'react';
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

export function ScrollArea({
    className,
    children,
    ...props
}: React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>) {
    return (
        <ScrollAreaPrimitive.Root className={cn('overflow-hidden', className)} {...props}>
            <ScrollAreaPrimitive.Viewport className="h-full w-full">
                {children}
            </ScrollAreaPrimitive.Viewport>
            <ScrollAreaPrimitive.Scrollbar
                orientation="vertical"
                className="flex w-2.5 touch-none select-none bg-neutral-100 p-[1px] transition-colors hover:bg-neutral-200"
            >
                <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-neutral-400" />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Scrollbar
                orientation="horizontal"
                className="flex h-2.5 touch-none select-none bg-neutral-100 p-[1px] transition-colors hover:bg-neutral-200"
            >
                <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-neutral-400" />
            </ScrollAreaPrimitive.Scrollbar>
            <ScrollAreaPrimitive.Corner />
        </ScrollAreaPrimitive.Root>
    );
}
