import type { NextPageWithLayout } from '@/types/next-page.types';
import GoodsReturnReport from '@/modules/common/invoice-checking/goods-return-report';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const GoodsReturnReportPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REPORTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <GoodsReturnReport />
    </PermissionGuard>
);

GoodsReturnReportPage.layoutType = 'dashboard';

export default GoodsReturnReportPage;
