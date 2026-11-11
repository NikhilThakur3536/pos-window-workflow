import type { NextPageWithLayout } from '@/types/next-page.types';
import PaymentsTransfersModule from '@/modules/common/cash-office/payments-transfers';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const PaymentsTransfersPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENTS_AND_TRANSFERS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <PaymentsTransfersModule />
    </PermissionGuard>
);

PaymentsTransfersPage.layoutType = 'dashboard';

export default PaymentsTransfersPage;