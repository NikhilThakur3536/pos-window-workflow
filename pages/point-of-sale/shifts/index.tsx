import type { NextPageWithLayout } from '@/types/next-page.types';
import ShiftsList from '@/modules/point-of-sale/shifts';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ShiftsPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.POINT_OF_SALE.SHIFTS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <ShiftsList />
    </PermissionGuard>
);

ShiftsPage.layoutType = 'dashboard';

export default ShiftsPage;
