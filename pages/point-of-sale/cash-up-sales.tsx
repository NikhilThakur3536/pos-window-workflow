import type { NextPageWithLayout } from '@/types/next-page.types';
import CashUpSalesModule from '@/modules/point-of-sale/cash-up-sales';
import PermissionGuard from '@/components/permission-guards/PermissionGuard';
import { SYSTEM_MODULES, SYSTEM_PERMISSIONS } from '@/lib/constant';
import { useHasCashUpViewAll } from '@/api-queries/security';
import { ViewAccessDeniedCard } from '@/components/permission-guards';
import { PageLoader } from '@/components/custom-components/PageLoader';

const CashUpSalesPage: NextPageWithLayout = () => {
    const { canViewAll, isLoading } = useHasCashUpViewAll();
    const appClient = process.env.NEXT_PUBLIC_CLIENT_TYPE === 'APP';
    return (
        <PermissionGuard
            module={SYSTEM_MODULES.POINT_OF_SALE.CASH_UP_SALES_NON_BANKABLE.code}
            permission={[SYSTEM_PERMISSIONS.READ]}
        >
            {appClient ? null : isLoading ? (
                <PageLoader isLoading />
            ) : canViewAll ? (
                <CashUpSalesModule moduleCode={SYSTEM_MODULES.POINT_OF_SALE.CASH_UP_SALES_NON_BANKABLE.code} />
            ) : (
                <ViewAccessDeniedCard
                    options={{
                        title: 'Wider Cash-Up Permission Required',
                        description: 'Cash-Up reports require the CASHUP_VIEW_ALL Execute permission.',
                    }}
                />
            )}
        </PermissionGuard>
    );
};

CashUpSalesPage.layoutType = 'dashboard';

export default CashUpSalesPage;
