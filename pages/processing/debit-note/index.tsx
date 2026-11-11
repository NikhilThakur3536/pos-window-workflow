import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import DebitNote from '@/modules/common/debit-note';

const GoodsReturnPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES?.PROCESSING.DEBIT_NOTE.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
        <DebitNote />
    </PermissionGuard>
);

GoodsReturnPage.layoutType = 'dashboard';
export default GoodsReturnPage;
