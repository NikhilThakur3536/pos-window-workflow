import type { NextPageWithLayout } from '@/types/next-page.types';
import CashUpList from '@/modules/point-of-sale/cash-up';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import MyShift from '@/modules/point-of-sale/my-shift';

const CashUpPage: NextPageWithLayout = () => {
    const appClient = process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP';
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.POINT_OF_SALE.CASH_UP.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            {appClient ? <MyShift /> : <CashUpList />}
        </PermissionGuard>
    );
};

CashUpPage.layoutType = 'dashboard';

export default CashUpPage;
