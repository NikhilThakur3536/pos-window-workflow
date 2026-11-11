import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import clsx from 'clsx';
import { useRouter } from 'next/router';

const tabRoutes = [
    { label: 'Cash Sales', value: '/point-of-sale/cash-sales/view-sales' },
    { label: 'Voided Sales', value: '/point-of-sale/voided-sales/view-sales' },
    { label: 'Suspended Sales', value: '/point-of-sale/suspended-sales/view-sales' },
    { label: 'Cash Refunds', value: '/point-of-sale/cash-refund/view-sales' },
];

export default function PointOfSale({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const currentPath = router.pathname;

    const handleTabChange = (path: string) => {
        router.push(path);
    };

    return (
        <div className="p-2">
            <Tabs defaultValue={currentPath} value={currentPath} className="flex h-full flex-col">
                <TabsList className="!mx-auto flex gap-2 rounded-lg bg-blue-100 p-1">
                    {tabRoutes.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={clsx('rounded-md px-4 py-2 text-sm font-medium capitalize transition-all', {
                                'bg-white text-blue-800 shadow': currentPath === tab.value,
                                'text-muted-foreground hover:bg-gray-200': currentPath !== tab.value,
                            })}
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {children}
            </Tabs>
        </div>
    );
}
