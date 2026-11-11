import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockInventories from '@/modules/common/stocks/inventories';
import { useRouter } from 'next/router';

const Page: NextPageWithLayout = () => {
    const router = useRouter();
    const stockId = Array.isArray(router.query['stock-id'])
        ? router.query['stock-id'][0]
        : router.query['stock-id'] || '';

    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.STOCK.MAINTENANCE.STOCK_INVENTORY.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            {stockId && <StockInventories stockId={stockId} />}
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;
