import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyTransactions from '@/modules/common/loyalty/transactions';

const LoyaltyTransactionsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyTransactions />
    </PermissionGuard>
);

LoyaltyTransactionsPage.layoutType = 'dashboard';

export default LoyaltyTransactionsPage;
