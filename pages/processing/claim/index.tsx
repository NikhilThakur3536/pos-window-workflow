import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import GoodsReceivingClaimsPage from '@/modules/common/claim';

const CreditNotePage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.CREDIT_NOTES.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <GoodsReceivingClaimsPage/>
    </PermissionGuard>
);

CreditNotePage.layoutType = 'dashboard';
export default CreditNotePage;
