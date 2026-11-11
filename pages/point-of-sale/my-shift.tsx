import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import MyShift from '@/modules/point-of-sale/my-shift';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MyShiftPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <MyShift />
    </PermissionGuard>
);

MyShiftPage.layoutType = 'dashboard';

export default MyShiftPage;
