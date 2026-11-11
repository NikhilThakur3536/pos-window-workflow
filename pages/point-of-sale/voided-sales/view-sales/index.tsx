import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PointOfSale from '@/modules/common/point-of-sale';
import ViewVoidedSales from '@/modules/common/point-of-sale/cash-sales/view-cash-sales/voided-sales';

const ViewVoidedCashSalesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE.CASH_SALE.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <PointOfSale>
                <ViewVoidedSales />
            </PointOfSale>
        </PermissionGuard>
    );
};

ViewVoidedCashSalesPage.layoutType = 'dashboard';

export default ViewVoidedCashSalesPage;
