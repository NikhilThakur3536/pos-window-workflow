import type { NextPageWithLayout } from '@/types/next-page.types';
import DenominationsList from '@/modules/point-of-sale/denominations';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DenominationsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.DENOMINATIONS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <DenominationsList moduleCode={SYSTEM_MODULES.POINT_OF_SALE.DENOMINATIONS.code} />
    </PermissionGuard>
);

DenominationsPage.layoutType = 'dashboard';

export default DenominationsPage;
