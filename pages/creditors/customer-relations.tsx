import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import CustomerRelations from '@/modules/common/customer-relations';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const CustomerRelationsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.CREDITORS.TRANSACTIONS.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <CustomerRelations type="creditor" />
        </PermissionGuard>
    );
};

CustomerRelationsPage.layoutType = 'dashboard';

export default CustomerRelationsPage;
