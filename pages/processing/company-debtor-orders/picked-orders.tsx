import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const PickedOrdersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.PICKED_ORDERS.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="picked-orders" />
        </PermissionGuard>
    );
};

PickedOrdersPage.layoutType = 'dashboard';

export default PickedOrdersPage;
