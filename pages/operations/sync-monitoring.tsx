import type { NextPageWithLayout } from '@/types/next-page.types';
import SyncMonitoringModule from '@/modules/operations/sync-monitoring';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const SYNC_MONITORING_CODE = SYSTEM_MODULES.OPERATIONS.SYNCHRONIZATION.SYNC_MONITORING.code;

const SyncMonitoringPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYNC_MONITORING_CODE} permission={[SYSTEM_PERMISSIONS.READ]}>
        <SyncMonitoringModule moduleCode={SYNC_MONITORING_CODE} />
    </PermissionGuard>
);

SyncMonitoringPage.layoutType = 'dashboard';

export default SyncMonitoringPage;