import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import AttendanceReportsModule from '@/modules/common/attendance/reports';

const AttendanceReportsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={[SYSTEM_MODULES.UTILITIES.ATTENDANCE.code, SYSTEM_MODULES.UTILITIES.ATTENDANCE.ATTENDANCE_REPORTS.code]}
            match="any"
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            <AttendanceReportsModule />
        </PermissionGuard>
    );
};

AttendanceReportsPage.layoutType = 'dashboard';

export default AttendanceReportsPage;
