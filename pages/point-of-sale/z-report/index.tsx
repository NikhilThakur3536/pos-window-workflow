import type { NextPageWithLayout } from '@/types/next-page.types';
import ZReportModule from '@/modules/point-of-sale/z-report';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ZReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.Z_REPORT.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ZReportModule moduleCode={SYSTEM_MODULES.POINT_OF_SALE.Z_REPORT.code} />
    </PermissionGuard>
);

ZReportPage.layoutType = 'dashboard';

export default ZReportPage;