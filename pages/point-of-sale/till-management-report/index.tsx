import type { NextPageWithLayout } from '@/types/next-page.types';
import TillManagementReportModule from '@/modules/point-of-sale/till-management-report';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const TillManagementReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.TILL_MANAGEMENT_REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <TillManagementReportModule
            moduleCode={SYSTEM_MODULES.POINT_OF_SALE.TILL_MANAGEMENT_REPORTS.code}
        />
    </PermissionGuard>
);

TillManagementReportPage.layoutType = 'dashboard';

export default TillManagementReportPage;
