import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierAllowances from '@/modules/common/supplier-allowances';

const Page: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.SUPPLIER_ALLOWANCES.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <SupplierAllowances />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';

export default Page;
