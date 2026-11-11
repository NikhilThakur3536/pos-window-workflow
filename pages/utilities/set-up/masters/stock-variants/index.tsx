import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import StockVariants from '@/modules/masters/stock-variants';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StockVariantsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_VARIANTS.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <StockVariants />
        </PermissionGuard>
    );
};

StockVariantsPage.layoutType = 'dashboard';

export default StockVariantsPage;