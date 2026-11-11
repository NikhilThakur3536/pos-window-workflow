import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import ViewCashRefunds from '@/modules/common/point-of-sale/cash-refund/view-cash-refunds';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PointOfSale from '@/modules/common/point-of-sale';

const ViewCashSalesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.POINT_OF_SALE.CASH_REFUND.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <PointOfSale>
                <ViewCashRefunds />
            </PointOfSale>
        </PermissionGuard>
    );
};

ViewCashSalesPage.layoutType = 'dashboard';

export default ViewCashSalesPage;
