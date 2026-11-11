import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PoliciesScreen from '@/modules/common/processing/replenishment/policies';

const ReplenishmentPoliciesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.PROCESSING?.REPLENISHMENT_RECOMMENDATIONS.POLICIES.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <PoliciesScreen />
    </PermissionGuard>
);

ReplenishmentPoliciesPage.layoutType = 'dashboard';

export default ReplenishmentPoliciesPage;
