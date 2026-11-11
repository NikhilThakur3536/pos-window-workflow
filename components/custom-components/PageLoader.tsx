import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageLoaderProps {
    color?: 'primary' | 'secondary' | 'muted';
    isLoading: boolean;
    children?: ReactNode;
    height?: string;
    width?: string;
}

export function PageLoader({
    color = 'primary',
    isLoading,
    children,
    height = '100vh',
    width = '100vw',
}: PageLoaderProps) {
    const isFullScreen = !height && !width;

    return isLoading ? (
        <div
            className={cn(
                'bg-background/80 z-[9999] flex items-center justify-center backdrop-blur-sm',
                isFullScreen ? '!fixed inset-0 z-50' : '!absolute inset-0',
            )}
            style={{
                height: height ?? (isFullScreen ? '!100vh' : '!100%'),
                width: width ?? (isFullScreen ? '!100vw' : '!100%'),
            }}
        >
            <div className="flex items-center space-x-2">
                {[0, 1, 2].map((index) => (
                    <div
                        key={index}
                        className={cn(
                            'h-3 w-3 animate-bounce rounded-full',
                            color === 'primary' && 'bg-primary',
                            color === 'secondary' && 'bg-secondary',
                            color === 'muted' && 'bg-muted-foreground',
                        )}
                        style={{
                            animationDelay: `${index * 0.1}s`,
                            animationDuration: '0.6s',
                        }}
                    />
                ))}
            </div>
            <span className="sr-only">Loading</span>
        </div>
    ) : (
        children
    );
}
