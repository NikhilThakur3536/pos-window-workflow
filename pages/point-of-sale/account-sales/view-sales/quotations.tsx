import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import POSAccountSales from '@/modules/common/point-of-sale/account-sales/view-account-sales';
import ViewAccountSalesQuotations from '@/modules/common/point-of-sale/account-sales/view-account-sales/quotations';

const ViewAccountSalesPage: NextPageWithLayout = () => {
    return (
        <POSAccountSales>
            <ViewAccountSalesQuotations />
        </POSAccountSales>
    );
};

ViewAccountSalesPage.layoutType = 'dashboard';
export default ViewAccountSalesPage;
