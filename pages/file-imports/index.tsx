import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ImportPage from '@/modules/common/file-import';

const PromotionsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.PROMOTIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <ImportPage/>
    </PermissionGuard>
);

PromotionsPage.layoutType = 'dashboard';

export default PromotionsPage;
