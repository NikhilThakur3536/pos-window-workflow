import type { NextPageWithLayout } from '@/types/next-page.types';
import TillToSafeList from '@/modules/point-of-sale/till-to-safe';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const TillToSafePage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.TILL_TO_SAFE.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <TillToSafeList moduleCode={SYSTEM_MODULES.POINT_OF_SALE.TILL_TO_SAFE.code} />
    </PermissionGuard>
);

TillToSafePage.layoutType = 'dashboard';

export default TillToSafePage;
