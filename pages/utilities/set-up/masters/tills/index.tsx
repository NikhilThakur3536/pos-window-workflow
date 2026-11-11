import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import TillsList from '@/modules/masters/tills';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.TILLS.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <TillsList />
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
