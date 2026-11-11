import type { NextPageWithLayout } from '@/types/next-page.types';
import CashOfficeDashboard from '@/modules/common/cash-office/dashboard';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashOfficeDashboardPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.DASHBOARD.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <CashOfficeDashboard />
    </PermissionGuard>
);

CashOfficeDashboardPage.layoutType = 'dashboard';

export default CashOfficeDashboardPage;