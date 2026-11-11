import type { NextPageWithLayout } from '@/types/next-page.types';
import ReconciliationModule from '@/modules/debtors/reconciliation';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ReconciliationPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.DEBTORS.RECONCILIATION.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ReconciliationModule moduleCode={SYSTEM_MODULES.DEBTORS.RECONCILIATION.code} />
    </PermissionGuard>
);

ReconciliationPage.layoutType = 'dashboard';

export default ReconciliationPage;
