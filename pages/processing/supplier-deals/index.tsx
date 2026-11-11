import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierDeals from '@/modules/common/supplier-deals';

const Page: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.SUPPLIER_DEALS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <SupplierDeals />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';
export default Page;
