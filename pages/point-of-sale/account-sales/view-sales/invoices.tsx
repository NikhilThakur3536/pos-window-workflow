import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import POSAccountSales from '@/modules/common/point-of-sale/account-sales/view-account-sales';
import ViewAccountSalesInvoice from '@/modules/common/point-of-sale/account-sales/view-account-sales/invoices';

const ViewAccountSalesPage: NextPageWithLayout = () => {
    return (
        <POSAccountSales>
            <ViewAccountSalesInvoice />
        </POSAccountSales>
    );
};

ViewAccountSalesPage.layoutType = 'dashboard';
export default ViewAccountSalesPage;
