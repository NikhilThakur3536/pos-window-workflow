import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import MastersList from '@/modules/masters';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <MastersList />
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
