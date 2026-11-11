import type { NextPageWithLayout } from '@/types/next-page.types';
import OverSupplyApprovalsScreen from '@/modules/common/company-debtor-orders/over-supply-approvals';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const OverSupplyApprovalsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.OVER_SUPPLY_APPROVAL.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <OverSupplyApprovalsScreen />
        </PermissionGuard>
    );
};

OverSupplyApprovalsPage.layoutType = 'dashboard';

export default OverSupplyApprovalsPage;
