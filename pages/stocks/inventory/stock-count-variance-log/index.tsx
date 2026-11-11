import type { NextPageWithLayout } from '@/types/next-page.types';
import StockCountVarianceLog from '@/modules/common/stocks/inventories/stock-count-variance-log';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StockCountVarianceLogPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.STOCK_COUNT_VARIANCE_LOG.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <StockCountVarianceLog />
    </PermissionGuard>
);

StockCountVarianceLogPage.layoutType = 'dashboard';

export default StockCountVarianceLogPage;