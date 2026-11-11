import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PricingPolicies from '@/modules/common/pricing-policies';

const PricingPoliciesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.POINT_OF_SALE?.PRICING_POLICIES.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <PricingPolicies />
    </PermissionGuard>
);

PricingPoliciesPage.layoutType = 'dashboard';

export default PricingPoliciesPage;
