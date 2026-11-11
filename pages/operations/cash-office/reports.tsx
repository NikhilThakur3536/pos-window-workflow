import type { NextPageWithLayout } from '@/types/next-page.types';
import ReportsModule from '@/modules/common/cash-office/reports';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashOfficeReportsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ReportsModule />
    </PermissionGuard>
);

CashOfficeReportsPage.layoutType = 'dashboard';

export default CashOfficeReportsPage;