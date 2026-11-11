import type { NextPageWithLayout } from '@/types/next-page.types';
import MenuManagement from '@/modules/common/menu-management';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MenuSetupPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_SETUP.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <MenuManagement />
        </PermissionGuard>
    );
};

MenuSetupPage.layoutType = 'dashboard';

export default MenuSetupPage;