import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import Maintenance from '@/modules/common/debtors/maintenance';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MaintenancePage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.DEBTORS.MAINTENANCE.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <Maintenance />
        </PermissionGuard>
    );
};

MaintenancePage.layoutType = 'dashboard';

export default MaintenancePage;
