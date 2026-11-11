import StocksList from '@/modules/common/stocks';
import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const Page: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.STOCK.MAINTENANCE.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <StocksList />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';

export default Page;
