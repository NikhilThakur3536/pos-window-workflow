import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import Memberships from '@/modules/common/loyalty/memberships';

const LoyaltyMembershipsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <Memberships />
    </PermissionGuard>
);

LoyaltyMembershipsPage.layoutType = 'dashboard';

export default LoyaltyMembershipsPage;
