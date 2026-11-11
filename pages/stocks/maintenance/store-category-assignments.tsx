import type { NextPageWithLayout } from '@/types/next-page.types';
import StockMaintenance from '@/modules/common/stock-maintenance';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StoreCategoryAssignmentsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.STORE_CLASSIFICATION.STORE_CATEGORY_ASSIGNMENTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <StockMaintenance initialTab="store-category-assignments" />
    </PermissionGuard>
);

StoreCategoryAssignmentsPage.layoutType = 'dashboard';

export default StoreCategoryAssignmentsPage;
