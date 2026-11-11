import type { NextPageWithLayout } from '@/types/next-page.types';
import ReasonMaster from '@/modules/common/invoice-checking/reason-master';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DiscrepancyReasonsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.PROCESSING.INVOICE_CHECKING.DISCREPANCY_REASONS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ReasonMaster />
    </PermissionGuard>
);

DiscrepancyReasonsPage.layoutType = 'dashboard';

export default DiscrepancyReasonsPage;