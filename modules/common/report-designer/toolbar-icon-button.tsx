'use client';

import * as React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

interface ToolbarIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    active?: boolean;
    variant?: 'icon' | 'group-first' | 'group-middle' | 'group-last';
}

/**
 * Small square icon button used across the FastReport-style toolbars.
 * `variant` controls corner rounding so buttons can be visually grouped
 * (New/Open/Save, alignment icons, grid icons, ...) the way the reference
 * designer groups them.
 */
export const ToolbarIconButton = React.forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
    ({ label, active, variant = 'icon', className, children, ...props }, ref) => {
        const roundedClass =
            variant === 'group-first'
                ? 'rounded-l-sm rounded-r-none'
                : variant === 'group-last'
                  ? 'rounded-r-sm rounded-l-none'
                  : variant === 'group-middle'
                    ? 'rounded-none'
                    : 'rounded-sm';

        return (
            <Tooltip.Root delayDuration={400}>
                <Tooltip.Trigger asChild>
                    <button
                        ref={ref}
                        type="button"
                        aria-label={label}
                        className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center border border-transparent text-neutral-700',
                            'hover:border-neutral-300 hover:bg-neutral-100 active:bg-neutral-200',
                            'disabled:pointer-events-none disabled:opacity-40',
                            active && 'border-neutral-300 bg-blue-100 hover:bg-blue-100',
                            roundedClass,
                            className,
                        )}
                        {...props}
                    >
                        {children}
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                    <Tooltip.Content
                        sideOffset={6}
                        className="z-50 rounded-sm bg-neutral-800 px-2 py-1 text-xs text-white shadow-md"
                    >
                        {label}
                        <Tooltip.Arrow className="fill-neutral-800" />
                    </Tooltip.Content>
                </Tooltip.Portal>
            </Tooltip.Root>
        );
    },
);
ToolbarIconButton.displayName = 'ToolbarIconButton';

export const ToolbarSeparator = () => <div className="mx-1 h-5 w-px shrink-0 bg-neutral-300" />;

export const ToolbarProvider = Tooltip.Provider;
