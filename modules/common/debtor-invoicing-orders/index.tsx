'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Orders from './orders';
import AccountSaleSettings from './settings';
import { useRouter } from 'next/router';

export type DebtorInvoicingOrdersTab = 'orders' | 'setup';

const DebtorInvoicingOrders = ({ initialTab }: { initialTab?: DebtorInvoicingOrdersTab }) => {
    const router = useRouter();
    const [tab, setTab] = useState<DebtorInvoicingOrdersTab>(initialTab || 'orders');

    useEffect(() => {
        if (initialTab) setTab(initialTab);
    }, [initialTab]);

    const selectTab = (value: string) => {
        setTab(value as DebtorInvoicingOrdersTab);
        const base = '/point-of-sale/debtor-invoicing-orders';
        router.replace(value === 'setup' ? `${base}/setup` : base, undefined, { shallow: true });
    };

    return (
        <div className="m-6 space-y-3">
            <Tabs value={tab} onValueChange={selectTab}>
                <TabsList className="flex w-max flex-wrap h-auto">
                    <TabsTrigger value="orders">Debtor Invoicing Orders</TabsTrigger>
                    <TabsTrigger value="setup">Debtor Invoicing Order Setup</TabsTrigger>
                </TabsList>
                <TabsContent value="orders">
                    <Orders />
                </TabsContent>
                <TabsContent value="setup">
                    <AccountSaleSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default DebtorInvoicingOrders;