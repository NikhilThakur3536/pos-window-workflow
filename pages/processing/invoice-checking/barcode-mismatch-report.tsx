import type { NextPageWithLayout } from '@/types/next-page.types';
import BarcodeMismatchReport from '@/modules/common/invoice-checking/barcode-mismatch-report';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const BarcodeMismatchReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <BarcodeMismatchReport />
    </PermissionGuard>
);

BarcodeMismatchReportPage.layoutType = 'dashboard';

export default BarcodeMismatchReportPage;
