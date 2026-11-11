import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';
import Link from 'next/link';

export default function Custom404() {
    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-white px-4 py-12 text-center dark:bg-gray-950">
            <div className="max-w-md space-y-4">
                <Frown className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600" />
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 dark:text-gray-50">{'404'}</h1>
                <p className="text-gray-600 dark:text-gray-400">{"Oops! The page you're looking for doesn't exist."}</p>
                <Link href="/" passHref>
                    <Button className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-gray-50 shadow transition-colors hover:bg-gray-900/90 focus-visible:ring-1 focus-visible:ring-gray-950 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:bg-gray-50 dark:text-gray-900 dark:hover:bg-gray-50/90 dark:focus-visible:ring-gray-300">
                        Go to Homepage
                    </Button>
                </Link>
            </div>
        </div>
    );
}
