import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorReceipts from '@/modules/common/debtors/receipts';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorReceiptsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.DEBTORS.RECEIPTS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <DebtorReceipts />
        </PermissionGuard>
    );
};

DebtorReceiptsPage.layoutType = 'dashboard';

export default DebtorReceiptsPage;
