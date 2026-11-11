import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import UserTypeMasterList from '@/modules/masters/user-type';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.STOCK_CATEGORIES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <UserTypeMasterList/>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
