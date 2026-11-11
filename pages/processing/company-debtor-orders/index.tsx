import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CompanyDebtorOrdersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDERS.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="orders" />
        </PermissionGuard>
    );
};

CompanyDebtorOrdersPage.layoutType = 'dashboard';

export default CompanyDebtorOrdersPage;