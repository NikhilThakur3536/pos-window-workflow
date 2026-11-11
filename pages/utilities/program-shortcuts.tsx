import type { NextPageWithLayout } from '@/types/next-page.types';
import ShortcutManagement from '@/modules/common/shortcuts';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const ProgramShortcutsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.UTILITIES.PROGRAM_SHORTCUTS.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <ShortcutManagement />
        </PermissionGuard>
    );
};

ProgramShortcutsPage.layoutType = 'dashboard';

export default ProgramShortcutsPage;