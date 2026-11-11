import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import React from 'react';

interface ColumnChipsProps {
    items: string[];
    maxVisibleChips?: number;
    chipClassName?: string;
}

export const ColumnChips: React.FC<ColumnChipsProps> = ({ items, maxVisibleChips = 3, chipClassName }) => {
    if (!items?.length) return <span className="text-gray-500">N/A</span>;

    const visibleItems = items.slice(0, maxVisibleChips);
    const remainingCount = items.length - maxVisibleChips;

    return (
        <div className="flex flex-wrap gap-2">
            <HoverCard>
                <HoverCardTrigger className="flex">
                    {visibleItems.map((item, index) => (
                        <Chip key={`visible-${index}`} className={cn('size-6 p-2', chipClassName)}>
                            {item.slice(0, 1)}
                        </Chip>
                    ))}
                    <Chip className="bg-muted size-6 p-2">+{remainingCount}</Chip>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-2">
                    <div className="flex flex-wrap gap-2">
                        {items.map((item, index) => (
                            <Chip key={`visible-${index}`} className="aspect-auto size-auto w-fit px-3 py-1">
                                {item}
                            </Chip>
                        ))}
                    </div>
                </HoverCardContent>
            </HoverCard>
        </div>
    );
};

type ChipProps = {
    children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

function Chip({ children, className, ...props }: ChipProps) {
    return (
        <span
            {...props}
            className={cn(
                'flex aspect-square size-5 items-center justify-center rounded-full text-sm font-medium',
                'bg-blue-100 text-blue-800',
                className,
            )}
        >
            {children}
        </span>
    );
}
