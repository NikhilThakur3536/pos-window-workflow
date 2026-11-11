import type { NextPageWithLayout } from '@/types/next-page.types';
import StockMaintenance from '@/modules/common/stock-maintenance';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const SkuTagsManagementPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.SKU_TAGS_MANAGEMENT.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <StockMaintenance initialTab="sku-tags-management" />
    </PermissionGuard>
);

SkuTagsManagementPage.layoutType = 'dashboard';

export default SkuTagsManagementPage;
