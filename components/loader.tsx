import { cn } from '@/lib/utils';
import React from 'react';

type LoaderProps = React.HTMLAttributes<HTMLDivElement>;

export default function Loader({ className, ...props }: LoaderProps) {
    return (
        <div
            {...props}
            className={cn('border-t-primary border-muted size-12 animate-spin rounded-full border-3', className)}
        />
    );
}
