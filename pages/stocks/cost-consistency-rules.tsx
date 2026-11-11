import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import CostConsistencyRulesScreen from '@/modules/common/stocks/cost-consistency-rules/cost-consistency-rules';

const CostConsistencyRulesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.STOCK?.PRICE_MAINTENANCE?.COST_CONSISTENCY_RULES?.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <CostConsistencyRulesScreen />
    </PermissionGuard>
);

CostConsistencyRulesPage.layoutType = 'dashboard';

export default CostConsistencyRulesPage;
