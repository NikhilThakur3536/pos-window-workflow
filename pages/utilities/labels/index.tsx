import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LabelTemplates from '@/modules/common/labels';

const LoyaltyCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LabelTemplates/>
    </PermissionGuard>
);

LoyaltyCardsPage.layoutType = 'dashboard';

export default LoyaltyCardsPage;
