import { Button } from '@/components/ui/button';
import { generateBreadcrumbs } from '@/utils/generate-breadcrumbs';
import { ChevronRight as ArrowIcon, ArrowLeft, ArrowRight, Home, RotateCw } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NavigationBar: React.FC = () => {
    const router = useRouter();
    const [canGoBack, setCanGoBack] = useState(false);
    const path = router.asPath.split('?')[0];
    const breadcrumbs = generateBreadcrumbs(path);

    useEffect(() => {
        setCanGoBack(window.history.length > 1);
    }, [router.asPath]);

    const handleBack = () => router.back();
    const handleForward = () => window.history.forward();
    const handleReload = () => {
        if ((window as any).electronAPI?.reloadApp) {
            (window as any).electronAPI.reloadApp();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="sticky top-0 z-50 flex w-full items-center justify-between gap-2 border-y bg-white py-1 pr-4 pl-1 dark:bg-zinc-900">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className="!rounded-full"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="icon" onClick={handleForward} className="!rounded-full">
                    <ArrowRight className="h-5 w-5" />
                </Button>

                <Button variant="ghost" size="icon" onClick={handleReload} className="!rounded-full">
                    <RotateCw className="h-5 w-5" />
                </Button>
            </div>

            <div className="scrollbar-hide ml-4 flex items-center gap-1 overflow-x-auto text-sm">
                {breadcrumbs?.length === 0 ? null : (
                    <Link href="/" className="text-muted-foreground hover:text-primary transition hover:underline">
                        <Home className="!h-4 !w-4 text-green-600 hover:text-green-800" />
                    </Link>
                )}

                {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <span key={crumb.href} className="flex items-center gap-1">
                            <ArrowIcon className="text-muted-foreground h-4 w-4" />
                            <span
                                className={`${isLast ? 'text-primary font-medium' : 'text-muted-foreground'} capitalize`}
                            >
                                {crumb.label}
                            </span>
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

export default NavigationBar;
