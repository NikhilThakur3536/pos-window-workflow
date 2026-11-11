import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useRouter } from 'next/router';
import StockInventoryLogs from '@/modules/common/stocks/inventories/logs';

const InventoryLogsPage: NextPageWithLayout = () => {
    const router = useRouter();
    const inventoryId = Array.isArray(router.query['inventory-id'])
        ? router.query['inventory-id'][0]
        : router.query['inventory-id'] || '';

    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            {inventoryId && (
                <StockInventoryLogs inventoryId={inventoryId} backHref="/stocks/inventory" />
            )}
        </PermissionGuard>
    );
};

InventoryLogsPage.layoutType = 'dashboard';

export default InventoryLogsPage;
