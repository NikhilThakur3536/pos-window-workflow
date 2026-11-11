import StockMovements from '@/modules/common/stock-movements';
import { type NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StockMovementsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <StockMovements />
    </PermissionGuard>
);

StockMovementsPage.layoutType = 'dashboard';

export default StockMovementsPage;
