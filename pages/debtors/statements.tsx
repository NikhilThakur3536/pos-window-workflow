import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import DebtorStatements from '@/modules/common/debtors/statements';
import AnyOfPermissionGuard from '@/components/permission-guards/AnyOfPermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const DebtorStatementsPage: NextPageWithLayout = () => {
    return (
        <AnyOfPermissionGuard
            modules={[
                SYSTEM_MODULES?.DEBTORS.ENQUIRIES.DEBTOR_STATEMENTS.code,
                SYSTEM_MODULES?.DEBTORS.STATEMENTS.code,
            ]}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <DebtorStatements />
        </AnyOfPermissionGuard>
    );
};

DebtorStatementsPage.layoutType = 'dashboard';

export default DebtorStatementsPage;