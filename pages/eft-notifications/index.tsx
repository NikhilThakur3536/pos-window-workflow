import type { NextPageWithLayout } from '@/types/next-page.types';
import EftNotifications from '@/modules/common/eft-notifications';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const EftNotificationsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.EFT_NOTIFICATION.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <EftNotifications />
        </PermissionGuard>
    );
};

EftNotificationsPage.layoutType = 'dashboard';

export default EftNotificationsPage;
