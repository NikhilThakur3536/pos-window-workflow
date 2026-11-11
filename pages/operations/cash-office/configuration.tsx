import type { NextPageWithLayout } from '@/types/next-page.types';
import CashOfficeConfigurations from '@/modules/common/cash-office/configurations';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CashOfficeConfigurationPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.CONFIGURATION.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <CashOfficeConfigurations />
    </PermissionGuard>
);

CashOfficeConfigurationPage.layoutType = 'dashboard';

export default CashOfficeConfigurationPage;