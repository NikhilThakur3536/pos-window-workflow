import type { NextPageWithLayout } from '@/types/next-page.types';
import ShortageReport from '@/modules/common/invoice-checking/shortage-report';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ShortageReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ShortageReport />
    </PermissionGuard>
);

ShortageReportPage.layoutType = 'dashboard';

export default ShortageReportPage;
