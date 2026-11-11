import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyCards from '@/modules/common/loyalty/cards/loyalty';
import LoyaltyCardsTab from '@/modules/common/loyalty/cards';

const LoyaltyCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyCardsTab>
            <LoyaltyCards />
        </LoyaltyCardsTab>
    </PermissionGuard>
);

LoyaltyCardsPage.layoutType = 'dashboard';

export default LoyaltyCardsPage;
