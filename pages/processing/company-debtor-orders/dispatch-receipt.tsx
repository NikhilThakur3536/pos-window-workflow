import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DispatchReceiptPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.DISPATCH_AND_RECEIPT.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="dispatch-receipt" />
        </PermissionGuard>
    );
};

DispatchReceiptPage.layoutType = 'dashboard';

export default DispatchReceiptPage;