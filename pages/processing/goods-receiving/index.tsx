import GoodsReceiving from '@/modules/common/goods-receiving';
import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const Page: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.GOODS_RECEIVING.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <GoodsReceiving />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';
export default Page;
