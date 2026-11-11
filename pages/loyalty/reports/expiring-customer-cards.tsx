import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyReportsTab from '@/modules/common/loyalty/reports';
import ExpiringCustomerCards from '@/modules/common/loyalty/reports/expiring-customer-cards';

const ExpiringCustomerCardsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyReportsTab>
            <ExpiringCustomerCards />
        </LoyaltyReportsTab>
    </PermissionGuard>
);

ExpiringCustomerCardsPage.layoutType = 'dashboard';

export default ExpiringCustomerCardsPage;
