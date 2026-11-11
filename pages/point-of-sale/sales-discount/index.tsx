import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import QuantityWiseDiscounts from '@/modules/common/quantity-wise-discount';

const GoodsDiscountPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES?.POINT_OF_SALE?.SALES_DISCOUNT.code}
        permission={[SYSTEM_PERMISSIONS?.READ]}
    >
        <QuantityWiseDiscounts />
    </PermissionGuard>
);

GoodsDiscountPage.layoutType = 'dashboard';
export default GoodsDiscountPage;
