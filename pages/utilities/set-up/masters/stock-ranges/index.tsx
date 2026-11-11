import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import StockRanges from '@/modules/masters/stock-categories/stock-ranges';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockCategoriesNav from '@/modules/masters/stock-categories';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_RANGES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <StockCategoriesNav>
                <StockRanges />
            </StockCategoriesNav>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;