import React from 'react';
import type { NextPageWithLayout } from '@/types/next-page.types';
import PaymentMethodsList from '@/modules/masters/payment-methods';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const PaymentMethodsPage: NextPageWithLayout = () => {
    return (
        <PermissionGuard
            module={SYSTEM_MODULES?.UTILITIES.SETUP.TENDER_SETUP.code}
            permission={[SYSTEM_PERMISSIONS?.READ]}
        >
            <PaymentMethodsList />
        </PermissionGuard>
    );
};

PaymentMethodsPage.layoutType = 'dashboard';

export default PaymentMethodsPage;