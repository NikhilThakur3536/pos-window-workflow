import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import CurrencyMasterList from '@/modules/masters/currency';

const MastersPage: NextPageWithLayout = () => {
    return (
        // <PermissionGuard
        //     module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.CURRENCY.code}
        //     permission={[SYSTEM_PERMISSIONS?.READ]}
        // >
            <CurrencyMasterList/>
        // </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;