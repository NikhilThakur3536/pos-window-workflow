import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import UserEnquiries from '@/modules/common/enquiries';

const CreditorEnquiriesPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard module={SYSTEM_MODULES?.CREDITORS.ENQUIRIES.code} permission={[SYSTEM_PERMISSIONS?.READ]}>
            <UserEnquiries userType="CREDITOR" />
        </PermissionGuard>
    );
};

CreditorEnquiriesPage.layoutType = 'dashboard';

export default CreditorEnquiriesPage;
