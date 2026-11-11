import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import CashRefundScreen from '@/modules/common/point-of-sale/cash-refund';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashSalePage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.POINT_OF_SALE.CASH_REFUND.code}
            permission={[SYSTEM_PERMISSIONS?.CREATE]}
        >
            <CashRefundScreen />
        </PermissionGuard>
    );
};

CashSalePage.layoutType = 'dashboard';

export default CashSalePage;
