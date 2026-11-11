import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import BankAccountsModule from '@/modules/masters/bank-account-master';

const BankAccountsPage: NextPageWithLayout = () => (
    <PermissionGuard module={SYSTEM_MODULES.UTILITIES.BANK_ACCOUNTS.code} permission={[SYSTEM_PERMISSIONS.READ]}>
        <BankAccountsModule />
    </PermissionGuard>
);

BankAccountsPage.layoutType = 'dashboard';

export default BankAccountsPage;
