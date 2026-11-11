import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import UserSessionsModule from '@/modules/common/user-monitoring/sessions';

const UserSessionsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={[SYSTEM_MODULES.UTILITIES.USER_MONITORING.code, SYSTEM_MODULES.UTILITIES.USER_MONITORING.USER_SESSIONS.code]}
            match="any"
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <UserSessionsModule />
        </PermissionGuard>
    );
};

UserSessionsPage.layoutType = 'dashboard';

export default UserSessionsPage;
