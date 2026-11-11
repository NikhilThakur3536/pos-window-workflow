import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SafesList from '@/modules/admin/safes';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.MODULE_PARAMETERS.USER_GROUP_AND_MAINTENANCE.USERS.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <SafesList />
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
