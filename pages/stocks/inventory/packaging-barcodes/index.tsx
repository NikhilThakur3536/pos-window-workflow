import type { NextPageWithLayout } from '@/types/next-page.types';
import PackagingBarcodes from '@/modules/common/stocks/inventories/packaging-barcodes';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const PackagingBarcodesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.STOCK_INVENTORY.PACKAGING_BARCODES.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <PackagingBarcodes />
    </PermissionGuard>
);

PackagingBarcodesPage.layoutType = 'dashboard';

export default PackagingBarcodesPage;