import { NextPageWithLayout } from '@/types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import ImportHistory from '@/modules/common/import-history';
import { IMPORT_HISTORY_TYPES } from '@/api-queries/import-history';

const Page: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.PROCESSING.GOODS_DISCOUNT.code}
            permission={[SYSTEM_PERMISSIONS?.CREATE]}
        >
            <ImportHistory importType={IMPORT_HISTORY_TYPES?.PRODUCT_WISE_QTY_DISCOUNT} />
        </PermissionGuard>
    );
};

Page.layoutType = 'dashboard';

export default Page;
