import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import LoyaltyReportsTab from '@/modules/common/loyalty/reports';
import TransactionSummary from '@/modules/common/loyalty/reports/transaction-summary';

const TransactionSummaryPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.LOYALTY_SETUP.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <LoyaltyReportsTab>
            <TransactionSummary />
        </LoyaltyReportsTab>
    </PermissionGuard>
);

TransactionSummaryPage.layoutType = 'dashboard';

export default TransactionSummaryPage;
