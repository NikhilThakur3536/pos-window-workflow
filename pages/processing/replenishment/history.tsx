import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ReplenishmentHistoryScreen from '@/modules/common/processing/replenishment/history';

const ReplenishmentHistoryPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.PROCESSING?.REPLENISHMENT_RECOMMENDATIONS.SAVED_RUNS.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <ReplenishmentHistoryScreen />
    </PermissionGuard>
);

ReplenishmentHistoryPage.layoutType = 'dashboard';

export default ReplenishmentHistoryPage;
