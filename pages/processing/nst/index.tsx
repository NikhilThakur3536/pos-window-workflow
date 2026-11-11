import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import NSTIndex from '@/modules/common/nst';

const NSTAllocationsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <NSTIndex />
    </PermissionGuard>
);

NSTAllocationsPage.layoutType = 'dashboard';
export default NSTAllocationsPage;
