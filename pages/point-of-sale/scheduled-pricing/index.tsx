import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ScheduledPricing from '@/modules/common/scheduled-pricing';

const ScheduledPricingPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.POINT_OF_SALE?.SCHEDULED_PRICING.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <ScheduledPricing />
    </PermissionGuard>
);

ScheduledPricingPage.layoutType = 'dashboard';

export default ScheduledPricingPage;
