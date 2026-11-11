import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import NSTCandidates from '@/modules/common/nst/candidates';

const NSTCandidatesPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.STOCK.MAINTENANCE.NST_MANAGEMENT.WORKSPACE.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <NSTCandidates />
    </PermissionGuard>
);

NSTCandidatesPage.layoutType = 'dashboard';
export default NSTCandidatesPage;
