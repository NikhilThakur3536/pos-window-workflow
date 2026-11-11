import type { NextPageWithLayout } from '@/types/next-page.types';
import WarehouseLocations from '@/modules/common/stocks/inventories/warehouse-locations';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const WarehouseLocationsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.WAREHOUSE_LOCATIONS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <WarehouseLocations />
    </PermissionGuard>
);

WarehouseLocationsPage.layoutType = 'dashboard';

export default WarehouseLocationsPage;