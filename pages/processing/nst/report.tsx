import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import NSTReport from '@/modules/common/nst/report';

const NSTReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <NSTReport />
    </PermissionGuard>
);

NSTReportPage.layoutType = 'dashboard';
export default NSTReportPage;
