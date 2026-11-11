import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierCostComparisonScreen from '@/modules/common/stocks/supplier-cost-comparison/supplier-cost-comparison';

const SupplierCostComparisonPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.STOCK?.MAINTENANCE?.SUPPLIER_PRICING?.SUPPLIER_COST_COMPARISON?.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <SupplierCostComparisonScreen />
    </PermissionGuard>
);

SupplierCostComparisonPage.layoutType = 'dashboard';

export default SupplierCostComparisonPage;