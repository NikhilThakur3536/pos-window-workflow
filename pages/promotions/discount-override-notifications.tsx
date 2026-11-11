import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import DiscountOverrideNotifications from '@/modules/common/promotions/discount-override-notifications';

const DiscountOverrideNotificationsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.POINT_OF_SALE?.PROMOTIONS?.DISCOUNT_OVERRIDE_NOTIFICATIONS.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <DiscountOverrideNotifications />
    </PermissionGuard>
);

DiscountOverrideNotificationsPage.layoutType = 'dashboard';

export default DiscountOverrideNotificationsPage;