import type { NextPageWithLayout } from '@/types/next-page.types';
import { useRouter } from 'next/router';
import CompanyDebtorOrders from '@/modules/common/company-debtor-orders';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';

const AislePicklistPage: NextPageWithLayout = () => {
    const router = useRouter();
    const initialOrderId = typeof router.query.orderId === 'string' ? router.query.orderId : undefined;
    return (
        <PermissionGuard module={SYSTEM_MODULES.PROCESSING.AISLE_PICKLIST.code} permission={[SYSTEM_PERMISSIONS.READ]}>
            <CompanyDebtorOrders initialTab="aisle-picklist" initialOrderId={initialOrderId} />
        </PermissionGuard>
    );
};

AislePicklistPage.layoutType = 'dashboard';

export default AislePicklistPage;