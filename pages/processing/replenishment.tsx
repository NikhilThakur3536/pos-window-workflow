import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ReplenishmentScreen from '@/modules/common/processing/replenishment';

const ReplenishmentPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.PROCESSING?.REPLENISHMENT_RECOMMENDATIONS.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <ReplenishmentScreen />
    </PermissionGuard>
);

ReplenishmentPage.layoutType = 'dashboard';

export default ReplenishmentPage;