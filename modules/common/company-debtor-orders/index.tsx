'use client';

import Orders from './orders';
import Configuration from './configuration';
import DeliverySchedule from './delivery-schedule';
import DispatchReceipt from './dispatch-receipt';
import StockBatchAllocation from './stock-batch-allocation';
import AislePicklist from './aisle-picklist';
import PickedOrders from './picked-orders';
import type { ComponentType } from 'react';

export type CompanyDebtorOrdersTab =
    | 'orders'
    | 'setup'
    | 'delivery-schedule'
    | 'dispatch-receipt'
    | 'stock-batch-allocation'
    | 'aisle-picklist'
    | 'picked-orders';

const TAB_COMPONENTS: Record<CompanyDebtorOrdersTab, ComponentType> = {
    orders: Orders,
    setup: Configuration,
    'delivery-schedule': DeliverySchedule,
    'dispatch-receipt': DispatchReceipt,
    'stock-batch-allocation': StockBatchAllocation,
    'aisle-picklist': AislePicklist,
    'picked-orders': PickedOrders,
};

/**
 * Renders a single Company Debtor Orders screen. There are no in-page tabs: each
 * screen has its own route and is reached from the sidebar menu.
 */
const CompanyDebtorOrders = ({
    initialTab = 'orders',
    initialOrderId,
}: {
    initialTab?: CompanyDebtorOrdersTab;
    initialOrderId?: string;
}) => {
    if (initialTab === 'aisle-picklist') {
        return (
            <div className="m-6 space-y-3">
                <AislePicklist initialOrderId={initialOrderId} />
            </div>
        );
    }

    const Component = TAB_COMPONENTS[initialTab] ?? Orders;

    return (
        <div className="m-6 space-y-3">
            <Component />
        </div>
    );
};

export default CompanyDebtorOrders;