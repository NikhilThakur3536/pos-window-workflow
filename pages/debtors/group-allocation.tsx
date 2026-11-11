import type { NextPageWithLayout } from '@/types/next-page.types';
import GroupAllocationModule from '@/modules/debtors/group-allocation';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const GROUP_ALLOCATION_LOG_CODE = SYSTEM_MODULES.DEBTORS.GROUP_ALLOCATION_LOG.code;

const GroupAllocationPage: NextPageWithLayout = () => (
    <PermissionGuard module={GROUP_ALLOCATION_LOG_CODE} permission={[SYSTEM_PERMISSIONS.READ]}>
        <GroupAllocationModule />
    </PermissionGuard>
);

GroupAllocationPage.layoutType = 'dashboard';

export default GroupAllocationPage;