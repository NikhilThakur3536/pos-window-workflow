import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierPricingScreen from '@/modules/common/stocks/supplier-pricing/supplier-pricing';

const SupplierPricingPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.STOCK?.MAINTENANCE?.SUPPLIER_PRICING.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <SupplierPricingScreen />
    </PermissionGuard>
);

SupplierPricingPage.layoutType = 'dashboard';

export default SupplierPricingPage;