import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorGroups from '@/modules/debtors/debtor-groups';
import AnyOfPermissionGuard from '@/components/permission-guards/AnyOfPermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

// Debtor groups fall back to debtor maintenance access, so a group that can maintain a
// debtor can also reach the groups that debtor belongs to.
const ALLOWED_MODULES = [SYSTEM_MODULES.DEBTORS.MASTERS.DEBTOR_GROUPS.code, SYSTEM_MODULES.DEBTORS.MAINTENANCE.code];

const DebtorGroupsPage: NextPageWithLayout = () => (
    <AnyOfPermissionGuard modules={ALLOWED_MODULES} permission={[SYSTEM_PERMISSIONS.READ]}>
        <DebtorGroups />
    </AnyOfPermissionGuard>
);

DebtorGroupsPage.layoutType = 'dashboard';

export default DebtorGroupsPage;
