import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import DefaultSettingsOnesPage from '@/modules/common/stocks/default-settings';

const PromotionsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.PROMOTIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <DefaultSettingsOnesPage/>
    </PermissionGuard>
);

PromotionsPage.layoutType = 'dashboard';

export default PromotionsPage;
