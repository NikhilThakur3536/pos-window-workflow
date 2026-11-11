import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DeliverySchedulePage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.DELIVERY_SCHEDULE.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="delivery-schedule" />
        </PermissionGuard>
    );
};

DeliverySchedulePage.layoutType = 'dashboard';

export default DeliverySchedulePage;