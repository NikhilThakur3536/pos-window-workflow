import type { NextPageWithLayout } from '@/types/next-page.types';
import AssetEventsModule from '@/modules/operations/assets/events';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ASSET_EVENTS_CODE = SYSTEM_MODULES.OPERATIONS.STORE_ASSETS_AND_MAINTENANCE.ASSET_EVENTS.code;

const AssetEventsPage: NextPageWithLayout = () => (
    <PermissionGuard module={ASSET_EVENTS_CODE} permission={[SYSTEM_PERMISSIONS.READ]}>
        <AssetEventsModule moduleCode={ASSET_EVENTS_CODE} />
    </PermissionGuard>
);

AssetEventsPage.layoutType = 'dashboard';

export default AssetEventsPage;