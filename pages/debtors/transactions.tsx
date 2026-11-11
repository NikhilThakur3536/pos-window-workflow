import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorTransactions from '@/modules/common/debtors/transactions';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorTransactionsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.DEBTORS.TRANSACTIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <DebtorTransactions />
        </PermissionGuard>
    );
};

DebtorTransactionsPage.layoutType = 'dashboard';

export default DebtorTransactionsPage;
