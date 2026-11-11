import type { NextPageWithLayout } from '@/types/next-page.types';
import ReconciliationModule from '@/modules/common/cash-office/reconciliation';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ReconciliationPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.RECONCILIATION_AND_CLOSING.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ReconciliationModule />
    </PermissionGuard>
);

ReconciliationPage.layoutType = 'dashboard';

export default ReconciliationPage;