import type { NextPageWithLayout } from '@/types/next-page.types';
import StoreInventorySalesConfiguration from '@/modules/common/store-inventory-sales-configuration';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const StoreInventorySalesConfigurationPage: NextPageWithLayout = () => {
    return (
        // <PermissionGuard
        //     module={SYSTEM_MODULES.UTILITIES.SETUP.STORE_SETUP.STORE_INVENTORY_SALES_CONFIGURATION.code}
        //     permission={[SYSTEM_PERMISSIONS.READ]}
        // >
            <div className="m-6">
                <StoreInventorySalesConfiguration />
            </div>
        // {/* </PermissionGuard> */}
    );
};

StoreInventorySalesConfigurationPage.layoutType = 'dashboard';

export default StoreInventorySalesConfigurationPage;
