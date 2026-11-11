import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import ViewCashSales from '@/modules/common/point-of-sale/cash-sales/view-cash-sales';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PointOfSale from '@/modules/common/point-of-sale';

const ViewCashSalesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE.CASH_SALE.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <PointOfSale>
                <ViewCashSales />
            </PointOfSale>
        </PermissionGuard>
    );
};

ViewCashSalesPage.layoutType = 'dashboard';

export default ViewCashSalesPage;
