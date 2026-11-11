import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import StockCategories from '@/modules/masters/stock-categories/categories';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockCategoriesNav from '@/modules/masters/stock-categories';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.STOCK_CATEGORIES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <StockCategoriesNav>
                <StockCategories />
            </StockCategoriesNav>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
