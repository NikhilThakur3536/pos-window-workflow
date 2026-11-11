import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import GoodsReturn from '@/modules/common/goods-return';

const GoodsReturnPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.GOODS_RETURN.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <GoodsReturn />
    </PermissionGuard>
);

GoodsReturnPage.layoutType = 'dashboard';
export default GoodsReturnPage;
