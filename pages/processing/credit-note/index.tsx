import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import CreditNote from '@/modules/common/credit-note';

const CreditNotePage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.POINT_OF_SALE?.CREDIT_NOTES.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <CreditNote />
    </PermissionGuard>
);

CreditNotePage.layoutType = 'dashboard';
export default CreditNotePage;
