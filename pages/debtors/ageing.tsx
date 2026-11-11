import type { NextPageWithLayout } from '@/types/next-page.types';
import AgeingModule from '@/modules/debtors/ageing';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const AgeingPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.DEBTORS.AGEING_AND_CREDIT_ALLOCATION.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <AgeingModule moduleCode={SYSTEM_MODULES.DEBTORS.AGEING_AND_CREDIT_ALLOCATION.code} />
    </PermissionGuard>
);

AgeingPage.layoutType = 'dashboard';

export default AgeingPage;
