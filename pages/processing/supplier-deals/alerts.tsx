import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierDealAlertsScreen from '@/modules/common/supplier-deals/supplier-deal-alerts';

const SupplierDealAlertsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.PROCESSING?.SUPPLIER_DEALS?.SUPPLIER_DEAL_ALERTS?.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <SupplierDealAlertsScreen />
    </PermissionGuard>
);

SupplierDealAlertsPage.layoutType = 'dashboard';

export default SupplierDealAlertsPage;
