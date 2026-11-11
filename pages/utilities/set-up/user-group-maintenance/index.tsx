import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import UtilitySettings from '@/modules/admin/user-group-maintenance';

const UserGroupMaintenancePage: NextPageWithLayout = () => {
    return <UtilitySettings />;
};

UserGroupMaintenancePage.layoutType = 'dashboard';

export default UserGroupMaintenancePage;
