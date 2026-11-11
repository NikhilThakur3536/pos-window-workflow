import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import CashSale from '@/modules/common/point-of-sale/cash-sales';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashSalePage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.POINT_OF_SALE.CASH_SALE.code}
            permission={[SYSTEM_PERMISSIONS?.CREATE]}
        >
            <CashSale />
        </PermissionGuard>
    );
};

CashSalePage.layoutType = 'dashboard';

export default CashSalePage;
