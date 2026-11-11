import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PhysicalStockCount from '@/modules/common/stocks/inventories/physical-count';

const Page: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.PHYSICAL_STOCK_COUNT.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <PhysicalStockCount />
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;