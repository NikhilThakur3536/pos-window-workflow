import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorInvoicingOrders from '@/modules/common/debtor-invoicing-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorInvoicingOrderSetupPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.POINT_OF_SALE.DEBTOR_INVOICING_ORDER_SETUP.code}
            permission={[SYSTEM_PERMISSIONS.READ, SYSTEM_PERMISSIONS.UPDATE]}
        >
            <DebtorInvoicingOrders initialTab="setup" />
        </PermissionGuard>
    );
};

DebtorInvoicingOrderSetupPage.layoutType = 'dashboard';

export default DebtorInvoicingOrderSetupPage;