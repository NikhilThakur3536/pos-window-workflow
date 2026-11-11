import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyCardsTab from '@/modules/common/loyalty/cards';
import DebtorLoyaltyCards from '@/modules/common/loyalty/cards/debtor-loyalty';

const DebtorLoyaltyCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyCardsTab>
            <DebtorLoyaltyCards />
        </LoyaltyCardsTab>
    </PermissionGuard>
);

DebtorLoyaltyCardsPage.layoutType = 'dashboard';

export default DebtorLoyaltyCardsPage;
