import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import UserEnquiries from '@/modules/common/enquiries';

const DebtorEnquiriesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.DEBTORS.ENQUIRIES.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <UserEnquiries userType="DEBTOR" />
        </PermissionGuard>
    );
};

DebtorEnquiriesPage.layoutType = 'dashboard';

export default DebtorEnquiriesPage;
