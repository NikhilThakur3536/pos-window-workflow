import type { NextPageWithLayout } from '@/types/next-page.types';
import AssetRegisterModule from '@/modules/operations/assets/register';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ASSET_REGISTER_CODE = SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_REGISTER.code;

const AssetRegisterPage: NextPageWithLayout = () => (
    <PermissionGuard module={ASSET_REGISTER_CODE} permission={[SYSTEM_PERMISSIONS.READ]}>
        <AssetRegisterModule moduleCode={ASSET_REGISTER_CODE} />
    </PermissionGuard>
);

AssetRegisterPage.layoutType = 'dashboard';

export default AssetRegisterPage;