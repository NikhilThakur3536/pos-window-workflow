import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import SupervisorInbox from '@/modules/common/security/supervisor-desk/inbox';

const SupervisorInboxPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={[
            SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.code,
            SYSTEM_MODULES.UTILITIES.SUPERVISOR_DESK.PENDING_REQUESTS.code,
        ]}
        match="any"
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <SupervisorInbox />
    </PermissionGuard>
);

SupervisorInboxPage.layoutType = 'dashboard';

export default SupervisorInboxPage;
