import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorReceiptAllocations from '@/modules/common/debtors/allocations';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorReceiptAllocationsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.DEBTORS.ALLOCATIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <DebtorReceiptAllocations />
        </PermissionGuard>
    );
};

DebtorReceiptAllocationsPage.layoutType = 'dashboard';

export default DebtorReceiptAllocationsPage;
