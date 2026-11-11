import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupervisorHistory from '@/modules/common/security/supervisor-desk/history';

const SupervisorHistoryPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={[
            SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
            SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.MY_APPROVAL_HISTORY.code,
        ]}
        match="any"
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <SupervisorHistory />
    </PermissionGuard>
);

SupervisorHistoryPage.layoutType = 'dashboard';

export default SupervisorHistoryPage;
