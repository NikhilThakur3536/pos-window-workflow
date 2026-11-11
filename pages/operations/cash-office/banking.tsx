import type { NextPageWithLayout } from '@/types/next-page.types';
import BankingModule from '@/modules/common/cash-office/banking';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const BankingPage: NextPageWithLayout = () => (
    <PermissionGuard
        module={SYSTEM_MODULES.OPERATIONS.CASH_OFFICE.BANK_DEPOSITS_AND_WITHDRAWALS.code}
        permission={[SYSTEM_PERMISSIONS.READ]}
    >
        <BankingModule />
    </PermissionGuard>
);

BankingPage.layoutType = 'dashboard';

export default BankingPage;