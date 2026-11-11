import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import AutomationScreen from '@/modules/common/processing/replenishment/automation';

const ReplenishmentAutomationPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.PROCESSING?.REPLENISHMENT_RECOMMENDATIONS.AUTOMATION.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <AutomationScreen />
    </PermissionGuard>
);

ReplenishmentAutomationPage.layoutType = 'dashboard';

export default ReplenishmentAutomationPage;
