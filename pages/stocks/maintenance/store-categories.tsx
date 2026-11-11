import type { NextPageWithLayout } from '@/types/next-page.types';
import StockMaintenance from '@/modules/common/stock-maintenance';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StoreCategoriesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORIES.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <StockMaintenance initialTab="store-categories" />
    </PermissionGuard>
);

StoreCategoriesPage.layoutType = 'dashboard';

export default StoreCategoriesPage;
