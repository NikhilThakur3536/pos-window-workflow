import type { NextPageWithLayout } from '@/types/next-page.types';
import CashOfficePaymentCollection from '@/modules/common/cash-office/payment-collection';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashOfficePaymentCollectionPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.PAYMENT_COLLECTION.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <CashOfficePaymentCollection />
    </PermissionGuard>
);

CashOfficePaymentCollectionPage.layoutType = 'dashboard';

export default CashOfficePaymentCollectionPage;