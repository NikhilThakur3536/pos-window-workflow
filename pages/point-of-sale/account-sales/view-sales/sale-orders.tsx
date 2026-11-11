import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import POSAccountSales from '@/modules/common/point-of-sale/account-sales/view-account-sales';
import ViewAccountSalesSaleOrder from '@/modules/common/point-of-sale/account-sales/view-account-sales/sale-orders';

const ViewAccountSalesPage: NextPageWithLayout = () => {
    return (
        <POSAccountSales>
            <ViewAccountSalesSaleOrder />
        </POSAccountSales>
    );
};

ViewAccountSalesPage.layoutType = 'dashboard';
export default ViewAccountSalesPage;
