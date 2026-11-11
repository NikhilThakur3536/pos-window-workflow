import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import StockSubCategories from '@/modules/masters/stock-categories/sub-categories';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockCategoriesNav from '@/modules/masters/stock-categories';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.STOCK_SUB_CATEGORIES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <StockCategoriesNav>
                <StockSubCategories />
            </StockCategoriesNav>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
