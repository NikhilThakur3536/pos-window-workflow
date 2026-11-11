import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import DebtorSourceDocumentList from '@/modules/masters/source-documents';

const MastersPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.DEFAULT_TABLES.STOCK_SUB_CATEGORIES.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
           <DebtorSourceDocumentList/>
        </PermissionGuard>
    );
};

MastersPage.layoutType = 'dashboard';

export default MastersPage;
