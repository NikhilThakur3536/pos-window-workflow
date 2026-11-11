import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockInventories from '@/modules/common/stocks/inventories';

const Page: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <StockInventories />
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;
