import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import StockEnquiries from '@/modules/common/enquiries/stock-enquiries';

const Page: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.STOCK.ENQUIRIES.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <StockEnquiries />
    </PermissionGuard>
);

Page.layoutType = 'dashboard';

export default Page;
