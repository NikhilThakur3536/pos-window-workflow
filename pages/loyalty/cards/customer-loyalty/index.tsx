import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyCardsTab from '@/modules/common/loyalty/cards';
import CustomerLoyaltyCards from '@/modules/common/loyalty/cards/customer-loyalty';

const CustomerLoyaltyCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyCardsTab>
            <CustomerLoyaltyCards />
        </LoyaltyCardsTab>
    </PermissionGuard>
);

CustomerLoyaltyCardsPage.layoutType = 'dashboard';

export default CustomerLoyaltyCardsPage;
