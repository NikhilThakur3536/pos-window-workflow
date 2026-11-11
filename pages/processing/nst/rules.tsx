import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import NSTRules from '@/modules/common/nst/rules';

const NSTRulesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.RULES.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <NSTRules />
    </PermissionGuard>
);

NSTRulesPage.layoutType = 'dashboard';
export default NSTRulesPage;
