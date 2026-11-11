import type { NextPageWithLayout } from '@/types/next-page.types';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CompanyDebtorOrderSetupPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.COMPANY_DEBTOR_ORDER_SETUP.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="setup" />
        </PermissionGuard>
    );
};

CompanyDebtorOrderSetupPage.layoutType = 'dashboard';

export default CompanyDebtorOrderSetupPage;