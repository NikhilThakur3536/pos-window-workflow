import type { NextPageWithLayout } from '@/types/next-page.types';
import MenuAccessManagement from '@/modules/common/menu-management/menu-access';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const MenuAccessPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.UTILITIES.SETUP.MENU_ACCESS_AND_SECURITY.MENU_ACCESS.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <MenuAccessManagement />
        </PermissionGuard>
    );
};

MenuAccessPage.layoutType = 'dashboard';

export default MenuAccessPage;