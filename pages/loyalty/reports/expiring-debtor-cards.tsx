import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyReportsTab from '@/modules/common/loyalty/reports';
import ExpiringDebtorCards from '@/modules/common/loyalty/reports/expiring-debtor-cards';

const ExpiringDebtorCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyReportsTab>
            <ExpiringDebtorCards />
        </LoyaltyReportsTab>
    </PermissionGuard>
);

ExpiringDebtorCardsPage.layoutType = 'dashboard';

export default ExpiringDebtorCardsPage;
