import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import CreditorTransactions from '@/modules/common/creditors/transactions';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CreditorTransactionsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.CREDITORS.TRANSACTIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <CreditorTransactions />
        </PermissionGuard>
    );
};

CreditorTransactionsPage.layoutType = 'dashboard';

export default CreditorTransactionsPage;
