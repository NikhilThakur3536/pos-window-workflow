import type { NextPageWithLayout } from '@/types/next-page.types';
import DiscrepancyReports from '@/modules/common/invoice-checking/discrepancy-reports';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DiscrepancyReportsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <DiscrepancyReports />
    </PermissionGuard>
);

DiscrepancyReportsPage.layoutType = 'dashboard';

export default DiscrepancyReportsPage;