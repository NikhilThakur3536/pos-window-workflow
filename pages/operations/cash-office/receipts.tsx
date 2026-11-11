import type { NextPageWithLayout } from '@/types/next-page.types';
import ReceiptsModule from '@/modules/common/cash-office/receipts';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashOfficeReceiptsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CASH_OFFICE_RECEIPTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ReceiptsModule />
    </PermissionGuard>
);

CashOfficeReceiptsPage.layoutType = 'dashboard';

export default CashOfficeReceiptsPage;