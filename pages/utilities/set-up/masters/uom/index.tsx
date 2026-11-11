import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import UomMasterList from '@/modules/masters/uom';

const UomPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.UTILITIES.SETUP.DEFAULT_TABLES.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <UomMasterList />
        </PermissionGuard>
    );
};

UomPage.layoutType = 'dashboard';

export default UomPage;
