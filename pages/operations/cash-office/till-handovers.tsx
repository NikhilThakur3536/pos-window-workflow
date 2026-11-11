import type { NextPageWithLayout } from '@/types/next-page.types';
import TillHandoverModule from '@/modules/common/cash-office/till-handovers';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const TillHandoversPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.TILL_HANDOVERS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <TillHandoverModule />
    </PermissionGuard>
);

TillHandoversPage.layoutType = 'dashboard';

export default TillHandoversPage;