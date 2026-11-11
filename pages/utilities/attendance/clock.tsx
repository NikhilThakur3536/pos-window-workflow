import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import AttendanceClockModule from '@/modules/common/attendance/clock';

const AttendanceClockPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={[SYSTEM_MODULES.UTILITIES.ATTENDANCE.code, SYSTEM_MODULES.UTILITIES.ATTENDANCE.ATTENDANCE_CLOCK.code]}
            match="any"
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <AttendanceClockModule />
        </PermissionGuard>
    );
};

AttendanceClockPage.layoutType = 'dashboard';

export default AttendanceClockPage;
