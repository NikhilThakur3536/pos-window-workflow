import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import PurchaseOrders from '@/modules/common/purchase-orders';

const Page: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.PURCHASE_ORDERS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <PurchaseOrders />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';
export default Page;
