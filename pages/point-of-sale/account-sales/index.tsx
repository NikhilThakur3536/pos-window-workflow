import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import AccountSales from '@/modules/common/point-of-sale/account-sales';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const AccountSalePage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.POINT_OF_SALE.ACCOUNT_SALES.code}
            permission={[SYSTEM_PERMISSIONS?.CREATE]}
        >
            <AccountSales />
        </PermissionGuard>
    );
};

AccountSalePage.layoutType = 'dashboard';

export default AccountSalePage;
