import { cn } from '@/lib/utils';
import { BarChart2, Database, DollarSign, Package, Receipt, ShoppingCart, Users, Warehouse } from 'lucide-react';
import { useState } from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import { APP_VERSION } from '@/lib/constant';
import Link from 'next/link';

const modules = [
    {
        id: 'sales',
        name: 'SALES REPORT',
        icon: BarChart2,
        color: 'text-blue-600',
        href: '/point-of-sale/reports/stock-wise',
    },
    { id: 'pos', name: 'POS', icon: ShoppingCart, color: 'text-green-600', href: '/point-of-sale/cash-sales' },
    {
        id: 'promotions',
        name: 'PROMOTIONS',
        icon: DollarSign,
        color: 'text-purple-600',
        href: '/promotions',
    },
    {
        id: 'users',
        name: 'USERS',
        icon: Users,
        color: 'text-orange-600',
        href: '/utilities/set-up/user-group-maintenance',
    },
    { id: 'stocks', name: 'STOCKS', icon: Package, color: 'text-red-600', href: '/stocks' },
    { id: 'inventory', name: 'INVENTORY', icon: Warehouse, color: 'text-indigo-600', href: '/stocks/inventory' },
    { id: 'grv', name: 'GRV', icon: Receipt, color: 'text-pink-600', href: '/processing/goods-receiving' },
    {
        id: 'dataImportCenter',
        name: 'DATA IMPORT CENTER',
        icon: Database,
        color: 'text-teal-600',
        href: '/utilities/data-import-center',
    },
];

const Dashboard: NextPageWithLayout = () => {
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const deviceType = process.env.NEXT_PUBLIC_APP_TYPE;

    return (
        <div
            className="relative min-h-[calc(100vh-78px)]"
            style={{
                backgroundImage: `url('/images/dashboard-bg.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            <div className="absolute inset-0 bg-slate-900/40"></div>
            <div className="relative z-10 flex min-h-[calc(100vh-78px)] flex-col items-center justify-center px-8">
                <div className="my-8 text-center">
                    <img src={`/assets/images/onetouch-logo.jpg`} className="!h-36 rounded-full" />
                </div>
                <div className="mb-16 grid grid-cols-4 gap-8">
                    {modules.map((module) => {
                        const IconComponent = module.icon;
                        const content = (
                            <>
                                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white">
                                    <IconComponent className={cn('h-8 w-8', module.color)} />
                                </div>
                                <span className="text-sm font-medium tracking-wide text-white">{module.name}</span>
                            </>
                        );

                        const className = cn(
                            'flex flex-col items-center gap-3 rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20 hover:shadow-lg',
                            activeModule === module.id ? 'scale-105 bg-white/25' : '',
                        );

                        return module.href ? (
                            <Link key={module.id} href={module.href} className={className}>
                                {content}
                            </Link>
                        ) : (
                            <button key={module.id} onClick={() => setActiveModule(module.id)} className={className}>
                                {content}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="absolute right-0 bottom-0 left-0 bg-slate-800/90 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="space-y-1 text-xs">
                        <div>Application: OneTouch {deviceType === 'WAREHOUSE-USER' ? 'DC' : 'Retail'} POS</div>
                        <div>Version: {APP_VERSION}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-2xl font-bold">
                                <span className="text-[#ED8D68]">O</span>ne
                                <span className="text-[#ED8D68]">T</span>
                                ouch
                            </div>
                            <div className="text-xs text-gray-300">Commercial Systems Company</div>
                        </div>
                        <div className="h-8 w-8 rotate-45 transform bg-[#ED8D68]"></div>
                        <div className="rounded px-2 py-1 text-xs font-bold text-white">
                            {deviceType === 'WAREHOUSE-USER' ? 'DC' : 'Retail'} SaaS
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

Dashboard.layoutType = 'dashboard';

export default Dashboard;
