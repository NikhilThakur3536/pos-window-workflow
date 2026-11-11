import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PricingPolicies from '@/modules/common/pricing-policies';

const DiscountAndPricingMatrixPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK?.PRICE_MAINTENANCE?.DISCOUNT_AND_PRICING_MATRIX.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <PricingPolicies module={SYSTEM_MODULES?.STOCK?.PRICE_MAINTENANCE?.DISCOUNT_AND_PRICING_MATRIX} />
        </PermissionGuard>
    );
};

DiscountAndPricingMatrixPage.layoutType = 'dashboard';

export default DiscountAndPricingMatrixPage;