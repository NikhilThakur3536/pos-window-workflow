import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupplierCommitments from '@/modules/common/supplier-commitments';

const Page: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.SUPPLIER_COMMITMENTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <SupplierCommitments />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';

export default Page;
