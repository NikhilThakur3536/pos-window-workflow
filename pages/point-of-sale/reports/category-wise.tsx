import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SalesReports from '@/modules/common/sales-reports';

const CategoryReports: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.POINT_OF_SALE?.SALES_REPORT?.DEBTOR_WISE_SALES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <SalesReports type="categoryWiseSales" />
        </PermissionGuard>
    );
};

CategoryReports.layoutType = 'dashboard';

export default CategoryReports;
